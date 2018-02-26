var express = require('express');
var router = express.Router();


// Messages
router.get('/messages', function(req, res) {
	res.render('messages');
});

module.exports = router;