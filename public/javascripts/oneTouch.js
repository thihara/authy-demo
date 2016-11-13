/**
 * Created by thihara
 */
$(document).ready(function () {
    checkOneTouchStatus();
});

function checkOneTouchStatus() {
    $.get("/oneTouchAuth",{}, function (responseData) {
        if(responseData.success){
            if(responseData.status == "pending"){
                console.log("Request pending");
                setTimeout(checkOneTouchStatus, 1000);
            } else if(responseData.status == "denied") {
                console.log("One Touch Denied.");
                $("#statusText").html("One Touch request denied. Redirecting. in 3 seconds..");
                setTimeout(redirectOnFailure, 3000);
            } else if(responseData.status == "approved") {
                $("#statusText").html("One Touch request approved. Redirecting. in 3 seconds..");
                setTimeout(redirectOnSuccess, 3000);
            }
        } else {
            $("#errorDiv").html(responseData.error.message);
            setTimeout(checkOneTouchStatus, 1000);
        }
    });
}

function redirectOnSuccess() {
    window.location.replace("/private/html/loggedIn.html");
}

function redirectOnFailure() {
    window.location.replace("/");
}