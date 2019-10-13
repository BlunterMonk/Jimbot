//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as fs from "fs";
import * as fsextra from "fs-extra";
import * as https from "https";
import * as http from "http";
import {spawn} from "cross-spawn"; 

import "../util/string-extension.js";
import * as Build from "../ffbe/build.js";
import * as BuildImage from "../ffbe/buildimage.js";
import * as Commands from "./commands.js";
import { log, logData, error, escapeString, debug } from "../global.js";
import { cache } from "../cache/cache.js";
import { config, Config } from "../config/config.js";
import { Profiles } from "../config/profiles.js";
import { Client } from "../discord.js";
import { Builder } from "../ffbe/builder.js";
import { FFBE } from "../ffbe/ffbewiki.js";
import { unitSearch, unitSearchWithParameters } from "../ffbe/unit.js";
import { downloadFile } from "../util/download.js";

////////////////////////////////////////////////////////////

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
const whaleSheet = "https://docs.google.com/spreadsheets/d/1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";

const jimooriUserID = "131139508421918721";
const furculaUserID = "344500120827723777";
const cottonUserID  = "324904806332497932";
const muspelUserID  = "114545824989446149";
const shadoUserID   = "103785126026043392";

const sprite = (n) => `https://exvius.gg/static/img/assets/unit/unit_ills_${n}.png`;
const guildId = (msg) => msg.guild.id;
const userId = (msg) => msg.author.id;

const gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "win before",
    "cast": "magic attack",
}

////////////////////////////////////////////////////////////
// COMMANDS

function handleHelp(receivedMessage) {

    handleDpthelp(receivedMessage);
    handleBuildhelp(receivedMessage);
    handleWikihelp(receivedMessage);
    handleProfilehelp(receivedMessage);
}

