"use strict";
//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var Discord = require("discord.js");
var request = require("request");
var fs = require("fs");
var cheerio = require("cheerio");
var https = require("https");
var http = require("http");
var global_js_1 = require("./global.js");
require("./string/string-extension.js");
var discord_js_1 = require("./discord.js");
var Config = require("./config/config.js");
var Editor = require("./editor/Edit.js");
var FFBE = require("./ffbe/ffbewiki.js");
var Cache = require("./cache/cache.js");
var constants = require("./constants.js");
var Commands = require("./commands/commands.js");
var config = null;
var editor = null;
var ffbe = null;
var cache = null;
var mainChannelID;
var pinkHexCode = 0xffd1dc;
var linkFilter = [
    /\|Trial/,
    /\|Event/,
    /\|Quest/,
    /\]\]/,
    /\[\[/,
    /\[\[.*\]\]/,
    /\(/,
    /\)/
];
var okEmoji = "🆗";
var cancelEmoji = "❌";
var wikiEndpoint = "https://exvius.gamepedia.com/";
var ffbegifEndpoint = "http://www.ffbegif.com/";
var exviusdbEndpoint = "https://exvius.gg/gl/units/205000805/animations/";
var renaulteUserID = "159846139124908032";
var jimooriUserID = "131139508421918721";
var furculaUserID = "344500120827723777";
var muspelUserID = "114545824989446149";
var sprite = function (n) { return "https://exvius.gg/static/img/assets/unit/unit_ills_" + n + ".png"; };
var aniGL = function (n) { return "https://exvius.gg/gl/units/" + n + "/animations/"; };
var aniJP = function (n) { return "https://exvius.gg/jp/units/" + n + "/animations/"; };
var guildId = function (msg) { return msg.guild.id; };
var userId = function (msg) { return msg.author.id; };
var chainFamilies = JSON.parse(String(fs.readFileSync("data/chainfamilies.json")));
var ignoreEffectRegex = /grants.*passive|unlock.*\[.*CD\]/i;
var unitDefaultSearch = "tmr|stmr";
// Lookup Tables
var gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "before",
    "win_before": "before",
    "win before": "before"
};
var searchAliases = [
    { reg: /imbue/g, value: "add element" },
    { reg: /break/g, value: "break|reduce def|reduce atk|reduce mag|reduce spr" },
    { reg: /buff/g, value: "increase|increase atk|increase def|increase mag|increase spr" },
    { reg: /debuff/g, value: "debuff|decrease|reduce" },
    { reg: /imperil/g, value: "reduce resistance" },
    { reg: /mit/g, value: "mitigate|reduce damage" },
    { reg: /evoke/g, value: "evoke|evocation" }
];
process.on("unhandledRejection", function (reason, p) {
    global_js_1.log("Unhandled Rejection at: Promise(" + p + "), Reason: " + reason);
    // application specific logging, throwing an error, or other logic here
});
// Initialize Client
discord_js_1.Client.init(function () {
    cache = new Cache.Cache();
    cache.init();
    editor = new Editor.Edit();
    editor.init(function (msg, key, file) {
        global_js_1.log("Response From Editor");
        config.reload(file);
        respondSuccess(msg, true);
        handleWhatis(msg, key, null);
    }, function (msg) {
        global_js_1.log("Response From Editor");
        respondFailure(msg, true);
    });
    ffbe = new FFBE.FFBE();
    config = new Config.Config();
    config.init();
    Commands.init(config);
    global_js_1.log("Configuration Loaded");
    discord_js_1.Client.setMessageCallback(onMessage.bind(_this));
    discord_js_1.Client.setPrivateMessageCallback(onPrivateMessage.bind(_this));
});
function onPrivateMessage(receivedMessage, content) {
    var copy = content.toLowerCase();
    var id = receivedMessage.author.id;
    global_js_1.log("Private Message From: " + id);
    global_js_1.log(content);
    if (editor.isEditing(id)) {
        global_js_1.log("Is Editor");
        editor.editorResponse(receivedMessage);
        return;
    }
    global_js_1.log("Settings Change Allowed");
    try {
        if (content.startsWith("?setinfo")) {
            global_js_1.log("Settings Change");
            editor.SetInfo(discord_js_1.Client, receivedMessage);
            return;
        }
        var params = getParameters(content);
        var command = getCommandString(content, "?");
        var parameters = params.parameters;
        var search = getSearchString("?" + command, copy);
        if (!search && parameters.length === 0) {
            global_js_1.log("Could not parse search string");
            respondFailure(receivedMessage, true);
            throw command;
        }
        if (content.startsWith("?addinfo")) {
            handleAddinfo(receivedMessage, search, parameters);
            editor.AddInfo(receivedMessage, search);
        }
        else if (content.startsWith("?setrank")) {
            handleSetrankings(receivedMessage, search, parameters);
        }
        else if (content.startsWith("?setinfo")) {
            handleSetinfo(receivedMessage, search, parameters);
        }
    }
    catch (e) {
        global_js_1.log("Failed: " + e);
        respondFailure(receivedMessage, true);
    }
}
function onMessage(receivedMessage, content) {
    var guildId = receivedMessage.guild.id;
    var copy = receivedMessage.content.toLowerCase();
    var attachment = receivedMessage.attachments.first();
    if (attachment) {
        global_js_1.log("Message Attachments");
        global_js_1.log(attachment.url);
    }
    // the command name
    /*
    let com = getCommandString(copy, prefix);
    try {
        let valid = false;
        log(eval(`valid = (typeof handle${com} === 'function');`));
        if (!valid) {
            let search = getSearchString(`${prefix}${com}`, copy);
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
    */
    var com = Commands.getCommandObject(content, attachment, discord_js_1.Client.guildSettings[guildId]);
    global_js_1.log("\n Command Obect");
    global_js_1.log(com);
    try {
        var search = com.search;
        var parameters = com.parameters;
        eval(com.run);
    }
    catch (e) {
        global_js_1.log(e);
        global_js_1.log("Command doesn't exist");
        if (discord_js_1.Client.validate(receivedMessage, "emote")) {
            handleEmote(receivedMessage);
        }
        else {
            global_js_1.log("Emotes are disabled for this user");
        }
    }
}
function getUnitData(id) {
    var filename = "tempdata/" + id + ".json";
    if (fs.existsSync(filename)) {
        global_js_1.log("Loading cached unit: " + id);
        var u = fs.readFileSync(filename);
        return JSON.parse(u.toString());
    }
    var cat = id[0];
    var bigUnits = fs.readFileSync("data/units-" + cat + ".json");
    var unitsList = JSON.parse(bigUnits.toString());
    var unit = unitsList[id];
    unitsList = null;
    bigUnits = null;
    if (!unit) {
        global_js_1.log("Could not find unit data");
        unit = null;
        return null;
    }
    global_js_1.log("Caching unit");
    if (!fs.existsSync("tempdata/"))
        fs.mkdirSync("tempdata/", { recursive: true });
    if (!fs.existsSync(filename)) {
        fs.createWriteStream(filename);
    }
    fs.writeFileSync(filename, JSON.stringify(unit, null, "\t"));
    return unit;
}
function searchUnitSkills(unit, keyword, active) {
    var reg = /\([^\)]+\)/g;
    var LB = unit.LB;
    var skills = unit.skills;
    var found = [];
    var keys = Object.keys(skills);
    keys.forEach(function (key) {
        var skill = skills[key];
        if (active != undefined && skill.active != active) {
            //log(`Skipping Skill: ${skill.name} - ${skill.active}`);
            return;
        }
        var total = collectSkillEffects(key, skills, keyword, "");
        //log("\nTotal Text\n");
        //log(total);
        for (var index = 0; index < found.length; index++) {
            var el = found[index];
            if (el.name == skill.name && el.value == total) {
                //log(`Found Duplicate`);
                //log(`Name: ${el.name}, Value: ${el.value}, S: ${s}`);
                return;
            }
        }
        if (total.empty())
            return;
        found[found.length] = {
            name: skill.name,
            value: total
        };
    });
    // Search LB
    if (LB && (active === undefined || active == true)) {
        var n = found.length;
        var s = "";
        var all = global_js_1.checkString(LB.name, keyword);
        global_js_1.log("LB Name: " + LB.name + ", All: " + all);
        LB.max_level.forEach(function (effect) {
            if (all || global_js_1.checkString(effect, keyword)) {
                s += "*" + effect + "*\n";
                found[n] = {
                    name: LB.name + " - MAX",
                    value: s
                };
            }
        });
    }
    //log(`Searched Skills For: ${keyword}`);
    //log(found);
    return found;
}
function collectSkillEffects(key, skills, keyword, total) {
    var skill = skills[key];
    var all = global_js_1.checkString(skill.name, keyword);
    //log(`Skill Name: ${skill.name}, All: ${all}`);
    var reg = /\([^\)]+\)/g;
    var _loop_1 = function (ind) {
        var effect = skill.effects[ind];
        if (global_js_1.checkString(effect, ignoreEffectRegex))
            return "continue";
        //log(`Skill Effect: ${effect}, Keyword: ${keyword}`);
        if (all || global_js_1.checkString(effect, keyword)) {
            var added_1 = false;
            var match = reg.exec(effect);
            do {
                if (!match)
                    break;
                var k = match[0].replace("(", "").replace(")", "");
                var subskill = skills[k];
                if (k != key && subskill && subskill.name.includes(skill.name) && !global_js_1.checkString(subskill.effects[0], ignoreEffectRegex)) {
                    //log(match);
                    //log(`Sub Skill: ${subskill.name}, Effect: ${subskill.effects}`);
                    subskill.effects.forEach(function (sub) {
                        total += sub + "\n";
                        added_1 = true;
                    });
                    //total += collectSkillEffects(k, skills, keyword, total);
                }
                match = reg.exec(effect);
            } while (match);
            if (!added_1)
                total += effect + "\n";
        }
    };
    for (var ind = 0; ind < skill.effects.length; ind++) {
        _loop_1(ind);
    }
    if (skill.strings.desc_short) {
        var desc = skill.strings.desc_short[0];
        if (global_js_1.checkString(desc, keyword)) {
            //log(`Description: ${desc}, keyword: ${keyword}`);
            //log(`Effects`);
            //log(skill.effects);
            total += "*\"" + desc + "\"*\n";
        }
    }
    return total;
}
function searchUnitItems(unit, keyword) {
    global_js_1.log("searchUnitItems(" + unit.name + ", " + keyword + ")");
    var found = [];
    var LB = unit.LB;
    if (LB && (global_js_1.checkString(LB.name, keyword) || global_js_1.checkString("lb", keyword))) {
        var n = found.length;
        var s = "";
        global_js_1.log("LB Name: " + LB.name);
        LB.max_level.forEach(function (effect) {
            s += "*" + effect + "*\n";
            found[n] = {
                name: LB.name + " - MAX",
                value: s
            };
        });
    }
    var TMR = unit.TMR;
    if (TMR && global_js_1.checkString("tmr", keyword)) {
        var n = found.length;
        global_js_1.log("TMR Name: " + TMR.name + ", Type: " + TMR.type);
        found[n] = equipToString(TMR);
    }
    var STMR = unit.STMR;
    if (STMR && global_js_1.checkString("stmr", keyword)) {
        var n = found.length;
        global_js_1.log("STMR Name: " + STMR.name + ", Type: " + STMR.type);
        found[n] = equipToString(STMR);
    }
    global_js_1.log(found);
    return found;
}
function searchUnitFrames(unit) {
    var LB = unit.LB;
    var skills = unit.skills;
    var families = {};
    var keys = Object.keys(skills);
    keys.forEach(function (key) {
        var skill = skills[key];
        if (!skill.active || !skill.attack_frames ||
            skill.attack_frames.length == 0 || skill.attack_frames[0].length <= 1)
            return;
        var frames = [];
        skill.attack_frames.forEach(function (element) {
            frames = frames.concat(element);
        });
        frames = frames.sort(function (a, b) {
            return a - b;
        });
        //log(frames);
        var str = arrayToString(frames);
        if (!str.str.empty()) {
            var fam = str.fam + ": " + str.str;
            if (!families[fam])
                families[fam] = [];
            if (families[fam].find(function (n) { return n == skill.name; }))
                return;
            families[fam].push(skill.name);
        }
    });
    // Search LB
    if (LB && LB.attack_frames &&
        LB.attack_frames.length > 0 && LB.attack_frames[0].length > 1) {
        //log(LB.attack_frames);
        var str = arrayToString(LB.attack_frames[0]);
        if (str) {
            var fam = str.fam + ": " + str.str;
            if (!families[fam])
                families[fam] = [];
            families[fam].push(LB.name + " (LB)");
        }
    }
    var found = [];
    //log(`Searched Skill Frames`);
    //log(families);
    var famKeys = Object.keys(families);
    famKeys.forEach(function (key) {
        var fam = families[key];
        var text = "";
        fam.forEach(function (skill) {
            text += skill + "\n";
        });
        found[found.length] = {
            name: key,
            value: text
        };
    });
    return found;
}
function loadUnitItems(JP, tmr, stmr) {
    var equipment = fs.readFileSync("../ffbe" + JP + "/equipment.json");
    var equipList = JSON.parse(equipment.toString());
    equipment = null;
    var TMR = equipList[tmr];
    var STMR = equipList[stmr];
    equipList = null;
    if (!TMR || !STMR) {
        var materia = fs.readFileSync("../ffbe" + JP + "/materia.json");
        var materiaList = JSON.parse(materia.toString());
        if (materiaList[tmr])
            TMR = materiaList[tmr];
        if (materiaList[stmr])
            STMR = materiaList[stmr];
        materia = null;
        materiaList = null;
    }
    return {
        TMR: TMR,
        STMR: STMR
    };
}
function equipToString(equip) {
    var effects = "";
    var slot = "";
    var stats = "";
    global_js_1.log("Equip Name: " + equip.name + ", Type: " + equip.type);
    if (equip.type == "EQUIP") {
        if (equip.effects) {
            equip.effects.forEach(function (effect) {
                if (!global_js_1.checkString(effect, /grants.*passive/i))
                    effects += effect + "\n";
            });
        }
        if (equip.stats) {
            var statKeys = Object.keys(equip.stats);
            statKeys.forEach(function (key) {
                var stat = equip.stats[key];
                if (!stat)
                    return;
                if (constants.statParameters.includes(key.toLowerCase())) {
                    global_js_1.log(key + "; " + stat + ", ");
                    stats += key + ": " + stat + ", ";
                }
                else {
                    stats += "\n" + key.replaceAll("_", " ").toTitleCase(" ") + ":\n";
                    var substatKeys = Object.keys(stat);
                    substatKeys.forEach(function (subkey) {
                        var sub = stat[subkey];
                        if (!sub)
                            return;
                        global_js_1.log(subkey + "; " + sub + ", ");
                        stats += subkey + ": " + sub + ", ";
                    });
                }
            });
        }
        if (equip.skills) {
            var skillKeys = Object.keys(equip.skills);
            skillKeys.forEach(function (key) {
                var skill = equip.skills[key];
                if (!skill)
                    return;
                skill.effects.forEach(function (eff) {
                    global_js_1.log(key + ": " + eff);
                    effects += eff + "\n";
                });
            });
        }
        if (equip.slot === "Weapon")
            slot = constants.weaponList[equip.type_id - 1].toTitleCase(" ");
        else
            slot = equip.slot;
    }
    if (equip.type == "MATERIA") {
        effects += "\"*" + equip.strings.desc_short[0] + "\"*\n";
        slot = "Materia";
    }
    return {
        name: equip.name + " - " + slot,
        value: stats + "\n" + effects
    };
}
function arrayToString(array) {
    var str = "";
    for (var index = 0; index < array.length; index++) {
        var element = array[index];
        var num = parseInt(element);
        if (index > 0) {
            var prev = parseInt(array[index - 1]);
            num = num - prev;
            if (num > 0) {
                str += "-" + num;
            }
        }
        else {
            str += "" + element;
        }
    }
    var fam = "Orphans";
    var keys = Object.keys(chainFamilies);
    for (var ind = 0; ind < keys.length; ind++) {
        var key = keys[ind];
        if (chainFamilies[key] === str.trim()) {
            fam = "" + key;
            break;
        }
    }
    return { str: str, fam: fam };
}
// COMMANDS
// WIKI 
function handleUnit(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    global_js_1.log("Searching Units For: " + search);
    ffbe.queryWikiForUnit(search, parameters, function (pageName, imgurl, description, limited, fields) {
        pageName = pageName.replaceAll("_", " ");
        var embed = {
            color: pinkHexCode,
            thumbnail: {
                url: imgurl
            },
            title: pageName,
            url: "https://exvius.gamepedia.com/" + search,
            fields: fields,
            description: function () {
                return this.options["description"];
            },
            footer: {
                text: ""
            }
        };
        // TODO: Create a function to better wrap this since it will be common
        if (parameters.length == 0 ||
            (parameters.length > 0 && parameters.includes("Description"))) {
            embed.description = description;
        }
        if (limited) {
            embed.footer = {
                text: "Unit Is Limited"
            };
        }
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
function handleEquip(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    global_js_1.log("Searching Equipment For: " + search + "...");
    ffbe.queryWikiForEquipment(search, parameters, function (imgurl, pageName, nodes) {
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
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
function handleSkill(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    global_js_1.log("Searching Skills For: " + search + "...");
    ffbe.queryWikiForAbility(search, parameters, function (imgurl, pageName, nodes) {
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
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
function handleSearch(receivedMessage, search) {
    global_js_1.log("Searching For: " + search + "...");
    ffbe.queryWikiWithSearch(search, function (batch) {
        var embed = {
            color: pinkHexCode,
            fields: batch
        };
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
function handleRank(receivedMessage, search, parameters) {
    global_js_1.log("\nSearching Rankings for: " + search);
    if (search) {
        var unit = config.getUnitRank(search.toLowerCase());
        if (!unit) {
            global_js_1.log("Could not find unit");
            return;
        }
        var embed = {
            title: unit.Unit,
            url: wikiEndpoint + unit.Unit.replaceAll(" ", "_"),
            color: pinkHexCode,
            fields: [
                {
                    name: "Rank",
                    value: unit.Base + " - " + unit.TDH
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
        discord_js_1.Client.sendMessageWithAuthor(receivedMessage, embed, muspelUserID);
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
function handleK(receivedMessage, search, id, name) {
    global_js_1.log("handleKit(" + search + ")");
    var unit = getUnitData(id);
    if (!unit) {
        global_js_1.log("Could not find unit data: " + unit);
        return;
    }
    var fields = null;
    var keyword = new RegExp(search.replace(/_/g, ".*"), "i");
    if (global_js_1.checkString(search, /frames|chain/i)) {
        fields = searchUnitFrames(unit);
    }
    else if (global_js_1.checkString(search, /enhancement/i)) {
        fields = searchUnitSkills(unit, /\+2$|\+1$/i, undefined);
    }
    else if (global_js_1.checkString(search, /cd/i)) {
        global_js_1.log("SEARCHING FOR CD");
        fields = searchUnitSkills(unit, /one.*use.*every.*turns/i, undefined);
    }
    else {
        var items = searchUnitItems(unit, keyword);
        var skills = searchUnitSkills(unit, keyword, true);
        fields = skills.concat(items);
    }
    if (!fields || fields.length == 0) {
        global_js_1.log("Failed to get unit skill list: " + keyword);
        return;
    }
    name = name.toTitleCase("_");
    var embed = {
        color: pinkHexCode,
        thumbnail: {
            url: sprite(getMaxRarity(id))
        },
        title: name.replaceAll("_", " "),
        url: "https://exvius.gamepedia.com/" + name,
        fields: fields
    };
    discord_js_1.Client.sendMessage(receivedMessage, embed);
}
function handleKit(receivedMessage, search, parameters, active) {
    global_js_1.log("handleKit(" + search + ")");
    var id = getUnitKey(search);
    if (!id) {
        global_js_1.log("No Unit Found");
        return;
    }
    var unit = getUnitData(id);
    if (!unit) {
        global_js_1.log("Could not find unit data: " + unit);
        return;
    }
    var key = convertParametersToSkillSearch(parameters);
    var keyword = new RegExp(key.replace(/_/g, ".*"), "gi");
    var fields = searchUnitSkills(unit, keyword, active);
    if (!fields || fields.length == 0) {
        global_js_1.log("Failed to get unit skill list: " + keyword);
        return;
    }
    var name = unit.name.toTitleCase();
    global_js_1.log("Unit Name: " + name);
    var embed = {
        color: pinkHexCode,
        thumbnail: {
            url: sprite(getMaxRarity(id))
        },
        title: name,
        url: "https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"),
        fields: fields
    };
    discord_js_1.Client.sendMessage(receivedMessage, embed);
}
function handleAbility(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, true);
}
function handlePassive(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, false);
}
function handleEnhancements(receivedMessage, search, parameters) {
    global_js_1.log("handleKit(" + search + ")");
    var id = getUnitKey(search);
    if (!id) {
        global_js_1.log("No Unit Found");
        return;
    }
    var unit = getUnitData(id);
    if (!unit) {
        global_js_1.log("Could not find unit data: " + unit);
        return;
    }
}
function handleData(receivedMessage, search, parameters) {
    search = search.replaceAll("_", " ");
    var data = cache.getSkill(search);
    if (!data) {
        global_js_1.log("Could not find Data for: " + search);
        return;
    }
    var defaultParameters = [
        'attack_count',
        'attack_damage',
        'attack_frames',
        'attack_type',
        'element_inflict',
        'effects',
    ];
    if (!parameters || parameters.length == 0)
        parameters = defaultParameters;
    var dataKeys = Object.keys(data);
    dataKeys.forEach(function (dkey) {
        var fields = [];
        var obj = data[dkey];
        var keys = Object.keys(obj);
        for (var ind = 0; ind < keys.length; ind++) {
            var key = keys[ind];
            var value = "" + obj[key];
            if (!parameters.includes(key))
                continue;
            if (!value || value.empty() || value === "null" || value === "None")
                continue;
            fields[fields.length] = {
                name: key,
                value: value
            };
        }
        var embed = {
            title: dkey + " - " + obj.name,
            color: pinkHexCode,
            fields: fields
        };
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
// FLUFF
function handleReactions(receivedMessage) {
    var content = receivedMessage.content.toLowerCase();
    switch (content) {
        case "hi majin":
            receivedMessage.guild.emojis.forEach(function (customEmoji) {
                if (customEmoji.name === "nuked" ||
                    customEmoji.name === "tifapeek" ||
                    customEmoji.name === "think") {
                    receivedMessage.react(customEmoji);
                }
            });
            break;
        case "hi jake":
            receivedMessage.react("🌹");
            receivedMessage.react("🛋");
            break;
        case "hi reberta":
            receivedMessage.guild.emojis.forEach(function (customEmoji) {
                if (customEmoji.name === "hugpweez" ||
                    customEmoji.name === "yay" ||
                    customEmoji.name === "praise") {
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
    if (!filename)
        return;
    discord_js_1.Client.sendImage(receivedMessage, filename);
}
function handleQuote(receivedMessage, search) {
    //var s = getSearchString(quoteQueryPrefix, content).toLowerCase();
    switch (search) {
        case "morrow":
            discord_js_1.Client.send(receivedMessage, new Discord.Attachment("morrow0.png"));
            break;
        default:
            break;
    }
}
function handleGif(receivedMessage, search, parameters) {
    global_js_1.log("Searching gifs for: " + search);
    var bot = /^\d/.test(search);
    if (bot)
        search = search.toUpperCase();
    var title = search.toTitleCase("_");
    var param = parameters[0];
    if (gifAliases[param]) {
        param = gifAliases[param];
    }
    getGif(search, param, function (filename) {
        global_js_1.log("success");
        discord_js_1.Client.sendImage(receivedMessage, filename);
    });
}
function handleSprite(receivedMessage, search, parameters) {
    var unit = getUnitKey(search);
    if (!unit) {
        return;
    }
    unit = getMaxRarity(unit);
    global_js_1.log("Searching Unit Sprite For: " + search);
    validateUnit(search, function (valid, imgurl) {
        search = search.replaceAll("_", " ");
        var embed = {
            color: pinkHexCode,
            image: {
                url: sprite(unit)
            }
        };
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
// INFORMATION
function handleRecentunits(receivedMessage, search, parameters) {
    ffbe.queryWikiFrontPage(function (links) {
        var embed = {
            color: pinkHexCode,
            author: discord_js_1.Client.getAuthorEmbed(),
            title: "Recently Released Units",
            description: links,
            url: "https://exvius.gamepedia.com/Unit_List"
        };
        discord_js_1.Client.sendMessage(receivedMessage, embed);
    });
}
function handleWhatis(receivedMessage, search, parameters) {
    var info = config.getInformation(search);
    if (!info) {
        return;
    }
    var embed = {
        color: pinkHexCode,
        title: info.title,
        description: info.description
    };
    discord_js_1.Client.sendMessageWithAuthor(receivedMessage, embed, renaulteUserID);
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
    var guildId = receivedMessage.guild.id;
    var settings = config.getRankings("bestunits");
    var list = "";
    Object.keys(settings).forEach(function (v) {
        var units = settings[v].split(" / ");
        var links = "**" + v + ":** ";
        units.forEach(function (u, ind) {
            //log(u);
            u = convertSearchTerm(u);
            u = convertValueToLink(u);
            links += u;
            if (ind < 2) {
                links += "/ ";
            }
        });
        list += "\n" + links;
    });
    var embed = {
        color: pinkHexCode,
        title: "Global Best 7\u2605 Units (random order, limited units __excluded__)",
        description: list,
    };
    discord_js_1.Client.sendMessageWithAuthor(receivedMessage, embed, renaulteUserID);
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
    discord_js_1.Client.sendPrivateMessage(receivedMessage, embed);
}
// DAMAGE
function handleDpt(receivedMessage, search, parameters, isBurst) {
    search = search.replaceAll("_", " ");
    var calc = cache.getCalculations(search, isBurst);
    if (!calc) {
        global_js_1.log("Could not find calculations for: " + search);
        return;
    }
    var text = "";
    var limit = 5;
    if (parameters && parameters[0])
        limit = parameters[0];
    var keys = Object.keys(calc);
    var cap = Math.min(limit, keys.length);
    for (var ind = 0; ind < cap; ind++) {
        var key = keys[ind];
        var element = calc[key];
        if (isBurst) {
            text += "**" + element.name + ":** " + element.damage + " on turn " + element.turns + "\n";
        }
        else {
            text += "**" + element.name + ":** " + element.damage + " : " + element.turns + "\n";
        }
    }
    var title = "";
    var s = search.toTitleCase();
    if (isBurst) {
        title = "Burst damage for: " + s + ". (damage on turn)";
    }
    else {
        title = "DPT for: " + s + ". (dpt - turns for rotation)";
    }
    var embed = {
        color: pinkHexCode,
        title: title,
        url: "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0/edit#gid=0",
        description: text,
        footer: {
            text: "visit the link provided for more calculations"
        },
    };
    discord_js_1.Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}
function handleBurst(receivedMessage, search, parameters) {
    handleDpt(receivedMessage, search, parameters, true);
}
// ADDING RESOURCES
function handleAddalias(receivedMessage, search, parameters) {
    if (receivedMessage.content.replace(/[^"]/g, "").length < 4) {
        global_js_1.log("Invalid Alias");
        return;
    }
    var w1 = parameters[0];
    var w2 = parameters[1];
    validateUnit(w1, function (valid) {
        if (valid) {
            respondFailure(receivedMessage);
        }
        else {
            validateUnit(w2, function (valid) {
                if (valid) {
                    global_js_1.log("Unit is valid");
                    w1 = w1.replaceAll(" ", "_");
                    config.addAlias(w1, w2);
                    config.save();
                    respondSuccess(receivedMessage);
                }
                else {
                    respondFailure(receivedMessage);
                }
            });
        }
    });
}
function handleAddemo(receivedMessage, search, parameters) {
    var s = receivedMessage.content.split(" ");
    if (!parameters) {
        global_js_1.log("Error with command, no parameters provided.");
        return;
    }
    var name = "";
    var url = "";
    if (parameters && parameters.length > 0) {
        name = search;
        url = parameters[0];
    }
    else if (s) {
        if (!s[1] || !s[2]) {
            return;
        }
        name = s[1];
        url = s[2];
    }
    else {
        global_js_1.log("Error with command, emote could not be added.");
        return;
    }
    var existing = validateEmote(name);
    if (existing) {
        var Attachment = new Discord.Attachment(existing);
        if (Attachment) {
            var embed = {
                title: "Conflict",
                description: "This emote already exists with this name, do you want to overwrite it?",
                color: pinkHexCode,
                image: {
                    url: "attachment://" + existing
                },
                files: [{ attachment: "" + existing, name: existing }]
            };
            discord_js_1.Client.sendMessage(receivedMessage, embed, function (message) {
                message.react(okEmoji);
                message.react(cancelEmoji);
                var filter = function (reaction, user) {
                    return (reaction.emoji.name === okEmoji || reaction.emoji.name === cancelEmoji) &&
                        user.id !== message.author.id;
                };
                message.awaitReactions(filter, { max: 1, time: 60000 })
                    .then(function (collected) {
                    var reaction = collected.first().emoji.name;
                    var count = collected.size;
                    if (count === 1 && reaction === okEmoji) {
                        overwriteFile(existing, url, function (result) {
                            var guildId = receivedMessage.guild.id;
                            receivedMessage.guild.emojis.forEach(function (customEmoji) {
                                if (customEmoji.name === config.getSuccess(guildId)) {
                                    message.delete();
                                    //receivedMessage.reply(`Emote has been replaced. :${customEmoji}:`);
                                    respondSuccess(receivedMessage);
                                }
                            });
                        });
                    }
                    else if (count === 0 || reaction === cancelEmoji) {
                        global_js_1.log("AddEmo - no response");
                        message.delete();
                        respondFailure(receivedMessage);
                    }
                })
                    .catch(function (collected) {
                    global_js_1.log("AddEmo - no response");
                    message.delete();
                    respondFailure(receivedMessage);
                });
            });
        }
    }
    else {
        downloadFile(name, url, function (result) {
            global_js_1.log(result);
            respondSuccess(receivedMessage);
        });
    }
}
function handleAddshortcut(receivedMessage, search, parameters) {
    var command = parameters[0];
    global_js_1.log("Set Information");
    global_js_1.log("Shortcut: " + search);
    global_js_1.log("Command: " + command);
    if (config.validateEditor(guildId(receivedMessage), userId(receivedMessage))) {
        global_js_1.log("User is not an editor");
        return;
    }
    if (config.setShortcut(guildId(receivedMessage), search, command)) {
        respondSuccess(receivedMessage, true);
    }
    else {
        respondFailure(receivedMessage, true);
    }
}
// SETTINGS
function handleSet(receivedMessage, search, parameters) {
    if (!search || parameters.length === 0) {
        return;
    }
    var guildId = receivedMessage.guild.id;
    var setting = discord_js_1.Client.guildSettings[guildId];
    var embed = {
        title: "Settings for '" + search + "'",
        description: JSON.stringify(setting)
    };
    discord_js_1.Client.sendMessage(receivedMessage, embed);
}
function handleSetrankings(receivedMessage, search, parameters) {
    if (receivedMessage.guild) {
        return;
    }
    var value = parameters[0];
    search = search.replaceAll("_", " ");
    search = search.toTitleCase();
    search = "[" + search + "]";
    global_js_1.log("Set Rankings");
    global_js_1.log("Catergory: " + search);
    global_js_1.log("Value: " + value);
    if (config.setRankings(search, value)) {
        respondSuccess(receivedMessage, true);
    }
    else {
        respondFailure(receivedMessage, true);
    }
}
function handleSetinfo(receivedMessage, search, parameters) {
    if (receivedMessage.guild) {
        return;
    }
    var title = parameters[0];
    var desc = parameters[1];
    global_js_1.log("Set Information");
    global_js_1.log("Title: " + title);
    global_js_1.log("Desc: " + desc);
    if (config.setInformation(search, title, desc)) {
        respondSuccess(receivedMessage, true);
    }
    else {
        respondFailure(receivedMessage, true);
    }
}
function handleAddinfo(receivedMessage, search, parameters) {
    if (receivedMessage.guild) {
        return;
    }
    global_js_1.log("Add Information: " + search);
    if (config.setInformation(search, "title", "desc")) {
        respondSuccess(receivedMessage, true);
    }
    else {
        respondFailure(receivedMessage, true);
    }
}
function handlePrefix(receivedMessage) {
    if (receivedMessage.member.roles.find(function (r) { return r.name === "Admin"; }) ||
        receivedMessage.member.roles.find(function (r) { return r.name === "Mod"; })) {
        // TODO: Add logic to change prefix to a valid character.
        global_js_1.log("User Is Admin");
        var s = receivedMessage.content.split(" ");
        if (!s[1] || s[1].length !== 1) {
            global_js_1.log("Invalid Prefix");
            respondFailure(receivedMessage);
            return;
        }
        config.setPrefix(receivedMessage.guild.id, s[1]);
        config.save();
        config.init();
        respondSuccess(receivedMessage);
    }
}
function handleUpdate(receivedMessage, search, parameters) {
    if (!discord_js_1.Client.isAuthorized(receivedMessage.author)) {
        return;
    }
    global_js_1.log("Handle Update");
    try {
        cache.updateDamage();
    }
    catch (e) {
        global_js_1.log(e);
        respondFailure(receivedMessage, true);
    }
    global_js_1.log("Finished Updating");
    respondSuccess(receivedMessage, true);
}
function handleReload(receivedMessage, search, parameters) {
    var id = receivedMessage.author.id;
    if (id != renaulteUserID && id != jimooriUserID && id != furculaUserID) {
        return;
    }
    global_js_1.log("Handle Reload");
    try {
        cache.reload();
        config.reload(null);
    }
    catch (e) {
        global_js_1.log(e);
        respondFailure(receivedMessage, true);
    }
    global_js_1.log("Finished Reloading");
    respondSuccess(receivedMessage, true);
}
// COMMANDS END
function convertValueToLink(value) {
    var link = value;
    linkFilter.forEach(function (filter) {
        link = link.replace(filter, "");
    });
    var title = link.toTitleCase("_");
    title = title.replace("Ss_", "SS_");
    title = title.replace("Cg_", "CG_");
    title = title.replaceAll("_", " ");
    link = "[" + title + "](" + (wikiEndpoint + link.replaceAll(" ", "_")) + ") ";
    //log("Converted Link: " + link);
    return link;
}
// IMAGES
var unitsDump = null;
function getUnitKey(search) {
    if (unitsDump === null) {
        global_js_1.log("loading units list");
        var data = fs.readFileSync("data/unitkeys.json");
        unitsDump = JSON.parse(String(data));
    }
    if (!unitsDump[search]) {
        return null;
    }
    return unitsDump[search];
}
function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}
function getMaxRarity(unit) {
    var rarity = unit[unit.length - 1];
    var id = unit.substring(0, unit.length - 1);
    global_js_1.log("Unit ID: " + unit);
    if (rarity === "5") {
        unit = id + "7";
    }
    return unit;
}
function getGif(search, param, callback) {
    global_js_1.log("getGif: " + search + ("(" + param + ")"));
    var filename = "tempgifs/" + search + "/" + param + ".gif";
    if (fs.existsSync(filename)) {
        callback(filename);
        global_js_1.log("Returning cached gif");
        return;
    }
    var unit = getUnitKey(search);
    if (!unit)
        unit = search;
    var rarity = unit[unit.length - 1];
    var id = unit.substring(0, unit.length - 1);
    global_js_1.log("Unit ID: " + unit);
    var unitL = null; // ignore using othet source if JP
    if (isLetter(search[0])) {
        unitL = search.replaceAll("_", "+");
    }
    var gifs = [];
    var count = 5; // most units only have 2 pages
    var queryEnd = function (c) {
        count--;
        if (count <= 0) {
            gifs.sort(function (a, b) {
                if (a.includes("ffbegif"))
                    return -1;
                else
                    return 1;
            });
            global_js_1.log(gifs);
            var img = gifs.find(function (n) {
                n = n.toLowerCase();
                if (param.includes("win")) {
                    return n.includes(param) && !n.includes("before");
                }
                global_js_1.log("Compare Gifs: " + n + ", " + param);
                // magic has priority
                if (global_js_1.compareStrings(n, "limit")) {
                    return global_js_1.compareStrings(param, "limit") && global_js_1.compareStrings(n, param);
                }
                else if (global_js_1.compareStrings(n, "mag")) {
                    global_js_1.log("Found mag: param: " + global_js_1.compareStrings(param, "mag") + ", n to param: " + global_js_1.compareStrings(n, param));
                    return global_js_1.compareStrings(n, param) && global_js_1.compareStrings(param, "mag");
                }
                else if (global_js_1.compareStrings(n, "standby")) {
                    global_js_1.log("Found Standby: param: " + global_js_1.compareStrings(param, "magic") + ", n: " + global_js_1.compareStrings(n, "magic"));
                    return global_js_1.compareStrings(param, "standby")
                        && ((!global_js_1.compareStrings(param, "magic") && !global_js_1.compareStrings(n, "magic"))
                            || (global_js_1.compareStrings(param, "magic") && global_js_1.compareStrings(n, "magic")));
                }
                else if (param.includes("attack") || n.includes("atk")) {
                    return n.includes("attack") || n.includes("atk");
                }
                return global_js_1.compareStrings(n, param);
            });
            if (!img) {
                img = gifs.find(function (n) {
                    return n.toLowerCase().replaceAll(" ", "_").includes(param.replaceAll(" ", "_"));
                });
            }
            if (img) {
                img = img.replaceAll(" ", "%20");
                global_js_1.log("Found Requested Gif");
                global_js_1.log(img);
                if (!fs.existsSync("tempgifs/" + search + "/"))
                    fs.mkdirSync("tempgifs/" + search + "/", { recursive: true });
                var file = null;
                var source = img.slice(0, 5) === 'https' ? https : http;
                source.get(img, function (response) {
                    if (response.statusCode !== 200) {
                        global_js_1.log("Unit Animation not found");
                        return;
                    }
                    file = fs.createWriteStream(filename);
                    file.on('finish', function () {
                        callback(filename);
                    });
                    return response.pipe(file);
                });
            }
        }
    };
    var uri = [aniGL(unit), aniJP(unit)];
    for (var i = 0; i < 2; i++) {
        request({ uri: uri[i] }, function (error, response, body) {
            var $ = cheerio.load(body);
            $('img').each(function (ind, el) {
                var src = $(el).attr('src');
                if (src === undefined)
                    return;
                var ext = getFileExtension(src);
                if (ext === ".gif") {
                    gifs.push(src);
                }
            });
            queryEnd(count);
        });
    }
    if (unitL) {
        for (var i = 0; i < 2; i++) {
            request({ uri: ffbegifEndpoint + "?page=" + i + "&name=" + unitL }, function (error, response, body) {
                var $ = cheerio.load(body);
                $('img').each(function (ind, el) {
                    var src = $(el).attr('src');
                    if (src === undefined)
                        return;
                    /*if (rarity === "5") {
                        if (!src.includes(id + "7")){
                            return;
                        }
                    }*/
                    //log(`SRC: ${src}`);
                    if (src.includes("Move"))
                        return;
                    var ext = getFileExtension(src);
                    if (ext === ".gif") {
                        gifs.push(ffbegifEndpoint + src);
                    }
                });
                queryEnd(count);
            });
        }
    }
    else {
        count -= 2;
    }
    queryEnd(count);
}
// Validation
function validateUnit(search, callback) {
    global_js_1.log("validateUnit(" + search + ")");
    var unit = getUnitKey(search.replaceAll(" ", "_"));
    global_js_1.log(unit);
    callback(unit != null);
}
function validateEmote(emote) {
    var file = null;
    var types = config.filetypes();
    for (var i = 0; i < types.length; i++) {
        var filename = "emotes/" + emote + types[i];
        if (fs.existsSync(filename)) {
            file = filename;
            break;
        }
    }
    return file;
}
// Response
function respondSuccess(receivedMessage, toUser) {
    if (toUser === void 0) { toUser = false; }
    discord_js_1.Client.respondSuccess(receivedMessage, toUser);
}
function respondFailure(receivedMessage, toUser) {
    if (toUser === void 0) { toUser = false; }
    discord_js_1.Client.respondFailure(receivedMessage, toUser);
}
function convertCommand(command, content, prefix) {
    //log("Convert Command");
    //log(command);
    //log("\n");
    // TODO: make this more robust.
    if (command === "Family") {
        return {
            command: "Unit",
            parameters: ["chain"],
            content: content.replace("family", "unit") + " \"chain\""
        };
    }
    else if (command === "Damage") {
        return {
            command: "Dpt",
            parameters: ["chain"],
            content: content.replace(prefix + "damage", prefix + "dpt")
        };
    }
    return null;
}
function runCommand(receivedMessage) {
}
function unitQuery(receivedMessage, command, search) {
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
    var id = getUnitKey(command.toLowerCase());
    //log(`Unit ID: ${id}`);
    if (!id)
        return false;
    //log(`Unit ID valid`);
    if (search && !search.empty()) {
        global_js_1.log(search);
        search = global_js_1.escapeString(search);
        global_js_1.log(search);
        searchAliases.forEach(function (regex) {
            if (global_js_1.checkString(search, regex.reg)) {
                //log(`Search contains a word to replace`);
                search = search.replace(regex.reg, regex.value);
                //log(`New Search: ${search}`);
            }
        });
        search = search.replaceAll(" ", ".*");
    }
    else {
        search = unitDefaultSearch;
    }
    handleK(receivedMessage, search, id, command);
    return true;
}
// HELPERS
function getQuotedWord(str) {
    if (str.replace(/[^\""]/g, "").length < 2) {
        return null;
    }
    var start = str.indexOf('"');
    var end = str.indexOfAfterIndex('"', start + 1);
    var word = str.substring(start + 1, end);
    global_js_1.log(start);
    global_js_1.log(end);
    global_js_1.log("Quoted Word: " + word);
    if (word.empty()) {
        return null;
    }
    return word;
}
function getFileExtension(link) {
    return link.substring(link.lastIndexOf("."), link.length);
}
function overwriteFile(existing, url, callback) {
    fs.unlink(existing, function (err) {
        if (err) {
            global_js_1.log(err);
            return;
        }
        downloadFile(name, url, function (result) {
            global_js_1.log(result);
            callback(result);
        });
    });
}
function downloadFile(name, link, callback) {
    var ext = link.substring(link.lastIndexOf("."), link.length);
    if (!config.filetypes().includes(ext)) {
        global_js_1.log("Invalid img URL");
        return;
    }
    var file = fs.createWriteStream("emotes/" + name + ext);
    var request = https.get(link, function (response) {
        response.pipe(file);
        callback("success");
    });
}
// PARSING HELPERS
function convertSearchTerm(search) {
    var s = search;
    var alias = config.getAlias(s.replaceAll(" ", "_"));
    if (alias) {
        global_js_1.log("Found Alias: " + alias);
        return alias.replaceAll(" ", "_");
    }
    //search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}
function convertParametersToSkillSearch(parameters) {
    var search = "";
    parameters.forEach(function (param, ind) {
        if (ind > 0)
            search += "|";
        search += param;
    });
    searchAliases.forEach(function (regex) {
        if (global_js_1.checkString(search, regex.reg)) {
            //log(`Search contains a word to replace`);
            search = search.replace(regex.reg, regex.value);
            //log(`New Search: ${search}`);
        }
    });
    return search.replaceAll(" ", ".*");
}
function getSearchString(prefix, msg, replace) {
    if (replace === void 0) { replace = true; }
    var ind = prefix.length + 1;
    var search = msg.slice(ind, msg.length);
    if (search.empty()) {
        return null;
    }
    if (replace == undefined || replace) {
        var s = search;
        var alias = config.getAlias(s.replaceAll(" ", "_"));
        if (alias) {
            global_js_1.log("Found Alias: " + alias);
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
        parameters.forEach(function (p, ind) {
            msg = msg.replace(p, "");
            parameters[ind] = p.replace(/'|"|‘|’|“|”/g, "");
        });
        msg = msg.trim();
    }
    return { msg: msg, parameters: parameters };
}
