/**
 * Created by thihara
 */
$(document).ready(function () {
    $("#signupForm").submit(function (event) {
        event.preventDefault();
    }).validate({
        rules : {
            fullName : "required",
            userName : {
                required: true,
                email: true,
                remote: "/userName"
            },
            password : "required",
            countryCode : "required",
            phone : {
                required : true,
                digits : true
            },
            confirmPassword : {
                required: true,
                equalTo: "#password"
            }
        },
        messages : {
            fullName: "Please enter your full name.",
            userName: {
                required: "Please enter your desired username.",
                email: "Invalid E-Mail address.",
                remote: "The username is already taken."
            },
            password: "Please enter your password.",
            countryCode : "Please enter the country code of the phone.",
            phone : "Please enter the phone number.",
            confirmPassword: {
                required: "Please confirm your password.",
                equalTo: "Passwords do not match."
            }
        },
        submitHandler : submitSignup
    });
});

function submitSignup(form) {
    $.post("/register",$(form).serialize(), function (responseData) {
        if(responseData.success){
            window.location.replace("/html/registrationSuccessful.html");
        } else {
            $("#errorDiv").html(responseData.error);
        }
    })
}