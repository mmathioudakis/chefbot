'use strict';

/**
 *
 * Usage:
 *
 *   node databaseGenerator.js [destFile]
 *
 *   destFile is optional and it will default to "chefbot.db"
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 * @author Michael Mathioudakis <michalis@michalis.co>
 */

var path = require('path');
var request = require('request');
var Async = require('async');
var ProgressBar = require('progress');
var sqlite3 = require('sqlite3').verbose();

var outputFile = process.argv[2] || path.resolve(__dirname, 'chefbot.db');
var db = new sqlite3.Database(outputFile);

// executes an API request to count all the available jokes
request('http://api.icndb.com/jokes/count', function (error, response, body) {
    if (!error && response.statusCode === 200) {
        var count = JSON.parse(body).value;
        var savedJokes = 0;
        var index = 0;
        var bar = new ProgressBar(':bar :current/:total', {total: count});

        // Prepares the database connection in serialized mode
        db.serialize();
        // Creates the database structure
        db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
        
        // On completion we just need to show errors in case we had any and close the database connection
        var onComplete = function (err) {
            db.close();
            if (err) {
                console.log('Error: ', err);
                process.exit(1);
            }
        };
    }
});
