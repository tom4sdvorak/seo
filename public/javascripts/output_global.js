$(document).ready(function() {
    var toggled = false;
    $("#sidemenu").click(function() {
        if(toggled){
            toggled = false;
            $("nav").css("width", "0em");
        }
        else{
            toggled = true;
            $("nav").css("width", "25em");
        }
    });
});