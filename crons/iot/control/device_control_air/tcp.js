const {mqtt, MAC_ADDRESS_LENGTH} = require('../../mqtt');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function mqttControl(MQTT, row) {
  return new Promise((resolve, reject) => {
    MQTT.client.publish('/airinone_tcp/query/device/' + row.device_type_id + '/' + row.data.device_air_type_id + '/' + row.device_iot_id, JSON.stringify(row), function (err) {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  });
}


async function control(row) {
  // console.log(row.change_field, row.change_value)
  let MQTT = await mqtt.$(row.data);

  await mqttControl(MQTT, row);
  
  console.log("SUCCESS", row.device_iot_id, row.change_field, row.change_value)

  await wait(1000);
}

// Guarantee that will never call twice for each device_id
// Return: function that check whether topic is accepted
function startListenBoardcast(row) {
  return new Promise(async (resolve, reject) => {
    let MQTT = await mqtt.$(row.data);

    let topic = '/airinone_tcp/broadcast/device/' + row.device_type_id + '/' + row.data.device_air_type_id + '/' + row.device_iot_id + '/'

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