

const regexCommand = /^[^\s]*/;
const regexSearch = /.*?\s+(.*[^"])\s.*/;
const regexParameter = /"[^"]+"|‘[^‘]+‘|‘[^’]+’|“[^“]+“|”[^”]+”|“[^“^”]+”|'[^']+'/g;

console.log("Match Test")


function getSearchString(msg, replace = true) {
    var match = msg.match(regexSearch);
    if (!match) return;
    console.log(match);

    var search = match[1];
    search = search.trim();
    console.log(search);
    
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

// var command = getCommandString(copy);
// console.log("getCommandString: " + command);
// const search = getSearchString(copy, false);
// console.log("getSearchString: " + search);
var params = getParameters(copy);
var parameters = params.parameters;
console.log("getParameters:");
console.log(parameters);
