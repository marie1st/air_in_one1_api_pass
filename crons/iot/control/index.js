const device_control_air = require('./device_control_air')

function router(row) {
  switch (row.change_entity) {
    case 'device_control_air': return device_control_air;
    default: throw new Error("Not supported");
  }
}

// ======== DON'T TOUCH THESE FUNCTIONS BELOW ========
async function performControl(row) {
  return await router(row).control(row);
}

async function performStartListenBoardcast(row) {
  return await router(row).startListenBoardcast(row);
}

async function performOnBoardcast(row, topic, message) {
  // console.log("perform boardcast start")
  return await router(row).onBoardcast(row, topic, message);
}

async function lockMask(row) {
  return await router(row).lockMask(row);
}

module.exports = { performControl, performStartListenBoardcast, performOnBoardcast, lockMask };