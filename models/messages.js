var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');


// Dialog schema
var MessageSchema = mongoose.Schema({
	mid: {
		type: Number,
		index: true,
	},
	did: {
		type: Number,
	},
	username: {
		type: String,
	},
	body: {
		type: String,
	},
	attachments: {
		type: Array, 
	},
	read_state: {
		type: Number,
	},
	mdate: {
		type: String, // moment date
	}
});

var Messages = module.exports = mongoose.model('Messages', MessageSchema);

// function create Message
module.exports.createMessage = function(newMessage, callback){
	newMessage.save(callback);
}

// ged count of Messages
module.exports.getCountOfMessages = function(query = {}, callback) {
	Messages.count(query, callback);
}


// Create a static getMessages method to return Message data from the db
module.exports.getMessages = function(page, did, callback) {

  let messages = [], limit = 10,
      start = (page * limit);

  // Query the db, using skip and limit to achieve page chunks
  Messages.find({did: did},'mid did username body attachments read_state mdate',{skip: start, limit: limit}).sort({mdate: -1}).exec(function(err,msg){

    // If everything is cool...
    if(!err) {
      messages = msg;  // We got Messages
    }
    messages.reverse();

    // Pass them back to the specified callback
    callback(messages);

  });

};

// get last message from dialog
module.exports.getLastMessage = function(did, callback) {

  let message;

  // Query the db, using skip and limit to achieve page chunks
  Messages.findOne({did: did},'mid did username body attachments read_state mdate',{limit: 1}).sort({mdate: -1}).exec(function(err,msg){

    // If everything is cool...
    if(!err) {
      message = msg;  // We got Message
    }

    // Pass them back to the specified callback
    callback(message);

  });

};

// get Message by id
module.exports.getMessageById = function(id, callback) {
	Messages.findById(id, callback);
}

// find message
module.exports.findMessage = function(query, callback) {
	if(query) {
		Messages.findOne(query, callback);
	}
}

// read message
module.exports.readMessage = function(mid, callback) {
	Messages.findMessage({mid: mid}, function(err, message) {
		if(err) throw err;
		message.set({read_state: 1}); // read state = 1, read
		message.save(callback);

	});
}
