//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as request from "request";
import * as fs from "fs";
import * as cheerio from "cheerio";
import * as https from "https";
import * as http from "http";

import { log, logData, checkString, compareStrings, escapeString } from "../global.js";
import "../string/string-extension.js";
import { Client } from "../discord.js";
import {unitSearch, unitSearchWithParameters} from "../ffbe/unit.js";
import {config} from "../config/config.js";
import {FFBE} from "../ffbe/ffbewiki.js";
import {Cache, cache} from "../cache/cache.js";
import * as constants from "../constants.js";
import * as Commands from "./commands.js";

var mainChannelID;
const pinkHexCode = 0xffd1dc;
const linkFilter = [
    /\|Trial/,
    /\|Event/,
    /\|Quest/,
    /\]\]/,
    /\[\[/,
    /\[\[.*\]\]/,
    /\(/,
    /\)/
];
const okEmoji = "🆗";
const cancelEmoji = "❌";

const wikiEndpoint = "https://exvius.gamepedia.com/";
const ffbegifEndpoint = "http://www.ffbegif.com/";
const exviusdbEndpoint = "https://exvius.gg/gl/units/205000805/animations/";
const sheetURL = "https://docs.google.com/spreadsheets/d/1RgfRNTHJ4qczJVBRLb5ayvCMy4A7A19U7Gs6aU4xtQE";
const muspelURL = "https://docs.google.com/spreadsheets/d/14EirlM0ejFfm3fmeJjDg59fEJkqhkIbONPll5baPPvU/edit#gid=558725580";

const renaulteUserID    = "159846139124908032";
const jimooriUserID     = "131139508421918721";
const furculaUserID     = "344500120827723777";
const cottonUserID      = "324904806332497932";
const muspelUserID      = "114545824989446149";

const sprite = (n) => `https://exvius.gg/static/img/assets/unit/unit_ills_${n}.png`;
const aniGL = (n) => `https://exvius.gg/gl/units/${n}/animations/`;
const aniJP = (n) => `https://exvius.gg/jp/units/${n}/animations/`;
const guildId = (msg) => msg.guild.id;
const userId = (msg) => msg.author.id;
// Lookup Tables

const gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "win before"
}


// COMMANDS

// WIKI 
function handleUnit(receivedMessage, search, parameters) {

    search = search.toTitleCase("_");
    log("Searching Units For: " + search);

    FFBE.queryWikiForUnit(search, parameters, function (pageName, imgurl, description, limited, fields) {
        pageName = pageName.replaceAll("_", " ");

        var embed = {
            color: pinkHexCode,
            thumbnail: {
                url: imgurl
            },
            title: pageName,
            url: "https://exvius.gamepedia.com/" + search,
            fields: fields,
            description ():string {
                return this.options["description"];
            },
            footer: {
                text: ""
            }
        };

        // TODO: Create a function to better wrap this since it will be common
        if (
            parameters.length == 0 ||
            (parameters.length > 0 && parameters.includes("Description"))
        ) {
            embed.description = description;
        }
        if (limited) {
            embed.footer = {
                text: "Unit Is Limited"
            };
        }

        Client.sendMessage(receivedMessage, embed);
    });
}
function handleEquip(receivedMessage, search, parameters) {

    search = search.toTitleCase("_");
    log(`Searching Equipment For: ${search}...`);

    FFBE.queryWikiForEquipment(search, parameters, function (imgurl, pageName, nodes) {
        var title = pageName;
        pageName = pageName.replaceAll(" ", "_");

        var embed = {
            color: pinkHexCode,
            thumbnail: {
                url: imgurl
            },
            title: title,
            fields: nodes,
            url: "https://exvius.gamepedia.com/" + pageName
        };

        Client.sendMessage(receivedMessage, embed);
    });
}
function handleSkill(receivedMessage, search, parameters) {

    search = search.toTitleCase("_");
    log(`Searching Skills For: ${search}...`);

    FFBE.queryWikiForAbility(search, parameters, function (imgurl, pageName, nodes) {
        var title = pageName;
        pageName = pageName.replaceAll(" ", "_");

        var embed = {
            color: pinkHexCode,
            thumbnail: {
                url: imgurl
            },
            title: title,
            fields: nodes,
            url: "https://exvius.gamepedia.com/" + pageName
        };

        Client.sendMessage(receivedMessage, embed);
    });
}
function handleSearch(receivedMessage, search) {

    log(`Searching For: ${search}...`);

    FFBE.queryWikiWithSearch(search, function (batch) {

        var embed = {
            color: pinkHexCode,
            fields: batch
        };

        Client.sendMessage(receivedMessage, embed);
    });
}
function handleRecentunits(receivedMessage, search, parameters) {

    FFBE.queryWikiFrontPage((links) => {
        var embed = {
            color: pinkHexCode,
            author: Client.getAuthorEmbed(),
            title: "Recently Released Units",
            description: links,
            url: "https://exvius.gamepedia.com/Unit_List"
        };

        Client.sendMessage(receivedMessage, embed);
    })
}


