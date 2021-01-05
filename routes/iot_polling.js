var express = require('express');
var router = express.Router();

const {setIotPollingSafetyLock} = require('../crons/iot/index')

/* GET home page. */
router.get('/safety/lock/MVIYJCUVYIIKDYIT', function(req, res, next) {
  setIotPollingSafetyLock(true)
  res.send('Lock success')
});

router.get('/safety/unlock/MVIYJCUVYIIKDYIT', function(req, res, next) {
  setIotPollingSafetyLock(false)
  res.send('Unlock success')
});

module.exports = router;
