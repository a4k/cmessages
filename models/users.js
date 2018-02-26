var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var moment = require('moment');

// user schema
var UserSchema = mongoose.Schema({
	uid: {
		type: Number,
		index: true,
	},
	first_name: {
		type: String,
	},
	last_name: {
		type: String,
	},
	date: {
		type: String,
	},
	photo: {
		type: String,
	},
	email: {
		type: String,
	},
	username: {
		type: String,
	},
	password: {
		type: String,
	},
	mdate: {
		type: String,
	},
	status: {
		type: String,
	},
	last_activity: {
		type: String,
	},
});

var Users = module.exports = mongoose.model('Users', UserSchema);

// function create user
module.exports.createUser = function(newUser, callback){
	Users.getUserByUsername(newUser.username, function(err, user){
	   	if(err) throw err;
	   	if(user){
	   		return done(null, false, {message: 'Пользователь с таким логином уже зарегестрирован'});
	   	}
		bcrypt.genSalt(10, function(err, salt) {
			bcrypt.hash(newUser.password, salt, function(err, hash) {
				// Store hash in your password DB
				newUser.password = hash;
				newUser.save(callback);
			});
		})

   });
}


// ged count of Users
module.exports.getCountOfUsers = function(query = {}, callback) {
	Users.count(query, callback);
}

// get user by email
module.exports.getUserByEmail = function(email, callback) {
	var query = {email: email};
	Users.findOne(query, callback);
}

// get user by username
module.exports.getUserByUsername = function(username, callback) {
	var query = {username: username};
	Users.findOne(query, callback);
}

// get user by username
module.exports.getProfileByUsername = function(username, callback) {
	var query = {username: username};
	Users.findOne(query, 'uid username first_name last_name photo date mdate status last_activity', callback);
}

// Get Users by usernames
module.exports.getUsers = function(users, callback) {
	let dusers = [];

  // Query the db, using OR
  Users.find({},'uid username first_name last_name photo status last_activity').or(users).exec(callback);

};

// get user by id
module.exports.getUserById = function(id, callback) {
	Users.findById(id, callback);
}

// compare password
module.exports.comparePassword = function(password, password_hash, callback) {
	bcrypt.compare(password, password_hash, function(err, isMatch){
		if(err) throw err;
		callback(null, isMatch);
	})
}

// user online
module.exports.setOnline = function(username, callback) {
	if(username) {
		Users.getUserByUsername(username, function(err, user) {
			if(err) throw err;
			user.set({status: 1}); // status - 1, online
			user.save(callback);

		});
		
	}
}
// user offline
module.exports.setOffline = function(username, callback) {
	if(username) {
		Users.getUserByUsername(username, function(err, user) {
			if(err) throw err;
			user.set({status: 0, last_activity: moment()}); // status - 0, offline
			user.save(callback);

		});
		
	}
}