function handleRank(receivedMessage, search, parameters) {
    log("\nSearching Rankings for: " + search);

    if (search) {
        const unit = cache.getUnitRank(search.toLowerCase());
        if (!unit) {
            log("Could not find unit");
            return;
        }

        var embed = {
            title: unit.Unit,
            url: wikiEndpoint + unit.Unit.replaceAll(" ", "_"),
            color: pinkHexCode,
            fields: [
                {
                    name: "Rank",
                    value: `${unit.Base} - ${unit.TDH}`
                }
            ],
            thumbnail: {
                url: unit.imgurl
            }
        };

        if (unit.notes) {
            embed.fields[embed.fields.length] = {
                name: "Notes",
                value: unit.notes
            };
        }

        Client.sendMessageWithAuthor(receivedMessage, embed, muspelUserID);
        return;
    }

    /*
    var embeds = [];
    var rankings = config.getRankings(search);
    log("\nRankings");
    log(rankings);
    rankings.forEach(rank => {
        embeds[embeds.length] = {
            title: rank.name,
            url: rank.pageurl,
            color: pinkHexCode,
            fields: [
                {
                    name: rank.comparison,
                    value: rank.reason
                }
            ],
            thumbnail: {
                url: rank.imgurl
            }
        };
    });

    log("\nEmbeds");
    log(embeds);
    embeds.forEach(embed => {
        Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
    });
    */
}


