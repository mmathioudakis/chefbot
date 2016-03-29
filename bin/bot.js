#!/usr/bin/env node

'use script';

var ChefBot = require('../lib/chefbot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var chefbot = new ChefBot({
	token: token,
	dbPath: dbPath,
	name: name
});

chefbot.run();