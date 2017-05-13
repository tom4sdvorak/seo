$(document).ready(function() {
    var toggled = false;
    $("#sidemenu").click(function() {
        if(toggled){
            toggled = false;
            $("nav").css("margin-left", "-25em");
        }
        else{
            toggled = true;
            $("nav").css("margin-left", "0em");
        }
    });
});