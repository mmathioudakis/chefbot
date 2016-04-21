#!/usr/bin/env node

'use script';

// select the instance of chef to run
// var ChefBot = require('../lib/newchef'); // development
var ChefBot = require('../lib/chefbot'); // stable

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var chefbot = new ChefBot({
	token: token,
	dbPath: dbPath,
	name: name
});

chefbot.run();