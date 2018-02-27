// main.jsx




var $dom, 
$chat = {},
isLogged = false, // user state logged in or no
$username = false,
clear = false,
socket = io();


//user info
$chat.data = {
	first_name: false, last_name: false, date: false, email: false, username: false, password: false
};

// dialog info
$chat.info = {
	did: false,
	recepient: {
		photo: '', // avatar
		username: '',
		status: '', // online, offline
		name: '',
		last_activity: '',
	},
};

// search info
$chat.search ={
	info: '',
};

// navigation links
$chat.nav = {
	header_noLogged: [['users/login','Войти'],['users/register','Регистрация']], // if user no logged in
	sidebar: ['home','dialogs','users', 'friends'], // left menu
	header: [['','Главная'],['users/ban','Профиль'],['users/logout','Выйти']], // if user logged in
};


socket.on('connectUser', function(msg) {
	// true connection
	$username = msg;
	$chat.user.state(); // user is active or no
});

// Main page -- Index
class Container extends React.Component {
	render() {
		return (
			<div className="page">
				<div className="header clearfix">
					<div className="container">
						<Header />
					</div>
				</div>
				<div className="container">
					<section className="main">
						<Body page={this.props.page} />
					</section>
				</div>
			</div>
		);
	}
}

// Header
class Header extends React.Component {
	render() {
		let nav = (isLogged) ? $chat.nav.header : $chat.nav.header_noLogged;

		return (
			<div className="header_row">
				<div className="logo float-left"><a href="/">Чат</a></div>
				<div className="float-right navigation">
					{nav.map((value) => {
						return <Link link={value[0]} label={value[1]} />
					})}
				</div>
			</div>
			);
	}
}

class Link extends React.Component {
	render() {
		let link = '/'+this.props.link;
		return (
			<a href={link} >{this.props.label}</a>
			);
	}
}

// Body
class Body extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			page: 0,
			msg: false,
		}
		let $this = this;
		socket.on('toDialog', function(msg) {
			// go to dialog page
			$this.setState({page: 'dialog_page', msg: msg});

		});
	}
	render() {
		// check for page
		if(this.state.page == 'dialog_page') {
			// its dialog page
			return (
				<div className="row">
					<div className="col-3">sidebar</div>
					<DialogPage msg={this.state.msg} />
				</div>
				);
		}
		if(this.props.page == 'dialogPage') {
			// its registration page
			let did = location.href.split('/dialogs/')[1];
			return (
				<div className="row">
					<DialogPage did={did} />
				</div>
				);
		} 
		else if(this.props.page == 'register') {
			// its registration page
			return (
				<div className="row">
					<RegisterMainForm />
				</div>
				);
		} 
		else if (this.props.page == 'login') {
			// its login page
			return (
				<div className="row">
					<LoginMainForm />
				</div>
				);
		}
		else if(this.props.page == 'dialogs') {
			// its dialogs page
			return (
				<div className="row">
					<Dialogs />
				</div>
				);
		}
		else if(this.props.page == 'profile') {
			// its profile page
			return (
				<div className="row">
					<Profile />
				</div>
				);
		}
		else {
			// its main page
			return (
				<div className="jumbotron row">
					<div className="col-8">
					  <MainJumbotron />
					</div>
					<div className="col-4">
						<LoginForm />
						<RegisterForm />
					</div>
				</div>
				);
			
		}
	}
}

// Show dialog page with messages
class DialogPage extends React.Component {
	constructor(props) {
		super(props);
		let $this = this, mprops = this.props.msg, did;
		this.state = {
			users: (mprops) ? mprops.users : false, // users who in dialog
			messages: (mprops) ? mprops.messages : false, // messages
			did: (mprops) ? mprops.did : (this.props.did) ? this.props.did : false, // dialog ID
		};
		$chat.info.did = this.state.did; // remember did
		did = this.state.did;


		if(this.props.did) {
			// user open this dialog
			socket.emit('getDialog', did);
		}
		
		// include socket block
		this.didSocketInclude();
		// check read messages
		this.didReadMessages();

		

	}

	didSocketInclude() {
		// our sockets
		let $this = this; 
		
		// wait dialog info and his messages
		socket.on('getDialog', function(msg) {
			if($this.state.did == msg.did) {
				// check for concurrency
				$this.setState({messages: msg.messages, users: msg.users});
				if($chat.user.isActive) {
					// user is online
					this.didReadMessages(); // read messages
				}
			}
		});

		socket.on('newMessage', function(msg) {
			// get new message
			let did2 = msg.did, message = msg.message;
			if($chat.info.did == did2) {
				// user in this dialog
				let msgs = $this.state.messages;
				if($this.state.messages) {
					// found messages
					msgs.push(message);
				}
				else {
					// not found messages
					msgs = [message];
				}
				$this.setState({messages: msgs}); // add new message to end
				if($chat.user.isActive) {
					// if user is active
					if($username !== message.username) {
						// its not sender this message
						// read message
						socket.emit('readMessage', {mid: message.mid, did: message.did});
					}
				}
			}
		});

		socket.on('readMessage', function(msg) {
			// readed message
			let messages = $this.state.messages;
			messages.map(function(message, index) {
				if(message.mid == msg.mid) {
					// its this message
					messages[index].read_state = 1;
					$this.setState({messages: messages});
				}
			});
		});
	}

