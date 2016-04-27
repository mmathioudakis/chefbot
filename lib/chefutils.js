'use strict';

function join(array) {
    // return csv of array
    var result = "";
    for (let i in array) {
        if (i > 0) {
            result = result + ", " + array[i];
        } else {
            result = array[0];
        }
    }
    return result;
}

function parseTime(text) {
    var times_array = text.match(/[0-9]?[0-9]:[0-9][0-9]/g);
    return times_array;
}

function matchTokens(text, options) {
    var selectedVenues = new Set([]);
    var tokens = text.split(/\W+/);
    for (let i in tokens) {
        for (let p in options) {
            if (tokens[i] === options[p]) {
                selectedVenues.add(tokens[i]);
            }
        }
    }
    return selectedVenues;
}

function count(array) {
    var cnts = new Map([]);
    for (let e of array) {
        if (cnts.has(e) === false) {
            cnts.set(e, 0);
        }
        cnts.set(e, 1 + cnts.get(e));
    }
    return cnts;
}


exports.join = join;
exports.parseTime = parseTime;
exports.matchTokens = matchTokens;
exports.count = count;