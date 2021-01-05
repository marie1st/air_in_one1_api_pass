const {mqtt, MAC_ADDRESS_LENGTH} = require('../../mqtt');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function _mqttControl(MQTT, device_id, control_key) {
  return new Promise((resolve, reject) => {
    const message = device_id + control_key;
    MQTT.client.publish("/query/device/" + device_id + "/app/123456789011",'(' + message + MQTT.convertLRF(message) + ')', function (err) {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  });
}

async function mqttControl(MQTT, device_id, field, value) {
  switch (field) {
    case 'device_fan_speed':  return await _mqttControl(MQTT, device_id, '000001040101000' + value);
    case 'device_mode':       return await _mqttControl(MQTT, device_id, '000001080101000' + value);
    case 'device_status':     return await _mqttControl(MQTT, device_id, '000001020101000' + value);
    case 'device_swing_mode': return await _mqttControl(MQTT, device_id, '000001070101000' + value);
    case 'device_temp':
      value = parseInt(value);
      let sent_temp = (value-15) * 2;
      return await _mqttControl(MQTT, device_id, '00000105010100' + sent_temp.toString(16).toUpperCase().padStart(2, '0'));
      /*switch (value) {
        case 16: return await _mqttControl(MQTT, device_id, '0000010501010003'); // 3 -> floor(3/2) = 1 is also 16
        case 17: return await _mqttControl(MQTT, device_id, '0000010501010005');
        case 18: return await _mqttControl(MQTT, device_id, '0000010501010007');
        case 19: return await _mqttControl(MQTT, device_id, '0000010501010009');
        case 20: return await _mqttControl(MQTT, device_id, '000001050101000A');
        case 21: return await _mqttControl(MQTT, device_id, '000001050101000C');
        case 22: return await _mqttControl(MQTT, device_id, '000001050101000E');
        case 23: return await _mqttControl(MQTT, device_id, '0000010501010011');
        case 24: return await _mqttControl(MQTT, device_id, '0000010501010013');
        case 25: return await _mqttControl(MQTT, device_id, '0000010501010015');
        case 26: return await _mqttControl(MQTT, device_id, '0000010501010017');
        case 27: return await _mqttControl(MQTT, device_id, '0000010501010019');
        case 28: return await _mqttControl(MQTT, device_id, '000001050101001B');
        case 29: return await _mqttControl(MQTT, device_id, '000001050101001D');
        case 30: return await _mqttControl(MQTT, device_id, '000001050101001E');
        default: throw new Error("Not supported ("+field+", "+value+")")
      }*/

    case 'device_is_locked_remote':
    case 'device_is_locked_temp':
      return true;

    default: throw new Error("Not supported ("+field+", "+value+")")
  }
}

async function control(row) {
  // console.log(row.change_field, row.change_value)
  let MQTT = await mqtt.$(row.data);

  for(var _ = 0; _ < 2; _++) { // Repeat 2 times (Daikin may randomly bug)
    await mqttControl(MQTT, row.device_iot_id, row.change_field, row.change_value)
  }
  
  console.log("SUCCESS", row.device_iot_id, row.change_field, row.change_value)

  await wait(1500);
}

// Guarantee that will never call twice for each device_id
// Return: function that check whether topic is accepted
function startListenBoardcast(row) {
  return new Promise(async (resolve, reject) => {
    let MQTT = await mqtt.$(row.data);

    let topic = '/broadcast/device/' + row.device_iot_id + '/'

    MQTT.client.subscribe(topic + '#', function (err) {
      if (!err) {
        resolve(topic => topic.startsWith(topic))
      } else {
        reject(err)
      }
    })
  })
}

/**
 * Return: device_control_air object (only some field)
 * 
 *  5CCF7F365745 FFFF 
 *  02 
 *  00 15 1500 
 *  [0] VERSION: 02 
 *  [1] UNKNOW: 85 
 *  [2] ON/OFF: 01 
 *  [3] LOCK: 00 
 *  [4] FAN SPEED: 03 
 *  [5] TEMP: 18 (device_temp = floor(TEMP / 2) + 15)
 *  [6] ERROR: 00 
 *  [7] SWING: 00 
 *  [8] MODE: 01 
 *  [9] ROOM TEMP LO: 0E 
 *  [10] ROOM TEMP HI: 01 
 *  [11] AMBIENT TEMP: 00 
 *  [12] ERROR ALERT: 00 
 *  [13] RSSI: 00
 *  0000000000002B7C
 */
async function onBoardcast(row, topic, message) {
  message = message.slice(1, -1)
  message = message.slice(MAC_ADDRESS_LENGTH + 4 + 2);
  
  let start_reg = parseInt(message.substr(0, 2), 16);
  let reg_length = parseInt(message.substr(2, 2), 16);

  message = message.slice(8);

  let reg_mapper = {
    2: "device_status",
    4: "device_fan_speed",
    5: "device_temp",
    6: "$$$error",
    7: "device_swing_mode",
    8: "device_mode",
  };

  let res = {}

  for(let regi = start_reg; regi < start_reg + reg_length ; regi++) {
    let regdata = parseInt(message.substr(0, 2), 16)
    message = message.slice(2)

    if (reg_mapper[regi]) {
      res[reg_mapper[regi]] = regdata;
    }
  }

  // Fix individual properties
  if (res.device_fan_speed) {
    switch (res.device_fan_speed) {
      case 0x0A: res.device_fan_speed = 'A'; break;
      case 0x0B: res.device_fan_speed = 'B'; break;
      case 0x0C: res.device_fan_speed = 'C'; break;
      case 0x0D: res.device_fan_speed = 'D'; break;
      case 0x0E: res.device_fan_speed = 'E'; break;
      case 0x0F: res.device_fan_speed = 'F'; break;
      default: res.device_fan_speed = res.device_fan_speed.toString(); break;
    }
  }

  if (res.device_temp) {
    res.device_temp = Math.floor(res.device_temp / 2) + 15
  }

  return res;
}

module.exports = {control, startListenBoardcast, onBoardcast}