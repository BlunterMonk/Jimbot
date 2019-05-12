//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "../string/string-extension.js";
import { log, logData,
    checkString, compareStrings,
    escapeString } from "../global.js";
import * as gs from "../config/guild.js";

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
const regexSearch = /^(?:.*?\s)(.*?)(?='|"|‘|’|“|”|$)/;
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
export function getCommandString(msg) {
    var split = regexCommand.exec(msg);

    if (!split) {
        return null;
    }

    return split[0].capitalize();
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

function convertCommand(command, content) {

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
            content: content.replace(`damage`, `dpt`)
        };
    }

    return null;
}

export interface CommandObject {
    attachment: any;
    command: string;
    search: string;
    parameters: string[];
    run: string;
}
var config = null;
export var init = function(conf) {
    config = conf;
};
export var getCommandObject = function(msg, attach, guildSettings: gs.GuildSettings): CommandObject {

    var attachment = null;
    var copy = msg.toLowerCase();
    if (attach) {
        log("Message Attachments");
        log(attach.url);
        attachment = attach.url;
    }

    // the command name
    var command = getCommandString(copy);
    var shortcut = guildSettings.getShortcut(command);
    if (shortcut) {
        log("Found Command Shortcut");
        copy = shortcut;
        command = getCommandString(copy);
        log(`New Command: ${command}`);
        log(`New Content: ${copy}`);
    }

    // If the command has a shortcut convert it.
    var newCommand = convertCommand(command, copy);
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
    
    // Get search string for command.
    const search = getSearchString(copy, (command !== "Dpt"));

    log("\ngetCommandString: " + command);
    log("getSearchString: " + search);
    log("getParameters:");
    log(parameters);
    
    if (command.toLowerCase() === `addemo` && parameters.length === 0) {
        if (attachment) {
            parameters[0] = attachment.url;
        }
    }

    var run = "handle" + command + "(receivedMessage, search, parameters)";

    return {
        attachment: attachment,
        command: command,
        search: search,
        parameters: parameters,
        run: run
    }
}
