

function join(array) {
    // return csv of array
    var result = "";
    n = array.length;
    for (i in array) {
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
    for (i in tokens) {
        for (p in options) {
            if (tokens[i] === options[p]) {
                selectedVenues.add(tokens[i]);
            }
        }
    }
    return selectedVenues;
}


exports.join = join;
exports.parseTime = parseTime;
exports.matchTokens = matchTokens;