	didReadMessages(msg = this.state.messages) {
		// check read messages
		if(msg) {
			// have messages or not
			msg.map(function(message) {
				if(message.read_state == 0) {
					// message not read
					// say to server that user read this message
					socket.emit('readMessage', {mid: message.mid, did: message.did});
				}
			});
		}
	}


	render() {
		let msg = this.state.messages, $this = this; // processing of data message
		if(msg) {
			// have messages
			return (
				<div className="messages_page">
					<div className="messages_page_inner">
						<div className="messages_page__body">
							<ul className="messages__items list-unstyled">
								{msg.map(function(message) {
									// get message
									return (<Message users={$this.state.users} message={message} />);
									
								})}
							
							</ul>
						</div>
						<AddMessageForm />
					</div>
				</div>
			);
		}
		else {
			return (
				<div className="messages_page">
					<div className="messages_page_inner">
						<div className="messages_page__body">
							<div className="noneMessages">
								Сообщений не найдено
							</div>
							<ul className="messages__items list-unstyled">

							</ul>
						</div>
						<AddMessageForm />
					</div>
				</div>

				)
		}

	}
}

// form to add new message
class AddMessageForm extends React.Component {
	constructor(props) {
		super(props);
		this.handleSendMessageClick = this.handleSendMessageClick.bind(this); // user add new message Button Click
		this.handleMessageInput = this.handleMessageInput.bind(this); // user onkey down message input
		this.handleDragOver = this.handleDragOver.bind(this); // catch drag-drop
		this.handleDragLeave = this.handleDragLeave.bind(this);

		this.state = {
			maxFileSize : 15 * 1000000, // 15 mb max file size
			dropClass: '', // class of drop zone
			isDropClass: '', // available to drop class
			alertMessage: false, // alert message to user
		}
	}

	handleMessageInput(event) {
		// catch key from Message Input
		if(event.keyCode == 13) {
			// user on key down Enter
			socket.emit('addNewMessage', {did: $chat.info.did, body: unHack($('#message_input').val())});
			$('#message_input').val('').focus();
		}
	}

	handleSendMessageClick(event) {
		// user click on New Message Button
		socket.emit('addNewMessage', {did: $chat.info.did, body: unHack($('#message_input').val())});
		$('#message_input').val('').focus();
	}

	/** [Drag-n-Drop]
		* Drag and drop files to area and send them to server
	 */
	componentDidMount() {
		// before render
		let $this = this, dragTimer;
		$(document).on('dragenter dragstart dragend dragleave dragover drag drop', (e) => {
			$.e.props.push('dataTransfer');
			e.preventDefault();
		});
		$(document).on({
			drop: (e) => {
				// file drop down to site
				e.stopPropagation();
	            e.preventDefault();
	            let dt = e.originalEvent.dataTransfer; // data Transfer
	            isConsole(e.originalEvent.dataTransfer);
	            dt.files.map((file) => {
	            	if(file.size < $this.state.maxFileSize) {
						// file can be upload
						// ajax send
						var data = new FormData();
				        // add to data
				        data.append('uploadFile', file.file);

				        //отсылаем с попощью Ajax
				        $.ajax({
				            url: '/dialogs',
				            data: data,
				            cache: false,
				            contentType: false,
				            processData: false,
				            type: 'POST',
				            success: function(response) {
				                if(response.status == 'ok') {
				                   isConsole(response.text);
				                }
				                else {
				                    isConsole(response.errors);
				                }
				            },
				            xhr: function() {
				                var xhr = $.ajaxSettings.xhr();

				                if ( xhr.upload ) {
				                    console.log('xhr upload');

				                    xhr.upload.onprogress = function(e) {
				                        file.progressDone = e.position || e.loaded;
				                        file.progressTotal = e.totalSize || e.total;
				                        //обновляем прогресс для файла
				                        baseClass.updateFileProgress(index, file.progressDone, file.progressTotal, file.element);
				                        //обновляем общий прогресс
				                        baseClass.totalProgressUpdated();
				                    };
				                }

				                return xhr;
				            }
				        });
					}
					else {
						// file can't be upload
						// show alert
						$this.setState({
							alertMessage: true,
						})
					}
	            });
	            dragTimer = setTimeout(function() {
					$this.setState({
						isDropClass: ''
					})
				}, 25);
			},
			dragover: (e) => {
				// file in window area
				let dt = e.originalEvent.dataTransfer;
				if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('Files'))) {
					$this.setState({
						isDropClass: 'dragstart'
					});
					clearTimeout(dragTimer);
				}
			},
			dragleave: (e) => {
				// file leave window area
				dragTimer = setTimeout(function() {
					$this.setState({
						isDropClass: ''
					})
				}, 25);
				
			}
		});
	}

	handleDragOver(event) {
		// file hover to site
		let $e = $(event.target); // drag zone
		this.setState({
			dropClass: 'hover',
		});
		return false;
	}

	handleDragLeave(event) {
		// file hover to site
		let $e = $(event.target); // drag zone
		this.setState({
			dropClass: '',
		});
		return false;
	}
	componentDidUpdate() {
		// after update
		if(this.state.alertMessage) {
			// show alert message
			setTimeout(() => {
				this.setState({alertMessage : false})
			}, 3000);
		}
	}

	render() {
		let $alert;
		if(this.state.alertMessage) {
			// Show alert window
			$alert = <Alert message="Файл слишком большой!" />;
		}
		return (
			<div className="AddMessageForm">
				{$alert}
					<div id="dropzone" className={this.state.isDropClass + ' ' + this.state.dropClass}
					 onDragOver={() => this.handleDragOver(event)} 
					 onDragLeave={() => this.handleDragLeave(event)}>
						  <div className="dropdoc">Перетащите файлы сюда,<br /> чтобы прикрепить их к сообщению</div>
					</div>
				<div className="messages_page__input">
					<div className="input__box">
						<input type="text" className="form-control message_input" id="message_input" name="message_input" onKeyDown={this.handleMessageInput} placeholder="Введите сообщение..." autoFocus="true" />
						<button className="btn btn-outline-primary" onClick={this.handleSendMessageClick}>Отправить</button>
					</div>
					<div className="input__attachments">
						<div className="docs"></div>
						<div className="photos"></div>
						<div className="notes"></div>
					</div>
				</div>
			</div>
		);
	}
}

