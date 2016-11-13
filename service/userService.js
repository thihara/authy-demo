/**
 * Created by thihara on 11/12/16.
 */
let pg = require("pg");
let path = require("path");
let fs = require("fs");
let crypto = require("crypto");
let authy = require("authy")("yikEROzvwM43cHJvV7DFNa9GnClsBRA6");

/**
 * Class containing all the user related service.
 */
class UserService {
    constructor() {
        let config = JSON.parse(fs.readFileSync(path.resolve("config/postgresql.json"), "utf8"));

        let dbConfig = {
            user: config.user,
            database: config.database,
            password: config.password,
            host: config.host,
            port: config.port,
            max: config.max,
            idleTimeoutMillis: config.idleTimeoutMillis
        };

        //Initialize the connection pool.
        this.pool = new pg.Pool(dbConfig);

        /**
         * If an error is encountered by a client while it sits idle in the pool the pool itself will emit an
         * error event with both the error and the client which emitted the original error.
         */
        this.pool.on('error', function (err, client) {
            this.logerror('Idle client error. Probably a network issue or a database restart.'
                + err.message + err.stack);
        });
    }

    /**
     * Check if the username exists and returns a true or false value through the provided callback.
     * Errors are suppressed.
     *
     * @param userName Username to check.
     * @param callback Callback to be invoked, should accept a bollean, true if user exist, false if an error is
     *                 encountered or the user doesn't exist.
     */
    doesUserNameExist(userName, callback) {
        let query = 'SELECT EXISTS(SELECT 1 FROM user_details WHERE user_name=$1) AS "exists"';
        this.executeQuery(query, [userName], (err, results) => {
            if (err) {
                console.error('Error running query. ' + err);
                return callback(false);
            }

            return callback(results.rows[0].exists);
        });
    }

    /**
     * Executes a DB query.
     * @param query The query to be executed.
     * @param params Parameters for the query, should be an Array.
     * @param callback Callback to be invoked after the query has completed. Should accept two parameters,
     *                 error and result.
     */
    executeQuery(query, params, callback) {
        this.pool.connect((conErr, client, done) => {
            if (conErr) {
                console.error('Error fetching client from pool. ' + conErr);
                return callback(conErr);
            }

            client.query(query, params, callback);

            done();
        });
    }

    /**
     * Creates a new user in the Authy service and then creates a new user in the database with the given parameters.
     *
     * @param userName User's user name.
     * @param fullName User's full name
     * @param unhashedPassword User's password, unhashed.
     * @param phone User's phone number without the country code.
     * @param countryCode User's phone number's country code.
     * @param callback Callback to be invoked after all operations completed. Should accept one parameter, error.
     */
    createNewUser(userName, fullName, unhashedPassword, phone, countryCode, callback) {
        authy.register_user(userName, phone, countryCode, (err, res) => {
            if (err) {
                return callback(err);
            }
            let authyID = res.user.id;

            this.saveUser(unhashedPassword, userName, fullName, phone, countryCode, authyID, callback);
        });
    }

    /**
     * Saves the user in the database. All parameters are exactly the same
     * as createNewUser function. Gernates the salt and hashes the password.
     */
    saveUser(unhashedPassword, userName, fullName, phone, countryCode, authyID, callback) {
        let salt = this.generateSalt();
        let hashedPassword = this.hashWithSHA512(unhashedPassword, salt);

        let query = `INSERT INTO user_details(user_name, full_name, password, salt, phone, country_code, authy_id) 
                        VALUES($1,$2,$3,$4,$5,$6,$7)`;
        let params = [userName, fullName, hashedPassword, salt, phone, countryCode, authyID];

        this.executeQuery(query, params, (err, results) => {
            if (err) {
                console.error('Error running query. ' + err);
            }

            //null or error, since there's only one parameter in the callback, one invocation is enough.
            callback(err);
        })
    }