function handleWhatsnew(receivedMessage) {
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

// FFBE WIKI

function handleWikihelp(receivedMessage) {
    var data = fs.readFileSync("./data/help/help-wiki.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

function handleUnit(receivedMessage, search, parameters) {

    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

    let original = search;
    
    search = search.toTitleCase("_");
    search = search.capitalizeWords(".");
    if (search.includes("(kh)"))
        search = search.replace("(kh)", "(KH)");

    log("Searching Units For: " + search);
    
    FFBE.queryWikiForUnit(search, parameters, function (pageName, imgurl, description, limited, fields) {
        if (pageName == null) {
            handleKit(receivedMessage, original, ["tmr|stmr"], "All");
            return;
        }

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

    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

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

    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

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
function handleWiki(receivedMessage, search, parameters) {
    log(`Searching For: ${search}...`);

    FFBE.queryWikiForPage(search, function (batch) {

        var embed = {
            color: pinkHexCode,
            description: batch
        };

        Client.sendMessage(receivedMessage, embed);
    });
}

function handleRank(receivedMessage, search, parameters) {
    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

    log("\nSearching Rankings for: " + search);

    if (search) {
        const unit = cache.getUnitRank(search.toLowerCase());
        if (!unit) {
            log("Could not find unit");
            return;
        }

        var embed = {
            title: unit.name,
            url: unit.url,
            color: pinkHexCode,
            description: unit.notes,
            fields: [
                {
                    name: "Rank",
                    value: unit.rating,
                    inline: true
                }, 
                {
                    name: "Role",
                    value: unit.role,
                    inline: true
                }
            ],
            thumbnail: {
                url: unit.icon
            }
        };

        // Add damage if present
        var calc = buildMuspelDamageString(search);
        if (calc && !calc.empty()) {
            embed.fields[embed.fields.length] = {
                name: "Damage Calculation",
                value: calc,
                inline: false
            }
        }

        Client.sendMessageWithAuthor(receivedMessage, embed, muspelUserID);
        return;
    }
}
function handleGif(receivedMessage, search, parameters) {
    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

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
function handleCg(receivedMessage, search, parameters) {
    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

    log("Searching CG for: " + search);
    
    search = search.replaceAll("_", " ");
    if (search == "rain")
        search = "SPOILER_rain";
    else if (search == "spoiler lasswell" || search == "king lasswell" || search == "chairman lasswell")
        search = "SPOILER_lasswell";

    const filename = `./cg/${search}.mp4`;
    if (!fs.existsSync(filename)) {
        log("CG Animation Doesn't Exist: ", filename);
        return;
    }

    const file = `${search}.mp4`;
    const attachment = new Discord.Attachment(filename, file);
    var embed = new Discord.RichEmbed()
            .attachFile(attachment)
            .setColor(pinkHexCode)
            .setImage(`attachment://${file}`);

    Client.send(receivedMessage, attachment);
}
function handleSprite(receivedMessage, search, parameters) {
    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

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


////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// FFBEEQUIP

function handleBuildhelp(receivedMessage) {
    var data = fs.readFileSync("./data/help/help-damage.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

export async function build(receivedMessage, url, unitIndex, calculation, isCompact: boolean, force = false): Promise<string> {

    return new Promise<string>((resolve, reject) => {

        Build.requestBuildData(url).then(response => {
            // log(data);
            var d = JSON.parse(response.data);
            if (!d || !d.units[0]) {
                error("Could not parse build data");
                reject("Could not parse build data");
                return;
            }      
            
            var ind = Math.max(unitIndex, d.units.length - 1);
            var b = d.units[ind];
            var build = Build.CreateBuild(response.id, response.region, b);
            if (!build) {
                Client.send(receivedMessage, "Sorry hun, something went wrong.");
                error("Could not build image");
                reject("Could not build unit");
                return;
            }
            var sendImg = function(p) {
                const attachment = new Discord.Attachment(p, 'build.png');
                var embed = new Discord.RichEmbed()
                        .attachFile(attachment)
                        .setColor(pinkHexCode)
                        .setImage(`attachment://build.png`);
                    
                if (calculation) {
                    var text = `**[${calculation.name.trim()}](${calculation.wiki})\n[(sheet)](${(calculation.source == "furcula") ? sheetURL : whaleSheet}) - [(wiki)](${calculation.wiki}) - [(build)](${calculation.url})**\n`;
                
                    embed.setDescription(text);
                    
                    // log(text);
                    Client.sendMessageWithAuthor(receivedMessage, embed, (calculation.source == "furcula") ? furculaUserID : shadoUserID);
                } else {
                    Client.sendMessage(receivedMessage, embed);
                }

                resolve(p);
            }
        
            let cmpt = `${(isCompact) ? "compact/" : ""}`;
            let imgPath = `./tempbuilds/${cmpt}${response.id}.png`;
            if (fs.existsSync(imgPath)) {
                sendImg(imgPath);
                return;
            }
        
            BuildImage.BuildImage(imgPath, build, isCompact).then(sendImg).catch((e) => {
                Client.send(receivedMessage, "Sorry hun, something went wrong.");
                error("Could not build image");
                reject(e);
            });
            
        }).catch(e => {
            error(e);
            reject(e);
        });
    });
}
function handleTeam(receivedMessage, search, parameters) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    Build.requestBuildData(search).then(response => {

        var d = JSON.parse(response.data);
        if (!d || !d.units[0]) {
            error("Could not parse build data");
            return;
        }
        
        var sendImg = function(p) {
            const attachment = new Discord.Attachment(p, 'build.png');
            var embed = new Discord.RichEmbed()
                    .attachFile(attachment)
                    .setColor(pinkHexCode)
                    .setImage(`attachment://build.png`);
                
            Client.sendMessage(receivedMessage, embed);
        }

        let imgPath = `./tempbuilds/${response.id}.png`;
        if (fs.existsSync(imgPath)) {
            sendImg(imgPath);
            return;
        }

        Client.send(receivedMessage, "oof, ok, this may take a while!");

        let team : Build.Build[] = d.units.map((buildData, index) => {
            return Build.CreateBuild(response.id, response.region, buildData);
        });

        BuildImage.BuildTeamImage(imgPath, team).then(sendImg).catch(e => {
            Client.send(receivedMessage, "Sorry hun, something went wrong.");
            error("Could not build image");
        })

        /*
        let imageBuilds : Promise<string>[] = d.units.map((buildData, index) => {
            return new Promise<string>((resolve, reject) => {

                let imgPath = `./tempbuilds/${response.id}/${response.id}_${index}.png`;
                if (fs.existsSync(imgPath)) {
                    sendImg(imgPath);
                    return;
                }

                var build = Build.CreateBuild(response.id, response.region, buildData);
                if (!build) {
                    Client.send(receivedMessage, "Sorry hun, something went wrong.");
                    error("Could not build image");
                    return;
                }

                BuildImage.BuildImage(imgPath, build, true).then(sendImg).catch((e) => {
                    Client.send(receivedMessage, "Sorry hun, something went wrong.");
                    error("Could not build image");
                    reject(e);
                });
            })
        });
        */

    }).catch(e => {
        error(e);
    });    
}
export function handleBuild(receivedMessage, search, parameters, isCompact: boolean) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var includeTitle = null;
    var unitID = getUnitKey(search);
    if (unitID) {
        var calc = cache.getUnitCalculation("furcula", search)
        if (calc) {
            calc.source = "furcula";
            includeTitle = calc;
            search = calc.url;
            log(`Loading Unit Calculation Build: ${calc.url}`);
        }
    }
    
    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    build(receivedMessage, search, ind, includeTitle, isCompact)
    .catch((e) => {
        console.error(e);
        error("Build Failed: ", e.message);
        error(`Unable to find build: ${search}`);
    });
}
export function handleBuildcompact(receivedMessage, search, parameters) {
    handleBuild(receivedMessage, search, parameters, true);
}
export function handleBis(receivedMessage, search, parameters, isCompact: boolean) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }
    
    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var includeTitle = null;
    //var unitID = getUnitKey(search);
    //if (unitID) {
        var calc = cache.getUnitCalculation("whale", search)
        if (calc) {
            calc.source = "whale";
            includeTitle = calc;
            search = calc.url;
            log(`Loading Unit Build: ${calc.url}`);
        }
    //}
         
    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    build(receivedMessage, search, ind, includeTitle, isCompact)
    .catch((e) => {
        log(`Unable to find build: ${search}`);    
    });
}
export function handleBiscompact(receivedMessage, search, parameters) {
    handleBuild(receivedMessage, search, parameters, true);
}
async function buildText(receivedMessage, url) {

    Build.requestBuildData(url).then(response => {
        // log(data);
        var b = JSON.parse(response.data).units[0];

        var name = getUnitNameFromKey(b.id).toTitleCase(" ");
        var text = Build.getBuildText(response.id, response.region, b);
        if (!text) {
            Client.send(receivedMessage, "Sorry hun, something went wrong.");
            log("Could not build text");
            return;
        }

        var desc = text.text.replaceAll("\\[", "**[");
        desc = desc.replaceAll("\\]:", "]:**");

        var embed = <any>{
            color: pinkHexCode,
            title: `Build: ${name}`,
            url: url,
            description: desc,
            // fields: text.fields,
            thumbnail: {
                url: `https://ffbeequip.com/img/units/unit_icon_${b.id}.png`
            }
        }

        // log(text);
        Client.sendMessage(receivedMessage, embed);
    }).catch(e => {
        error(e);
    });
}
export function handleBuildtext(receivedMessage, search, parameters) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var unitID = getUnitKey(search);
    if (unitID) {
        var calc = cache.getUnitCalculation("furcula", search)
        if (calc) {
            search = calc.url;
            log(`Loading Unit Build: ${calc.url}`);
        }
    }

    buildText(receivedMessage, search);
}
export function handleBistext(receivedMessage, search, parameters) {

    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var unitID = getUnitKey(search);
    if (unitID) {
        var calc = cache.getUnitCalculation("whale", search)
        if (calc) {
            search = calc.url;
            log(`Loading Unit Build: ${calc.url}`);
        }
    }

    buildText(receivedMessage, search);
}


////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// DAMAGE

function handleDpthelp(receivedMessage) {
    var data = fs.readFileSync("./data/help/help-damage.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

function buildDPTEmbed(search, isBurst, source) {
    var calc = cache.getCalculations(source, search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return null;
    }

    var text = "";
        
    const keys = Object.keys(calc);
    for (let ind = 0; ind < keys.length; ind++) {
        const key = keys[ind];
        const element = calc[key];

        if (isBurst && element.burst && !element.burst.empty()) {
            text += `**${element.name}:** ${element.burst} on turn ${element.burstTurn}\n`;
        } else if (element.damage && !element.damage.empty()) {
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

    return embed
}
function buildRotationEmbed(search, source) {

    var calc = cache.getUnitCalculation(source, search);
    if (!calc || !calc.rotation) {
        log("Could not find calculations for: " + search);
        return;
    }

    var bturn = 0;
    var text = `**Damage Per Turn: ${calc.damage}**\n`;
    if (calc.burst && !calc.burst.empty()) {
        text += `**Highest Burst: ${calc.burst} on turn ${calc.burstTurn}**\n`;
        bturn = parseInt(calc.burstTurn);
    }
    text += `**[(spreadsheet)](${(source == "furcula") ? sheetURL : whaleSheet}) - [(wiki)](${calc.wiki}) - [(build)](${calc.url})**\n\n`;
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

    return embed;
}
function buildMuspelDamageString(search) {
    var calc = cache.getCalculations("muspel", search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return;
    }

    var text = "";
        
    const keys = Object.keys(calc);
    for (let ind = 0; ind < keys.length; ind++) {
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

    return text;
}
function buildDamageEmbed(search) {

    search = search.replaceAll("_", " ");

    var furc = cache.getUnitCalculation("furcula", search);
    var whale = cache.getUnitCalculation("whale", search);
    var musp = cache.getUnitCalculation("muspel", search);
    if (!furc && !whale && !musp) {
        log("Could not find calculations for: " + search);
        return;
    }

    var text = "";
    text += `**[(furcula sheet)](${sheetURL}) - [(shado sheet)](${whaleSheet}) - [(muspel sheet)](${muspelURL})**\n\u200B\n`;

    if (furc && furc.damage && !furc.damage.empty()) {
        
        text += `**[Damage Per Turn:](${furc.url})** ${furc.damage} : ${furc.turns}\n`;
        if (furc.burst && !furc.burst.empty()) {
            text += `**[Highest Burst:](${furc.url})** ${furc.burst} on turn ${furc.burstTurn}\n`;
        }
    }

    if (whale && whale.damage && !whale.damage.empty()) {
        text += `**[Whale Damage Per Turn:](${whale.url})** ${whale.damage} : ${whale.turns}\n`;
        if (whale.burst && !whale.burst.empty()) {
            text += `**[Whale Highest Burst:](${whale.url})** ${whale.burst} on turn ${whale.burstTurn}\n`;
        }
    }

    if (musp && musp.damage && !musp.damage.empty()) {
        if (musp.type == "finisher") {
            text += `**Muspel's Calc (${musp.type}):** ${musp.damage} on turn ${musp.turns}\n`;
        } else {
            text += `**Muspel's Calc (${musp.type}):** ${musp.damage} : ${musp.turns}\n`;
        }
    }

    return <any>{
        color: pinkHexCode,
        title: `**__${furc.name}__**`,
        url: furc.wiki,
        description: text,
    }
}

function handleTopdps(receivedMessage, search, parameters) {

    const calcs = cache.getAllCalculations();
    const check = search && !search.empty();

    const culled = [];
    calcs.forEach(unit => {

        if (unit.jp || unit.name.includes("(JP)"))
            return;
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

    var limit = 10;
    var p = parseInt(parameters[0]);
    if (!Number.isNaN(p))
        limit = p;

    var text = "";
    var count = Math.min(limit, sorted.length);
    for (let index = 0; index < count; index++) {
        const unit = sorted[index];
        
        if (check)
            text += `**${unit.name}:** ${unit.damage}\n`;
        else 
            text += `**${unit.name} (${unit.type}):** ${unit.damage}\n`;
    }

    var embed = <any>{
        color: pinkHexCode,
        title: `Top DPS`,
        description: text,
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}

function handleDamage(receivedMessage, search, parameters) {
    
    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    let embed = buildDamageEmbed(search);
    Client.sendMessage(receivedMessage, embed);
}

function handleDpt(receivedMessage, search, parameters, isBurst) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    if (receivedMessage.channel.name.includes("wiki")) {
        handleMuspel(receivedMessage, search, parameters);
        return;
    }
    
    search = search.replaceAll("_", " ");

    var embed = buildDPTEmbed(search, isBurst, "furcula");
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleWhale(receivedMessage, search, parameters, isBurst) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var embed = buildDPTEmbed(search, isBurst, "whale");
    embed.url = whaleSheet;

    Client.sendMessageWithAuthor(receivedMessage, embed, shadoUserID);
}
function handleBurst(receivedMessage, search, parameters) {
    handleDpt(receivedMessage, search, parameters, true);
}
function handleWhaleburst(receivedMessage, search, parameters) {
    handleWhale(receivedMessage, search, parameters, true);
}
function handleRotation(receivedMessage, search, parameters) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var embed = buildRotationEmbed(search, "furcula");
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleWhaletation(receivedMessage, search, parameters) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var embed = buildRotationEmbed(search, "whale");
    embed.url = whaleSheet;

    Client.sendMessageWithAuthor(receivedMessage, embed, shadoUserID);
}

function handleMuspel(receivedMessage, search, parameters) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var text = buildMuspelDamageString(search);

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


////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////


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



////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////


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


// ADDING RESOURCES

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
function handleRemovealias(receivedMessage, search, parameters) {

    let name = search;
    if (parameters && parameters.length > 0)
        name = parameters[0];

    log("Removing Alias: ", name);
    config.removeAlias(name);
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
       
        downloadImage(name, url, result => {
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
function handleUpdate(receivedMessage, search, parameters, forced = false) {

    if (!Client.isAuthorized(receivedMessage.author)) {
        return;
    }

    var source = "";
    if (receivedMessage.author.id != jimooriUserID) {
        source = config.getUserNameFromID(receivedMessage.author.id)
    } else {
        source = parameters[0];
    }

    log(`Handle Update: ${source}`);
    if (cache.isUpdating == true) {
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

    cache.updateDamage(source, forced, (success, error) => {
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
function handleForceupdate(receivedMessage, search, parameters) {
    if (receivedMessage.author.id != jimooriUserID) {
        return;
    }

    cache.isUpdating = false;
    handleUpdate(receivedMessage, search, parameters, true);
}
function handleReload(receivedMessage, search, parameters) {

    var id = receivedMessage.author.id;
    if (id != jimooriUserID) {
        return;
    }

    log("Handle Reload");

    try {
        cache.reload();
        config.reload();
        Client.reload();
        Builder.reload();
    } catch(e) {
        log(e);
        respondFailure(receivedMessage, true);
    }

    log("Finished Reloading");
    respondSuccess(receivedMessage, true);
}
function handleRecache(receivedMessage, search, parameters) {
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
            color: pinkHexCode,
            description: output
        })
    });
}
function handleClear(receivedMessage, search, parameters) {
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


// PROFILES

function getMentionID(search): string {

    if (search && !search.empty()) {
        log("Getting friend code for mentioned user: ", search);

        search = search.replace("<", "");
        search = search.replace(">", "");
        search = search.replace("!", "");
        search = search.replace("@", "");

        if (!search.isNumber())
            return null;

        return search;
    }

    return null;
}

var welcomePhrases = [
    "Hurray, a new cutie patootie, welcome %v!",
    "Banzai, atarashī kawaī %v ni yōkoso!",
    "Bravo, bienvenue à bord d'une nouvelle %v mignonne!",
    "Hurra, bienvenido a bordo del nuevo %v lindo!",
    "Hurra, willkommen an Bord der neuen süßen %v!",
];

function handleProfilehelp(receivedMessage) {
    var data = fs.readFileSync("./data/help/help-profiles.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

function handleProfile(receivedMessage, search, parameters) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;

    let mention = getMentionID(search);
    if (mention) {
        log("Found mention: ", mention);
        id = mention;
    } else if (search && !search.empty()) {
        let newId = Profiles.getProfileID(search);
        if (!newId) {
            return;
        }

        log("Found User ID: ", newId, " from Nickname: ", search);
        id = newId;
    }

    let profile = Profiles.getProfile(id);
    if (!profile) {
        Client.send(receivedMessage, `oh, ${receivedMessage.author.username} baby, you gotta use "?Register" first 'kay?`);
        return;
    }

    var sendMsg = function(embed) {
        Client.sendMessage(receivedMessage, embed);
    }

    log("Attempting to display profile for user: ", id);
    Client.fetchUser(id).then(user => {

        var embed = new Discord.RichEmbed()
                .setColor(pinkHexCode)
                .setImage(`attachment://build.png`)
                .setThumbnail(user.avatarURL);

        let text = "";
        text += "**__Status:__** " + Profiles.getStatus(id).capitalize() + "\n\u200B\n";
        
        let keys = Object.keys(profile.builds);
        if (keys.length == 0) {
            text += "**__Builds:__**\n\n";
        } else {
            text += "**__No Builds Added__**\n\n";
        }

        // Add builds
        let tempText = "";
        keys.forEach((key, i) => {
            let n = key.replaceAll("_", " ").toTitleCase(" ");
            let u = profile.builds[key];
            tempText += `[${n}](${u})\n`;
        });
        if (tempText.length + text.length > 2000) {
            debug("Build text too long, removing links: ", tempText.length);

            tempText = "";
            keys.forEach((key, i) => {
                tempText += key.replaceAll("_", " ").toTitleCase(" ") + "\n";
            });
        }
        text += tempText + "\n";

        // Add username and friend code
        let name = (profile.nickname.empty()) ? user.username : profile.nickname.replaceAll("_", " ").toTitleCase(" ");
        let code = (profile.friendcode.empty()) ? "" : ": " + profile.friendcode.numberWithCommas();

        embed.setTitle(`${name}'s Profile${code}`)
             .setDescription(text);

        // add lead image
        let leadURL = profile.lead;
        if (leadURL) {
            embed.setDescription(text + "\u200B\n**__Lead:__**")
            Build.requestBuildData(leadURL).then(response => {
                var d = JSON.parse(response.data);
                if (!d || !d.units[0]) {
                    error("Could not parse build data");
                    Client.send(receivedMessage, "sorry hun, looks like the build you sent isn't quite right")
                    return;
                }
        
                let imgPath = `./tempbuilds/compact/${response.id}.png`;
                if (fs.existsSync(imgPath)) {
                    const attachment = new Discord.Attachment(imgPath, 'build.png');
                    embed.attachFile(attachment);
                    sendMsg(embed);
                    return;
                }

                var build = Build.CreateBuild(response.id, response.region, d.units[0]);
                if (!build) {
                    error("Could not build image");
                    sendMsg(embed);
                    return;
                }
        
                BuildImage.BuildImage(imgPath, build, true)
                    .then(p => {
                        const attachment = new Discord.Attachment(p, 'build.png');
                        embed.attachFile(attachment);
                        sendMsg(embed);
                    })
                    .catch((e) => {
                        error("Could not build lead image: ", e);
                        sendMsg(embed);
                    });
            });
        } else {
            sendMsg(embed);
        }

    }).catch(e => {
        error("Failed to fetch user information: ", e.message);
        Client.send(receivedMessage, "sorry, I messed up");
    })
}
function handleFriend(receivedMessage, search, parameters) {
    
    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    let mention = getMentionID(search);
    if (mention) {
        id = mention;
    }

    let code = Profiles.getFriendCode(id);
    if (!code || code.empty()) {
        Client.send(receivedMessage, "looks like we aren't friends yet, sad...");
        return;
    }
    log("Retrieving Friend Code For User: ", id, " Code: ", code);

    Client.send(receivedMessage, `${code}`);
}
function handleUserbuild(receivedMessage, search, parameters) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;
    if (!parameters || parameters.length < 1) {
        Client.send(receivedMessage, "hmm, you didn't tell me which build to give you")
    }

    let name = parameters[0].toLowerCase().replaceAll(" ", "_");
    let mention = getMentionID(search);
    if (mention) {
        id = mention;
    } else if (search && !search.empty()) {
        let newId = Profiles.getProfileID(search);
        if (!newId) {
            return;
        }

        log("Found User ID: ", newId, " from Nickname: ", search);
        id = newId;
    }

    let buildUrl = Profiles.getBuild(id, name);
    if (!buildUrl) {
        error("No Build URL found with name: ", name, " For user: ", id);
        // Client.send(receivedMessage, `looks like, ${receivedMessage.author.username} baby, you gotta Register first 'kay?`);
        return;
    }

    build(receivedMessage, buildUrl, 0, null, false)
    .catch((e) => {
        console.error(e);
        error("Build Failed: ", e.message);
        error(`Unable to find build: ${name}`);
    });
}

function handleMybuild(receivedMessage, search, parameters) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let profile = Profiles.getProfile(receivedMessage.author.id);
    if (!profile)
        return;

    var url = profile.builds[search];
    if (!url) {
        error("Could not find build with name: ", search, " for user: ", receivedMessage.author.id);
        return;
    }

    search = search.replaceAll("_", " ").toTitleCase(" ");
         
    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    build(receivedMessage, url, ind, null, false)
    .catch((e) => {
        console.error(e);
        error("Build Failed: ", e.message);
        error(`Unable to find build: ${search}`);
    });
}
function handleMybuildcompact(receivedMessage, search, parameters) {
}
function handleMyteam(receivedMessage, search, parameters) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let profile = Profiles.getProfile(receivedMessage.author.id);
    if (!profile)
        return;

    var url = profile.builds[search];
    if (!url) {
        error("Could not find build with name: ", search, " for user: ", receivedMessage.author.id);
        return;
    }

    handleTeam(receivedMessage, url, parameters);
}


// PROFILE SETTINGS

function handleRegister(receivedMessage, search, parameters) {

    let id = receivedMessage.author.id;
    log("Register: ", id);
    if (Profiles.getProfile(id)) {
        Client.send(receivedMessage, "silly billy, you're already registered");
        return;
    }

    let code  = "";
    let name = "";
    if (search && !search.empty()) {
        search = search.replaceAll(",", "").trim();

        if (parameters.length > 0) {
            let n = parameters[0].toLowerCase().replaceAll(" ", "_");
            debug("Attempting to add nickname: ", n);
            if (Profiles.nicknameTaken(n)) {
                log("Registration cancelled, Nickname in use: ", n);
                Client.send(receivedMessage, "seems like that nickname is already taken, try another ok?");
                return;
            } else {
                name = n;
            }
        } 
        
        let c = parseInt(search);
        debug("Attempting to add friend code: ", c);
        if (search.length > 9 || Number.isNaN(c) || !search.isNumber()) {
            log("Registration cancelled, friend code invalid: ", c);
            Client.send(receivedMessage, "no can do boss, make sure you just send the numbers 'kay?");
            return;
        }

        code = search;
    }

    log("Registering New User: ", id);
    Client.fetchUser(id).then(user => {
        
        if (Profiles.nicknameTaken(user.username)) {
            name = "";
        }
        
        Profiles.addProfile(id, code, name);

        var msg = welcomePhrases[getRandomInt(welcomePhrases.length)]
        msg = msg.replaceAll("%v", name.replaceAll("_", " ").toTitleCase(" "));
        
        Client.send(receivedMessage, msg);
    });
}
function handleAddbuild(receivedMessage, search, parameters) {

    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    if (!parameters || parameters.length < 2) {
        Client.send(receivedMessage, "sorry hun, you're missing some info")
    }

    let name = parameters[0];
    name = name.replace(/[^\w\s]/gi, '')
    if (name.length > 128) {
        Client.send(receivedMessage, "stop stop stop, that name is way too long!")
        return;
    }
    let url = parameters[1];

    Build.requestBuildData(url).then(response => {
        var d = JSON.parse(response.data);
        if (!d || !d.units[0]) {
            error("Could not parse build data");
            Client.send(receivedMessage, "sorry hun, looks like the build you sent isn't quite right")
            return;
        }

        Profiles.addBuild(id, name.replaceAll(" ", "_"), url);
        Client.send(receivedMessage, `OK, i'll remember that, ${name}`);

        log("Stored New Build: ", name, " Unit: ", `(${d.id})`, " URL: ", url)
    }).catch(e => {
        error(e);
        Client.send(receivedMessage, "sorry hun, looks like the build you sent isn't quite right")
    });
}
function handleRemovebuild(receivedMessage, search, parameters) {

    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;
    if (!search || search.empty()) {
        return;
    }

    debug("Attempting to remove build: ", search, " From user: ", id);
    
    let name = search.replaceAll(" ", "_")
    let removed = Profiles.removeBuild(id, name);
    if (removed) {
        log("Removed Build: ", name, " From User: ", id);
        Client.send(receivedMessage, `if you insist... *jimbot forgot "${search.toTitleCase().replaceAll("_", " ")}"*`);
    } 
}
function handleEnableautobuild(receivedMessage, search, parameters) {
    
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    log("Enabling Auto Build For User: ", id);
    Profiles.setAutoBuild(id, true);

    Client.send(receivedMessage, "all set, auto build engage!");
}
function handleDisableautobuild(receivedMessage, search, parameters) {
    
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    log("Enabling Auto Build For User: ", id);
    Profiles.setAutoBuild(id, false);

    Client.send(receivedMessage, "okay, no more auto builds...");
}
function handleFriendcode(receivedMessage, search, parameters) {
    
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    if (!search || search.empty())
        return;

    search = search.replaceAll(",", "").trim();

    let code = parseInt(search);
    log("Attempting to add friend code: ", code);
    if (search.length > 9 || Number.isNaN(code) || !search.isNumber()) {
        Client.send(receivedMessage, "no can do boss, make sure you just send the numbers 'kay?");
        return;
    }

    log("Added Friend Code For User: ", id, " Code: ", search);
    Profiles.setFriendCode(id, search);

    Client.send(receivedMessage, "so exciting! I love making new friends!");
}
function handleNickname(receivedMessage, search, parameters) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    search = search.trim();
    if (search.length > 64) {
        Client.send(receivedMessage, "that's way too long to be a name, no can do.")
        return;
    }

    if (Profiles.nicknameTaken(search)) {
        Client.send(receivedMessage, "that name is already taken, sorry!");
        return;
    }

    Profiles.saveNickname(id, search);

    Client.send(receivedMessage, `Got it, ${search.replaceAll("_", " ").toTitleCase(" ")}!`);
}
function handleSetstatus(receivedMessage, search, parameters) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;
    let profile = Profiles.getProfile(id);
    if (!profile)
        return;
    
    if (!parameters || parameters.length == 0 || parameters[0].empty()) {
        return;
    }

    let status = parameters[0];

    Profiles.setStatus(id, status);
    Client.send(receivedMessage, "Got it! Your profile has been updated");
}
function handleSetlead(receivedMessage, search, parameters) {

    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    if (!search || search.empty()) {
        Client.send(receivedMessage, "you forgot to tell me which build");
    }

    let url = search;
    let b = Profiles.getBuild(id, search);
    if (b) {
        url = b;
        log("Got Stored build from user: ", search);
    }

    Build.requestBuildData(url).then(response => {
        var d = JSON.parse(response.data);
        if (!d || !d.units[0]) {
            error("Could not parse build data");
            Client.send(receivedMessage, "sorry hun, looks like the build you sent isn't quite right")
            return;
        }

        Profiles.setLead(id, url);

        build(receivedMessage, url, 0, null, true)
        .then(p => {
            Client.send(receivedMessage, `lookin good, I'm sure everyone will like it!`);
            log("Stored New Lea Build: ", " Unit: ", `(${d.id})`, " URL: ", url)
        })
        .catch((e) => {
            error("Build Failed: ", e);
        });
    }).catch(e => {
        error(e);
        Client.send(receivedMessage, "sorry hun, looks like the build you sent isn't quite right")
    });
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

function handleKit(receivedMessage, search, parameters, type: string) {
    log(`handleKit(${search})`);

    var id = getUnitKey(search);
    if (!id) {
        log("No Unit Found");
        return;
    }

    if (parameters.length == 0)
        parameters[0] = "";
        
    var unit = unitSearchWithParameters(id, type, parameters);
    if (!unit) {
        log("unitSearchWithParameters: No Unit information was found: ", JSON.stringify(parameters))
        return;
    }

    log("hanleKit Output: ", JSON.stringify(unit))

    //var img = `unit_ills_${getMaxRarity(id)}.png`;
    var name = unit.name.toTitleCase();
    var embed = {
        color: pinkHexCode,
        //thumbnail: {
        //     url: `attachment://${img}`
        //},
        title: name,
        url: "https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"),
        fields: unit.fields
    };

    Client.sendMessage(receivedMessage, embed);
    /*
    Client.sendMessage(receivedMessage, {
        embed:embed,
        files: [{
            attachment:`./icons/units/${img}`,
            name:`${img}`
        }]
    });
    */
}
function handleAbility(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, "Active");
}
function handlePassive(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, "Passive");
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

function handleAddreview(receivedMessage, search, parameters) {
    
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
function handleJimooriview(receivedMessage, search, parameters) {

    var reviews = JSON.parse(fs.readFileSync("data/reviews.json").toString());
    var text = reviews[search];
    if (!text)
        return;

    var s = search.replaceAll("_", " ");
    s = s.toTitleCase();
    var embed = <any>{
        color: pinkHexCode,
        title: `${s} Review: ${text.rating}/10`,
        description: text.description
    }
    
    Client.sendMessage(receivedMessage, embed);
}


function handleUnitQuery(receivedMessage, command, search) {
    if (!command)
        return false;

    if (!search)
        search = "";

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


function handleGrab(receivedMessage, search, parameters) {

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
// RESPONSE

function respondSuccess(receivedMessage, toUser = false) {
    Client.respondSuccess(receivedMessage, toUser);
}
function respondFailure(receivedMessage, toUser = false) {
    Client.respondFailure(receivedMessage, toUser);
}


/////////////////////////////////////////////////
// PARSING HELPERS

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}

function getUnitKey(search) {

    let id = cache.getUnitKey(search);
    if (id)
        return id;

    id = cache.getUnitIDGL(search);
    if (id)
        return id;

    return cache.getUnitIDJP(search);
}
function getJPKey(search) {

    let id = cache.getUnitKey(search);
    if (id)
        return id;

    id = cache.getUnitIDGL(search);
    if (id)
        return id;

    return cache.getUnitIDJP(search);
}
function getUnitNameFromKey(search) {
    return cache.getUnitName(search);
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
async function getGif(search, param, callback) {

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");
    unitName = unitName.capitalizeWords(".");
    log("getGif: " + unitName + `(${param})`);

    var animationName = param;
    animationName = animationName.toTitleCase().replaceAll(" ", "%20");
    
    const filename = `tempgifs/${search}/${param}.gif`;
    if (fs.existsSync(filename)) {
        callback(filename);
        debug("Returning cached gif");
        return;
    }

    var unitID = getUnitKey(search);
    if (!unitID)
        unitID = search;

    var id = unitID.substring(0, unitID.length-1);
    debug("Unit ID: " + unitID);
    
    var unitL = null; // ignore using othet source if JP
    if (isLetter(search[0])) {
        unitL = search.replaceAll("_", "+");
    }

    var saveGif = function(url): Promise<string> {
        if (!fs.existsSync(`tempgifs/${search}/`))
            fs.mkdirSync( `tempgifs/${search}/`, { recursive: true});
        
        var file = null;
        var source = url.slice(0, 5) === 'https' ? https : http;
        return new Promise<string>((resolve, reject) =>{

            source.get(url, function(response) {
                if (response.statusCode !== 200) {
                    error("Unit Animation not found");
                    reject("Unit Animation not found");
                    return;
                }
                file = fs.createWriteStream(filename);
                file.on('finish', function() {
                    resolve(filename);
                });
                return response.pipe(file);
            });
        })
    }
    
    for (let rarity = 7; rarity > 2; rarity--) {
        var direct = `http://www.ffbegif.com/${unitName}/${id}${rarity}%20${animationName}.gif`;
        debug(`Searching for: ${direct}`);
        await saveGif(direct).then((p) =>{
            callback(p);
            rarity = 0;
        }).catch((e) => {
            error("failed to get gif");
        });
    }
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

        downloadImage(existing.slice(existing.lastIndexOf("/"), existing.lastIndexOf(".")), url, result => {
            log(result);

            callback(result);
        });
    });
}
function downloadImage(name, link, callback) {
    var ext = link.substring(link.lastIndexOf("."), link.length).toLowerCase();
    if (!config.filetypes().includes(ext)) {
        log("Invalid img URL");
        return;
    }

    const file = fs.createWriteStream("emotes/" + name + ext);
    downloadFile(file, link).then(callback);
}


/////////////////////////////////////////////////

export function handle(receivedMessage, com: Commands.CommandObject): boolean {
    
    log("Handle Command Object: ", com);

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
        error("Command doesn't exist: ", com.command, " error: ", e.message);
        console.log(e);

        if (Client.validate(receivedMessage, "emote")) {
            handleEmote(receivedMessage);
        } else {
            log("Emotes are disabled for this user");
        }
    }

    return false;
}