// Message object
class Message extends React.Component {
	constructor(props) {
		super(props);
		let $this = this;
		this.state = {
			message: this.props.message,
			users: this.props.users,
			user: false,
		};
	}
	componentDidMount() {
		// before render
		let $this = this;
		this.state.users.map(function(user) {
			if(user.username == $this.state.message.username) {
				// find user who add this message
				$this.setState({user: user});
			}
		})
	}
	render() {
		let user = this.state.user, message = this.state.message,
		link = '/users/' + user.username, 
		name = user.first_name, 
		messageClass = (message.read_state == 0) ? 'messages__item media not_read' : 'messages__item media',
		onlineClass = (user.status == 1) ? 'messages__item__avatar_wrap online' : 'messages__item__avatar_wrap';
		return (
			<li className={messageClass}>
				<a className={onlineClass} href={link}><img className="messages__item__avatar mr-3" src={user.photo} alt={name} /></a>
					
		    <div className="messages__item__body">
		      <a href={link}><h5 className="mt-0 mb-1">{name}</h5></a>
		      <div className="media__body">
				{message.body}
		      </div>
		    </div>
		  </li>
		);
	}
}

// dialogs page
class Dialogs extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			dialogs: false,
			page: 0, // page 0 - main, page 1 - create dialog
			add_form: 0, // show form: 0 - no, 1 - create dialog, 2 - search messages
			search: $chat.search.info,
		}
		this.handleCreateDialogClick = this.handleCreateDialogClick.bind(this); // on click Create Dialog Button
		this.handleGoToDialogClick = this.handleGoToDialogClick.bind(this); // on click Go To Dialog Button
		this.handleSearchEnter = this.handleSearchEnter.bind(this); // on key down Search Field


		let $this = this;
		// send page = 0 for get dialogs
		socket.emit('getDialogs', 0);
		// listen answer from server
		socket.on('getDialogs', function(msg) {
			// get dialogs
			$this.setState({dialogs: msg});
		});
		socket.on('newDialog', function(msg) {
			// new dialog from server
			$this.setState({dialogs: $this.state.dialogs.push(msg)}); // add to list of dialogs
		});
	}

	handleCreateDialogClick(event) {
		// create dialog
		this.setState({add_form: 1}); // page new dialog
	}

	handleGoToDialogClick(event) {
		// go to dialog
		let search = this.state.search;
		search = unHack(search); 
		this.setState({add_form: 0}); // hide create dialog form
		socket.emit('createDialog', search); // send username to server
		this.setState({search: ''});
		$chat.search.info = '';
	}

	handleRemoveClick(sid, username) {
		// remove username
		let usernames = this.state.search, unames = usernames.split(',').slice();
		// $('.search_control__username[data-id="' + sid + '"]').hide();
		if(usernames.indexOf(',') > -1) {
			// have usernames
			let uIndex = unames.findIndex(function(uname){
				if(username == uname) {
					return true;
				}
			});
			unames.splice(uIndex, 1);
			if(unames[0] == '') {
				usernames = '';
			}
			else {
				usernames = unames.join(',');
			}
		}
		else {
			usernames = '';
		}
		
		this.setState({search: usernames});
		
	} 

	handleSearchEnter(event) {
		// onkeyDown search field
		if(event.keyCode == 188 || event.keyCode == 191 || event.keyCode == 13) {
			if(event.target.value.length > 2) {
				let value = unHack(event.target.value).replace(/,/g, '');
				if(this.state.search.indexOf(value) > -1 || value.length < 3) {
					// find this username
					return false
				}
				if(this.state.search) {
					// have usernames
					this.setState({search: this.state.search + ',' + value});
				}
				else {
					// first username
					this.setState({search: value});
				}
				$('#search_username').val(''); // clear input text
			}
			return false;
		}
	}

	render() {
		let $elements, search_form;


		if(this.state.add_form == 0) {
			// if user click on Create Dialog Button
			let $this = this,
				search = this.state.search, 
				countNames = (search.indexOf(',') > -1) ? search.split(',').length : 0,
				sid = -1;
			if(countNames > 1) {
				// array have names example: username1, username2. Count :: 2
				search = search.split(',');
				search = search.map(function(username) {
					// process array for usernames
					sid++;
					return (<SearchItem sid={sid} username={username} onClick={() => $this.handleRemoveClick(sid, username)} />);
				});
			} 
			else if(search.length > 2) {
				// not array. Have only one username
				sid++;
				search =  (<SearchItem sid={sid} username={search} onClick={() => $this.handleRemoveClick(sid, search)} />);
			}
			else {
				search =  '';
			}
			
			search_form = (
				<div className="search_control">
					<div className="search_control__usernames">
					{search}
					</div>
					<input type="text" className="form-control" id="search_username" placeholder="Введите логин или логины через ENTER" onKeyDown={this.handleSearchEnter} />
					<button className="btn-primary btn" id="createDialog" onClick={this.handleGoToDialogClick}>Перейти</button>
				</div>
				);
		} else if(this.state.add_form == 1) {
			search_form = <button className="btn-primary btn" id="createDialog" onClick={this.handleCreateDialogClick}>Создать диалог</button>;
		}

		if(this.state.page == 1) {
			// page new dialog
		}
		else {
			// page main
			if(this.state.dialogs.length > 0) {
				// user have dialogs 
				$elements = (
					<div className="dialogs">
						<div className="dialogs__search">
							{search_form}
							
						</div>
						<div className="dialogs__list">
							<ul className="dialogs__items list-unstyled">
								{this.state.dialogs.map((dialog) => {
									return <DialogItem dialog={dialog} />
								})}
							</ul>
						</div>
					</div>
				);
			}
			else {
				// user dont have dialogs
				$elements = (
					<div className="dialogs">
						<div className="dialogs__nofind">
							<div className="dialogs__nofind_text">
								Начните общаться прямо сейчас.
							</div> 
							{search_form}
						</div>
					</div>
				);
			}
			
		}
		return $elements;
	}
}

