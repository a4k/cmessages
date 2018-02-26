var express = require('express');
var router = express.Router();


// Stars
router.get('/stars', function(req, res) {
	res.render('stars');
});

module.exports = router;