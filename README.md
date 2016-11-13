# Authy demo application

An express js application to demonstrate twilio authy](https://www.twilio.com/authy) integration. Thie sample app
is integrated with twilio two factor authentication and it's one touch api.

## Dependencies

This application has the following dependencies.

    "authy": "^1.2.0",
    "body-parser": "^1.15.2",
    "crypto": "0.0.3",
    "express": "~4.13.4",
    "express-session": "^1.14.2",
    "pg": "^6.1.0"

This application is written with `ES6`  and therefor needs `node >= 6` in order to run.

## Database

This application needs to connect to an postgresql database to persist and retrieve user data.

Please use the following table creation statement.

```sql
    CREATE TABLE USER_DETAILS(
        USER_NAME           TEXT PRIMARY KEY NOT NULL,
        FULL_NAME           TEXT NOT NULL,
        PASSWORD            TEXT NOT NULL,
        SALT                TEXT NOT NULL,
        PHONE TEXT NOT NULL,
        COUNTRY_CODE TEXT NOT NULL,
        AUTHY_ID TEXT NOT NULL
    );
```

The database connection parameters can be changed from the `postgresql.json` file in the `config` folder.

## Installation

Install the dependencies with

```
    npm install
```

Run the application with

```
    npm start
```

or

```
    node index.js
```

## Important

You will need a smart phone to install the [authy mobile app](https://play.google.com/store/apps/details?id=com.authy.authy&hl=en)
to test this application.

Make sure to enter the proper country code and phone number. The validation currently in place isn't exact.
For example for my mobile number `+94721234567` the country code is `+94` (Sri Lanka) and the mobile is `721234567`.