// usernames in search form
class SearchItem extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			sid: this.props.sid,
		}

	}

	render() {
		let username = this.props.username;
		// output username(search_item) block
		return (
			<div data-id={this.state.sid} className="search_control__username btn btn-primary">
				<span className="username">{username}</span>
				<span className="remove" onClick={() => this.props.onClick()}>x</span>
			</div>
		);
	}
}

// get dialog item
class DialogItem extends React.Component {
	constructor(props) {
		super(props);
		let $this = this, dialog = this.props.dialog;
		this.handleDialogClick = this.handleDialogClick.bind(this); // user click on dialog
		this.state = {
			value: 0,
			did: dialog.did, // dialog id
			dialog: dialog,
			lastMessage: false,
			users: [], // users photo
			usersName: [], // user names who in dialog
			dialogName: false, // string name of dialog
		};

		socket.emit('getLastMessage', dialog.did);
		// socket.emit('getDialogUsers', {did: dialog.did, usernames: dialog.usernames}); // send to server. get users

		this.didSocketInclude(dialog);
	}

	// who in dialog
	componentDidMount() {
		let $this = this;
		Promise.all(this.state.dialog.usernames.map(function(user){
			// find all and append user info
			let a = $this.state.usersName, b = $this.state.users;
			a.push(user.first_name + ' ' + user.last_name);
			b.push(user);
			$this.setState({usersName: a}); // name users
			$this.setState({users: b}); // photo users
		})).then((users) => {
			$this.setState({dialogName : $this.state.usersName.join(',')});
		});
	}

	/** [didSocketInclude description]
	* Socket box
	* @param dialog [array]
	 */
	didSocketInclude(dialog) {
		// socket box
		let $this = this, did = $this.state.did;
		socket.on('getLastMessage', function(message){
			// get last message from Dialog
			if(message.did == did) {
				$this.setState({lastMessage: message});
			}
		});

		socket.on('newMessage', function(msg) {
			// get new message
			if(did == msg.did) {
				// if new message for this dialog
				$this.setState({lastMessage: msg.message}); // add new message
			}
		});

		/** [readMessage]
		* User(anyone) read message
		* @param mid Integer [message id] 
		 */
		socket.on('readMessage', function(mid) {
			// anyone read message
			let lMessage = $this.state.lastMessage;
			if(lMessage.mid == mid && did == lMessage.did) {
				// its this message
				lMessage.read_state = 1; // set message is readed
				$this.setState({lastMessage: lMessage});
			}
		});
	}

