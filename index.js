/**
 * Created by thihara
 */
let express = require("express");
let path = require("path");
let session = require('express-session');
var users = require('./routes/users');
let app = express();

app.use(session({secret: "registration app"}));

app.all("/private/*", function(req, res, next) {
    if (req.session.loggedInUser && req.session.twoFactorAuthComplete) {
        next();
    } else if(req.session.loggedInUser && !req.session.twoFactorAuthComplete) {
        res.redirect("/twoFactor");
    } else if(req.session.loggedInUser && req.session.twoFactorAuthComplete && !req.session.oneTouchApproved) {
        res.redirect("/oneTouch");
    } else {
        res.redirect("/");
    }
});

app.use(express.static("public"));
app.use("/private", express.static("private", {redirect:false}));

app.use('/', users);

app.get('/', (req, res, next) => {
    res.sendFile(path.resolve("public/html/index.html"));
});

app.get('/signup', (req, res, next) => {
    res.sendFile(path.resolve("public/html/signup.html"));
});

app.get('/twoFactor', (req, res, next) => {
    if(req.session.loggedInUser) {
        res.sendFile(path.resolve("private/html/twoFactor.html"));
    } else {
        res.redirect("/");
    }
});

app.get('/oneTouch', (req, res, next) => {
    if(req.session.loggedInUser && req.session.twoFactorAuthComplete) {
        res.sendFile(path.resolve("private/html/oneTouch.html"));
    } else if(req.session.loggedInUser) {
        res.redirect("/twoFactor");
    } else {
        res.redirect("/");
    }
});

app.listen(process.env.PORT || 8080, () => {
    console.log("Serer started on port 8080");
});