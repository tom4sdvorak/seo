var express = require('express');
var path = require('path');
var logger = require('morgan');
var fs = require("fs");
var formidable = require('formidable');
var archiver = require('archiver');
var FileHandler = require('./FileHandler');

function getNextID(){
    var folders = fs.readdirSync(path.join(__dirname, '/o'));
    var count = 0;
    for(var i = 0; i < folders.length; i++){
        if(parseInt(folders[i]) > count){
            count = parseInt(folders[i]);
        }
    }
    count++;
    console.log("New count is " + count);
    return count;
}

function setup(){
    if(!fs.existsSync(path.join(__dirname, '/o'))) {
        fs.mkdirSync(path.join(__dirname, '/o'), function(err){
            if(err){
                console.log("Cannot create directory");
            }
        });
    }
    if(!fs.existsSync(path.join(__dirname, '/download'))) {
        fs.mkdirSync(path.join(__dirname, '/download'), function(err){
            if(err){
                console.log("Cannot create directory");
            }
        });
    }

    uploadCount = getNextID();
}

var app = express();
setup();

app.use(logger('dev'));
app.use('/',express.static(path.join(__dirname, 'public')));
app.use('/o/:id/',express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/o/:id/', function(req, res){
    var id = req.params.id;
    var files = fs.readdirSync(path.join(__dirname, '/o', id));
    var regex = /.html\b/i;
    var filename = "";
    for(var i = 0; i < files.length; i++){
        if(files[i].search(regex) !== -1){
            filename = files[i];
            break;
        }
    }
    if(filename === ""){
        console.log("Sending back to index");
        res.redirect('/');
    }
    else{
        console.log("Sending to " + path.join(__dirname, 'o/', id,files[i]));
        //res.sendFile(path.join(__dirname, 'o/24/', filename));
        res.sendFile(filename, {root: path.join(__dirname, 'o/', id)});
    }
});

app.get('/o/:id/custom.css', function(req, res) {
    var id = req.params.id;
    res.sendFile("custom.css", {root: path.join(__dirname, 'o/', id)});
});

app.get('/o/:id/download', function(req, res) {

    var id = req.params.id;
    if (fs.existsSync(path.join(__dirname, '/download', 'download' + id + '.zip'))) {
        console.log("Download already created, sending...");
        res.download(path.join(__dirname, '/download', 'download' + id + '.zip'));
    }
    else{
        console.log("Setting up download");
        var output = fs.createWriteStream(path.join(__dirname, '/download', 'download' + id + '.zip'));
        var archive = archiver('zip', {
            store: true
        });

        output.on('close', function() {
            console.log(archive.pointer() + ' BYTES TOTAL');
            console.log('DONE.');
            res.download(path.join(__dirname, '/download', 'download' + id + '.zip'));
        });

        archive.on('error', function(err) {
            throw err;
        });

        archive.pipe(output);
        archive.directory(path.join(__dirname, 'o/', id), '');
        archive.finalize();
    }
});

/**
 * On upload, receive file and save it to new folder
 */
app.post('/upload', function(req, res){

    var form = new formidable.IncomingForm();
    var newFile = new FileHandler();
    // Once file is received, try to create new directory and save it there
    form.on('file', function(field, file) {
        form.uploadDir = path.join(__dirname, '/o', uploadCount.toString());
        fs.mkdir(form.uploadDir, function(err){
            if(err){
                console.log("Cannot create directory");
            }
            else{
                fs.rename(file.path, path.join(form.uploadDir, file.name), function(){
                    newFile.setID(uploadCount);
                    newFile.setName(file.name);
                    newFile.genHTML(function(err){
                        if(err === 0){
                            console.log("Cannot create HTML");
                        }
                        else{
                            console.log("FINISHED");
                            res.json({success : "File Uploaded", id : newFile.id});
                            uploadCount++;
                        }
                    });


                });
            }
        });
    });

    form.on('error', function(err) {
        console.log('Error: \n' + err);
    });

    form.parse(req);
});

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.redirect('/');
});

module.exports = app;