	handleDialogClick(event) {
		// user click on dialog
		socket.emit('toDialog', this.props.dialog.did); // go to dialog
		// location.href('/dialogs/' + this.state.did);
	}

	render() {
		let $this = this,
			dialog = this.props.dialog, 
			dialogName = this.state.dialogName,
			lastMessage,
			lMessage = this.state.lastMessage, 
			users = this.state.users,
			lMessageReadClass,
			photo;
		if(lMessage) {
			// have last message
			lMessageReadClass = (lMessage.read_state && lMessage.read_state == 1) ? 'last_message__body' : 'last_message__body not_read'; // read and not read Class
			
			if(dialog.type == 'group') {
				// its one people to group dialog
				if(dialog.name) {
					// set name of dialog
					dialogName = dialog.name;
				}

				if(dialog.photo) {
					// dialog have photo
					photo = (
						<a className="dialogs__item__avatar_wrap" href={link}><img className="dialogs__item__avatar mr-3" src={dialog.photo} alt={name} /></a>
					);
				} 
				else {
					// no photo, show users. Max 4 users
					let countUsers = 0;
					photo = users.map(function(user) {
						if(user.username == $username) return;
						
						countUsers += 1;
						if(countUsers < 5) {
							let link = '/users/' + user.username, name = user.first_name + ' ' + user.last_name,
							onlineClass = (user.status == 1) ? 'dialogs__item__avatar_wrap online dia-'+countUsers : 'dialogs__item__avatar_wrap dia-'+countUsers;
							return (
								<a className={onlineClass} href={link}><img className="dialogs__item__avatar mr-3" src={user.photo} alt={name} /></a>
							);
						}
					});
				}
			
			}
			else {
				// its one people to one type dialog
				photo = users.map(function(user) {
					if(user.username == $username) return;
					let link = '/users/' + user.username, name = user.first_name + ' ' + user.last_name,
					onlineClass = (user.status == 1) ? 'dialogs__item__avatar_wrap online dia-1' : 'dialogs__item__avatar_wrap dia-1';
					return (
						<a className={onlineClass} href={link}><img className="dialogs__item__avatar mr-3" src={user.photo} alt={name} /></a>
					);
				});
				
			}

			users.map(function(user) {
				if(user.username == lMessage.username) {
					// if its username who add last Message
					let link = '/users/' + user.username, name = user.first_name;
					lastMessage = (
				      <div className="media media__last_message">
					        <img className="last_message__avatar mr-3" src={user.photo} />
					      <div className="media-body">
					        <div className={lMessageReadClass}>
					        	{lMessage.body}
					        </div>
					      </div>
				      </div>
						);
					
				}
					
			});
		} else {
			lastMessage = '';
		}

		return (
			<li className="dialogs__item media" onClick={this.handleDialogClick}>
				<div className="dialogs__item__photo">
				    {photo}
				</div>
			    <div className="media-body">
			      <h5 className="mt-0 mb-1">{dialogName}</h5>
					{lastMessage}
			    </div>
			  </li>
			);
		
	}
}

// User Page Profile /users/{username}
class Profile extends React.Component {
	constructor(props) {
		super(props);
		let $this = this;
		this.handleSendMessageClick = this.handleSendMessageClick.bind(this); // user click on Send Message Button
		this.handleAddToFriendClick = this.handleAddToFriendClick.bind(this); // user click on Add To Friends Button
		this.state = {
			username: location.href.split('/users/')[1],
			answer: false,
			msg: false,
			modul: 'create', // modul state if no opened - false
		}
		socket.emit('getProfile', this.state.username); // send username to server
		socket.on('getProfile', function(msg) {
			// get answer from server
			$this.setState({answer: true, msg: msg}); // tell that we got answer
			// information about recepient user
			$chat.info.recepient.username = msg.username;
			$chat.info.recepient.photo = msg.photo;
			$chat.info.recepient.status = msg.status;
			$chat.info.recepient.last_activity = msg.last_activity;
			$chat.info.recepient.name = msg.first_name + ' ' + msg.last_name;
			$this.setState({
				modul: 'create'
			});

		});
	}

	handleSendMessageClick(event) {
		// user click on Send Message Button
		this.setState({
			modul: 'sendMessage'
		});
	}

	handleAddToFriendClick(event) {
		// user click on Add To Friends Button

	}

