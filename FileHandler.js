var fs = require("fs");
var path = require('path');

function FileHandler() {
    this.id = 0;
    this.name = "default";

    /*
    Sets ID of file which is also name of folder where it is located
     */
    this.setID = function(id){
        this.id = id;
        console.log("Setting id: " + id);
    }

    /*
    Sets name of the file including extension
     */

    this.setName = function(name){
        this.name = name;
        console.log("Setting name: " + name);
    }

    /*
    Main function that creates necessary files
     */
    this.genHTML = function(){
        console.log("Generating HTML");
        this.parsedJSON = JSON.parse(fs.readFileSync('./sample.json', 'utf8'));
        var name = this.parsedJSON.paper_name;

        var stream = fs.createWriteStream(path.join(__dirname, '/o', this.id.toString(), name.replace(/ /g, '-') + ".html"));
        this.writeHTML(stream);
        stream.on('finish', function(){
            console.log('Completed writing html');
        });

        stream = fs.createWriteStream(path.join(__dirname, '/o', this.id.toString(), "custom.css"));
        this.writeCSS(stream);
        stream.on('finish', function(){
            console.log('Completed writing css');
        });
    }

    /*
    Writes to stream all HTML tags based on reading of json file
     */
    this.writeHTML = function(stream){
        var chapters = new Array();
        stream.write('<!doctype html><html lang="cs"><head><meta charset="utf-8">');
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
        stream.write('</ol></nav></div>');
        stream.write('<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>');
        stream.write('<script src="javascripts/output_global.js"></script>');
        stream.write('</body></html>');
        stream.end();
    }

    /*
     Writes to stream all css properties based on reading of json file
     */
    this.writeCSS = function(stream){
        stream.write('body { ');
        stream.write('color: '+ this.parsedJSON.font_color + ';');
        stream.write('background-color: '+ this.parsedJSON.background_color + ';');
        stream.write('}');
        stream.end();
    }
}

module.exports = FileHandler;