    /**
     * Authenticates the user by checking the username and password. Also initiates a Authy one touch request
     * and an Authy code based two factor authorization.
     *
     * @param userName User name to be authenticated.
     * @param unhashedPassword Unhashed password of the user to be matched against.
     * @param callback Callback to be invoked when all operations have completed. Should accept two
     *                 parameters, error and user. User object contains fullName, userName, authyID, phone,
     *                 countryCode and oneTouchUUID fields.
     */
    authenticateUser(userName, unhashedPassword, callback) {
        this.executeQuery("SELECT * FROM user_details WHERE user_name=$1", [userName], (err, results) => {
            if (err || !results.rows[0]) {
                //Error or null if no row is returned for the given user name.
                return callback(err);
            }

            let fullName = results.rows[0]["full_name"];
            let password = results.rows[0]["password"];
            let salt = results.rows[0]["salt"];
            let authyID = results.rows[0]["authy_id"];
            let phone = results.rows[0]["phone"];
            let countryCode = results.rows[0]["country_code"];

            if (!this.checkPassword(unhashedPassword, salt, password)) {
                return callback(null, null);
            }

            let user = {
                fullName: fullName,
                userName: userName,
                authyID: authyID,
                phone: phone,
                countryCode: countryCode
            };

            this.sendOneTouchRequest(user, (authError, user) => {
                if (authError) {
                    return callback(authError);
                }

                //The callback will be invoked inside the function, no need to invoke it here.
                this.authorizeWithAuthy(user, callback);
            });
        });
    }

    /**
     * Initiates an Authy authorization request.
     */
    authorizeWithAuthy(user, callback) {
        authy.request_sms(user.authyID, (err, res) => {
            if (err) {
                return callback(err);
            }

            callback(null, user);
        });
    }

    /**
     * Initiates an Authy one touch authorization request and sets the oneTouchUUID in the user object.
     */
    sendOneTouchRequest(user, callback) {
        let url = `/onetouch/json/users/${user.authyID}/approval_requests`;

        authy._request("post", url, {
            "details[Email Address]": user.userName,
            "message": "Please authorize login to the registration demo app."
        }, (err, response) => {
            if (err) {
                return callback(err);
            }
            user.oneTouchUUID = response.approval_request.uuid;
            callback(null, user);
        });
    }

    /**
     * Checks the one touch authorization request's status.
     * @param uuid UUID of the on touch request.
     * @param callback Callback to be invoked when request completes, Should accept two paramters, error and status.
     *                 status can be of value "approved", "rejected" or pending.
     */
    isOneTouchAuthorized(uuid, callback) {
        let url = `/onetouch/json/approval_requests/${uuid}`;

        authy._request("get", url, {}, (err, response) => {
            if (err) {
                return callback(err);
            }
            let status = response.approval_request.status;

            callback(null, status);
        });
    }

    /**
     * Verify the given token against the Authy service to check if it's the correct one.
     * @param authyID The Authy user ID/
     * @param token Token to be validated.
     * @param callback Callback to be invoked after all operations complete. Should accept two parameters,
     *                 error and response.
     */
    verifyAuthyCode(authyID, token, callback) {
        authy.verify(authyID, token, (err, res) => {
            if (err) {
                return callback(err);
            }

            callback(null, res);
        });
    }

    /**
     * Generates a random string 10 characters long for the salt value.
     * @returns {string} The generated salt value.
     */
    generateSalt() {
        let length = 10;
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    /**
     * Hashes a password with the given salt and sha512 algorithm.
     * @param password Password to be hashed.
     * @param salt The random salt value.
     * @returns {*} The hashed password.
     */
    hashWithSHA512(password, salt) {
        let hash = crypto.createHmac('sha512', salt);
        hash.update(password);

        return hash.digest('hex');
    }

    /**
     * Checks if the password matches the hashed password.
     * @param unhashedPassword The unhashed password.
     * @param salt The original salt used to hash the password.
     * @param hashedPassword The hashed password.
     * @returns {boolean} true if the passwords match, false otherwise.
     */
    checkPassword(unhashedPassword, salt, hashedPassword) {
        return hashedPassword == this.hashWithSHA512(unhashedPassword, salt);
    }
}

module.exports = UserService;