	render() {
		let msg = this.state.msg, status = (msg.status == 1) ? 'online' : (msg.last_activity) ? 'last seen ' + msg.last_activity : 'offline';
		
		if(this.state.answer) {
			// data is defined
			return (
					<div className="row profile_page">
						<div className="col-3">
							<img src={msg.photo} className="profile_page__avatar" alt=""/>
							<div className="profile_page__buttons">
								<button type="button" onClick={this.handleSendMessageClick} className="btn btn-primary">Написать сообщение</button>
								<button type="button" onClick={this.handleAddToFriendClick} className="btn btn-outline-primary">Добавить в друзья</button>
							</div>
						</div>
						<div className="col-9">
							<h2 className="page_name">{msg.first_name} {msg.last_name} <span className="profile_status">{status}</span></h2>
							<div className="profile_page__info">
								Здесь кратко о пользователе..
								{this.state.modul == 'sendMessage' &&
									<Modul id="sendMessage" />
								}
							</div>

						</div>
					</div>
				);
		} else {
			return 'Не найден пользователь';
		}
	}
}

// Call to action
class MainJumbotron extends React.Component {
	render() {
		return (
			<div className="mainjumbotron">
				<h1 className="display-4">Привет, друг!</h1>
				 <p className="lead">Это простой чат, где нет ничего лишнего.</p>
				 <hr className="my-4" />
				 <p>Почувствуй больше, общайся.</p>
				 <p className="lead">
				   <a className="btn btn-primary btn-lg" href="/users/register" role="button">Начать пользоваться</a>
				 </p>
			</div>
			);
	}
}

// LoginForm on start page
class LoginForm extends React.Component {
	render() {
		return (
			<div className="loginform">
				<form action="/users/login" method="post">
				  <div className="form-group">
				    <input type="text" className="form-control" id="username" name="username" placeholder="Введите логин" autoFocus="true" required />
				  </div>
				  <div className="form-group">
				    <input type="password" className="form-control" id="password" name="password" placeholder="Пароль" required />
				  </div>
				  <div className="loginform__buttons">
					  <button type="submit" className="btn btn-primary">Войти</button><a href="/users/register" className="btn btn-outline-primary" role="button">Зарегестрироваться</a>
				  </div>
				</form>
			</div>
			);
	}
}
// RegisterForm
class RegisterForm extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			''
			);
	}
}

// LoginMainForm on LoginPage
class LoginMainForm extends React.Component {
	render() {
		return (
			<div className="loginmainform">
				<form action="/users/login" method="post">
				  <div className="form-group">
				    <input type="text" className="form-control" id="username" name="username" placeholder="Введите логин" autoFocus="true" required />
				  </div>
				  <div className="form-group">
				    <input type="password" className="form-control" id="password" name="password" placeholder="Пароль" required />
				  </div>
				  <div className="loginform__buttons">
					<button type="submit" className="btn btn-primary">Войти</button>
				  </div>
				</form>
			</div>
			);
	}
}
// RegisterMainForm
class RegisterMainForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			value: 0,
			btnText: ['Регистрация', 'Получить письмо', 'Начать пользоваться'],
			alert: false,
		};
	}
	render() {
		// main step
		return (
			<div className="registermainform">
					<RegisterControl step={this.state.value} />
			</div>
			);
		
			
		
	}
}
// register controller for steps
class RegisterControl extends React.Component {
	constructor(props) {
		super(props);
		this.handleContinueClick = this.handleContinueClick.bind(this);
		this.handleFinishClick = this.handleFinishClick.bind(this);
		this.state = {
			step: this.props.step,
			nameStep: ['Регистрация','Проверка'],
			nameBtn: ['Продолжить','Регистрация'],
		};
	}

	handleContinueClick(event) {
		// user click on continue button
		let $this = this;
		if(this.state.step == 0) {
			if($('#reg_first_name').isValid({}) && $('#reg_last_name').isValid() && $('#reg_date').isValid()) {
				this.setState({step: this.state.step+1});
			}
		} 

		event.preventDefault();
		return false;
	}

	handleFinishClick(event) {
		// user click on end registration button
		event.preventDefault();
		this.setState({step: this.state.step+1});
	}

