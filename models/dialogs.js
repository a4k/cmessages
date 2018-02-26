var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');



// Dialog schema
var DialogSchema = mongoose.Schema({
	did: {
		type: Number,
		index: true,
	},
	usernames: {
		type: Array,
	},
	type: {
		type: String, // one, group
	},
	name: {
		type: String,
	},
	song_is: {
		type: String, // true, false
	},
	photo: {
		type: String,
	},
	mdate: {
		type: String, // moment date
	}
});

var Dialogs = module.exports = mongoose.model('Dialogs', DialogSchema);

// function create Dialog
module.exports.createDialog = function(newDialog, callback){
	newDialog.save(callback);
}

// get Dialog by Dialogname
module.exports.getDialogByUsername = function(username, callback) {
	let query = {usernames: username};
	Dialogs.findOne(query, callback);
}

// ged count of Dialogs
module.exports.getCountOfDialogs = function(query = {}, callback) {
	Dialogs.count(query, callback);
}

// find dialog
module.exports.findDialog = function(query, callback) {
	if(query) {
		Dialogs.findOne(query, callback);
	}

};

/** [isDialogExist]
	* Check if dialog is exist by usernames
	* @usernames array
 */
module.exports.isDialogExist = function(usernames, type, callback) {
	let dialog;
	// Dialogs.findOne({type: type}, 'usernames did mdate type', {and: usernames}, callback);
	Dialogs.find({type: type}, 'did mdate type').and(usernames).limit(1).exec(callback);
}

// Create a static getDialogs method to return dialog data from the db
module.exports.getDialogs = function(page, username, callback) {

  let dialogs = [], limit = 10,
      start = (page * limit);

  // Query the db, using skip and limit to achieve page chunks
  Dialogs.find({usernames: username},'usernames did mdate type song_is',{skip: start, limit: limit}).sort({mdate: -1}).exec(function(err,msg){

    // If everything is cool...
    if(!err) {
      dialogs = msg;  // We got dialogs
    }
    dialogs.reverse();

    // Pass them back to the specified callback
    callback(dialogs);

  });

};

// get Dialog by id
module.exports.getDialogById = function(id, callback) {
	Dialogs.findById(id, callback);
}
