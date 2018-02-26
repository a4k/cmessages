var express = require('express');
var router = express.Router();


// Get HomePage
router.get('/', ensureAuthenticated, function(req, res) {
	res.render('index');
});

// check user is logged in
function ensureAuthenticated(req, res, next) {
	if(req.isAuthenticated()) {
		// if user is logged in
		res.redirect('/dialogs')
	} else {
		// user is not logged in
		return next();
	}
}

module.exports = router;