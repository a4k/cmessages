var express = require('express');
var router = express.Router();


// Friends
router.get('/friends', function(req, res) {
	res.render('friends');
});

module.exports = router;