/** [Dialogs] Routes
	* server page of dialogs page
 */

var express = require('express'),
	router = express.Router(),
	multiparty = require('multiparty');


var Dialogs = require('../models/dialogs');
var dir = {
    images: './public/uploads/images',
    images2: '/uploads/images/',
    docs: './public/uploads/docs/',
    docs2: '/uploads/docs/',
    photos: './public/uploads/photos/',
    photos2: '/uploads/photos/'
  };

// Dialogs
router.get('/', ensureAuthenticated, function(req, res) {
	user = req.user;
	res.render('dialogs');
});

// Dialog page
router.get('/:did', ensureAuthenticated, function(req, res) {
	user = req.user;
	res.render('dialogPage');
});


// upload files
router.post('/', ensureAuthenticated, function(req, res) {
	// create form
    var form = new multiparty.Form(), // file path, type and his size
    	uploadFile = {uploadPath: '', type: '', size: 0}, // max file size
    	maxSize = 15 * 1024 * 1024, // 15 MB // accept types
    	supportMimeTypes = ['image/jpg', 'image/jpeg', 'image/png'], // array with errors
    	errors = [], linkToFile, currentDate = moment(), photoFileName;

     // check error
    form.on('error', function(err){
        /*if(fs.existsSync(uploadFile.path)) {
            // delete this file
            fs.unlinkSync(uploadFile.path);
            console.log('error');
        }*/
    });

    form.on('close', function() {
        // all good
        if(errors.length == 0) {
            // no errors
            res.send({status: 'ok', info: [linkToFile, currentDate, photoFileName]});
        }
        else {
            /*if(fs.existsSync(uploadFile.path)) {
                //delete this file
                fs.unlinkSync(uploadFile.path);
            }*/
            // have errors
            res.send({status: 'bad', errors: errors});
        }
    });

    // file appear
    form.on('part', function(part) {
        // read size
        uploadFile.size = part.byteCount;
        //read type
        uploadFile.type = part.headers['content-type'];
        // file path is exist
        if(checkYet(part.filename)) {
          photoFileName = part.filename;
          linkToFile = dir.photos2 + currentDate + photoFileName;
          uploadFile.path = dir.photos + currentDate + photoFileName;

          // check file size
          if(uploadFile.size > maxSize) {
              errors.push('File size is ' + uploadFile.size + '. Limit is' + (maxSize / 1024 / 1024) + 'MB.');
          }

         /* // if accept type
          if(supportMimeTypes.indexOf(uploadFile.type) == -1) {
              errors.push('Unsupported mimetype ' + uploadFile.type);
          }*/

          // no errors make flow
          if(errors.length == 0) {
              var out = fs.createWriteStream(uploadFile.path);
              part.pipe(out);
          }
          else {
              // miss
              // stop upload on go to close
              part.resume();
          }
        } else {
          part.resume();
        }
        
      
    });

    // парсим форму
    form.parse(req);
})

// check user is logged in
function ensureAuthenticated(req, res, next) {
	if(req.isAuthenticated()) {
		// if user is logged in
		return next();
	} else {
		// user is not logged in
		res.redirect('/')
	}
}

function checkYet(a) {
    if(a === undefined || a === null) {
      return false;
    } else {
      return true;
    }
  }


module.exports = router;