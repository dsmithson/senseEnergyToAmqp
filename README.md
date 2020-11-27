# senseEnergyToAmqp
Connects to Sense Energy API and sends Monitor Info, RealTime readings, and Device listings to an AMQP 0.9.1 Exchange

## Configuring with Environment Variables

This program uses a number of environment variables for configuration.  These are listed below.  The app will load these values from a .env file if present.

### Values

- AMQP_CONN=amqp://(user):(pass)@(amqp server)
- AMQP_EXCHANGE=(amqp exchange name)
- AMQP_REALTIME_ROUTINGKEY=(amqp routing key)
- AMQP_DEVICES_ROUTINGKEY=(amqp routing key)
- AMQP_MONITORINFO_ROUTINGKEY=(amqp routing key)
- SENSE_EMAIL=(Sense Email Address)
- SENSE_PASSWORD=(<)Sense Password)

### Example

- AMQP_CONN=amqp://user:pass@192.168.20.23
- AMQP_EXCHANGE=knightware.sense
- AMQP_REALTIME_ROUTINGKEY=actions.realtime
- AMQP_DEVICES_ROUTINGKEY=actions.devices
- AMQP_MONITORINFO_ROUTINGKEY=actions.monitorinfo
- SENSE_EMAIL=me@gmail.com
- SENSE_PASSWORD=SuperSecretPassword


