const {db} = require("../../database");
const { performControl, performStartListenBoardcast, performOnBoardcast, lockMask } = require("./control");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const { v4: uuidv4 } = require('uuid');
const { calculateDelay } = require("./delay");

let SAFETY_LOCK = false;

function setIotPollingSafetyLock(lock) {
  SAFETY_LOCK = lock;
}

let queue_round = 0;
let queue_running = 0;

// TODO: Declare all change_entity
let CONTROL_ENTITY_NAMES = ['device_control_air']

function make_new_control_entity_dict() {
  let res = {}
  for(let key of CONTROL_ENTITY_NAMES) {
    res[key] = {};
  }

  return res
}

// This is data queue for prevent "Data Hazard"
let queue = make_new_control_entity_dict()

// This is queue for make control same device in sequence
// control_queue.device_control_air[device_iot_id] = [row, ...]
let control_queue = make_new_control_entity_dict()

// This hold data sync with iot
// control_entity_data.device_control_air[device_iot_id] = {...}
let control_entity_data = make_new_control_entity_dict()
let real_control_entity_data = make_new_control_entity_dict()

// boardcast_metadata.device_control_air[device_iot_id] = { boardcast_topic_checker: <function>, }
let boardcast_metadata = make_new_control_entity_dict()

function enqueue(row) {
  if (!queue[row.change_entity]) queue[row.change_entity] = {}
  if (!queue[row.change_entity][row.device_id]) queue[row.change_entity][row.device_id] = {}
  queue[row.change_entity][row.device_id][row.change_field] = row;
  queue[row.change_entity][row.device_id][row.change_field].queue_round = queue_round;
}

function getQueueRow(row) {
  if (!queue[row.change_entity]) return null;
  if (!queue[row.change_entity][row.device_id]) return null;
  if (!queue[row.change_entity][row.device_id][row.change_field]) return null;

  return queue[row.change_entity][row.device_id][row.change_field]
}

function isQueueRowNextRound(row) {
  let qrow = getQueueRow(row);

  if (!qrow) return true;

  return qrow.iot_status !== 'pending' && qrow.iot_status !== 'processing';
}

