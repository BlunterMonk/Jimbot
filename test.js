//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

String.prototype.similarity = function (s2) {
    var s1 = this;
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (
        (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
    );
}
    
String.prototype.toTitleCase = function (splitter) {
    if (!splitter) {
        splitter = " ";
    }
    return this.toLowerCase().split(splitter).map(function(word) {
        if (word.length > 3)
            return (word.charAt(0).toUpperCase() + word.slice(1));
        else 
            return word;
    }).join(splitter);
}
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
String.prototype.limitTo = function (limit) {
    if (this.length <= limit) {
        return this;
    }
    return this.substring(0, limit) + "...";
};
String.prototype.empty = function () {
    return this.length === 0 || !/\S/.test(this);
};
String.prototype.indexOfAfter = function (search, start) {
    var string = this;
    var preIndex = string.indexOf(start);
    return preIndex + string.substring(preIndex).indexOf(search);
};
String.prototype.indexOfAfterIndex = function (search, start) {
    return start + this.substring(start).indexOf(search);
};
String.prototype.matches = function (other) {
    return this === other;
};


const regexCommand = /^[^\s]*/;
const regexSearch = /^(?:.*?\s)(.*?)(?='|"|‘|’|“|”|$)/;
const regexParameter = /"[^"]+"|‘[^‘]+‘|‘[^’]+’|“[^“]+“|”[^”]+”|“[^“^”]+”|'[^']+'/g;

console.log("Match Test")


function getSearchString(msg, replace = true) {
    var match = msg.match(regexSearch);
    if (!match) return;

    var search = match[1];
    search = search.trim();
    
    if (search.empty()) {
        return null;
    }

    if (replace == undefined || replace) { 
        var s = search;
        var alias = config.getAlias(s.replaceAll(" ", "_"));
        if (alias) {
            log("Found Alias: " + alias);
            return alias.replaceAll(" ", "_");
        }
    }

    search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}
function getCommandString(msg) {
    var split = regexCommand.exec(msg);

    if (!split) {
        return null;
    }

    return split[0];
}
function getParameters(msg) {

    var parameters = [];
    var params = msg.match(regexParameter);
    if (params) {
        parameters = params;

        parameters.forEach((p, ind) => {
            msg = msg.replace(p, "");
            parameters[ind] = p.replace(/'|"|‘|’|“|”/g, "");
        });
        msg = msg.trim();
    }

    return { msg: msg, parameters: parameters };
}

var copy = `unit derp lander "stmr" "rarity"`;
console.log(copy.slice(1, copy.length));

var command = getCommandString(copy);
console.log("getCommandString: " + command);
const search = getSearchString(copy, false);
console.log("getSearchString: " + search);
var params = getParameters(copy);
var parameters = params.parameters;
console.log("getParameters:");
console.log(parameters);
