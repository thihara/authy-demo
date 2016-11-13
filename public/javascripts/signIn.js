/**
 * Created by thihara
 */
$(document).ready(function () {
    $("#signInForm").submit(function (event) {
        event.preventDefault();
    }).validate({
        rules : {
            userName : "required",
            password : "required"
        },
        messages : {
            userName: "Please enter your  username.",
            password: "Please enter your password."
        },
        submitHandler : submitSignIn
    });
});

function submitSignIn(form) {
    $.post("/authenticate",$(form).serialize(), function (responseData) {
        if(responseData.success){
            window.location.replace("/twoFactor");
        } else {
            $("#errorDiv").html(responseData.error);
        }
    })
}