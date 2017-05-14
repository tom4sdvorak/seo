var fs = require("fs");
var path = require('path');
var exec = require('child_process').exec;

function FileHandler() {
    this.id = 0;
    this.name = "default";

    this.setID = function(id){
        this.id = id;
        console.log("Setting id: " + id);
    };

    this.getID = function(){
        return this.id;
    };

    this.setName = function(name){
        this.name = name;
        console.log("Setting name: " + name);
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
                console.log("Generating HTML");
                this.parsedJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '/o', id, "parsed.json"), 'utf8'));
                var name = this.parsedJSON.paper_name;

                var stream = fs.createWriteStream(path.join(__dirname, '/o', id, name.replace(/ /g, '-') + ".html"));
                this.writeHTML(stream);
                stream.on('finish', function(){
                    console.log('Completed writing html');
                });

                stream = fs.createWriteStream(path.join(__dirname, '/o', id, "custom.css"));
                this.writeCSS(stream);
                stream.on('finish', function(){
                    console.log('Completed writing css');
                    callback(1);
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
            console.log('Parsing pdf');
            var id = this.id.toString();
            exec('ruby ./parser.rb ' + path.join(__dirname, '/o', this.id.toString(), this.getName()), function(error, stdout, stderr){
                console.log('error: ' + error);
                console.log('stderr: ' + stderr);
                var stream = fs.createWriteStream(path.join(__dirname, '/o', id , 'parsed.json'));
                stream.write(stdout);
                stream.end();
                stream.on('finish', function(){
                    console.log('Completed parsing json');
                    callback(1);
                });
            });
        }
    };

    /*
    Writes to stream all HTML tags based on reading of json file
     */
    this.writeHTML = function(stream){
        var chapters = new Array();
        stream.write('<!doctype html><html lang="cs"><head>');
        stream.write('<meta charset="utf-8">');
        stream.write('<meta name="keywords" content="' + this.parsedJSON.keywords + '">');
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
                        stream.write('<p class="text-normal">' + this.parsedJSON.chapters[chapter].content[content].text + '</p>');
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
        stream.end();
    };
}

module.exports = FileHandler;

