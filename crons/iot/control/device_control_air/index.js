const daikin_split_type = require('./daikin_split_type')
const tcp = require('./tcp')

function router(row) {
  if (row.device_iot_id.startsWith("tcp/")) {
    return tcp;
  }

  return daikin_split_type;
}

// ======== DON'T TOUCH THESE FUNCTIONS BELOW ========
async function control(row) {
  return await router(row).control(row);
}

async function startListenBoardcast(row) {
  return await router(row).startListenBoardcast(row);
}

async function onBoardcast(row, topic, message) {
  return await router(row).onBoardcast(row, topic, message);
}

async function lockMask(row) {
  // console.log(row.data)

  switch (row.data.device_is_locked_remote) {
    case 'U': return {};

    case 'S': return {
      "device_fan_speed": null,
      "device_temp": row.data.device_is_locked_temp > 0 ? row.data.device_is_locked_temp : null,
      "device_swing_mode": null,
      "device_mode": null,
    };

    case 'L': return {
      "device_status": null,
      "device_fan_speed": null,
      "device_temp": row.data.device_is_locked_temp > 0 ? row.data.device_is_locked_temp : null,
      "device_swing_mode": null,
      "device_mode": null,
    };

    default:
      if (row.data.device_is_locked_temp != 0) {
        return { device_temp: row.data.device_is_locked_temp > 0 ? row.data.device_is_locked_temp : null };
      }

      return {}
  }
}

module.exports = { control, startListenBoardcast, onBoardcast, lockMask };