	render() {
		let step = this.state.step, elements = null,
		 stepMainClass = (step == 0) ? 'register_steps__main' : 'register_steps__main none',
		 stepValidClass = (step == 1) ? 'register_steps__continue none' : 'register_steps__continue',
		 btnSubmit;
		 if(step == 0) {
		 	btnSubmit = this.handleContinueClick;
		 	stepMainClass = 'register_steps__main';
		 	stepValidClass = 'register_steps__continue none';
		 } else if(step == 1) {
		 	btnSubmit = false;
			stepMainClass = 'register_steps__main none';
		 	stepValidClass = 'register_steps__continue';
		 }


			elements = (
				<form action="/users/register" method="post" className="form-inline" onSubmit={btnSubmit} >
					<div className={stepMainClass}>
					<h4>{this.state.nameStep[step]}</h4>
						<div className="form-group">
						  <input type="text" className="form-control" name="first_name" id="reg_first_name" placeholder="Имя" autoFocus="true" required />
						</div>
						<div className="form-group">
						  <input type="text" className="form-control" name="last_name" id="reg_last_name" placeholder="Фамилия" required />
						</div>
						<div className="form-group">
						  <input type="date" className="form-control" name="date" id="reg_date" min="1940-01-01" max="2012-12-12" required />
						</div>
					</div>
					<div className={stepValidClass}>
						<div className="form-group">
						  <input type="email" className="form-control" name="email" id="reg_email" placeholder="Email" />
						</div>
						<div className="form-group">
						  <input type="text" className="form-control" name="username" id="reg_username" placeholder="Логин" />
						</div>
						<div className="form-group">
						  <input type="password" className="form-control" name="password" id="reg_password" placeholder="Пароль" />
						</div>
					</div>
					<button type="submit" className="btn btn-primary">{this.state.nameBtn[step]}</button>
				</form>
			);
		
		if(step == 2)  {
			// successful information for user
			elements = (
				<div className="register_step__finish">
					<h4>Спасибо за регистрацию.</h4>
					<p className="lead">Подтвердите письмо и вы получите все возможности чата.</p>
				</div>
				);
		}
		return elements;

	}
}

/** [Modul]
	* Windows on the site(new Message, Friend ..)
	* Functions: Create, show, close
 */
class Modul extends React.Component {
	constructor(props) {
		super(props);
		let $this = this;
		// handle methods
		this.handleCtrlEnter = this.handleCtrlEnter.bind(this); // ctrl+enter on Message Input
		this.handleCheckLen = this.handleCheckLen.bind(this); // Check len onKeyUp
		this.handleChange = this.handleChange.bind(this); // Input Text Box onChange
		this.handleSendMessage = this.handleSendMessage.bind(this); // Send message to server
		this.state = {
			id: this.props.id, // no opened Windows
			closeWindow: false, // in true window close
			alertMessage: false, // alert message on page
			value: false, // text of message
		};

		/** [sendMessageToUser]
			* Answer from server, if user create message
			* @param {String} [msg]
		 */
		socket.on('sendMessageToUser', function(msg) {
			if(msg == 'successful') {
				$this.setState({alertMessage: true}); // open alert window
			}
		})
	}

	/** [handleOpenModul]
		* Open window
	 */
	handleOpenModul(id) {
		if(!$('#' + id).length) {
			// not exist
			return;
		}
		// this.setState({closeWindow: false, alertMessage: false});
		$('#' + id).modal('show');
	}

	/** [handleCloseModul]
		* Close window by id
		* @id - string
	 */
	handleCloseModul(id) {
		$('#' + id).modal('hide');
		this.setState({closeWindow: false});
	}

	/** [handleCtrlEnter]
		* ctrl+enter on message box event
	 */
	handleCtrlEnter(event) {
		if((event.ctrlKey) && ((event.keyCode == 0xA)||(event.keyCode == 0xD))) {
			this.SendMessage();
		}
	}

	/** [handleCheckLen]
		* check lenght of text in message input
	 */
	handleCheckLen(event) {
		let value = $(event.target).text();
		this.setState({value: value});

		if(value.length > 1000) {
			$('.warn').text('У вас слишком длинное сообщение')
		}
		else {
			$('.warn').text('')
		}
	}

	/** [handleChange]
		** When user change Text Box of message, function add to state variable
		*@param event
	 */
	handleChange(event) {
		this.setState({value: $(event.target).text()});
	} 

	/** [handleChange]
		** When user click on "Send" Button
		*@param event
	 */
	handleSendMessage(event) {
		this.SendMessage();
	}
	/** [SendMessage]
		* Send Message to Server Post-request
		* @param array of {username : String, body : String}
		* @username [Name of recepient]
		* @body [Text of message]
	 */
	SendMessage() {
		socket.emit('sendMessageToUser', {username: $chat.info.recepient.username, body: this.state.value});
		this.setState({closeWindow: true}); // close window

	}

	componentDidMount() {
		// after render
		this.handleOpenModul(this.props.id); // open window by id
	}
	componentDidUpdate() {
		// after update
		if(this.state.closeWindow) {
			this.handleCloseModul(this.props.id); // close window
		}
		else {
			this.handleOpenModul(this.props.id); // open window by id
		}
		if(this.state.alertMessage) {
			// show alert message
			setTimeout(() => {
				this.setState({alertMessage : false})
			}, 3000);
		}
	}

