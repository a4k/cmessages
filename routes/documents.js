var express = require('express');
var router = express.Router();


// Documents
router.get('/documents', function(req, res) {
	res.render('documents');
});

module.exports = router;