//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as fs from "fs";

import "../util/string-extension.js";
import * as Commands from "./commands.js";
import { log, error, debug, logCommand } from "../global.js";
import { Cache } from "../cache/cache.js";
import { Client } from "../discord.js";
import { downloadFile } from "../util/download.js";
import * as handlers from "./handlers/index.js";
import { validateEmote } from "./handlers/common.js";
import { handleWikihelp } from "./handlers/handleWiki.js";
import { handleDpthelp } from "./handlers/handleCalcs.js";
import { handleBuildhelp } from "./handlers/handleBuilds.js";
import { handleProfilehelp } from "./handlers/index.js";

////////////////////////////////////////////////////////////

const pinkHexCode = 0xffd1dc;
const jimooriUserID = "131139508421918721";


////////////////////////////////////////////////////////////
// COMMANDS

function handleHelp(receivedMessage: Discord.Message) {
    handleDpthelp(receivedMessage);
    handleBuildhelp(receivedMessage);
    handleWikihelp(receivedMessage);
    handleProfilehelp(receivedMessage);
}

function handleWhatsnew(receivedMessage: Discord.Message) {
    var data = fs.readFileSync("./data/help/new.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        fields: readme.fields,
        title: readme.title,
        foorer: {
            text: "For more information please use the '?help' command"
        }
    };

    Client.sendMessage(receivedMessage, embed);
}

function handleAddreview(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    var id = receivedMessage.author.id;
    if (id != jimooriUserID) {
        return;
    }

    var reviews = JSON.parse(fs.readFileSync("data/reviews.json").toString());

    var t =  parameters[1];
    t = t.toTitleCase(". ")
    reviews[search] = {
        rating: parameters[0],
        description: t
    };

    fs.writeFileSync("data/reviews.json", JSON.stringify(reviews, null, '\t'));
}

// FLUFF

function handleReactions(receivedMessage: Discord.Message) {
    const content = receivedMessage.content.toLowerCase();
    switch (content) {
        case "hi majin":
            receivedMessage.guild.emojis.forEach(customEmoji => {
                if (
                    customEmoji.name === "nuked" ||
                    customEmoji.name === "tifapeek" ||
                    customEmoji.name === "think"
                ) {
                    receivedMessage.react(customEmoji);
                }
            });
            break;
        case "hi jake":
            receivedMessage.react("🌹");
            receivedMessage.react("🛋");
            break;
        case "hi reberta":
            receivedMessage.guild.emojis.forEach(customEmoji => {
                if (
                    customEmoji.name === "hugpweez" ||
                    customEmoji.name === "yay" ||
                    customEmoji.name === "praise"
                ) {
                    receivedMessage.react(customEmoji);
                }
            });
        default:
            break;
    }
}

function handleEmote(receivedMessage: Discord.Message, search: string) {
    var filename = validateEmote(search);
    if (!filename) 
        return;

    Client.sendImage(receivedMessage, filename);
}

function handleWhatis(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    var info = Cache.getInformation(search)
    if (!info) {
        return;
    }
    
    var embed = {
        color: pinkHexCode,
        title: info.title,
        description: info.description
    };

    Client.sendMessageWithAuthor(receivedMessage, embed, info.author);
}

function handleGrab(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (receivedMessage.author.id != jimooriUserID) {
        return;
    }

    var limit = 1;
    var p = parseInt(parameters[1]);
    if (!Number.isNaN(p))
        limit = p;


    // Get messages
    // receivedMessage.channel.fetchMessages({ limit: limit })
    //     .then(messages => {
    //         log(`Received ${messages.size} messages`);
    //     })
    //     .catch(console.error);

    receivedMessage.channel.fetchMessage(parameters[0])
        .then(startMessage => {
            log("Found Starting Message");
            log(startMessage.content);

            var start = startMessage.createdTimestamp;
            var end = receivedMessage.createdTimestamp;
            log(`Grabbing Messages From: ${start}`);
        
            // Get messages and filter by user ID
            receivedMessage.channel.fetchMessages({limit:100})
                .then(messages => {
                    var filtered = messages.filter(m => m.author.id === '350621713823825920' 
                        && m.attachments.first() != null && m.createdTimestamp >= start && m.createdTimestamp <= end);
                    log(`Found ${filtered.size} images`);
                    var links : string[] = filtered.map(element => {
                        return element.attachments.first().url;
                    });

                    let path = `tempgrabbed/${start}/`;
                    if (!fs.existsSync(path))
                        fs.mkdirSync(path, { recursive: true});

                    log(links);
                    links.forEach((link, i) => {
                        var ext = link.substring(link.lastIndexOf("."), link.length).toLowerCase();
                        var name = `aya${i}${ext}`;
                        downloadFile(path + name, link).then(p => {
                            log(`Downloaded ${p}`);
                        }).catch(console.error);
                    });
                })
                .catch(console.error);
        })
        .catch(console.error);
}

/////////////////////////////////////////////////

export function handle(receivedMessage: Discord.Message, com: Commands.CommandObject): boolean {
    
    log("Handle Command Object: ", com);
    logCommand(com);

    try {
        var search = com.search;
        var parameters = com.parameters;

        if (com.attachment)
            parameters[parameters.length] = com.attachment;

        let h = handlers;
        eval("h." + com.run);
    } catch (e) {
        error("Command Failed Exception: ", e);
        
        try {
            eval(com.run);
        } catch (e) {
            error("Command doesn't exist: ", com.command, ", error: ", e);
            if (Client.validate(receivedMessage, "emote")) {
                handleEmote(receivedMessage, com.command.toLowerCase());
            } else {
                log("Emotes are disabled for this user");
            }
        }
    }

    return false;
}