function updateIotStatusInDatabase(row, connection = db) {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE device_history SET iot_status = ? ${row.iot_message ? ",iot_message = ?" : ""} WHERE id = ?`, 
      row.iot_message ? [row.iot_status, row.iot_message, row.id] : [row.iot_status, row.id],
      function(err, results) {
        if (err) {
          return reject(err);
        }

        return resolve(results)
      }
    )
  });
}

function getLastDeviceHistory(control_entity, device_iot_id) {
  // prevent sql injection
  if (CONTROL_ENTITY_NAMES.indexOf(control_entity) == -1) throw new Error("SQL Injection");

  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM device_history WHERE change_entity = ? AND device_iot_id = ? ORDER BY id DESC LIMIT 1;", [control_entity, device_iot_id], async (err, rows, fields) => {
      if (err) {
        console.error(err)
        return reject(err)
      }

      if (rows.length > 0) {
        db.query("SELECT * FROM " + control_entity + " WHERE device_iot_id = ? ORDER BY id DESC LIMIT 1;", [device_iot_id], async (err, controlDataRows, fields) => {
          if (err) {
            console.error(err)
            return reject(err)
          }
    
          if (controlDataRows.length > 0) {
            rows[0].data = controlDataRows[0];
            return resolve(rows[0])
          } else {
            return reject(new Error("No data"))
          }
        });
      } else {
        return reject(new Error("No data"))
      }
    });
  })
}

function getSingleDeviceControlData(control_entity, device_iot_id) {
  // prevent sql injection
  if (CONTROL_ENTITY_NAMES.indexOf(control_entity) == -1) throw new Error("SQL Injection");

  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM " + control_entity + " WHERE device_iot_id = ?", [device_iot_id], async (err, rows, fields) => {
      if (err) {
        console.error(err)
        return reject(err)
      }

      if (rows.length > 0) {
        return resolve(rows[0])
      } else {
        return reject(new Error("No data"))
      }
    });
  })
}

function updateDeviceControlData(control_entity, device_iot_id, change_data, change_agent_type) {
  // prevent sql injection
  if (CONTROL_ENTITY_NAMES.indexOf(control_entity) == -1) throw new Error("SQL Injection");

  let change_entries = Object.entries(change_data);

  return new Promise((resolve, reject) => {
    db.query(
      `UPDATE ${control_entity} SET
        ${change_entries.map(x => x[0] + ' = ?,').join('\n')}
        change_agent_type = ?,
        change_agent_guid = ?,
        change_agent_scope_type = 'device',
        change_agent_scope_id = device_id
      WHERE device_iot_id = ?`, 
      [...change_entries.map(x => x[1]), change_agent_type, uuidv4(), device_iot_id],
      function(err, results) {
        if (err) {
          return reject(err);
        }

        return resolve(results)
      }
    )
  });
}

async function afterOnBoardcast(row, result, lock_mask) {
  console.log("DECODE SUCCESS", row.change_entity, row.device_iot_id)
  console.log(result)

  // ============== FILTER $ fields ==============
  let error_status = 0;
  if (result.$$$error) {
    error_status = result.$$$error;
    delete result.$$$error;
  }

  // ============== Sync with db iteration 1 ==============
  let current_data = control_entity_data[row.change_entity][row.device_iot_id];
  let change_data = {}

  for(let key in result) {
    if (key.startsWith('$')) continue;

    if (current_data[key] != result[key]) {
      change_data[key] = result[key];
    }
  }

  // IN REAL WE IGNORE LOCKING EFFECT
  for (let key in change_data) {
    real_control_entity_data[row.change_entity][row.device_iot_id][key] = change_data[key]
  }

  await updateDeviceControlData(row.change_entity, row.device_iot_id, change_data, 'iot')

  // ============== LOCKING SYSTEM ==============
  change_data = {}
  // console.log(lock_mask)
  for(let key in result) {
    if (key.startsWith('$')) continue;

    if (!(key in lock_mask)) {
      if (current_data[key] != result[key]) {
        change_data[key] = result[key];
      }
    } else {
      if (lock_mask[key] === null) {
        if (current_data[key] != result[key]) {
          change_data[key] = current_data[key];
        }
      } else {
        if (current_data[key] != lock_mask[key]) {
          change_data[key] = lock_mask[key]
        }
      }
    }
  }

  await updateDeviceControlData(row.change_entity, row.device_iot_id, change_data, 'iot_locking')

  // ============== UPDATE CURRENT DATA ==============
  for (let key in change_data) {
    current_data[key] = change_data[key]
  }
  
}

async function onBoardcast(topic, message) {
  if (SAFETY_LOCK) return;

  for (let control_entity in boardcast_metadata) {
    for (let device_iot_id in boardcast_metadata[control_entity]) {
      if (boardcast_metadata[control_entity][device_iot_id].boardcast_topic_checker(topic)) {
        let row = await getLastDeviceHistory(control_entity, device_iot_id);
        let lock_mask = await lockMask(row);
        let result = await performOnBoardcast(row, topic, message)
        return await afterOnBoardcast(row, result, lock_mask);
      }
    }
  }
}

// Guarantee that will never call twice for each device_id
async function startListenBoardcast(row) {
  real_control_entity_data[row.change_entity][row.device_iot_id] = 
    control_entity_data[row.change_entity][row.device_iot_id] = 
    await getSingleDeviceControlData(row.change_entity, row.device_iot_id)

  if (!boardcast_metadata[row.change_entity][row.device_iot_id]) boardcast_metadata[row.change_entity][row.device_iot_id] = {};
  return boardcast_metadata[row.change_entity][row.device_iot_id].boardcast_topic_checker = await performStartListenBoardcast(row);
}

async function deprecateRow(row, connection) {
  row.iot_status = 'deprecated';
  console.log('deprecate', row.change_field, row.change_value);
  await updateIotStatusInDatabase(row, connection)
}

async function markProcessing(row) {
  row.iot_status = 'processing';
  await updateIotStatusInDatabase(row)
}

async function processRow(row) {
  await wait(await calculateDelay(row));

  try {
    let message = await performControl(row)
    row.iot_status = 'success';
    row.iot_message = getResponseMessage(message);
    await updateIotStatusInDatabase(row)
  } catch (err) {
    console.error(err)
    row.iot_status = 'error_'+(row.iot_error_count + 1);
    row.iot_message = getResponseMessage(err);
    await updateIotStatusInDatabase(row)
  }
}

function assignControlIndexToRows(rows) {
  let indexs = {}; //indexs[device_type_id] = index

  for (let row of rows) {
    let device_type_id = row.device_type_id;
    if (!indexs[device_type_id]) indexs[device_type_id] = 0;

    row.$controlIndex = indexs[device_type_id]++;
  }

  for (let row of rows) {
    row.$controlTotal = indexs[row.device_type_id];
  }

  return rows;
}

async function fetchData() {
  if (SAFETY_LOCK) return;
  if (Date.now() - queue_running < 5000) return;

  // console.log("Start iot fetch")
  queue_round++;
  queue_running = Date.now();

  db.query("UPDATE device_history SET iot_status = 'deprecated' WHERE change_agent_type = 'iot'")

  db.query("SELECT * FROM device_history WHERE iot_status IN ('pending', 'error_1', 'error_2') AND change_agent_type != 'iot' ORDER BY priority DESC, id;", async (err, rows, fields) => {
    if (err) {
      console.error(err)
      queue_running = 0;
      return;
    }

    // console.log(rows);

    db.getConnection(function(err, connection) {
      if (err) {
        queue_running = 0;
        return;
      }

      connection.beginTransaction(async function(err) {
        if (err) { //Transaction Error (Rollback and release connection)
          queue_running = 0;
          connection.rollback(function() {
            connection.release();
          });
        } else {

          try {
            rows = assignControlIndexToRows(rows);

            for(let row of rows) {
              console.log("query", row.change_field, row.change_value)

              let qrow = getQueueRow(row);
        
              switch (row.status) {
                case 'pending': row.iot_error_count = 0;
                case 'error_1': row.iot_error_count = 1;
                case 'error_2': row.iot_error_count = 2;
                default: row.iot_error_count = 3;
              }
              
              if (!qrow || qrow.queue_round < queue_round) {
                if (isQueueRowNextRound(row)) enqueue(row);
              } else {
                await deprecateRow(qrow, connection)
                enqueue(row);
              }
            }

            connection.commit(function(err) {
              if (err) {
                connection.rollback(function() {
                  connection.release();
                });
              } else {
                connection.release();
              }
            });
      
            let promises = []
            // let markProcessingPromises = [];
        
            for(let row of rows) {
              let qrow = getQueueRow(row);
              if (qrow.id == row.id) {
                //promises.push(processRow(qrow));

                await markProcessing(row);

                // ============ LOCKING SYSTEM ============
                let lock_mask = await lockMask(qrow);

                // JUST FOR LOCKING, FOR REAL VALUE USE real_control_entity_data
                function update_control_entity_data() {
                  // console.log("Update")
                  if (qrow.change_field in lock_mask) {
                    control_entity_data[qrow.change_entity][qrow.device_iot_id][qrow.change_field] = qrow.data[qrow.change_field]
                  }
                }

                // ============ START LISTEN BOARDCAST ============
                if (!boardcast_metadata[qrow.change_entity][qrow.device_iot_id] || !boardcast_metadata[qrow.change_entity][qrow.device_iot_id].boardcast_topic_checker) {
                  startListenBoardcast(qrow) // Do it async !
                    .then(res => {
                      console.log('LISTEN', qrow.change_entity, qrow.device_iot_id)
                      update_control_entity_data();
                    })
                    .catch(err => console.error(err))
                } else {
                  update_control_entity_data();
                }

                // ============ CONTROL ============
                let cqueue = control_queue[qrow.change_entity];
                if (!cqueue[qrow.device_iot_id]) {
                  cqueue[qrow.device_iot_id] = [];
                  cqueue[qrow.device_iot_id].last_control = Date.now();
                }

                function shift_cqueue() {
                  cqueue[qrow.device_iot_id].shift();
                  if (cqueue[qrow.device_iot_id].length == 0) {
                    cqueue[qrow.device_iot_id].last_control = Date.now();
                  }
                }

                let real_data = real_control_entity_data[qrow.change_entity] && 
                  real_control_entity_data[qrow.change_entity][qrow.device_iot_id];

                // console.log(real_data.device_status)

                if (qrow.change_field == "device_status" || qrow.change_field == "device_is_locked_remote" || (real_data && real_data.device_status == 1)) {
                  let promise;

                  if (cqueue[qrow.device_iot_id].length > 0) {
                    console.log("LENGTH > 0")

                    promise = new Promise((resolve, reject) => {
                      cqueue[qrow.device_iot_id][cqueue[qrow.device_iot_id].length-1]
                        .then(() => processRow(qrow).then(resolve).catch(reject))
                        .catch(() => processRow(qrow).then(resolve).catch(reject))
                    });
                  } else {
                    promise = processRow(qrow);
                  }

                  if (promise) {
                    promise.then(shift_cqueue).catch(shift_cqueue)
                    if (process.env.MOCK_MODE == 1) promise.then(() => setTimeout(()=> real_control_entity_data[qrow.change_entity][qrow.device_iot_id][qrow.change_field] = qrow.data[qrow.change_field], 1500))

                    cqueue[qrow.device_iot_id].push(promise)
                    promises.push(promise)
                  }
                } else {
                  // IF NOT READY TO CONTROL REVERT STATUS TO PENDING
                  qrow.iot_status = 'pending';
                  await updateIotStatusInDatabase(qrow)
                }
              }
            }
        
            // await Promise.all(promises);

            queue_running = 0;
          } catch (err) {
            console.error(err);

            queue_running = 0;

            connection.rollback(function() {
              connection.release();
            });
          }

        }
      })
    })
  })
}

function registerIOTCron() {
  setInterval(fetchData, 1000);
  //fetchData()
}

async function init() {
  async function init_listen(control_entity) {
    async function listen_single(record) {
      let row = await getLastDeviceHistory(control_entity, record.device_iot_id);
      let listenResult = await startListenBoardcast(row)
      console.log('LISTEN', row.change_entity, row.device_iot_id)
    }

    db.query("SELECT * FROM "+control_entity, async (err, rows, fields) => {
      for (let row of rows) {
        listen_single(row)
      }
    });
  }

  init_listen("device_control_air")
}
console.log("INIT")
init();

function getResponseMessage(err) {
  if (typeof err === "string") return err;
  if (typeof err === "undefined") return "";
  
  if (err.message) return err.message;
  
  return JSON.stringify(err)
}

module.exports = {registerIOTCron, setIotPollingSafetyLock, onBoardcast}