require 'json'
content1 = {text: "I'm a nice big text", type:"text/large"}
content2 = {text: "A wall of normal text that we need to render nicely in a paragraph. A wall of normal text that we need to render nicely in a paragraph. A wall of normal text that we need to render nicely in a paragraph. A wall of normal text that we need to render nicely in a paragraph. A wall of normal text that we need to render nicely in a paragraph. A wall of normal text that we need to render nicely in a paragraph. A wall of normal text that we need to render nicely in a paragraph.", type:"text/normal"}

bullet = {type: "list/bullet", items: ["The first line", "The second line", "The third line"] }


chapter1 = {name: "First chapter of the thesis.", content: [content1, content2, bullet]}
chapter2 = {name: "Second chapter of the thesis.", content: [content2, content1]}


root = Hash.new
root[:author] = "Roman Vocásek"
root[:background_color] = "inherit"
root[:font_color] = "inherit"
root[:chapters] = [chapter1, chapter2]
root[:paper_name] = "Advanced bullshit advancements"


print root.to_json

