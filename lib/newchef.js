'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');


var ChefBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'chef';

    this.user = null;
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
};

ChefBot.prototype._onMessage = function (message) {
    // console.log(message);
    if ( this._isChannelMessageToBot(message)) {
        this._replyOnChannel(message);
    } else if (this._isDirectMessageToBot(message)) {
        this._chatDirectly(message);
    }
};

ChefBot.prototype._isChannelMessageToBot = function(message) {
    return this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromChefBot(message) &&
        this._isMentioningChef(message);
}

ChefBot.prototype._isDirectMessageToBot = function(message) {
    return this._isChatMessage(message) &&
        this._isDirectMessage(message) &&
        !this._isFromChefBot(message);
}


ChefBot.prototype._replyOnChannel = function (message) {
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


ChefBot.prototype._chatDirectly = function (message) {
    // this implements chat logic
    var userID = message.user;
    var userEntry = this.users.filter(function (user) {
        return user.id === userID;
    })[0];
    var first_name = userEntry["profile"]["first_name"];


    console.log(userEntry["profile"]);

    this.postMessageToUser(userEntry.name,
        'I hear you, ' + first_name + "...");

}


ChefBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
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
        message.channel[0] === 'C';
};

ChefBot.prototype._isDirectMessage = function(message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'D';
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
