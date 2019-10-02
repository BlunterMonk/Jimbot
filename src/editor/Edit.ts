//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "discord.js";
import * as Editor from"./Editor.js";
import * as constants from "../../bin/constants.js";
import { log } from "../global.js";

////////////////////////////////////////////////////////////

var editors = {};

function indexToUnicode(index) {
    var ind = String(index);
    var number = "";
    for (var i = 0; i < ind.length; i++) {
        number += constants.unicodeNumbers[parseInt(ind[i])];
    }
    return number;
}


// CREATE EDITOR

function newEditor(receivedMessage, file) {
    var userId = receivedMessage.author.id;

    var guildId = null;
    if (receivedMessage.guild) {
        guildId = guildId(receivedMessage);
    } 

    editors[userId] = new Editor.Editor(guildId, userId, `data/${file}.json`);
    var settings = editors[userId].getState();
    log("\nNew Editor");
    log(settings);

    if (file) {
        return;
    }

    // TODO
    // If not using a shortcut, display options.
}

// REQUESTS

// Send a message requesting the Editor to submit their new data
function respondEditorAction(receivedMessage, key) {
    var embed = {
        title: `Currently Editing: ${key}`,
        color: constants.pinkHexCode,
        description: "Please submit the new value"
    };

    receivedMessage.channel
    .send({embed: embed})
    .then(message => {
    })
    .catch(console.error);
}

// Send a message requesting the user to submit their information
// to add a new entry.
function respondAddAction(receivedMessage, key) {
    var embed = {
        title: `Adding New **${key.toTitleCase()}**`,
        color: constants.pinkHexCode,
        description: ""
    };

    if (key) {
        embed.description = `Please submit the new ${key.toTitleCase()}`;
    }

    receivedMessage.channel
    .send({embed: embed})
    .then(message => {
    })
    .catch(console.error);
}

// RESPONSE

// Send the current state of the editor's settings to the user.
// Each state is a JSON object
function respondSettings(receivedMessage, key, settings) {
    var userId = receivedMessage.author.id;

    if (!settings) {
        log("No settings to display");
        return;    
    }

    // Make sure to only respond with an actual object, if the current state is
    // at the lowest level, just respond with the value.
    // Otherwise, break the object into fields based on their key and value.
    var type = typeof settings;
    log(`Type of Settings: ${type}`);

    var fields = [];
    var keys =  Object.keys(settings);
    if (type != "string") {

        keys.forEach((key, ind) => {
            var name = `${indexToUnicode(ind)}. ${key}`;
            var value = "```" + JSON.stringify(settings[key], null, "\t").limitTo(512) + "```";
            fields[fields.length] = {
                name: name,
                value: value
            }
        })
    }


    // Create embed based on the current state, and it's available options.
    var text = "Actions: cancel. Type the number for the entry you want to edit."
    if (type == "string") {
        text = "Actions: edit, cancel";
    }

    var embed = {
        title: key,
        color: constants.pinkHexCode,
        footer: {
            text: text
        },
        fields: [],
        description: ""
    };
    
    if (fields.length == 0) {
        embed.description = "```" + JSON.stringify(settings, null, "\t").limitTo(1018) + "```";
    } else {
        embed.fields = fields;
    }

    receivedMessage.channel
    .send({embed: embed})
    .then(message => {
        fields.forEach((f, i) => {
            message.react(constants.unicodeNumbers[i]);
        });
        editors[userId].setState(settings);
    })
    .catch(console.error);
}

// STATE

// Handle searching through the settings 
function editorTraverseMode(receivedMessage) {
    var userId = receivedMessage.author.id;

    var next = null;
    var content = parseInt(receivedMessage.content);

    if (Number.isNaN(content)) {
        content = receivedMessage.content;
    } else {
        content = editors[userId].getStateKey(content);
    }

    log("Editor Response");
    log(content);

    log("\nNext:")
    log(next);
    if (editors[userId].next(content)) {

        var state = editors[userId].getState();
        log("\nCurrent State");
        log(state);
        
        respondSettings(receivedMessage, content, state);

        log("\nEditor");
        log(editors[userId]);
    }
}

// Handle session for editing an existing entry
function editorEditMode(receivedMessage) {
    var userId = receivedMessage.author.id;
    var state = editors[userId].getState();

    log(`Editor Is Editing: ${userId}`);
    log("\nCurrent State");
    log(state);
    log("\nCurrent Tree");
    log(editors[userId].tree);

    editors[userId].setData(receivedMessage.content);
    respondEditorPreview(receivedMessage, 
        editors[userId].getCurrentKey(), 
        editors[userId].getData(),
        JSON.stringify(state).slice(1, -1)
        );
}

// Handle session for adding new entries to the settings
function editorAddMode(receivedMessage) {
    var userId = receivedMessage.author.id;
    var state = editors[userId].getState();

    var curKey = editors[userId].getEditKey();
    log("\nCurrent Key");
    log(curKey);

    log(`Editor(${userId}) Is Adding`);
    log("\nCurrent State");
    log(state);
    log("\nCurrent Tree");
    log(editors[userId].tree);

    if (curKey) {
        log("Adding to key: " + curKey);
        editors[userId].setData(receivedMessage.content, curKey);
        log("\n\nEDITOR DATA");
        log(editors[userId].getData());
    }

    var keys = editors[userId].getStateKeys();
    log("\nCurrent Keys");
    log(keys);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (!editors[userId].getData(key)) {
            editors[userId].setEditKey(key);
            respondAddAction(receivedMessage, key);
            return;
        }
    }
    
    respondEditorPreview(receivedMessage, 
        editors[userId].getCurrentKey(), 
        editors[userId].getData(),
        null,
        );
}