// FLUFF
function handleReactions(receivedMessage) {
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
function handleEmote(receivedMessage) {
    var img = receivedMessage.content.split(" ")[0];
    img = img.toLowerCase().slice(1, img.length);

    var filename = validateEmote(img);
    if (!filename) return;

    Client.sendImage(receivedMessage, filename);
}
function handleQuote(receivedMessage, search) {
    //var s = getSearchString(quoteQueryPrefix, content).toLowerCase();
    switch (search) {
        case "morrow":
            Client.send(receivedMessage, new Discord.Attachment("morrow0.png"));
            break;
        default:
            break;
    }
}
function handleGif(receivedMessage, search, parameters) {
    log("Searching gifs for: " + search);

    var bot = /^\d/.test(search)
    if (bot)
        search = search.toUpperCase();

    var title = search.toTitleCase("_");

    var param = parameters[0];
    if (gifAliases[param]) {
        param = gifAliases[param];
    }

    getGif(search, param, (filename) => {
        log("success");

        Client.sendImage(receivedMessage, filename);
    });
}
function handleSprite(receivedMessage, search, parameters) {

    var unit = getUnitKey(search);
    if (!unit) {
        return;
    }

    unit = getMaxRarity(unit)

    log("Searching Unit Sprite For: " + search);
    validateUnit(search, function (valid, imgurl) {
        search = search.replaceAll("_", " ");

        var embed = {
            color: pinkHexCode,
            image: {
                url: sprite(unit)
            }
        };

        Client.sendMessage(receivedMessage, embed);
    });
}

// INFORMATION

function handleWhatis(receivedMessage, search, parameters) {

    var info = cache.getInformation(search)
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
function handleGuide(receivedMessage, search, parameters) {
    handleWhatis(receivedMessage, search, parameters);
}
function handleG(receivedMessage, search, parameters) {
    handleWhatis(receivedMessage, search, parameters);
}
function handleNoob(receivedMessage, search, parameters) {
    handleWhatis(receivedMessage, "new_player", parameters);
}
function handleGlbestunits(receivedMessage, search, parameters) {

    const settings = cache.getTopUnits(search);

    var getLinks = function(units, cat, link) {
        var links = `**[${cat.replaceAll("_", " ").toTitleCase(" ")}]:** `;
        units.forEach((u, ind) => {

            u = convertSearchTerm(u);
            if (link) {
                u = convertValueToLink(u);
            } else {
                u = u.replaceAll("_", " ");
                u = u.toTitleCase(" ");
            }

            links += u;
            if (ind < units.length - 1) {
                links += " / ";
            }
        });
        return links
    }

    var list = "";
    if (!search || search.empty()) {
        var categories = Object.keys(settings);
        categories.forEach((cat) => {
            var units = settings[cat];
            list += "\n" + getLinks(units, cat, true);
        });
    } else {
        list += "\n" + getLinks(settings, search, true);
    }

    var t =  `Global Best 7★ Units (random order, limited units __excluded__)`;
    var embed = {
        color: pinkHexCode,
        title: t,
        description: list,
    };

    Client.sendMessage(receivedMessage, embed, null, (e) => {
        log("Message too big, removing links")

        list = "";
        categories.forEach((cat) => {
            var units = settings[cat];
            list += "\n" + getLinks(units, cat, false);
        });

        embed = {
            color: pinkHexCode,
            title: t,
            description: list,
        };

        Client.sendMessage(receivedMessage, embed)
    });
}
function handleAddtopunit(receivedMessage, search, parameters) {
    if (receivedMessage.guild) {
        return;
    }
 
    var cat = search;
    var unit = parameters[0];
    if (search.empty()) {
        cat = parameters[0];
        unit = parameters[1];
    }

    if (cache.addTopUnit(cat, unit)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}
function handleRemovetopunit(receivedMessage, search, parameters) {
    if (receivedMessage.guild) {
        return;
    }

    var cat = search;
    var unit = parameters[0];
    if (search.empty()) {
        cat = parameters[0];
        unit = parameters[1];
    }

    if (cache.removeTopUnit(cat, unit)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}
function handleHelp(receivedMessage) {
    var data = fs.readFileSync("readme.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

// DAMAGE
function handleDamage(receivedMessage, search, parameters) {

    search = search.replaceAll("_", " ");
    var calc = cache.getUnitCalc(search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return;
    }
    var text = "";
    if (!calc.damage.empty()) {
        text += `**Damage Per Turn:** ${calc.damage}\n`;
    }
    if (!calc.burst.empty()) {
        text += `**Highest Burst:** ${calc.burst} on turn ${calc.burstTurn}\n`;
    }
    text += `\n[(spreadsheet)](${sheetURL}) - [(wiki)](${calc.wiki}) - [(build)](${calc.url})\n`;

    var embed = <any>{
        color: pinkHexCode,
        title: `${calc.name}`,
        url: sheetURL,
        description: text,
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleDpt(receivedMessage, search, parameters, isBurst) {

    if (receivedMessage.channel.name.includes("wiki")) {
        handleMuspel(receivedMessage, search, parameters);
        return;
    }
    
    search = search.replaceAll("_", " ");
    var calc = cache.getCalculations(false, search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return;
    }

    var text = "";
    var limit = 5;
    if (parameters && parameters[0])
        limit = parameters[0];
        
    const keys = Object.keys(calc);
    const cap = Math.min(limit, keys.length);
    for (let ind = 0; ind < cap; ind++) {
        const key = keys[ind];
        const element = calc[key];

        if (isBurst && !element.burst.empty()) {
            text += `**${element.name}:** ${element.burst} on turn ${element.burstTurn}\n`;
        } else if (!element.damage.empty()) {
            text += `**${element.name}:** ${element.damage} : ${element.turns}\n`;
        }
    }

    var title = "";
    var s = search.toTitleCase();
    if (isBurst) {
        title = `Burst damage for: ${s}. (damage on turn)`;
    } else {
        title = `DPT for: ${s}. (dpt - turns for rotation)`;
    }

    var embed = <any>{
        color: pinkHexCode,
        title: title,
        url: sheetURL,
        description: text,
        footer: {
            text: "visit the link provided for more calculations"
        },
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleBurst(receivedMessage, search, parameters) {
    handleDpt(receivedMessage, search, parameters, true);
}
function handleRotation(receivedMessage, search, parameters) {

    search = search.replaceAll("_", " ");
    var calc = cache.getUnitCalc(search);
    if (!calc || !calc.rotation) {
        log("Could not find calculations for: " + search);
        return;
    }

    var bturn = 0;
    var text = `**Damage Per Turn: ${calc.damage}**\n`;
    if (!calc.burst.empty()) {
        text += `**Highest Burst: ${calc.burst} on turn ${calc.burstTurn}**\n`;
        bturn = parseInt(calc.burstTurn);
    }
    text += `**[(spreadsheet)](${sheetURL}) - [(wiki)](${calc.wiki}) - [(build)](${calc.url})**\n\n`;
    calc.rotation.forEach((txt, ind) => {
        if (txt.empty()) 
            return;

        if (ind+1 === bturn) {
            text += `**[${ind+1}]: ${txt}**\n`;
        } else {
            text += `**[${ind+1}]**: ${txt}\n`;
        }
    });

    var embed = <any>{
        color: pinkHexCode,
        title: `Optimal Rotation For: ${calc.name}`,
        description: text,
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleTopdps(receivedMessage, search, parameters) {

    const calcs = cache.getAllCalculations();
    const check = search && !search.empty();

    const culled = [];
    calcs.forEach(unit => {

        if (check && !unit.type.includes(search))
            return;
        if (!unit.damage || unit.damage === undefined || unit.damage.empty())
            return;

        var ad = parseInt(unit.damage.replaceAll(",", ""));

        if (Number.isNaN(ad)) return;

        culled.push(unit);
    });


    const sorted = culled.sort((a, b) => {

        var ad = parseInt(a.damage.replaceAll(",", ""));
        var bd = parseInt(b.damage.replaceAll(",", ""));

        if (Number.isNaN(ad)) {
            return -1;
        } else if (Number.isNaN(bd)) {
            return 1;
        }

        if (bd < ad)
            return -1;
        else 
            return 1;
    });

    var text = "";
    var count = Math.min(10, sorted.length);
    for (let index = 0; index < count; index++) {
        const unit = sorted[index];
        
        text += `**${unit.name}:** ${unit.damage}\n`;
    }

    var embed = <any>{
        color: pinkHexCode,
        title: `Top DPS`,
        description: text,
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleMuspel(receivedMessage, search, parameters) {

    search = search.replaceAll("_", " ");
    var calc = cache.getCalculations(true, search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return;
    }

    var text = "";
    var limit = 5;
    if (parameters && parameters[0])
        limit = parameters[0];
        
    const keys = Object.keys(calc);
    const cap = Math.min(limit, keys.length);
    for (let ind = 0; ind < cap; ind++) {
        const key = keys[ind];
        const element = calc[key];

        if (element.damage.empty())
            continue;

        if (element.type == "finisher") {
            text += `**${element.name} (${element.type}):** ${element.damage} on turn ${element.turns}\n`;
        } else {
            text += `**${element.name} (${element.type}):** ${element.damage} : ${element.turns}\n`;
        }
    }

    var s = search.toTitleCase();
    var embed = <any>{
        color: pinkHexCode,
        title: `Muspel Damage Comparisons: ${s}`,
        url: muspelURL,
        description: text,
        footer: {
            text: "visit the link provided for more calculations"
        },
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, muspelUserID);
}

// ADDING RESOURCES
function handleAddalias(receivedMessage, search, parameters) {
    if (receivedMessage.content.replace(/[^"]/g, "").length < 4) {
        log("Invalid Alias");
        return;
    }

    var w1 = parameters[0];
    var w2 = parameters[1];

    validateUnit(w1, valid => {
        if (valid) {
            respondFailure(receivedMessage);
        } else {
            validateUnit(w2, valid => {
                if (valid) {
                    log("Unit is valid");

                    w1 = w1.replaceAll(" ", "_");
                    config.setAlias(w1, w2);
                    config.save();

                    respondSuccess(receivedMessage);
                } else {
                    respondFailure(receivedMessage);
                }
            });
        }
    });
}
function handleAddemo(receivedMessage, search, parameters) {
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
                color: pinkHexCode,
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

                            overwriteFile(existing, url, result => {
                                const guildId = receivedMessage.guild.id;
                                receivedMessage.guild.emojis.forEach(customEmoji => {
                                    if (customEmoji.name === Client.getSuccess(guildId)) {
                                        message.delete();
                                        //receivedMessage.reply(`Emote has been replaced. :${customEmoji}:`);
                                        respondSuccess(receivedMessage);
                                    }
                                });
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
        downloadFile(name, url, result => {
            log(result);
            respondSuccess(receivedMessage);
        });
    }
}
function handleAddshortcut(receivedMessage, search, parameters) {
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
function handleAddresponse(receivedMessage, search, parameters) {

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
function handleSet(receivedMessage, search, parameters) {
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
function handleSetbestunits(receivedMessage, search, parameters) {
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

    if (cache.setRankings(search, value)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}
function handleSetinfo(receivedMessage, search, parameters) {
    if (receivedMessage.guild) {
        return;
    }

    var title = parameters[0];
    var desc = parameters[1];
    
    log("Set Information");
    log(`Title: ${title}`);
    log(`Desc: ${desc}`);

    if (cache.setInformation(search, title, desc, receivedMessage.author.id)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}
function handleAddinfo(receivedMessage, search, parameters) {
    
    if (receivedMessage.guild) {
        return;
    }

    log(`Add Information: ${search}`);

    if (cache.setInformation(search, "title", "desc", receivedMessage.author.id)) {
        respondSuccess(receivedMessage, true);
    } else {
        respondFailure(receivedMessage, true);
    }
}
function handlePrefix(receivedMessage) {
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
function handleUpdate(receivedMessage, search, parameters) {

    if (!Client.isAuthorized(receivedMessage.author)) {
        return;
    }

    log("Handle Update");

    try {
        cache.updateDamage(receivedMessage.author.id == muspelUserID, () => {
            log("Finished Updating");
            respondSuccess(receivedMessage, true);
        });
    } catch(e) {
        log(e);
        respondFailure(receivedMessage, true);
    }
}
function handleReload(receivedMessage, search, parameters) {

    var id = receivedMessage.author.id;
    if (id != renaulteUserID && id != jimooriUserID && id != furculaUserID) {
        return;
    }

    log("Handle Reload");

    try {
        cache.reload();
        config.reload();
        Client.reload();
    } catch(e) {
        log(e);
        respondFailure(receivedMessage, true);
    }

    log("Finished Reloading");
    respondSuccess(receivedMessage, true);
}


// UNIT DATAMINE INFORMATION
function handleK(receivedMessage, search, id) {
    log(`handleKit(${search})`);

    var unit = unitSearch(id, search);
    if (!unit) return;

    var name = unit.name.toTitleCase();
    var embed = {
        color: pinkHexCode,
        thumbnail: {
            url: sprite(getMaxRarity(id))
        },
        title: name.toTitleCase(),
        url: "https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"),
        fields: unit.fields
    };

    Client.sendMessage(receivedMessage, embed);
}

function handleKit(receivedMessage, search, parameters, active) {
    log(`handleKit(${search})`);

    var id = getUnitKey(search);
    if (!id) {
        log("No Unit Found");
        return;
    }

    var unit = unitSearchWithParameters(id, active, parameters);
    if (!unit) return;

    var name = unit.name.toTitleCase();
    var embed = {
        color: pinkHexCode,
        thumbnail: {
             url: sprite(getMaxRarity(id))
        },
        title: name,
        url: "https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"),
        fields: unit.fields
    };

    Client.sendMessage(receivedMessage, embed);
}
function handleAbility(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, true);
}
function handlePassive(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, false);
}

function handleData(receivedMessage, search, parameters) {
    
    search = search.replaceAll("_", " ");
    var data = cache.getSkill(search);
    if (!data) {
        log("Could not find Data for: " + search);
        return;
    }

    const defaultParameters = [ 
        'attack_count',
        'attack_damage',
        'attack_frames',
        'attack_type',
        'element_inflict',
        'effects',
    ]
    if (!parameters || parameters.length == 0)
        parameters = defaultParameters;
    
    const dataKeys = Object.keys(data);
    dataKeys.forEach(dkey => {
        var fields = [];
        const obj = data[dkey];

        const keys = Object.keys(obj);
        for (let ind = 0; ind < keys.length; ind++) {
            const key = keys[ind];
            const value = `${obj[key]}`;
            
            if (!parameters.includes(key))
                continue;
            if (!value || value.empty() || value === "null" || value === "None")
                continue;
            
            fields[fields.length] = {
                name: key,
                value: value
            }
        }
        
        var embed = <any>{
            title: `${dkey} - ${obj.name}`,
            color: pinkHexCode,
            fields: fields
        }
        
        Client.sendMessage(receivedMessage, embed);
    });
}





function handleUnitQuery(receivedMessage, command, search) {
    if (!command)
        return false;

    //log(`${command} Doesn't Exists`);
    var s = command.toLowerCase();
    //log(`Search: ${search}`);

    var alias = config.getAlias(s);
    if (alias) {
        //log("Found Alias: " + alias);
        command = alias.toLowerCase().replaceAll(" ", "_");
    }

    var id = getUnitKey(command.toLowerCase())
    //log(`Unit ID: ${id}`);
    if (!id)
        return false;

    //log(`Unit ID valid`);
    handleK(receivedMessage, escapeString(search), id);
    return true;
}


/////////////////////////////////////////////////
// RESPONSE

function respondSuccess(receivedMessage, toUser = false) {
    Client.respondSuccess(receivedMessage, toUser);
}
function respondFailure(receivedMessage, toUser = false) {
    Client.respondFailure(receivedMessage, toUser);
}


/////////////////////////////////////////////////
// PARSING HELPERS

function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}

function getUnitKey(search) {
    return cache.getUnitKey(search);
}

function getMaxRarity(unit) {
    var rarity = unit[unit.length-1];
    var id = unit.substring(0, unit.length-1);
    log("Unit ID: " + unit);
    if (rarity === "5") {
        unit = id + "7";
    } else {
        unit = id + "6";
    }
    return unit;
}
function getGif(search, param, callback) {
    log("getGif: " + search + `(${param})`);

    var unitName = search
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20")

    var animationName = param
    animationName = param.toTitleCase().replaceAll(" ", "%20")
    
    const filename = `tempgifs/${search}/${param}.gif`;
    if (fs.existsSync(filename)) {
        callback(filename);
        log("Returning cached gif");
        return;
    }

    var unitID = getUnitKey(search);
    if (!unitID)
        unitID = search;

    var rarity = unitID[unitID.length-1];
    var id = unitID.substring(0, unitID.length-1);
    log("Unit ID: " + unitID);
    
    var unitL = null; // ignore using othet source if JP
    if (isLetter(search[0])) {
        unitL = search.replaceAll("_", "+");
    }

    var saveGif = function(url) {
        if (!fs.existsSync(`tempgifs/${search}/`))
        fs.mkdirSync( `tempgifs/${search}/`, { recursive: true});
        
        var file = null;
        var source = url.slice(0, 5) === 'https' ? https : http;
        source.get(url, function(response) {
            if (response.statusCode !== 200) {
                log("Unit Animation not found");
                return;
            }
            file = fs.createWriteStream(filename);
            file.on('finish', function() {
                callback(filename);
            });
            return response.pipe(file);
        });
    }
    
    var gifs = [];
    var count = 5; // most units only have 2 pages
    var queryEnd = function (c) {
        count--;

        if (count <= 0) {

            gifs.sort((a, b) => {
                if(a.includes("ffbegif"))
                    return -1;
                else 
                    return 1;
            });
            log(gifs);
            
            var img = gifs.find((n) => {
                n = n.toLowerCase();

                if (param.includes("win")) {
                    return n.includes(param) && !n.includes("before");
                }

                log(`Compare Gifs: ${n}, ${param}`);

                // magic has priority
                if (compareStrings(n, "limit") || compareStrings(param, "limit")) {
                    log(`Found Limit: param: ${compareStrings(param, "limit")}, n to param: ${compareStrings(n, param)}`);
                    return compareStrings(param, "limit") && compareStrings(n, param);
                } else if ((compareStrings(n, "mag") && !compareStrings(n, "standby")) ||
                            (compareStrings(param, "mag") && !compareStrings(param, "standby"))) {
                    log(`Found mag: param: ${compareStrings(param, "mag")}, n to param: ${compareStrings(n, param)}`);
                    return compareStrings(n, param) && compareStrings(param, "mag") && !compareStrings(n, "standby");
                } else if (compareStrings(n, "standby")) {
                    log(`Found Standby: param: ${compareStrings(param, "magic")}, n: ${compareStrings(n, "magic")}`);

                    return compareStrings(param, "standby") 
                            && ((!compareStrings(param, "magic") && !compareStrings(n, "magic"))
                            || (compareStrings(param, "magic") && compareStrings(n, "magic")));
                } else if (compareStrings(n, "atk|attack") && compareStrings(param, "atk|attack")) {
                    log(`Found Atk: param: ${compareStrings(param, "atk")}, n: ${compareStrings(n, "atk")}`);
                    log(`Found Attack: param: ${compareStrings(param, "attack")}, n: ${compareStrings(n, "attack")}`);
                    return true;
                }
                
                log("Gif did not match any cases");
                return compareStrings(n, param);
            });
            if (!img) {
                img = gifs.find((n) => {
                    return n.toLowerCase().replaceAll(" ", "_").includes(param.replaceAll(" ", "_"));
                });
            }
            if (img) {
                
                img = img.replaceAll(" ", "%20");
                log("Found Requested Gif");
                log(img);
                
                saveGif(img);
            }
        }
    };

    var uri = [ aniGL(unitID), aniJP(unitID) ];
    for(var i = 0; i < 2; i++) {
        request(
            { uri: uri[i] },
            function(error, response, body) {
                const $ = cheerio.load(body);
                $('img').each((ind, el) => {
                    var src = $(el).attr('src');
                    if (src === undefined)
                        return;

                    var ext = getFileExtension(src);
                    if (ext === ".gif") {
                        gifs.push(src);
                    }
                });

                queryEnd(count);
            }
        );
    }

    var direct = `http://www.ffbegif.com/${unitName}/${getMaxRarity(unitID)}%20${animationName}.gif`;
    log(`Searching for: ${direct}`);
    request(
        { uri: direct },
        function(error, response, body) {

            if (response.statusCode != 200) {
                log(`Gif could not be found.`)
                return;
            }
            
            saveGif(direct);
        }
    );

    /*log(`Searching for: ${direct}`);
    var siteSearch = `${ffbegifEndpoint}?page=${i}&name=${unitL}`;
    if (unitL) {
        for(var i = 0; i < 2; i++) {
            request(
                { uri: direct },
                function(error, response, body) {
                    log(body);
                    const $ = cheerio.load(body);
                    $('img').each((ind, el) => {
                        var src = $(el).attr('src');
                        if (src === undefined)
                            return;

                        if (src.includes("Move")) return;

                        var ext = getFileExtension(src);
                        if (ext === ".gif") {
                            gifs.push(ffbegifEndpoint+src);
                        }
                    });

                    queryEnd(count);
                }
            );
        }
    } else {
        count -= 2;
    }*/

    queryEnd(count);
}

function convertSearchTerm(search) {
    var s = search;
    var alias = config.getAlias(s.replaceAll(" ", "_"));
    if (alias) {
        //log("Found Alias: " + alias);
        return alias.replaceAll(" ", "_");
    }

    //search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}
function convertValueToLink(value) {
    
    var link = value;
    linkFilter.forEach(filter => {
        link = link.replace(filter, "");
    });
    
    var title = link.toTitleCase("_");
    title = title.replace("Ss_", "SS_");
    title = title.replace("Cg_", "CG_");
    title = title.replaceAll("_", " ");

    link = `[${title}](${wikiEndpoint + link.replaceAll(" ", "_")}) `;
    //log("Converted Link: " + link);
    return link;
}

function getSearchString(prefix, msg, replace = true) {
    var ind = prefix.length + 1;
    var search = msg.slice(ind, msg.length);

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
function getCommandString(msg, prefix) {
    var split = msg.split(" ")[0];
    split = split.replace(prefix, "").capitalize();

    if (split.empty()) {
        return null;
    }

    return split;
}
function getParameters(msg) {

    var parameters = [];
    var params = msg.match(/"[^"]+"|‘[^‘]+‘|‘[^’]+’|“[^“]+“|”[^”]+”|“[^“^”]+”|'[^']+'/g);
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

function validateUnit(search, callback) {
    log(`validateUnit(${search})`);
    var unit = getUnitKey(search.replaceAll(" ", "_"));
    log(unit);
    callback(unit != null);
}
function validateEmote(emote) {
    var file = null;

    const types = config.filetypes();
    for (var i = 0; i < types.length; i++) {
        var filename = "emotes/" + emote + types[i];
        if (fs.existsSync(filename)) {
            file = filename;
            break;
        }
    }

    return file;
}
function getQuotedWord(str) {
    if (str.replace(/[^\""]/g, "").length < 2) {
        return null;
    }

    var start = str.indexOf('"');
    var end = str.indexOfAfterIndex('"', start + 1);
    var word = str.substring(start + 1, end);
    log(start);
    log(end);
    log("Quoted Word: " + word);

    if (word.empty()) {
        return null;
    }

    return word;
}
function getFileExtension(link) {
    return link.substring(link.lastIndexOf("."), link.length);
}
function overwriteFile(existing: string, url, callback) {
    fs.unlink(existing, err => {
        if (err) {
            log(err);
            return;
        }

        downloadFile(existing.slice(existing.lastIndexOf("/"), existing.lastIndexOf(".")), url, result => {
            log(result);

            callback(result);
        });
    });
}
function downloadFile(name, link, callback) {
    var ext = link.substring(link.lastIndexOf("."), link.length).toLowerCase();
    if (!config.filetypes().includes(ext)) {
        log("Invalid img URL");
        return;
    }

    const file = fs.createWriteStream("emotes/" + name + ext);
    const request = https.get(link, function (response) {
        response.pipe(file);
        callback("success");
    });
}


/////////////////////////////////////////////////

export function handle(receivedMessage, com: Commands.CommandObject): boolean {
    
    log("\nHandle Command Obect");
    log(com);

    if (handleUnitQuery(receivedMessage, com.command, com.search)) {
        return;
    }

    try {
        var search = com.search;
        var parameters = com.parameters;

        if (com.attachment)
            parameters[parameters.length] = com.attachment;

        eval(com.run);
    } catch (e) {
        log(e);
        log("Command doesn't exist");

        if (Client.validate(receivedMessage, "emote")) {
            handleEmote(receivedMessage);
        } else {
            log("Emotes are disabled for this user");
        }
    }

    return false;
}
