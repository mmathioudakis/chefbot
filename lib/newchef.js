'use strict';

var chefutils = require('./chefutils.js');
var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var DELAY_THRESHOLD_MS = 120000; // 2 minutes


var TUAS_str = '<http://www.amica.fi/en/restaurants/' 
        + 'ravintolat-kaupungeittain/espoo/tuas/|TUAS>';
var CS_str = '<http://www.sodexo.fi/tietotekniikantalo|CS>';


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
    if (this._isChannelMessageToBot(message)) {
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
    })[0].profile.first_name;
    this.postMessageToChannel(channel.name, 
    	'Hey, ' + userName + '!\n' +
    	'Check out food options at ' + TUAS_str + '  and ' + CS_str + '.',
    	{as_user: true});
};

ChefBot.prototype._setState = function(state_id) {
    var time = new Date().toISOString();
    this.state = state_id;
    this.lastTime = time;

    console.log('New state: ' + this.state + '\t(' + this.lastTime + ')');
}


ChefBot.prototype._chatDirectly = function (message) {
    // this function implements chat logic
    var userID = message.user;
    var userEntry = this.users.filter(function (user) {
        return user.id === userID;
    })[0];

    var userName = userEntry["name"];
    var first_name = userEntry["profile"]["first_name"];

    // has it been a long time? reset dialog
    if (this.lastTime !== null) {
        var delay = new Date().getTime() - new Date(this.lastTime).getTime();
        if (delay > DELAY_THRESHOLD_MS) {
            this._setState(null);
            this.postMessageToUser(userName,
                "oh it's you!\n" + 
                    "(it took you some time to say something, sooo...\n" + 
                        "I went away to work in the meantime... :sleeping:)");
        }
    }

    switch(this.state) {
        case null:
            // the user said something, we do not care what
            // all we do is schedule for food
            this._setState('__GO__ASKFORTIME__');
            
            var greeting_message = 'glad to hear from you, ' + first_name +
                '...\ngoing for lunch today? yes / no?';
            this.postMessageToUser(userName,
                greeting_message,
                function(result) {
                    if (result.ok == false) {
                        // TODO ...
                    }
                });
            break;
        case '__GO__ASKFORTIME__':
            // the user tells us whether they are going for lunch
            var response = message.text.toLowerCase();
            console.log("RESPONSE:\n" + response);
            var yesIdx = response.indexOf('yes');
            var noIdx = response.indexOf('no');
            if (yesIdx >= 0 && noIdx == -1) {
                this.postMessageToUser(userName,
                    "great! what time works best for you? 12:00? " +
                    "12:30? other (HH:MM)? ");
                this._setState('__GETTIME__ASKFORVENUE__');
            } else if (yesIdx == -1 && noIdx >= 0) {
                this.postMessageToUser(userName,
                    "no? some other time maybe...\n" + 
                    "NOW BACK TO WORK! " + 
                    ":nerd_face::stuck_out_tongue_winking_eye:" +
                    ":flushed::sob:");
                this._setState(null);
            } else {
                this.postMessageToUser(userName,
                    "it's in your nature as human to be confused...\n" +
                    "talk to me again when you're a bot :robot_face:");
                this._setState(null);
            }
            break;
        case '__GETTIME__ASKFORVENUE__':
            // parse time provided
            // console.log("DEBUG: ", message.text);
            var times = chefutils.parseTime(message.text);
            console.log(times);
            var times_str = chefutils.join(times);
            
            // confirm and ask for venue
            var confirmation = "Ok, I recorded " + times_str +
                " as your response" + (times.length > 1 ? "s" : "") + ".";
            var question = "Where would you like to go?\n" +
                TUAS_str + "?\n" +
                CS_str + "?\n" + 
                "Either?"
            this.postMessageToUser(userName,
                confirmation + "\n" + question);
            this._setState('__GETVENUE__END__');
            break;
        case '__GETVENUE__END__':
            // parse venue selection

            // end discussion
            this.postMessageToUser(userName,
                    "thanks for the info!");
            this._setState(null);
            break;
        default:
            this.postMessageToUser(userName,
                "TELL MICHAEL I'M BROKEN'!!!1! LOL :scream:");
            break;
    }
}

// ChefBot.prototype._parseTime = function(text) {
//     var times_array = text.match(/[0-9]?[0-9]:[0-9][0-9]/g);
//     return times_array;
// }

ChefBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];

    // used for chat logic
    this.state = null; 
    this.lastTime = null;
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
