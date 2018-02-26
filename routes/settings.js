var express = require('express');
var router = express.Router();


// Settings
router.get('/settings', function(req, res) {
	res.render('settings');
});

module.exports = router;