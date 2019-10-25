//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as fs from "fs";
import * as fsextra from "fs-extra";
import {spawn} from "cross-spawn"; 

import "../../util/string-extension.js";
import * as Build from "../../ffbe/build.js";
import * as BuildImage from "../../ffbe/buildimage.js";
import { log, logData, error, escapeString, debug } from "../../global.js";
import { Cache } from "../../cache/cache.js";
import { Config } from "../../config/config.js";
import { Profiles } from "../../config/profiles.js";
import { Client } from "../../discord.js";
import { Builder } from "../../ffbe/builder.js";
import { FFBE } from "../../ffbe/ffbewiki.js";
import { unitSearch, unitSearchWithParameters } from "../../ffbe/unit.js";
import { downloadFile } from "../../util/download.js";
import { resolve } from "url";
import * as handlers from "./index.js";
import { getUnitKey, respondSuccess, respondFailure, validateUnit, validateEmote } from "./common.js";
import { convertSearchTerm, convertValueToLink, getRandomInt } from "../helper.js";

////////////////////////////////////////////////////////////////////

const okEmoji = "🆗";
const cancelEmoji = "❌";
const jimooriUserID = "131139508421918721";

const guildId = (msg) => msg.guild.id;
const userId = (msg) => msg.author.id;

function downloadImage(name: string, link: string): Promise<string> {
    var ext = link.substring(link.lastIndexOf("."), link.length).toLowerCase();
    if (!Config.filetypes().includes(ext)) {
        log("Invalid img URL");
        return Promise.reject("Invalid img URL");
    }

    const filename = "./emotes/" + name + ext;
    return downloadFile(filename, link);
}

function overwriteFile(existing: string, url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.unlink(existing, err => {
            if (err) {
                error(err);
                reject(err);
                return;
            }

            let name = existing.slice(existing.lastIndexOf("/"), existing.lastIndexOf("."));
            downloadImage(name, url).then(resolve).catch(reject);
        });
    });
}

////////////////////////////////////////////////////////////////////

