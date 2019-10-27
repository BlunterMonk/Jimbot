//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as fs from "fs";

import "../../util/string-extension.js";
import { log, logData, error, escapeString, debug } from "../../global.js";
import { Cache } from "../../cache/cache.js";
import { Config } from "../../config/config.js";
import { Profiles } from "../../config/profiles.js";
import { Client } from "../../discord.js";
import { FFBE } from "../../ffbe/ffbewiki.js";
import { unitSearch, unitSearchWithParameters } from "../../ffbe/unit.js";
import { downloadFile } from "../../util/download.js";
import { resolve } from "url";
import { getUnitKey, validateUnit } from "./common.js";
import { convertSearchTerm, convertValueToLink, isLetter } from "../helper.js";
import { buildMuspelDamageString } from "./handleCalcs.js";

////////////////////////////////////////////////////////////////////

const gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "win before",
    "cast": "magic attack",
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
        
        return downloadFile(filename, url);
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

////////////////////////////////////////////////////////////////////

export function handleWikihelp(receivedMessage) {
    var data = fs.readFileSync("./data/help/help-wiki.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

export function handleUnit(receivedMessage: Discord.Message, search: string, parameters: string[]) {

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

export function handleEquip(receivedMessage: Discord.Message, search: string, parameters: string[]) {

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

export function handleSkill(receivedMessage: Discord.Message, search: string, parameters: string[]) {

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

export function handleSearch(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    log(`Searching For: ${search}...`);

    FFBE.queryWikiWithSearch(search, function (batch) {

        var embed = {
            fields: batch
        };

        Client.sendMessage(receivedMessage, embed);
    });
}

export function handleRecentunits(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    FFBE.queryWikiFrontPage((links) => {
        var embed = {
            author: Client.getAuthorEmbed(),
            title: "Recently Released Units",
            description: links,
            url: "https://exvius.gamepedia.com/Unit_List"
        };

        Client.sendMessage(receivedMessage, embed);
    })
}

export function handleWiki(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    log(`Searching For: ${search}...`);

    FFBE.queryWikiForPage(search, function (batch) {

        var embed = {
            description: batch
        };

        Client.sendMessage(receivedMessage, embed);
    });
}

export function handleRank(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (search == "help") {
        handleWikihelp(receivedMessage);
        return;
    }

    log("\nSearching Rankings for: " + search);

    if (search) {
        const unit = Cache.getUnitRank(search.toLowerCase());
        if (!unit) {
            log("Could not find unit");
            return;
        }

        var embed = {
            title: unit.name,
            url: unit.url,
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

        Client.sendMessageWithAuthor(receivedMessage, embed, "114545824989446149");
        return;
    }
}

export function handleGif(receivedMessage: Discord.Message, search: string, parameters: string[]) {
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

export function handleCg(receivedMessage: Discord.Message, search: string, parameters: string[]) {
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

    Client.send(receivedMessage, attachment);
}

export function handleSprite(receivedMessage: Discord.Message, search: string, parameters: string[]) {
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
    if (validateUnit(search)) {
        let path = `./icons/units/unit_ills_${unit}.png`;
        if (!fs.existsSync(path)) {
            log("Unit sprite does not exist: ", path);
            return;
        }

        const attachment = new Discord.Attachment(path, 'sprite.png');
        var embed = new Discord.RichEmbed()
                .attachFile(attachment)
                .setImage(`attachment://sprite.png`);

        log("Found Unit Sprite: ", path)
        Client.sendMessage(receivedMessage, embed);
    };
}

export function handleGlbestunits(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    const settings = Cache.getTopUnits(search);

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
        title: t,
        description: list,
    };

    Client.sendMessage(receivedMessage, embed)
    .catch((e) => {
        log("Message too big, removing links")

        list = "";
        categories.forEach((cat) => {
            var units = settings[cat];
            list += "\n" + getLinks(units, cat, false);
        });

        embed = {
            title: t,
            description: list,
        };

        Client.sendMessage(receivedMessage, embed)
    });
}

export function handleK(receivedMessage, search, id) {
    log(`handleKit(${search})`);

    var unit = unitSearch(id, search);
    if (!unit) return;

    var name = unit.name.toTitleCase();
    var embed = new Discord.RichEmbed()
        .setTitle(name.toTitleCase())
        .setURL("https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"))

    unit.fields.forEach(field => {
        embed.addField(field.name, field.value);
    })

    Client.sendMessage(receivedMessage, embed);
}

export function handleKit(receivedMessage: Discord.Message, search: string, parameters: string[], type: string) {
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

    var name = unit.name.toTitleCase();
    var embed = new Discord.RichEmbed()
        .setTitle(name)
        .setURL("https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"))

    /*
    let path = `./icons/units/unit_ills_${getMaxRarity(id)}.png`;
    if (fs.existsSync(path)) {
        const attachment = new Discord.Attachment(path, 'sprite.png');
        embed.attachFile(attachment)
             .setThumbnail(`attachment://sprite.png`);
    }
    */
   
    unit.fields.forEach(field => {
        embed.addField(field.name, field.value);
    })

    Client.sendMessage(receivedMessage, embed);
}

export function handleAbility(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleKit(receivedMessage, search, parameters, "Active");
}

export function handlePassive(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleKit(receivedMessage, search, parameters, "Passive");
}

export function handleData(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    search = search.replaceAll("_", " ");
    var data = Cache.getSkill(search);
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
            fields: fields
        }
        
        Client.sendMessage(receivedMessage, embed);
    });
}

export function handleJimooriview(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    var reviews = JSON.parse(fs.readFileSync("data/reviews.json").toString());
    var text = reviews[search];
    if (!text)
        return;

    var s = search.replaceAll("_", " ");
    s = s.toTitleCase();
    var embed = <any>{
        title: `${s} Review: ${text.rating}/10`,
        description: text.description
    }
    
    Client.sendMessage(receivedMessage, embed);
}

export function handleUnitQuery(receivedMessage: Discord.Message, command: string, search: string) {
    if (!command)
        return false;

    if (!search)
        search = "";

    //log(`${command} Doesn't Exists`);
    var s = command.toLowerCase();
    //log(`Search: ${search}`);

    var alias = Config.getAlias(s);
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
