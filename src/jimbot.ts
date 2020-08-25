//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "./util/string-extension.js";
import * as Editor from "./editor/Edit.js";
import * as Commands from "./commands/commands.js";
import * as Discord from "discord.js";
import { log, logData, error } from "./global.js";
import { Client } from "./discord.js";
import { Config } from "./config/config.js";
import { Cache } from "./cache/cache.js";
import { handle } from "./commands/handles.js";

////////////////////////////////////////////////////////////

var editor = null;

process.on("unhandledRejection", (reason, p) => {
    log(`Unhandled Rejection at: Promise(${JSON.stringify(p)}), Reason: ${reason}`);
    log(p);
    // application specific logging, throwing an error, or other logic here
});

// Initialize Client

Client.init(() => {

    editor = new Editor.Edit();
    editor.init((msg, key, file) => {
        log("Response From Editor");
        Cache.reload();
        Config.reload();

        Client.respondSuccess(msg, true);

        const com = Commands.getCommandObject(`whatis ${key}`, null, false, msg.author, null);
        handle(msg, com);
    }, (msg) =>{
        log("Response From Editor");
        Client.respondFailure(msg, true);
    })

    log("Configuration Loaded");

    Client.setMessageCallback(onMessage.bind(this));
    Client.setPrivateMessageCallback(onPrivateMessage.bind(this));
});

function onPrivateMessage(receivedMessage, content, author: Discord.User) {

    var id = receivedMessage.author.id;
    
    log("Private Message From: " + id);
    log(content)

    if (editor.isEditing(id)) {
        log("Is Editor");
        editor.editorResponse(receivedMessage);
        return;
    }
    
    log("Settings Change Allowed");

    const com = Commands.getCommandObject(content, null, false, author, null);
    logData("Command Obect", com);

    const command = com.command;
    const parameters = com.parameters;
    const search = com.search;

    try {
        if (command == "Setinfo") {
            log("Settings Change")

            editor.SetInfo(Client, receivedMessage);
            return;
        }

        if (!search && parameters.length === 0) {
            log("Could not parse search string");
            Client.respondFailure(receivedMessage, true);
            return;
        }

        handle(receivedMessage, com);
        if (command == "Addinfo") {
            editor.AddInfo(receivedMessage, search);
        }
    } catch(e) {
        log("Failed: " + e);
        Client.respondFailure(receivedMessage, true);
    }
}
function onMessage(receivedMessage, content, caseSensitive: boolean, author: Discord.User, guild: Discord.Guild) {
    
    const guildId = receivedMessage.guild.id;
    const attachment = receivedMessage.attachments.first();

    // Get command information
    var com = Commands.getCommandObject(content, attachment, caseSensitive, author, guild);
    if (!com) {
        return;
    }

    try {
        handle(receivedMessage, com);
    } catch (e) {
        error("Command doesn't exist: ", com.command, " error: ", e.message);
        console.log(e);
    }
}