export function handleAddtopunit(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (receivedMessage.guild) {
        return;
    }
 
    var cat = search;
    var unit = parameters[0];
    if (search.empty()) {
        cat = parameters[0];
        unit = parameters[1];
    }

    if (Cache.addTopUnit(cat, unit)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

export function handleRemovetopunit(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (receivedMessage.guild) {
        return;
    }

    var cat = search;
    var unit = parameters[0];
    if (search.empty()) {
        cat = parameters[0];
        unit = parameters[1];
    }

    if (Cache.removeTopUnit(cat, unit)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

export function handleAddalias(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (receivedMessage.content.replace(/[^"]/g, "").length < 4) {
        log("Invalid Alias");
        return;
    }

    var w1 = parameters[0];
    var w2 = parameters[1];

    if (validateUnit(w1)) {
        respondFailure(receivedMessage);
    } else {
        if (validateUnit(w2)) {
            log("Unit is valid");

            w1 = w1.replaceAll(" ", "_");
            Config.setAlias(w1, w2);
            Config.save();

            respondSuccess(receivedMessage);
        } else {
            respondFailure(receivedMessage);
        }
    }
}

export function handleRemovealias(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    let name = search;
    if (parameters && parameters.length > 0)
        name = parameters[0];

    log("Removing Alias: ", name);
    Config.removeAlias(name);
}

export function handleAddemo(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    var s = receivedMessage.content.split(" ");

    if(!parameters) {
        log("Error with command, no parameters provided.");
        return;
    }

    var name = "";
    var url = "";
    if (parameters && parameters.length > 0) {
        name = search;
        url = parameters[0];
    } else if (s) {
        if (!s[1] || !s[2]) {
            return;
        }

        name = s[1];
        url = s[2];
    } else {
        log("Error with command, emote could not be added.");
        return;
    }

    var existing = validateEmote(name);
    if (existing) {
        var Attachment = new Discord.Attachment(existing);
        if (Attachment) {
            
            var embed = {
                title: "Conflict",
                description:
                    "This emote already exists with this name, do you want to overwrite it?",
                image: {
                    url: `attachment://${existing}`
                },
                files: [{ attachment: `${existing}`, name: existing }]
            };

            Client.sendMessage(receivedMessage, embed, message => {
                
                message.react(okEmoji);
                message.react(cancelEmoji);

                const filter = (reaction, user) =>
                                (reaction.emoji.name === okEmoji || reaction.emoji.name === cancelEmoji) &&
                                user.id !== message.author.id;

                message.awaitReactions(filter, { max: 1, time: 60000 })
                    .then(collected => {
                        const reaction = collected.first().emoji.name;
                        const count = collected.size;

                        if (count === 1 && reaction === okEmoji) {

                            overwriteFile(existing, url)
                            .then(result => {
                                log("Successfully overwrote file: ", result);

                                const guildId = receivedMessage.guild.id;
                                receivedMessage.guild.emojis.forEach(customEmoji => {
                                    if (customEmoji.name === Client.getSuccess(guildId)) {
                                        message.delete();
                                        //receivedMessage.reply(`Emote has been replaced. :${customEmoji}:`);
                                        respondSuccess(receivedMessage);
                                    }
                                });
                            })
                            .catch(e => {
                                error("Failed to overwrite image: ", e);
                            });

                        } else if (count === 0 || reaction === cancelEmoji) {
                            log("AddEmo - no response");
                            message.delete();
                            respondFailure(receivedMessage);
                        }
                    })
                    .catch(collected => {
                        log("AddEmo - no response");
                        message.delete();
                        respondFailure(receivedMessage);
                    });
            });
        }
    } else {
       
        downloadImage(name, url)
        .then(result => {
            log(result);
            respondSuccess(receivedMessage);
        })
        .catch(e => {
            error("Failed to download image: ", e);
            respondFailure(receivedMessage);
        });
    }
}

export function handleAddshortcut(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    var command = parameters[0];
    
    log("Set Information");
    log(`Shortcut: ${search}`);
    log(`Command: ${command}`);

    if (Client.validateEditor(guildId(receivedMessage), userId(receivedMessage))) {
        log("User is not an editor");
        return;
    }

    if (Client.setShortcut(guildId(receivedMessage), search, command)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

export function handleAddresponse(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    var command = parameters[0];
    if (parameters.length == 2) {
        search = parameters[0];
        command = parameters[1];
    }
    
    log("Add Response");
    log(`Shortcut: ${search}`);
    log(`Command: ${command}`);

    if (Client.setResponse(guildId(receivedMessage), search, command)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

// SETTINGS
export function handleSet(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (!search || parameters.length === 0) {
        return;
    }

    const guildId = receivedMessage.guild.id;
    const setting = Client.guildSettings[guildId];

    var embed = {
        title: `Settings for '${search}'`,
        description: JSON.stringify(setting)
    }

    Client.sendMessage(receivedMessage, embed);
}

export function handleSetbestunits(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (receivedMessage.guild) {
        return;
    }

    var value = parameters[0];
    search = search.replaceAll("_", " ");
    search = search.toTitleCase();
    search = `[${search}]`;
    
    log("Set Rankings");
    log(`Catergory: ${search}`);
    log(`Value: ${value}`);

    if (Cache.setRankings(search, value)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

export function handleSetinfo(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (receivedMessage.guild) {
        return;
    }

    var title = parameters[0];
    var desc = parameters[1];
    
    log("Set Information");
    log(`Title: ${title}`);
    log(`Desc: ${desc}`);

    if (Cache.setInformation(search, title, desc, receivedMessage.author.id)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

export function handleAddinfo(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    if (receivedMessage.guild) {
        return;
    }

    log(`Add Information: ${search}`);

    if (Cache.setInformation(search, "title", "desc", receivedMessage.author.id)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}

export function handlePrefix(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (
        receivedMessage.member.roles.find(r => r.name === "Admin") ||
        receivedMessage.member.roles.find(r => r.name === "Mod")
    ) {
        // TODO: Add logic to change prefix to a valid character.
        log("User Is Admin");
        var s = receivedMessage.content.split(" ");
        if (!s[1] || s[1].length !== 1) {
            log("Invalid Prefix");
            respondFailure(receivedMessage);
            return;
        }

        Client.setPrefix(receivedMessage.guild.id, s[1]);

        respondSuccess(receivedMessage);
    }
}

export function handleUpdate(receivedMessage: Discord.Message, search: string, parameters: string[], forced = false) {

    if (!Client.isAuthorized(receivedMessage.author)) {
        return;
    }

    var source = "";
    if (receivedMessage.author.id != jimooriUserID) {
        source = Config.getUserNameFromID(receivedMessage.author.id)
    } else {
        source = parameters[0];
    }

    log(`Handle Update: ${source}`);
    if (Cache.isUpdating == true) {
        log("already updating");
        Client.send(receivedMessage, "Sorry bud, an update is in progress, please try again later.")
        respondFailure(receivedMessage, true);
        return;
    }

    var phrases = [
        "Roger roger, starting update!",
        "Rikai, kōshin masutā no kaishi!",
        "성은이 망극하옵니다 전하.",
        "deja que comience la actualización!",
        "Oh bountiful deity, deliver on to us a revalation!",
        "mettre à jour la feuille mettre à jour la feuille!",
        "고향을 위협하는 자들은 각오하라!"
    ]

    var msg = phrases[getRandomInt(phrases.length)]

    Client.send(receivedMessage, msg);

    if (source == "lyregard") {
        
        Builder.update((success, error) => {
            log(`Finished Updating: ${success}`);

            if (success) {
                fsextra.emptyDirSync("./tempbuilds");
                Client.send(receivedMessage, "done!");
                respondSuccess(receivedMessage, true);
            } else {
                respondFailure(receivedMessage, true);
            }
        });
        return;
    }

    Cache.updateDamage(source, forced, (success, error) => {
        log(`Finished Updating: ${success}`);

        if (success) {
            Client.send(receivedMessage, "done!");
            respondSuccess(receivedMessage, true);
        } else {
            Client.send(receivedMessage, `Something went wrong, give it another try in a few minutes. ${error}`);
            respondFailure(receivedMessage, true);
        }
    });
}

export function handleForceupdate(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (receivedMessage.author.id != jimooriUserID) {
        return;
    }

    Cache.isUpdating = false;
    handleUpdate(receivedMessage, search, parameters, true);
}

export function handleReload(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    var id = receivedMessage.author.id;
    if (id != jimooriUserID) {
        return;
    }

    log("Handle Reload");

    try {
        Cache.reload();
        Config.reload();
        Client.reload();
        Builder.reload();
        Profiles.reload();
    } catch(e) {
        log(e);
        respondFailure(receivedMessage, true);
    }

    log("Finished Reloading");
    respondSuccess(receivedMessage, true);
}

export function handleRecache(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    var id = receivedMessage.author.id;
    if (id != jimooriUserID) {
        return;
    }

    var child = null;
    if (!fs.existsSync(".\\cache.bat"))
        child = spawn("sh", ["./cache.sh"]);
    else 
        child = spawn(".\\cache.bat");
    
    // since these are streams, you can pipe them elsewhere
    // child.stdout.setEncoding('utf8');
    child.stderr.pipe(process.stdout);

    // Handle Errors
    child.on('error', (chunk) => {
        let output = chunk.toString()
        log(`child process error ${output}`);

        Client.send(receivedMessage, "recache failed\n" + chunk)
    });

    // Finish 
    child.on('close', (code) => {
        log(`child process exited with code ${code}`);
        Client.send(receivedMessage, "recache complete")
    });

    // Respond to data stream
    child.stdout.on('data', (chunk) => {
        let output = chunk.toString()
        if (output.empty())
            return;

        log(`${output}`);

        Client.sendMessage(receivedMessage, {
            title: "Recache Progress",
            description: output
        })
    });
}

export function handleClear(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    var id = receivedMessage.author.id;
    if (id != jimooriUserID) {
        return;
    }

    if (parameters[0] == "all") {
        fsextra.emptyDirSync(`./tempbuilds}`);
        fsextra.emptyDirSync(`./tempdata}`);
        fsextra.emptyDirSync(`./tempgifs}`);
    } else {
        if (fs.existsSync(`./${parameters[0]}`))
            fsextra.emptyDirSync(`./${parameters[0]}`);
    }
}
