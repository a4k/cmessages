/*
Name - app.js
Description - server application, sync with frontend.
Use library : Socket, Mongo, Body-parser
Database : MongoDB
Author - Brovkovich Nikita
Date start - 01/2018
 */

var options = {
	// 'log level' : 0
}, user = false;


// Add modules in app
var express = require('express'), // add module express
	fs = require('fs'),
	path = require('path'),
	multiparty = require('multiparty'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	exphbs = require('express-handlebars'),
	expressValidator = require('express-validator'),
	flash = require('connect-flash'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	mongo = require('mongo'),
	mongoose = require('mongoose'),
	moment = require('moment'),
	multer = require('multer'),
	db;



// connect to MongoDB
mongoose.connect('mongodb://localhost/cmessages');
db = mongoose.connection;

// Our routes
var $pages = {
	routes: require('./routes/index'),
	users: require('./routes/users'),
	dialogs: require('./routes/dialogs'),
	messages: require('./routes/messages'),
	documents: require('./routes/documents'),
	stars: require('./routes/stars'),
	friends: require('./routes/friends'),
	settings: require('./routes/settings'),

}

// Mongo Collection-Models
var Users = require('./models/users'),
	Dialogs = require('./models/dialogs'),
	Messages = require('./models/messages'),
	Documents = require('./models/documents'),
	Stars = require('./models/stars'),
	Friends = require('./models/friends'),
	Settings = require('./models/settings');



// Init app
var app = express();
var port = process.env.PORT  || 3000;
var http = require('http');

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({'defaultLayout' : 'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
	secret : 'secret',
	saveUninitialized : true,
	resave : true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
	errorFormatter: function(param, msg, value){
		var namespace = param.split('.'),
			root = namespace.shift(),
			formParam = root;

		while(namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return {
			param : formParam,
			msg: msg,
			value: value
		}
	}
}));

// Connect Flash - For send only one message(session)
app.use(flash());

// Global Vars
app.use(function(req, res, next) {
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	res.locals.user = req.user || null;
	user = req.user; // user logged in
	next();
});

// Set Routes Pages
app.use('/', $pages.routes);
app.use('/users', $pages.users);
app.use('/dialogs', $pages.dialogs);
app.use('/documents', $pages.documents);
app.use('/settings', $pages.settings);
app.use('/friends', $pages.friends);

// Fire it up (start our server)
var server = http.createServer(app).listen(port, function() {
  console.log('Express server listening on port ' + port);
});

// Initialize socket.io
var io = require('socket.io').listen(server);

// users who in site and online
var users_socket = [], users_socket2 = [];

// start work with socket.io
io.on('connection', function(socket) {
	// user connected
	if(user) {
		// if user find
		isConsole('connected ' + user.username);
		socket.username = user.username;
		if(users_socket.indexOf(socket.username) > -1) {
			// fined
		} 
		else {
			// no fined
			users_socket.push(socket.username);
			users_socket2.push(socket);
		}
		Users.setOnline(socket.username, function(err, user) {
			if(err) throw err;
			// user online
		});
		socket.emit('connectUser', socket.username); // send username to socket

		/** [getDialogs]
			* Get dialogs by socket.username
			* @param {page} Integer [page of dialogs 0-...]
			* Return Array Dialogs
		 */
		socket.on('getDialogs', function(page){
			// user want view dialogs
			Dialogs.getDialogs(page, socket.username, function(dialogs, pages){
				// send dialogs to user
		   		// socket.emit('getDialogs', dialogs);

				let d = dialogs.map(function(dialog) {
					// get usernames in dialog
					return new Promise((resolve, reject) => {
						Promise.all(dialog.usernames.map(function(username) {
							return {'username' : username};
						})).then((users) => {
					  		resolve(users); // send array usernames for query
					  	});
					}).then((users) => {
						// query usernames in database
						return new Promise((resolve2, reject2) => {
							Users.getUsers(users, function(err, users) {
								// users who in dialog
								if(err) throw err;
						  		resolve2(users);
						  	})
						});
					}).then((users) => {
						// dialog
						dialog.users = users;
						return users;
					}).then((d) => {
						dialog.usernames = d;
						return dialog;
					});
				});

				// vers 2
				Promise.all(d).then(function(dialogs){
			   		socket.emit('getDialogs', dialogs);
					
				});


			});
		});


		/** [getDialogUsers]
		* Get information about users who in dialog
		* @param {did: integer, usernames: array}
		* Return {[array]} {did: integer, users: array}
		*/
		socket.on('getDialogUsers', function(msg) {
			let users = msg.usernames.map(function(username) {
				return {'username':username}
			});
			Users.getUsers(users, function(err, users) {
				if(err) throw err;
				// show users who in dialog
				socket.emit('getDialogUsers', {did: msg.did, users: users});
			});
		});

		/** [toDialog]
			* Jump to Dialog by id, Get Information about dialog and his users and messages
			* @param {did} Integer [Dialog id]
			* Return Array {did : Integer, users : Array, messages : Array}
		 */
		socket.on('toDialog', function(did) {
			// go to dialog page
			Dialogs.findDialog({did: did}, function(err, dialog) {
				if(err) throw err;
				// users from this dialog
				// get information about users who in dialog
				Promise.all(dialog.usernames.map((username) => {
					return {'username' : username}
				})).then((users) => {
					Users.getUsers(users, function(err, users) {
						if(err) throw err;
						// show users who in dialog
						Messages.getMessages(0,did, function(messages, pages){
							// show users who in dialog
							socket.emit('toDialog', {did: did, users: users, messages: messages});
						});
					});
					
				})
			})
		});

		/** [getDialog]
			* Get information about dialog and his messages and users
			* @param {did} Integer [Dialog id]
			* Return Array {did : Integer, users : Array, messages : Array}
		 */
		socket.on('getDialog', function(did) {
			// get dialog info
			Dialogs.findDialog({did: did}, function(err, dialog) {
				if(err) throw err;

				Promise.all(dialog.usernames.map(function(username) {
						return {'username' : username};
				})).then((users) => {
					// map function about usernames have performed
					Users.getUsers(users, function(err, users) {
						if(err) throw err;
						// get users who id dialog
						Messages.getMessages(0, did, function(messages, pages) {
							// show messages from dialog
							socket.emit('getDialog', {did: did, users: users, messages: messages});
						})
					})
				});
			})
		});

		/** [getLastMessage]
			* Get information about last message in dialog
			* @param {did} Integer [Dialog id]
			* Return Array of Message
		 */
		socket.on('getLastMessage', function(did){
			// user want view dialogs
			Messages.getLastMessage(did, function(message, pages){
				// send dialogs to user
		   		socket.emit('getLastMessage', message);
			})
		});

		/** [addnewMessage]
			* Add new Message in Database
			* @msg {username : .., body : ..} Array [Common information]
			* @username String [Username of recepient]
			* @body String [Text of message]
			* Return newMessage {did : .., message: ..}
		 */
		socket.on('addNewMessage', function(msg) {
			// user want add new message
			let did = msg.did, body = msg.body;

			// need check msg for hacks....

			// create message
			Messages.getCountOfMessages({}, function(err, count) {
				// count of Messages
				let mid = count+1; // "auto increment" id
				var newMessage = new Messages({
					mid: mid,
					did: did,
					read_state: 0,
					body: body,
					username: socket.username,
					mdate: moment()
				});

				Messages.createMessage(newMessage, function(err, message) {
					if(err) throw err;
					Dialogs.findDialog({did: did}, function(err, dialog) {
						dialog.usernames.map(function(username) {
							if(users_socket.indexOf(username) > -1) {
								// current user online
								users_socket2[users_socket.indexOf(username)].emit('newMessage', {did: did, message: message}); 
							}
						});
					});
					// io.to('dialog '+did).emit('newMessage', {did: did, message: message}); // send everyone who in this room Dialog Page
				});
				
			});
		});

/*
			new Promise(function(resolve, reject) {
				Promise.all(usernames.map(function(username) {
					return {'usernames' : username};
				})).then((users) => {
			  		resolve(users);
			  	});
			}).then((users) => {
 */

		/** [sendMessageToUser]
			* Send message to User, check if already created dialog and create message
			* @param {Array} [msg] {username: .., body: ..}
			* @param {String} [Username]
			* @param {String} [Body]
			* Return newMessage {did : .., message : ..}
		 */
		socket.on('sendMessageToUser', function(msg) {
			// check for exist dialog
			let usernames = [socket.username, msg.username];
			new Promise(function(resolve, reject) {
				Promise.all(usernames.map(function(username) {
					return {'usernames' : username};
				})).then((users) => {
			  		resolve(users);
			  	});
			}).then((users) => {
				// usernames for query and type of dialog(one, group)
				Dialogs.isDialogExist(users, 'one', function(err, dialog){
					// dialog is exist
					if(err) throw err;
					if(dialog.length) {
						dialog = dialog[0];
						Messages.getCountOfMessages({}, function(err, count) {
							// count of Messages
							let mid = count+1; // "auto increment" id
							var newMessage = new Messages({
								mid: mid,
								did: dialog.did,
								read_state: 0,
								body: msg.body,
								username: socket.username,
								mdate: moment()
							});

							// create message
							Messages.createMessage(newMessage, function(err, message) {
								if(err) throw err;
								usernames.map(function(username) {
									if(users_socket.indexOf(username) > -1) {
										// current user online
										socket.emit('sendMessageToUser', 'successful');
										users_socket2[users_socket.indexOf(username)].emit('newMessage', {did: dialog.did, message: message}); 
									}
								});
							});
						});
					}
					else {
						// no dialog
						Dialogs.getCountOfDialogs({}, function(err, count) {
							// count of dialogs
							let did = count+1; // "auto increment" id
							var newDialog = new Dialogs({
								did: did,
								usernames: usernames,
								type: 'one',
								song_is: 'true',
								mdate: moment()
							});

							// create dialog
							Dialogs.createDialog(newDialog, function(err, dialog) {
								if(err) throw err;
								// send message
								Messages.getCountOfMessages({}, function(err, count) {
									// count of Messages
									let mid = count+1; // "auto increment" id
									var newMessage = new Messages({
										mid: mid,
										did: did,
										read_state: 0,
										body: msg.body,
										username: socket.username,
										mdate: moment()
									});

									// create message
									Messages.createMessage(newMessage, function(err, message) {
										if(err) throw err;
										// notification users
										usernames.map(function(username) {
											if(users_socket.indexOf(username) > -1) {
												// current user online
												socket.emit('sendMessageToUser', 'successful');
												users_socket2[users_socket.indexOf(username)].emit('newMessage', {did: did, message: message}); 
											}
										});
									});
								});
							});
						
						});
					}
				});
			});
		});


		/** [readMessage]
			* User read this message
			* @param msg Array of {mid : .., did : ..}
			* @param {Integer} [Mid] [Message id]
			* @param {Integer} [Did] [Dialog id]
			* Return {Array} [{mid : Integer}] [Number message which readed]
		 */
		socket.on('readMessage', function(msg) {
			// user read message
			
			// control user have this dialog
			// and dialog have this message
			
			let mid = msg.mid, did = msg.did;
			
			Dialogs.findDialog({did: did}, function(err, dialog) {
				if(err) throw err;
				// users from this dialog
				// get information about users who in dialog
				let usernames = dialog.usernames;
				if(usernames.indexOf(socket.username) > -1) {
					// user have this dialog
					Messages.findMessage({mid: mid}, function(err, message) {
						if(err) throw err;
						if(message.did == did) {
							// message exist in dialog
							
							// set message read_state = 1
							if(message.read_state == 0 && message.username !== socket.username) {
								// message is not read
								Messages.readMessage(mid, function(err, message) {
									if(err) throw err;
									usernames.map(function(username) {
										if(users_socket.indexOf(username) > -1) {
											// current user online
											users_socket2[users_socket.indexOf(username)].emit('readMessage', {mid: message.mid}); 
										}
									});
								});
							}
						}
					});
				}
			})
		});

		socket.on('createDialog', function(search) {
			// user craete dialog
			let type, usernames = [socket.username];

			// need to check search var for hack...

			if(search.indexOf(',') > -1) {
				// group dialog
				type = 'group';
				search.split(',').map(function(uname) {
					usernames.push(uname);
				});
			}
			else {
				// one dialog
				type = 'one';
				usernames.push(search); // add username
			}

			Dialogs.getCountOfDialogs({}, function(err, count) {
				// count of dialogs
				let did = count+1; // "auto increment" id
				var newDialog = new Dialogs({
					did: did,
					usernames: usernames,
					type: type,
					song_is: 'true',
					mdate: moment()
				});

				Dialogs.createDialog(newDialog, function(err, dialog) {
					if(err) throw err;
					let users = Promise.all(usernames.map(function(username) {
						return {'username' : username};
					})
					).then(function() {
						Users.getUsers(users, function(err, users) {
						if(err) throw err;
							// show users who in dialog
							socket.emit('toDialog', {did: did, users: users, messages: []});
						});
					});
				});
				
			});
		});



	}

	socket.on('getProfile', function(msg) {
		// user get user profile by username
		Users.getProfileByUsername(msg, function(err, user) {
			if(err) throw err;
		   	if(user) {
		   		// user is exist
		   		socket.emit('getProfile', user);
		   	}

		});
	});

	socket.on('disconnect', function() {
		// user is disconnected
		isConsole('disconnected ' + socket.username);
		
		let index = users_socket2.indexOf(socket);
		if(index > -1) {
			// fined
			users_socket.splice(index, 1);
			users_socket2.splice(index, 1);
		} 
		Users.setOffline(socket.username, function(err, user) {
			if(err) throw err;
			// user offline
		});
	
	})
})





// other functions
function isConsole(a = 'test') {
	console.log(a);
}