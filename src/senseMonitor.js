const sense = require('sense-energy-node');
const amqp = require('amqplib')
require('dotenv').config();
 
//Global Variables
var mySense;                        //Main Sense API object
var amqpConn;               //AMQP connection
var amqpChannel;            //AMQP Channel
var currentlyProcessing = false;    //Flag to ensure only one websocket packet is handled at a time
var websocketPollingInterval = 60;  //Number of seconds between opening/closing the websocket

async function startAmqp() {
    //process.env.mqConns is an array of connection string
    amqpConn = await amqp.connect(process.env.AMQP_CONN);
    amqpChannel = await amqpConn.createChannel();
    amqpChannel.on("close", () => {
        console.log("AMQP connection closed");
        amqpChannel = null;
    });
    amqpChannel.on("error", (err) => {
        console.log("AMQP Error: " + err);
    });
    await amqpChannel.assertExchange(process.env.AMQP_EXCHANGE, "topic", { durable: false });
}
 
async function startSense() {
    try {
        mySense = await sense({email: process.env.SENSE_EMAIL, password: process.env.SENSE_PASSWORD, verbose: false})   //Set up Sense API object and authenticate
 
        //Get devices
        await mySense.getDevices().then(devices => {
            for (let dev of devices) {
                //console.log(dev);

                //Publish data to exchange
                amqpChannel.publish(process.env.AMQP_EXCHANGE, process.env.AMQP_DEVICES_ROUTINGKEY, Buffer.from(JSON.stringify(dev)));
            }
        });
 
        //Get monitor info
        await mySense.getMonitorInfo().then(monitor => {
            //console.log(monitor);   //Process monitor details here
            amqpChannel.publish(process.env.AMQP_EXCHANGE, process.env.AMQP_MONITORINFO_ROUTINGKEY, Buffer.from(JSON.stringify(monitor)));
        })
 
        //Handle websocket data updates (one at a time)
        mySense.events.on('data', async (data) => {
 
            //Check for loss of authorization. If detected, try to reauth
            if (data.payload.authorized == false){
                console.log('Authentication failed. Trying to reauth...');
                refreshAuth();
            }

            //Set processing flag so we only send through and process one at a time
            if (data.type === "realtime_update" && data.payload && data.payload.devices) {
                mySense.closeStream();

                if (currentlyProcessing){
                    return 0;
                }
                currentlyProcessing = true;
                console.log(`Fresh websocket device data incoming...`)

                //Publish data to exchange
                if(!amqpChannel) {
                    await startAmqp();
                }
                amqpChannel.publish(process.env.AMQP_EXCHANGE, process.env.AMQP_REALTIME_ROUTINGKEY, Buffer.from(JSON.stringify(data.payload)));
                console.log("Processed realtime message");
            }
            return 0;
        });
 
        //Handle closures and errors
        mySense.events.on('close', (data) => {
            console.log(`Sense WebSocket Closed | Reason: ${data.wasClean ? 'Normal' : data.reason}`);
            let interval = websocketPollingInterval && websocketPollingInterval > 10 ? websocketPollingInterval : 60;
 
            //On clean close, set up the next scheduled check
            console.log(`New poll scheduled for ${interval * 1000} ms from now.`);
            setTimeout(() => {
                currentlyProcessing = false;
                mySense.openStream();
            },  interval * 1000);
        });
        mySense.events.on('error', (data) => {
            console.log('Error: Sense WebSocket Closed | Reason: ' + data.msg);
        });
 
        //Open websocket flow (and re-open again on an interval)
        mySense.openStream();
 
    } catch (error) {
        console.log(`FATAL ERROR: ${error}`);
        if (error.stack){
            console.log(`FATAL ERROR: ${error.stack}`);
        }
        process.exit();
    }
}
 
//Attempt to refresh auth
function refreshAuth(){
    try {
        mySense.getAuth();
    } catch (error) {
        console.log(`Re-auth failed: ${error}. Exiting.`);
        process.exit();
    }
}

async function main() {
    await startAmqp();
    await startSense();
}

main();
 