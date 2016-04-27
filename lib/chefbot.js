'use strict';

var chefutils = require('./chefutils.js');
var util = require('util');
var path = require('path');
var fs = require('fs');
// var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var DELAY_THRESHOLD_MS = 120000; // 2 minutes


var TUAS_str = '<http://www.amica.fi/en/restaurants/' 
        + 'ravintolat-kaupungeittain/espoo/tuas/|TUAS>';
var CS_str = '<http://www.sodexo.fi/tietotekniikantalo|CS>';


var ChefBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'chef';
    this.user = null;
    // used for chat logic
    this.state = null; 
    this.lastTime = null;
    this.preferences = null;

};

// inherits methods and properties from the Bot constructor
util.inherits(ChefBot, Bot);


ChefBot.prototype.run = function () {
    ChefBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};


ChefBot.prototype._onStart = function () {
    this._init();
    this._loadBotUser();
};

ChefBot.prototype._onMessage = function (message) {
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

    var channelMessage = 'Hey, ' + userName + '!\n' +
        'Check out food options at ' + TUAS_str +
        '  and ' + CS_str + '.';

    if (this.preferences.size > 0) {
        var timesPrefs = [];
        var venuePrefs = [];
        for (let userPref of this.preferences.entries()) {
            for (let t of userPref[1].get('times')) {
                timesPrefs.push(t);
            }
            for (let v of userPref[1].get('venues')) {
                venuePrefs.push(v);
            }
        }
        var timesCounts = chefutils.count(timesPrefs);
        var venuesCounts = chefutils.count(venuePrefs);

        console.log("[_replyOnChannel]\n");
        console.log(timesCounts);
        console.log(venuesCounts);

        var timesCountsStr = "";
        timesCounts.forEach(function(y, x) {
            console.log(x);
            if (timesCountsStr.length > 0) {
                timesCountsStr = timesCountsStr + ", " + x +
                    " (" + y + " people)";
            } else {
                timesCountsStr = x + " (" + y + " people)";
            }
        });

        var venuesCountsStr = "";
        venuesCounts.forEach(function(y, x) {
            console.log(x);
            if (venuesCountsStr.length > 0) {
                venuesCountsStr = venuesCountsStr + ", " + x +
                    " (" + y + " people)";
            } else {
                venuesCountsStr = x + " (" + y + " people)";
            }
        })

        var prefStr = "\nTime preferences: " + timesCountsStr + 
            "\nPlace preferences: " + venuesCountsStr;

        // var prefStr = "\nTime preferences: " + timesPrefs.toString() + 
        //     "\nPlace preferences: " + venuePrefs.toString();
        channelMessage = channelMessage + prefStr;
    } else {
        console.log("[_replyOnChannel] Found empty preferences.");
    }
    this.postMessageToChannel(channel.name, 
        channelMessage, {as_user: true});
};

ChefBot.prototype._setState = function(state_id) {
    var time = new Date().toISOString();
    this.state = state_id;
    this.lastTime = time;

    console.log('[_setState] New state: ' + this.state +
        '\t(' + this.lastTime + ')');
}


ChefBot.prototype._chatDirectly = function (message) {
    // this function implements chat logic
    // TODO keep separately track of the discussion for each user!

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
                "oh it's you!");
        }
    }

    switch(this.state) {
        case null:
            // the user said something, we do not care what
            // all we do is schedule for food

            if (message.text.toLowerCase().search('bye') > -1) {
                this.postMessageToUser(userName, 'bye! :wave:');
                break;
            }

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
            var yesIdx = response.indexOf('yes');
            var noIdx = response.indexOf('no');

            if (yesIdx >= 0 && noIdx == -1) {

                // collect / overwrite preferences for this user
                this.preferences.set(userName, new Map([]));

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
            var times = chefutils.parseTime(message.text);
            var timesStr = chefutils.join(times);
            
            // store preferences for this user
            this.preferences.get(userName).set('times', times);

            // confirm and ask for venue
            var confirmation = "Ok, I recorded " + timesStr +
                " as your response" + (times.length > 1 ? "s" : "") + ".";
            var question = "Where would you like to go?\n" +
                this.venues['tuas'] + "?\n" +
                this.venues['cs'] + "?\n" + 
                "Either?"
            this.postMessageToUser(userName,
                confirmation + "\n" + question);
            this._setState('__GETVENUE__END__');
            break;
        case '__GETVENUE__END__':
            // parse venue selection
            var venueOptions = [];
            for (var v in this.venues) {
                venueOptions.push(v);
            }
            var selectedVenues = [];
            chefutils.matchTokens(message.text.toLowerCase(), 
                venueOptions).forEach(function(x){selectedVenues.push(x);});

            // store preferences for this user
            // this.preferences[userName]['venues'] = selectedVenues;
            this.preferences.get(userName).set('venues', selectedVenues);

            var venueLinks = this._getVenueLinks(selectedVenues);
            var venuesStr = chefutils.join(venueLinks);
            var confirmation = "Ok, I recorded " + venuesStr +
                " as your response" + 
                (selectedVenues.length > 1 ? "s" : "") + ".";
            var byeStr = "talk to you later!";

            // end discussion
            this.postMessageToUser(userName,
                    confirmation + "\n" + byeStr);
            this._setState(null);
            break;
        default:
            this.postMessageToUser(userName,
                "TELL MICHAEL I'M BROKEN'!!!1! LOL :scream:");
            break;
    }
}

ChefBot.prototype.venues = {'tuas': TUAS_str, 'cs': CS_str,
                            'either': 'either', 'any': 'any',
                            'neither': 'neither', 'other': 'other'};

ChefBot.prototype._getVenueLinks = function (selectedVenues) {
    // return the links for the selected venues
    // TODO: deal with special answers ('any', 'either', etc)
    var result = new Array();
    for (var v in selectedVenues) {
        result.push(this.venues[selectedVenues[v]]);
    }
    return result;
}

ChefBot.prototype._init = function () {
    // used for chat logic
    this.state = null; 
    this.lastTime = null;

    // the time preferences of people
    this.preferences = new Map([]);
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
    		msg.indexOf('eat') > -1 ||
            msg.indexOf('food') > -1 ||
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
