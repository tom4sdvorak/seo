var fs = require("fs");
var path = require('path');
var exec = require('child_process').exec;

function FileHandler() {
    this.id = 0;
    this.name = "default";

    this.setID = function(id){
        this.id = id;
        //console.log("Setting id: " + id);
    };

    this.getID = function(){
        return this.id;
    };

    this.setName = function(name){
        this.name = name;
        //console.log("Setting name: " + name);
    };

    this.getName = function(){
        return this.name;
    };

    /*
    Main function that creates necessary files
     */
    this.genHTML = function(callback){
        var id = this.id.toString();
        this.genJSON(function(err){
            if(err === 0){
                callback(0);
            }
            else{
                //console.log("Generating HTML");
                this.parsedJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '/o', id, "parsed.json"), 'utf8'));
                var name = this.parsedJSON.paper_name;
                var done = false;
                var streamHTML = fs.createWriteStream(path.join(__dirname, '/o', id, name.replace(/ /g, '-') + ".html"));
                this.writeHTML(streamHTML);
                streamHTML.on('finish', function(){
                    //console.log('Completed writing html');
                    if(done){
                        callback(1);
                    }
                    else{
                        done = true;
                    }
                });

                var streamCSS = fs.createWriteStream(path.join(__dirname, '/o', id, "custom.css"));
                this.writeCSS(streamCSS);
                streamCSS.on('finish', function(){
                    //console.log('Completed writing css');
                    if(done){
                        callback(1);
                    }
                    else{
                        done = true;
                    }
                });
            }
        }.bind(this));
    };

    this.genJSON = function(callback){
        var fileExists = fs.existsSync(path.join(__dirname, '/o', this.id.toString(), this.getName()));
        if(!fileExists) {
            console.log('Cannot parse. File does not exist at location' + fileExists);
            callback(0);
        }
        else{
            //console.log('Parsing pdf');
            var id = this.id.toString();
            exec('ruby ./parser.rb ' + path.join(__dirname, '/o', this.id.toString(), this.getName()) + ' ' + path.join(__dirname, '/o', this.id.toString(), "images"),{maxBuffer: 1000*1024} ,function(error, stdout, stderr){
                if(error !== null){
                    console.log('error: ' + error);
                    console.log('stderr: ' + stderr);
                    callback(0);
                }
                else{
                    var stream = fs.createWriteStream(path.join(__dirname, '/o', id , 'parsed.json'));
                    stream.write(stdout);
                    stream.end();
                    stream.on('finish', function(){
                        //console.log('Completed parsing json');
                        callback(1);
                    });
                }
            });
        }
    };

    /*
    Writes to stream all HTML tags based on reading of json file
     */
    this.writeHTML = function(stream){
        var chapters = new Array();
        var doingList = "none";
        var bulletRegex = /^•/gi;
        var numberRegex = /^\d+\./gi;
        stream.write('<!doctype html><html lang="cs"><head>');
        stream.write('<meta charset="utf-8">');
        stream.write('<meta name="author" content="' + this.parsedJSON.author + '">');
        stream.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        stream.write('<title>' + this.parsedJSON.paper_name + '</title>');
        stream.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">');
        stream.write('<link href="stylesheets/output_global.css" rel="stylesheet">');
        stream.write('<link href="custom.css" rel="stylesheet">');
        stream.write('</head><body>');
        stream.write('<span id="sidemenu" class="glyphicon glyphicon-menu-hamburger"></span>');
        stream.write('<div class="container"><div id="content"><section>');
        stream.write('<header><h1>' + this.parsedJSON.paper_name + '</h1>');
        chapters.push(this.parsedJSON.paper_name);
        stream.write('<p>' + this.parsedJSON.author + '</p></header>');

        // Loop for each object of chapters
        for(var chapter in this.parsedJSON.chapters){
            stream.write('<article><h2 id="chap' + chapters.length + '">' + this.parsedJSON.chapters[chapter].name + '</h2>');
            chapters.push(this.parsedJSON.chapters[chapter].name);
            // Loop for each object of content
            for(var content in this.parsedJSON.chapters[chapter].content){
                switch(this.parsedJSON.chapters[chapter].content[content].type) {
                    case "text/large":
                        stream.write('<h3>' + this.parsedJSON.chapters[chapter].content[content].text + '</h3>');
                        break;
                    case "text/plus":
                        stream.write('<h4>' + this.parsedJSON.chapters[chapter].content[content].text + '</h4>');
                        break;
                    case "text/normal":
                        //Check if item from list
                        if(this.parsedJSON.chapters[chapter].content[content].text.match(bulletRegex) !== null){
                            if(doingList !== "bullet"){
                                stream.write('<ul>');
                                doingList = "bullet";
                            }
                            stream.write('<li>' + this.parsedJSON.chapters[chapter].content[content].text.substr(1) + '</li>');
                        }
                        else if(this.parsedJSON.chapters[chapter].content[content].text.match(numberRegex) !== null){
                            if(doingList !== "number"){
                                stream.write('<ol>');
                                doingList = "number";
                            }
                            stream.write('<li>' + this.parsedJSON.chapters[chapter].content[content].text.substr(2) + '</li>');
                        }
                        else{
                            switch(doingList){
                                case "bullet":
                                    stream.write('</ul>');
                                    doingList = "none";
                                    break;
                                case "number":
                                    stream.write('</ol>');
                                    doingList = "none";
                                    break;
                                default:
                                    break;
                            }
                            stream.write('<p>' + this.parsedJSON.chapters[chapter].content[content].text + '</p>');
                        }
                        break;
                    case "text/small":
                        stream.write('<p class="text-small">' + this.parsedJSON.chapters[chapter].content[content].text + '</p>');
                        break;
                    case "list/bullet":
                        stream.write('<ul>');
                        // Loop for each item in items
                        for(var item in this.parsedJSON.chapters[chapter].content[content].items){
                            stream.write('<li>' + this.parsedJSON.chapters[chapter].content[content].items[item] + '</li>');
                        }
                        stream.write('</ul>');
                        break;
                    case "list/number":
                        stream.write('<ol>');
                        // Loop for each item in items
                        for(var item in this.parsedJSON.chapters[chapter].content[content].items){
                            stream.write('<li>' + this.parsedJSON.chapters[chapter].content[content].items[item] + '</li>');
                        }
                        stream.write('</ol>');
                        break;
                    case "image":
                        var imgFilename = this.parsedJSON.chapters[chapter].content[content].image_name;
                        var imgSubtitle = this.parsedJSON.chapters[chapter].content[content].subtitle;
                        var imgWidth = this.parsedJSON.chapters[chapter].content[content].width;
                        var imgHeight = this.parsedJSON.chapters[chapter].content[content].height;
                        stream.write('<figure><img src="../../' + imgFilename + '" alt="' + imgSubtitle +'" height="' + imgHeight + '" width="' + imgWidth + '"><figcaption>' + imgSubtitle + '</figcaption></figure>');
                        break;
                    default:
                        break;
                }
            }
            //Loop images and subtitles
            var regex = /.tif\b/i;
            if(this.parsedJSON.chapters[chapter].images.length === 0){
                continue;
            }
            else if(this.parsedJSON.chapters[chapter].images.length === this.parsedJSON.chapters[chapter].labels.length){
                for(var i = 0; i<this.parsedJSON.chapters[chapter].images.length; i++){
                    if(this.parsedJSON.chapters[chapter].images[i].search(regex) !== -1){
                        stream.write('<figure class="bad-image"><a href="images/' + this.parsedJSON.chapters[chapter].images[i] + '">Download Image</a><figcaption>' + this.parsedJSON.chapters[chapter].labels[i] + '</figcaption></figure>');
                    }
                    else {
                        stream.write('<figure><img src="images/' + this.parsedJSON.chapters[chapter].images[i] + '" alt="' + this.parsedJSON.chapters[chapter].labels[i] + '"><figcaption>' + this.parsedJSON.chapters[chapter].labels[i] + '</figcaption></figure>');
                    }
                }
            }
            else{
                for(var i = 0; i<this.parsedJSON.chapters[chapter].images.length; i++){
                    if(this.parsedJSON.chapters[chapter].images[i].search(regex) !== -1){
                        stream.write('<figure class="bad-image"><a href="images/' + this.parsedJSON.chapters[chapter].images[i] + '">Download Image</a></figure>');
                    }
                    else{
                        stream.write('<figure><img src="images/' + this.parsedJSON.chapters[chapter].images[i] + '" alt="' + this.parsedJSON.paper_name + '-' + this.parsedJSON.chapters[chapter].name + '"></figure>');
                    }
                }
                for(var i = 0; i<this.parsedJSON.chapters[chapter].labels.length; i++){
                    stream.write('<p class="unord-labels">' + this.parsedJSON.chapters[chapter].labels[i] + '</p>');
                }
            }
            stream.write('</article>');
        }
        stream.write('</section></div><footer>' + this.parsedJSON.author + '</footer>');
        stream.write('<nav><ol>');
        for(var i = 0; i < chapters.length; i++){
            if(i > 0){
                stream.write('<li><a href ="#chap' + i + '">' + chapters[i] + '</a></li>');
            }
            else{
                stream.write('<b>' + chapters[i] + '</b>');
            }
        }
        stream.write('</ol>');
        stream.write('<a href="download" id="dl-button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-download-alt"></span> Download</a></nav></div>');
        stream.write('<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>');
        stream.write('<script src="javascripts/output_global.js"></script>');
        stream.write('</body></html>');
        stream.end();
    };

    /*
     Writes to stream all css properties based on reading of json file
     */
    this.writeCSS = function(stream){
        stream.write('nav { display:none }');
        stream.write('#sidemenu { display:none }');
        stream.write('img { max-width:90%; height:auto }');
        stream.end();
    };
}

module.exports = FileHandler;