	render() {
		let $this = this,
			id = this.props.id,
			$alert,
			value = this.state.value,
			$recepient = $chat.info.recepient,
			recepient_status = ($recepient) ? $recepient.status : false;


		if(recepient_status) {
			recepient_status = (recepient_status == 1) ? 'online' : 'last seen ' + $recepient.last_activity + ' offline';
		}
		if(this.state.alertMessage) {
			// Show alert window
			$alert = <Alert message="Успешная отправка сообщения" />;
		}
		
		// set moduls
		// window send message
		return (
			<div className="modalCenter">
				{$alert}
				<div className="modal fade" id="sendMessage" tabIndex="-1" role="dialog" aria-labelledby="modalCenterTitle" aria-hidden="true">
				 	<div className="modal-dialog modal-dialog-centered" role="document">
					    <div className="modal-content">
					      <div className="modal-header">
					        <h5 className="modal-title" id="exampleModalLongTitle">Новое сообщение</h5>
					        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
					          <span aria-hidden="true">&times;</span>
					        </button>
					      </div>
					      <div className="modal-body">
					      	<div className="mail_recepient_info">
					      		<div className="media media__recepient">
							        <img className="recepient__avatar mr-3" src={$recepient.photo} />
							      <div className="media-body recepient__body">
							        	<div className="recepient__body_name">{$recepient.name}</div>
							        	<div className="recepient__body_status">{recepient_status}</div>
							      </div>
						      </div>
					      	</div>
					      	<div className="mail_box">
					      		<div contentEditable="true" id="mail_box_editable" onChange={$this.handleChange} onKeyUp={$this.handleCheckLen} onKeyPress={$this.handleCtrlEnter}></div>
					      	</div>
					      	<div className="warn"></div>
					      </div>
					      <div className="modal-footer">
					        <button type="button" className="btn btn-primary" onClick={$this.handleSendMessage}>Отправить</button>
					      </div>
					    </div>
					</div>
				</div>
			</div>
		);
	
		// window add to friend
		// window attachments
		
		

	}
}

/** [Alert]
	* Show alert box on site
 */
class Alert extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			message: this.props.message
		}
	}

	render() {
		let $this = this,
			msg = this.state.message; // message on alert box
		if(msg) {
			return (
				<div className="alert alert-success" role="alert">
				  {msg}
				</div>
			);
		}
		return '';
	}
}

/** @type {$chat.user}
	* Keep track of current user, and set his Activity 
 */
$chat.user = {
	mousePosition: {x: 0, y: 0},
	isActive: false,
	timer: false,
	timeNoActive: 0,
	state: function() {
		// user on site?
		$(document).bind('mousemove', function(event) {
			let nPosition = {x: event.clientX, y: event.clientY};
			if($chat.user.mousePosition.x == nPosition.x && $chat.user.mousePosition.y == nPosition.y) {
				// user deactive
				$chat.user.timer = setTimeout(function() {
					$chat.user.timeNoActive += 100;
				}, 100);
				if($chat.user.timeNoActive > 15 * 1000) {
					// if user no active on 15 seconds
					$chat.user.isActive = false;
				}
			}
			else {
				$chat.user.isActive = true;
				$chat.user.timeNoActive = 0;
				clearTimeout($chat.user.timer);
			}
		});
	}
}



// check form validation
$.fn.extend({
	valid: function(a = {min: 2}){
		let $this = this;
		if(this.isValid(a)) {
			this.removeClass('invalid')
		} else {
			this.addClass('invalid')
		}
		if(this.attr('data-check') !== "true") {
			// if input dont have bind on self
			this.attr('data-check', 'true');
			this.bind('keydown', function(e){
				// listen key from input
				if($this.isValid(a)) {
					$this.removeClass('invalid')
				} else {
					$this.addClass('invalid')
				}
			});
		}
	},
	isValid: function(a = {min: 2}) {
		// check {min: (min length), max: (max length)}
		let b = this.val(), re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}/igm;
		if(a.email) {
			// this is email
			if(b !== '' && re.test(b)) {
				return true;
			} else {
				return false
			}
		} else {
			if(a.min > b.length) {
				return false
			} else {
				return true
			}
		}
	}
});

// against hackers
function unHack(a) {
	return a.trim();
}



// render pages
$(document).ready(function(){
	// check for page
	let $dom, $el;
	if(document.getElementById('main')) {
		// its main page
		$el = 'main';
	}
	else if(document.getElementById('login')) {
		// its login page
		$el = 'login';
	}
	else if(document.getElementById('register')) {
		// its register page
		$el = 'register';
	}
	else if(document.getElementById('dialogs')) {
		// its dialogs page
		$el = 'dialogs';
	}
	else if(document.getElementById('profile')) {
		// its profile page
		$el = 'profile';
	}
	else if(document.getElementById('dialogPage')) {
		// its dialogPage page
		$el = 'dialogPage';
	}
	if($('#'+$el).hasClass('profile')) {
		// user logged in
		isLogged = true;
	}

	$dom = <Container page={$el} />;

	// show the block
	ReactDOM.render(
		$dom,
		document.getElementById($el)
	);
});


/** [isConsole]
	* Output text in console
	* @a typeof number [Its Number of test]
	* @a typeof string [Its just string what are you want to say] 
	* @a is false [Output is test]
 */
function isConsole(a = 'test') {
	if(typeof a === 'number') {
		isConsole('Thats good #' + a)
	}
	else {
		console.log(a)
	}
}