import { GuildSettings } from './../config/config';
//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "./string/string-extension.js";
import "include";

const searchAliases = [
    { reg: /imbue/g, value: "add element" },
    { reg: /break/g, value: "break|reduce def|reduce atk|reduce mag|reduce spr"},
    { reg: /buff/g, value: "increase|increase atk|increase def|increase mag|increase spr"},
    { reg: /debuff/g, value: "debuff|decrease|reduce"},
    { reg: /imperil/g, value: "reduce resistance"},
    { reg: /mit/g, value: "mitigate|reduce damage"},
    { reg: /evoke/g, value: "evoke|evocation"}
]

const regexCommand = /^[^\s]*/;
const regexSearch = /.*?\s+(.*[^"])\s.*/;
const regexParameter = /"[^"]+"|‘[^‘]+‘|‘[^’]+’|“[^“]+“|”[^”]+”|“[^“^”]+”|'[^']+'/g;


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



function convertSearchTerm(search) {
    var s = search;
    var alias = config.getAlias(s.replaceAll(" ", "_"));
    if (alias) {
        log("Found Alias: " + alias);
        return alias.replaceAll(" ", "_");
    }

    //search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}
function convertParametersToSkillSearch(parameters) {
    var search = "";
    parameters.forEach((param, ind) => {
        if (ind > 0) 
            search += "|";
        search += param;
    });

    searchAliases.forEach(regex => {
        if (checkString(search, regex.reg)) {
            //log(`Search contains a word to replace`);
            search = search.replace(regex.reg, regex.value);
            //log(`New Search: ${search}`);
        }
    });

    return search.replaceAll(" ",".*")
}


function convertCommand(command, content, prefix) {

    //log("Convert Command");
    //log(command);
    //log("\n");

    // TODO: make this more robust.
    if (command === "Family") {
        return {
            command: "Unit",
            parameters: ["chain" ],
            content: content.replace("family", "unit") + ` "chain"`
        };
    } else if (command === "Damage") {
        return {
            command: "Dpt",
            parameters: ["chain" ],
            content: content.replace(`${prefix}damage`, `${prefix}dpt`)
        };
    }

    return null;
}
function validateCommand(receivedMessage, command) {
    var roles = receivedMessage.member.roles.array();
    var guildId = receivedMessage.channel.guild.id;

    for (var i = 0; i < roles.length; i++) {
        log("Attempt to validate: " + roles[i].name);
        if (config.validateCommand(guildId, roles[i].name, command)) {
            log("Role Validated");
            return true;
        }
    }

    return false;
}


export var config = null;
export var guildMessage = function(msg, attachment, guildSettings: GuildSettings): string {

    var copy = msg.toLowerCase();
    if (attachment) {
        log("Message Attachments");
        log(attachment.url);
    }

    // the command name
    let com = getCommandString(copy);
    try {
        let valid = false;
        log(eval(`valid = (typeof handle${com} === 'function');`));
        if (!valid) {
            let search = getSearchString(copy);
            if (unitQuery(receivedMessage, com, search))
                return;
        }
    } catch (e) {
        //log(e);
        //log("JP Unit: " + command);
        let search = getSearchString(`${prefix}${com}`, copy);
        if (unitQuery(receivedMessage, com, search))
            return;
    }

    try {
        var command = getCommandString(copy);
        var shortcut = guildSettings.getShortcut(command);
        if (shortcut) {
            log("Found Command Shortcut");
            copy = shortcut;
            command = getCommandString(copy, prefix);
            log(`New Command: ${command}`);
            log(`New Content: ${copy}`);
        }
        //log("Before");
        //log(command);
        //log(copy);

        // If the command has a shortcut convert it.
        var newCommand = convertCommand(command, copy, prefix);
        if (newCommand) {
            command = newCommand.command;
            copy = newCommand.content;
            //log("After");
            //log(command);
            //log(copy);
        }

        // Get any parameters from the final comand string
        var params = getParameters(copy);
        var parameters = params.parameters;
        copy = params.msg;
        
        // Get search string for command.
        const search = getSearchString(`${prefix}${command}`, copy, (command !== "Dpt"));

        // Validate the user
        if (!validateCommand(receivedMessage, command)) {
            log("Could not validate permissions for: " + displayName);
            //respondFailure(receivedMessage);
            throw command;
        }

        // If no parameters or search provided exit.
        if (!search && parameters.length === 0) {
            log("Could not parse search string");
            throw command;
        }

        /**/
        log("\ngetCommandString: " + command);
        log("getSearchString: " + search);
        log("getParameters:");
        log(parameters);
        
        if (command.toLowerCase() === `addemo` && parameters.length === 0) {
            //log("Addemo but no parameters.");
            if (attachment) {
                //log("Message Has Attachments");
                //log(attachment.url);
                parameters[0] = attachment.url;
            }
        }
        var run = "handle" + command + "(receivedMessage, search, parameters)";

        //log("Running Command: " + command);
        eval(run);
    } catch (e) {
        //log(e);
        //log(`No search terms found for "${e}", run other commands: `);
        try {
            log("\nTrying Backup Command: " + "handle" + e);
            eval("handle" + e + "(receivedMessage)");
        } catch (f) {
            log(f);
            log("Command doesn't exist");
            if (validateCommand(receivedMessage, "emote")) {
                handleEmote(receivedMessage, prefix);
            } else {
                log("Emotes are disabled for this user");
            }
        }
    }
}
