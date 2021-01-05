var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({ user: 'john wich', pet: 'dog' });
});

module.exports = router;
