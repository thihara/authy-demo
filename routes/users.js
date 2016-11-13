let express = require('express');
let bodyParser = require("body-parser");
let UserService = require("../service/userService");
let userService = new UserService();
let urlEncodedBodyParser = bodyParser.urlencoded({extended: false});
let router = express.Router();

router.get("/userName", (req, res, next) => {
    let userName = req.query.userName;
    if (!userName) {
        return res.status(400).json({error: "userName parameter missing."});
    }

    userService.doesUserNameExist(userName, (exists) => {
        if (exists) {
            res.json("Username already taken.");
        } else {
            res.json("true");
        }
    });
});

router.post("/authenticate", urlEncodedBodyParser, (req, res, next) => {
    let userName = req.body.userName;
    let password = req.body.password;
    if (!userName || !password) {
        return res.status(400).json({error: "userName password parameter missing."});
    }

    userService.authenticateUser(userName, password, (error, user) => {
        if (error) {
            res.json({success: false, error: JSON.stringify(error)});
        } else if (user == null) {
            res.json({success: false, error: "Incorrect username or password."});
        } else {
            req.session.loggedInUser = user;
            res.json({success: true, user: user});
        }
    });
});

router.post("/register", urlEncodedBodyParser, (req, res, next) => {
    let userName = req.body.userName;
    let password = req.body.password;
    let confirmPassword = req.body.confirmPassword;
    let fullName = req.body.fullName;
    let countryCode = req.body.countryCode;
    let phone = req.body.phone;

    if (!userName || !password || !confirmPassword || !fullName || !countryCode || !phone
        || password != confirmPassword) {
        return res.status(400).json({
            success: false, error: `userName, password, confirmPassword, countryCode, phone or 
            fullName parameter missing. Or password and confirmPassword doesn't match.`
        });
    }

    userService.createNewUser(userName, fullName, password, phone, countryCode, (error) => {
        if (error) {
            res.json({success: false, error: JSON.stringify(error)});
        } else {
            res.json({success: true});
        }
    });
});

router.post("/authorize", urlEncodedBodyParser, (req, res, next) => {

    let authyToken = req.body.authyToken;

    if (!authyToken) {
        return res.status(400).json({success: false, error: "authyToken parameter missing."});
    } else if (!req.session.loggedInUser) {
        return res.status(400).json({success: false, error: "Please login with username and password first."});
    }

    let authyID = req.session.loggedInUser.authyID;

    userService.verifyAuthyCode(authyID, authyToken, (error) => {
        if (error) {
            res.json({success: false, error: JSON.stringify(error)});
        } else {
            req.session.twoFactorAuthComplete = true;
            res.json({success: true});
        }
    });
});

router.get("/oneTouchAuth", (req, res, next) => {
    let uuid = req.session.loggedInUser.oneTouchUUID;

    userService.isOneTouchAuthorized(uuid, (err, authStatus) => {
        if (err) {
            return res.json({success: false, error: JSON.stringify(err)});
        }

        if (authStatus == "approved") {
            req.session.oneTouchApproved = true;
        } else if (authStatus == "rejected") {
            req.session.loggedInUser = null;
            req.session.twoFactorAuthComplete = false;
        }

        res.json({success: true, status: authStatus})
    });
});

module.exports = router;