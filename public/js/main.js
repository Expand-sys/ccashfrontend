$(document).ready(function(){
    $("#transactions a").click(function(e){
        e.preventDefault();
        $(this).tab('show');
    });
});

$(document).ready(function(){
    $("#market a").click(function(e){
        e.preventDefault();
        $(this).tab('show');
    });
});

function onSubmit(token) {
    document.getElementById("register").submit();
}
