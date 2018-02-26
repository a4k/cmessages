var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var moment = require('moment');


var Users = require('../models/users');




// Register
router.get('/register', function(req, res) {
	res.render('register');
});
// Login
router.get('/login', function(req, res) {
	res.render('login');
});

// Profile
router.get('/:username', function(req, res) {
	res.render('profile');
});

// Register User
router.post('/register', function(req, res) {
	var first_name = req.body.first_name,
		last_name = req.body.last_name,
		date = req.body.date,
		email = req.body.email,
		username = req.body.username,
		password = req.body.password;


	// Valid
	req.checkBody('first_name', 'Имя обязательно').notEmpty();
	req.checkBody('last_name', 'Фамилия обязательна').notEmpty();
	req.checkBody('date', 'Дата рождения обязательна').notEmpty();
	req.checkBody('email', 'Email обязательно').notEmpty();
	req.checkBody('email', 'Email неправильно заполнен').isEmail();
	req.checkBody('password', 'Пароль обязателен').notEmpty();
	req.checkBody('username', 'Логин обязателен').notEmpty();

	var errors = req.validationErrors();

	if(errors) {
		// have errors
		res.redirect("/users/register"); 
	} else {
		Users.getCountOfUsers({}, function(err, count) {
			// count of users
			let uid = count + 1; // "auto increment" id
			var newUser = new Users({
				uid: uid,
				first_name: first_name,
				last_name: last_name,
				date: date,
				email: email,
				password: password,
				username: username,
				photo: '/img/noavatar.png',
				mdate: moment()
			});

			Users.createUser(newUser, function(err, user) {
				if(err) throw err;
				console.log(user);
				// auto authorization
				req.flash('success_msg', 'Вы успешно зарегестрированы.');
				res.redirect('/users/login');
			});
			

			

		})
		

	}

});


passport.use(new LocalStrategy(
  function(username, password, done) {
   Users.getUserByUsername(username, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Нет такого пользователя'});
   	}

   	Users.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Неправильный пароль'});
   		}
   	});
   });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Users.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
  });


router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'Вы вышли');

	res.redirect('/users/login');
});

module.exports = router;