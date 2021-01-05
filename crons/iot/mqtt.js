var mqtt = require('mqtt');

class MQTTClient {
  constructor(device) {
    this.device = device;
    this.ready = false;
    this.connectError = false;
    this.onBoardcast = require('./index').onBoardcast; // Prevent circular import

    this._buildClient();
  }

  _buildClient() {
    const device = this.device;

    // Build client
    this.client = mqtt.connect("mqtt://"+device.device_mqtt_hostname, {
      port: device.device_mqtt_port || 1883,
      host: device.device_mqtt_hostname,
      ...(device.device_mqtt_username ? {username: device.device_mqtt_username} : {}),
      ...(device.device_mqtt_password ? {password: device.device_mqtt_password} : {}),
    })

    this.connectPromise = new Promise((resolve, reject) => {
      this.client.on('connect', (data) => {
        console.log('MQTT connection success', [device.device_mqtt_hostname, device.device_mqtt_port, device.device_mqtt_username, device.device_mqtt_password]);
        resolve(this)
      });

      setTimeout(()=>{
        if (!this.ready) {
          console.error('XXX MQTT connection FAILED XXX', [device.device_mqtt_hostname, device.device_mqtt_port, device.device_mqtt_username, device.device_mqtt_password]);
          reject(new Error("MQTT connection Failed"));
        }
      }, 3000)
    });

    this.connectPromise.then(x => this.ready = true).catch(x => this.connectError = true);

    this.client.on('message', (topic, message) => {
      // message is Buffer
      console.log('['+device.device_mqtt_hostname+']', topic, ':', message.toString())
      this.onBoardcast(topic, message.toString())
    })
  }

  async waitForConnect(retryCount = 0) {
    if (this.ready) return this;
    if (this.connectError) {
      this.connectError = false;
      this._buildClient();
      if (retryCount >= 3) throw new Error("MQTT connection Failed")
      return waitForConnect(retryCount+1);
    }

    return await this.connectPromise;
  }

  convertLRF(sBuf) {
    var nBuf = 0;
    var i = 0;
    for (i = 0; i < sBuf.length; i = i + 2) {
      nBuf = nBuf + parseInt(sBuf.substring(i, 2 + i), 16);
    }
    nBuf = ((nBuf ^ 0xff) + 1) & 0xff;
    sBuf = (0 + nBuf.toString(16).toUpperCase()).slice(-2);
    return sBuf;
  }
}

class MQTT {
  constructor() {
    this.clients = {};
  }

  async $(device) {
    let key = [device.device_mqtt_hostname, device.device_mqtt_port, device.device_mqtt_username, device.device_mqtt_password]
    if (this.clients[key]) return await this.clients[key].waitForConnect();
    this.clients[key] = new MQTTClient(device);
    return await this.clients[key].waitForConnect();
  }
}

module.exports = {mqtt: new MQTT(), MQTT, MQTTClient, MAC_ADDRESS_LENGTH: 12}