// PREVIEW

// Send a preview of the new entry, and wait for confirmation from 
// the user before finalizing it.
function respondEditorPreview(receivedMessage, key, data, old) {
    var oldMsg = null;
    var newMsg = null;
    var userId = receivedMessage.author.id;

    if (old) {
        receivedMessage.channel
        .send({embed: {
            title: `Old Data: ${key}`,
            color: constants.pinkHexCode,
            description: "```" + old + "```"
        }})
        .then(message => {
            oldMsg = message;
        })
        .catch(console.error);
    }

    receivedMessage.channel
    .send({embed: {
        title: `New Data: ${key}`,
        color: constants.pinkHexCode,
        description: "```" + JSON.stringify(data, null, '\t') + "```",
        footer: {
            text: "Respond 'OK' to apply this new version. 'X' to cancel."
        }
    }})
    .then(message => {
        message.react(constants.okEmoji);
        message.react(constants.cancelEmoji);

        const emojiResponseFilter = (reaction, user) =>
            (reaction.emoji.name === constants.okEmoji ||
                reaction.emoji.name === constants.cancelEmoji) &&
            user.id !== message.author.id;
        message.awaitReactions(emojiResponseFilter, { max: 1, time: 30000 })
            .then(collected => {
                const reaction = collected.first().emoji.name;
                const count = collected.size;
                log(count);

                if (count === 1 && reaction === constants.okEmoji) {
                    log("AddEmo - confirmed");
                    editors[userId].save();

                    log(`Current Key - ${editors[userId].getEditedObjectKey()}`);
                    message.delete();

                    log("Success Callback");
                    log(respondSuccess);
                    respondSuccess(receivedMessage, editors[userId].getEditedObjectKey(), editors[userId].file);
                    log("----------------");

                    endEditorSession(userId);
                    if (oldMsg) oldMsg.delete();
                } else if (count === 0 || reaction === constants.cancelEmoji) {
                    log("AddEmo - no response");
                    endEditorSession(userId);
                    
                    if (oldMsg) oldMsg.delete();
                    message.delete();

                    respondFailure(receivedMessage);
                }
            })
            .catch(collected => {
                /*log("Set Data - no response");
                endEditorSession(userId);
                if (oldMsg) oldMsg.delete();
                message.delete();
                respondFailure(receivedMessage, true);*/
            });
    })
    .catch(console.error);
}

// End the editors session and cleanup
function endEditorSession(userId) {
    log(`Ending Editor Session For: ${userId}`)
    editors[userId] = null;
    delete editors[userId];
}


var respondSuccess;
var respondFailure;

export interface EditInterface {
    respondSuccess: any;
    respondFailure: any;
    isEditing(userId: string);
    SetInfo(cli, receivedMessage);
    AddInfo(cli, receivedMessage, search: string);
    editorResponse(receivedMessage);
};

export class Edit implements EditInterface {
    respondSuccess: any;
    respondFailure: any;
    constructor() {

    }

    init = function(success, failure) {
        respondSuccess = success;
        respondFailure = failure;
    }

    isEditing = function(userId) {
        return editors[userId];
    }
    SetInfo = function(cli, receivedMessage) {
        // Create a new editor session and respond with the current settings
        var userId = receivedMessage.author.id;
        newEditor(receivedMessage, "information");
        respondSettings(receivedMessage, "Information", editors[userId].getState());
    }
    AddInfo = function(receivedMessage, search) {
        var userId = receivedMessage.author.id;

        newEditor(receivedMessage, "information");
        editors[userId].setIsAdding(true);
        editors[userId].next(search);
        editorAddMode(receivedMessage);
    }
    editorResponse = function(receivedMessage) {
        var userId = receivedMessage.author.id;

        if (receivedMessage.content.toLowerCase() == "cancel") {
            endEditorSession(userId);
            log("Edit Canceled")
            log(editors);
            return;
        }

        if (editors[userId].getIsEditing()) {
            editorEditMode(receivedMessage);
            return;
        } else if (editors[userId].getIsAdding()) {
            editorAddMode(receivedMessage);
            return;
        }

        log(`Editor Traversing Settings: ${userId}`);

        var state = editors[userId].getState();
        switch (receivedMessage.content) {
            case "edit": 
            {
                if (!editors[userId].isStateEditable()) {
                    log("Cannot Edit State");
                    return;
                }

                var state = editors[userId].getState();
                log("\nCurrent State");
                log(state);
                log("\nCurrent Tree");
                log(editors[userId].tree);

                editors[userId].setIsEditing(true);

                respondEditorAction(receivedMessage, editors[userId].getCurrentKey());
                return;
            }
            case "add":
            {
                /*if (editors[userId].isStateEditable()) {
                    log("Cannot Add State");
                    return;
                }

                editors[userId].setIsAdding(true);
                respondAddAction(receivedMessage, editors[userId].getCurrentKey());*/
                return;
            }
            case "back":
            {
                // TODO: maybe, implement backtracking.
                //log("\nGoing Back");
            }
            break;
            default:
                break;
        }

        editorTraverseMode(receivedMessage);
    }

}
