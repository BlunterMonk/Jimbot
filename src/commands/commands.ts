//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "../util/string-extension.js";
import * as Discord from "discord.js";
import { log } from "../global.js";
import { Config } from "../config/config.js";

////////////////////////////////////////////////////////////

const regexCommand = /^[^\s]*/;
const regexSearch = /^(?:.*?\s)(.*?)(?='|"|‘|’|“|”|$)/;
const regexParameter = /"[^"]+"|‘[^‘]+‘|‘[^’]+’|“[^“]+“|”[^”]+”|“[^“^”]+”|'[^']+'/g;


export function getSearchString(msg, replace = true) {
    var match = msg.match(regexSearch);
    if (!match) return;

    var search = match[1];
    search = search.trim();
    
    if (search.empty()) {
        return null;
    }

    if (replace == undefined || replace) { 
        var s = search;
        var alias = Config.getAlias(s.replaceAll(" ", "_"));
        if (alias) {
            log("Found Alias: " + alias);
            return alias.replaceAll(" ", "_");
        }
    }

    search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}

function parameterToSearchString(parameter: string, replace = true) {
    var search = parameter;

    if (replace == undefined || replace) { 
        var s = search;
        var alias = Config.getAlias(s.replaceAll(" ", "_"));
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
            parameters[ind] = p.replace(/'|"|“|”/g, "");
        });
        msg = msg.trim();
    }

    return { msg: msg, parameters: parameters };
}

function convertCommand(command, content) {

    // TODO: make this more robust.
    if (command === "Family") {
        return {
            command: "Unit",
            parameters: ["chain" ],
            content: content.replace("family", "unit") + ` "chain"`
        };
    }

    return null;
}

const aliasIgnoreList = [
    "dpt", "mybuild", "userbuild", "removealias", "gif"
];
const textEntryCommands = [
    "setnickname", "setstatus", "set", "addcg"
];

export interface CommandObject {
    attachment: any;
    command: string;
    search: string;
    parameters: string[];
    run: string;
    authorName: string;
    authorID: string;
    authorGuild: string;
    authorGuildID: string;
    timestamp: any;
}
export var getCommandObject = function(msg, attach, author: Discord.User, guild: Discord.Guild): CommandObject {

    var attachment = null;
    var copy = msg;
    if (attach) {
        log("Message Attachments: ", attach.url);
        attachment = attach.url;
    }

    // the command name
    var command = getCommandString(copy);
    if (!command || command.empty())
        return null;

    if (!textEntryCommands.includes(command.toLowerCase()))
        copy = copy.toLowerCase();

    // if (guildSettings) {
    //     var shortcut = guildSettings.getShortcut(command);
    //     if (shortcut) {
    //         log("Found Command Shortcut");
    //         copy = shortcut;
    //         command = getCommandString(copy);
    //         log(`New Command: ${command}`);
    //         log(`New Content: ${copy}`);
    //     }
    // }

    const alias = Config.getCommandAlias(command);
    if (alias) {
        command = alias.capitalize();
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
    var search = getSearchString(copy, !aliasIgnoreList.includes(command.toLowerCase()));
    if (!search)
        search = "";
    
    if (command.toLowerCase() === `addemo` && parameters.length === 0) {
        if (attachment) {
            parameters[0] = attachment;
        }
    }

    if (parameters.length == 1 && search.empty()) {
        search = parameterToSearchString(parameters[0]);
    }

    var run = "handle" + command + "(receivedMessage, search, parameters)";

    var guildID = null;
    var guildName = null;
    if (guild) {
        guildID = guild.id;
        guildName = guild.name;
    }

    return {
        attachment: attachment,
        command: command,
        search: search,
        parameters: parameters,
        run: run,
        authorID: author.id,
        authorName: author.username,
        authorGuild: guildName,
        authorGuildID: guildID,
        timestamp: Date.now()
    }
}