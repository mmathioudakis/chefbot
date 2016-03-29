'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');


var ChefBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'chef';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'chefbot.db');

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(ChefBot, Bot);


ChefBot.prototype.run = function () {
    ChefBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};


ChefBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
    // console.log(this.users);
};


ChefBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromChefBot(message) &&
        this._isMentioningChef(message)
    ) {
        this._replyToUser(message);
    }
};


ChefBot.prototype._replyToUser = function (message) {
	// console.log(message);
    var channel = this._getChannelById(message.channel);
    var userID = message.user;
    var userName = this.users.filter(function (user) {
        return user.id === userID;
    })[0].real_name;
    this.postMessageToChannel(channel.name, 
    	'Hey, ' + userName + "!\n" +
    	'Check out food options at <http://www.amica.fi/en/restaurants/ravintolat-kaupungeittain/espoo/tuas/|TUAS> and <http://www.sodexo.fi/tietotekniikantalo|CS>.',
    	{as_user: true});
};


ChefBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};


ChefBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};


ChefBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};


ChefBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name,
    	'Hi everyone!',
        {as_user: true});
};


ChefBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};


ChefBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};


ChefBot.prototype._isMentioningChef = function (message) {
	var msg = message.text.toLowerCase();
    return msg.indexOf('lunch') > -1 || 
    		msg.indexOf('eat') < -1 ||
    		msg.indexOf(this.name) > -1;
};


ChefBot.prototype._isFromChefBot = function (message) {
    return message.user === this.user.id;
};


ChefBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = ChefBot;
