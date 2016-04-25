

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


exports.join = join;
exports.parseTime = parseTime;