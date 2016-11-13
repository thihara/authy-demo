/**
 * Created by thihara
 */
$(document).ready(function () {
    $("#twoFactorForm").submit(function (event) {
        event.preventDefault();
    }).validate({
        rules : {
            authyToken : "required"
        },
        messages : {
            authyToken: "Please enter the verification token."
        },
        submitHandler : submitAuthyCode
    });
});

function submitAuthyCode(form) {
    $.post("/authorize",$(form).serialize(), function (responseData) {
        if(responseData.success){
            window.location.replace("/oneTouch");
        } else {
            $("#errorDiv").html(responseData.error.message);
        }
    })
}