

import * as Discord from "discord.js";
import * as request from "request";
import * as fs from "fs";
import * as cheerio from "cheerio";
import * as https from "https";
import * as http from "http";

import "./string/string-extension.js";
import * as Config from "./config/config.js";
import * as Editor from "./editor/Edit.js";
import * as FFBE from "./ffbe/ffbewiki.js";
import * as constants from "./constants.js";

const client = new Discord.Client();
var config = null;
var editor = null;
var ffbe = null;

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

const renaulteUserID = "159846139124908032";
const jimooriUserID = "131139508421918721";
const furculaUserID = "344500120827723777";
const muspelUserID = "114545824989446149";

const sprite = (n) => `https://exvius.gg/static/img/assets/unit/unit_ills_${n}.png`;
const aniGL = (n) => `https://exvius.gg/gl/units/${n}/animations/`;
const aniJP = (n) => `https://exvius.gg/jp/units/${n}/animations/`;
const guildId = (msg) => msg.guild.id;
const userId = (msg) => msg.author.id;

// Lookup Tables

const gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "before",
    "win_before": "before",
    "win before": "before"
}
const searchAliases = [
    { reg: /imbue/g, value: "add element" },
    { reg: /break/g, value: "break|reduce def|reduce atk|reduce mag|reduce spr"},
    { reg: /buff/g, value: "increase|increase atk|increase def|increase mag|increase spr"},
    { reg: /debuff/g, value: "debuff|decrease|reduce"},
    { reg: /imperil/g, value: "reduce resistance"},
    { reg: /mit/g, value: "mitigate|reduce damage"},
    { reg: /evoke/g, value: "evoke|evocation"}
]

// Commands
const commandCyra = `hi cyra`;
const commandJake = `hi jake`;
var loading = true;

// Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click to Reveal Token"
var bot_secret_token = "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg";
var bot_secret_token_test = "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

client.login(bot_secret_token_test);


// Keep track of added messages
const botMessages = [];
function cacheBotMessage(received, sent) {
    botMessages[botMessages.length] = {
        received: received,
        sent: sent,
        time: new Date()
    };
    //log("Cached Message");
    //log(botMessages[botMessages.length - 1]);
}

function log(data) {
    console.log(data);
}
function logData(data) {
    console.log(JSON.stringify(data));
}

function LoadGuilds() {
    // List servers the bot is connected to
    log("Loading Guilds:");
    client.guilds.forEach(guild => {
        log(` - ${guild.name} - ${guild.id}`);
        
        config.loadGuild(guild.name, guild.id);
    });
}

//joined a server
client.on("guildCreate", guild => {
    log("Joined a new guild: " + guild.name);
    //Your other stuff like adding to guildArray
    config.loadGuild(guild.name, guild.id);
});
//removed from a server
client.on("guildDelete", guild => {
    log("Left a guild: " + guild.name);
    //remove from guildArray
    config.unloadGuild(guild.name, guild.id);
});

client.on("ready", () => {
    log("Connected as " + client.user.tag);

    editor = new Editor.Edit();
    editor.init((msg, key, file) => {
        log("Response From Editor");
        config.reload(file);
        respondSuccess(msg, true);
        handleWhatis(msg, key, null);
    }, (msg) =>{
        log("Response From Editor");
        respondFailure(msg, true);
    })

    ffbe = new FFBE.FFBE();
    config = new Config.Config();
    config.init();
    LoadGuilds();

    log("Configuration Loaded");
    loading = false;
});

client.on("message", receivedMessage => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user || loading) {
        return;
    }

    const content = receivedMessage.content;
    if (!receivedMessage.guild) {
        privateMessage(receivedMessage);
        return;
    }

    const guildId = receivedMessage.guild.id;
    const prefix = config.getPrefix(guildId);
    if (!content.startsWith(prefix)) {
        handleReactions(receivedMessage);
        return;
    }

    guildMessage(receivedMessage, guildId, prefix);
});

client.on("messageDelete", deletedMessage => {
    log("Message Deleted");
    log(deletedMessage.id);

    for (var i = 0; i < botMessages.length; i++) {
        var msg = botMessages[i];

        if (msg.received === deletedMessage.id) {
            var sent = deletedMessage.channel
                .fetchMessage(msg.sent)
                .then(sent => {
                    if (sent) {
                        log("Deleted Message");
                        sent.delete();

                        botMessages.splice(i, 1);
                    }
                })
                .catch(console.error);
            break;
        }
    }
});

process.on("unhandledRejection", (reason, p) => {
    log(`Unhandled Rejection at: Promise(${p}), Reason: ${reason}`);
    // application specific logging, throwing an error, or other logic here
});1


function getUnitData(id) {

    var filename = `tempdata/${id}.json`;
    if (fs.existsSync(filename)) {
        log(`Loading cached unit: ${id}`)
        var u = fs.readFileSync(filename);
        return JSON.parse(u.toString());
    }

    var cat = id[0];
    var bigUnits = fs.readFileSync(`data/units-${cat}.json`);
    var unitsList = JSON.parse(bigUnits.toString());

    var unit = unitsList[id];
    
    unitsList = null;
    bigUnits = null;
    //var JP = ""; // this is to tell the skill search to use JP data.
    if (!unit) {
        log("Could not find unit data");
        unit = null;
        return null;
        /*
        bigUnits = fs.readFileSync('../ffbe-jp/units.json');
        unitsList = JSON.parse(bigUnits.toString());

        JP = "-jp";
        unit = unitsList[id];
        unitsList = null;
        bigUnits = null;
        if (!unit) {
            log("Could not find unit data in GL");
            unit = null;
            return null;
        }*/
    }

    //unit.skills = getSkillsFromUnit(unit, JP);
    log("Caching unit");
    if (!fs.existsSync(`tempdata/`))
        fs.mkdirSync( `tempdata/`, { recursive: true});
    if (!fs.existsSync(filename)) {
        fs.createWriteStream(filename);
    }
    fs.writeFileSync(filename, JSON.stringify(unit, null, "\t")); 

    return unit;
}
function getSkillsFromUnit(unit, JP) {

    var skills = unit.skills;
    if (!skills) {
        return null;
    }

    var skillKeys = [];
    skills.forEach(skill => {
        skillKeys.push(skill.id);
    });
    //log(skillKeys);


    var bigSkills = fs.readFileSync(`../ffbe${JP}/skills.json`);
    var skillList = JSON.parse(bigSkills.toString());
    //log("Giant List");
    bigSkills = null;
    
    var skillData = {};
    var keys = Object.keys(skillList);
    //log(keys.length);
    skillKeys.forEach(key => {
        skillData[key] = skillList[key];
    });
    keys = null;
    skillList = null;

    return skillData;
}
function checkString(text, keyword): boolean {
    return keyword.test(text.replace(/\s*/g,""));
}
function searchUnitSkills(unit, keyword: RegExp, active) {

    const LB = unit.LB;
    const skills = unit.skills;
    var found = [];
    var keys = Object.keys(skills);
    keys.forEach(key => {
        var skill = skills[key];
        if (active != undefined && skill.active != active) {
            //log(`Skipping Skill: ${skill.name} - ${skill.active}`);
            return;
        }

        var all = checkString(skill.name, keyword);
        var n = found.length;
        var s = "";
        for (let ind = 0; ind < skill.effects.length; ind++) {
            const effect = skill.effects[ind]
            if (all || checkString(effect, keyword)) {
                s += `${effect}\n`;
                found[n] = {
                    name: `${skill.name}`,
                    value: s
                };
            }
        }

        if (skill.strings.desc_short) {
            var desc = skill.strings.desc_short[0];
            if (checkString(desc, keyword)) {
                s += `*"${desc}"*\n`;
                found[n] = {
                    name: `${skill.name}`,
                    value: s
                };
            }
        }
    });
        
    // Search LB
    if (LB && (active === undefined || active == true)) {
        var n = found.length;
        var s = "";

        var all = checkString(LB.name, keyword);
        log(`LB Name: ${LB.name}, All: ${all}`);

        LB.max_level.forEach(effect => {
            if (all || checkString(effect, keyword)) {
                s += `*${effect}*\n`;
                found[n] = {
                    name: `${LB.name} - MAX`,
                    value: s
                };
            }
        });
    }

    //log(`Searched Skills For: ${keyword}`);
    //log(found);

    return found;
}
function searchUnitItems(unit, keyword: RegExp) {
    log(`searchUnitItems(${unit.name}, ${keyword})`);

    var found = [];

    const LB = unit.LB;
    if (LB && (checkString(LB.name, keyword) || checkString("lb", keyword))) {
        var n = found.length;
        var s = "";

        log(`LB Name: ${LB.name}`);

        LB.max_level.forEach(effect => {
            s += `*${effect}*\n`;
            found[n] = {
                name: `${LB.name} - MAX`,
                value: s
            };
        });
    }

    const TMR = unit.TMR;
    if (TMR && checkString("tmr", keyword)) {
        var n = found.length;

        log(`TMR Name: ${TMR.name}, Type: ${TMR.type}`);
        found[n] = equipToString(TMR);
    }

    const STMR = unit.STMR;
    if (STMR && checkString("stmr", keyword)) {
        var n = found.length;

        log(`STMR Name: ${STMR.name}, Type: ${STMR.type}`);
        found[n] = equipToString(STMR);
    }

    log(found);
    return found;
}
function loadUnitItems(JP, tmr, stmr) {
    
    var equipment = fs.readFileSync(`../ffbe${JP}/equipment.json`);
    var equipList = JSON.parse(equipment.toString());
    equipment = null;

    var TMR = equipList[tmr];
    var STMR = equipList[stmr];
    equipList = null;

    if (!TMR || !STMR) {
        var materia = fs.readFileSync(`../ffbe${JP}/materia.json`);
        var materiaList = JSON.parse(materia.toString());

        if (materiaList[tmr]) TMR = materiaList[tmr];
        if (materiaList[stmr]) STMR = materiaList[stmr];

        materia = null;
        materiaList = null;
    }

    return {
        TMR: TMR,
        STMR: STMR
    }
}
function equipToString(equip) {
    var effects = "";
    var stats = "";

    log(`Equip Name: ${equip.name}, Type: ${equip.type}`);

    if (equip.type == "EQUIP") {
        if (equip.effects) {
            equip.effects.forEach(effect => {
                if (!checkString(effect, /Grants.*passive/g))
                effects += `${effect}\n`;
            });
        }
        
        if (equip.stats) {
            var statKeys = Object.keys(equip.stats);
            statKeys.forEach(key => {
                const stat = equip.stats[key];
                if (!stat) return;

                if (constants.statParameters.includes(key.toLowerCase())) {
                    log(`${key}; ${stat}, `);
                    stats += `${key}: ${stat}, `;
                } else {
                    stats += `\n${key.replaceAll("_", " ").toTitleCase(" ")}:\n`;
                    var substatKeys = Object.keys(stat);
                    substatKeys.forEach(subkey => {
                        const sub = stat[subkey];
                        if (!sub) return;
            
                        log(`${subkey}; ${sub}, `);
                        stats += `${subkey}: ${sub}, `;
                    });
                }
            });
        }

        if (equip.skills) {
            var skillKeys = Object.keys(equip.skills);
            skillKeys.forEach(key => {
                const skill = equip.skills[key];
                if (!skill) return;

                skill.effects.forEach(eff => {
                    log(`${key}: ${eff}`);
                    effects += `${eff}\n`;
                });
            });
        }
    }
    
    if (equip.type == "MATERIA") {
        effects += `"*${equip.strings.desc_short[0]}"*\n`;
    }

    return {
        name: `${equip.name}`,
        value: `${stats}\n${effects}`
    }
}


// COMMANDS

// WIKI 
function handleUnit(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    log("Searching Units For: " + search);
    ffbe.queryWikiForUnit(search, parameters, function (pageName, imgurl, description, limited, fields) {
        pageName = pageName.replaceAll("_", " ");

        var embed = {
            color: pinkHexCode,
            author: {
                name: client.user.username,
                icon_url: client.user.avatarURL
            },
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

        receivedMessage.channel
            .send({
                embed: embed
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
    });
}
function handleEquip(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    log(`Searching Equipment For: ${search}...`);
    ffbe.queryWikiForEquipment(search, parameters, function (imgurl, pageName, nodes) {
        var title = pageName;
        pageName = pageName.replaceAll(" ", "_");

        receivedMessage.channel
            .send(mainChannelID, {
                embed: {
                    color: pinkHexCode,
                    author: {
                        name: client.user.username,
                        icon_url: client.user.avatarURL
                    },
                    thumbnail: {
                        url: imgurl
                    },
                    title: title,
                    fields: nodes,
                    url: "https://exvius.gamepedia.com/" + pageName
                }
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
    });
}
function handleSkill(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    log(`Searching Skills For: ${search}...`);
    ffbe.queryWikiForAbility(search, parameters, function (imgurl, pageName, nodes) {
        var title = pageName;
        pageName = pageName.replaceAll(" ", "_");

        receivedMessage.channel
            .send(mainChannelID, {
                embed: {
                    color: pinkHexCode,
                    author: {
                        name: client.user.username,
                        icon_url: client.user.avatarURL
                    },
                    thumbnail: {
                        url: imgurl
                    },
                    title: title,
                    fields: nodes,
                    url: "https://exvius.gamepedia.com/" + pageName
                }
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
    });
}
function handleSearch(receivedMessage, search) {
    log(`Searching For: ${search}...`);
    ffbe.queryWikiWithSearch(search, function (batch) {
        receivedMessage.channel
            .send(mainChannelID, {
                embed: {
                    color: pinkHexCode,
                    author: {
                        name: client.user.username,
                        icon_url: client.user.avatarURL
                    },
                    fields: batch
                }
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
    });
}
function handleRank(receivedMessage, search, parameters) {
    log("\nSearching Rankings for: " + search);
    if (search) {
        const unit = config.getUnitRank(search.toLowerCase());
        if (!unit) {
            log("Could not find unit");
            return;
        }

        client.fetchUser(muspelUserID)
        .then(muspel => {
            var embed = {
                author: {
                    name: muspel.username,
                    icon_url: muspel.avatarURL
                },
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

            receivedMessage.channel
            .send({
                embed: embed
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
        });
        return;
    }

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
    client.fetchUser(furculaUserID)
    .then(calculator => {
        embeds.forEach(embed => {
            receivedMessage.channel
                .send({
                    embed: embed
                })
                .then(message => {
                    //cacheBotMessage(receivedMessage.id, message.id);
                })
                .catch(console.error);
        });
    });
}

function handleK(receivedMessage, search, id, name) {
    //log(`handleKit(${search})`);

    var unit = getUnitData(id);
    if (!unit) {
        log(`Could not find unit data: ${unit}`);
        return;
    }

    var keyword = new RegExp(search.replace(/_/g,".*"), "i");
    var items = searchUnitItems(unit, keyword);
    var skills = searchUnitSkills(unit, keyword, true);
    var fields = skills.concat(items);
    if (!fields || fields.length == 0) {
        log(`Failed to get unit skill list: ${keyword}`);
        return;
    }

    name = name.toTitleCase("_")
    var embed = {
        color: pinkHexCode,
        author: {
            name: client.user.username,
            icon_url: client.user.avatarURL
        },
        thumbnail: {
            url: sprite(getMaxRarity(id))
        },
        title: name.replaceAll("_", " "),
        url: "https://exvius.gamepedia.com/" + name,
        fields: fields
    };

    receivedMessage.channel
        .send({
            embed: embed
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
}

function handleKit(receivedMessage, search, parameters, active) {
    log(`handleKit(${search})`);

    var id = getUnitKey(search);
    if (!id) {
        log("No Unit Found");
        return;
    }

    var unit = getUnitData(id);
    if (!unit) {
        log(`Could not find unit data: ${unit}`);
        return;
    }

    var key = convertParametersToSkillSearch(parameters);
    var keyword = new RegExp(key.replace(/_/g,".*"), "gi");
    var fields = searchUnitSkills(unit, keyword, active);
    if (!fields || fields.length == 0) {
        log(`Failed to get unit skill list: ${keyword}`);
        return;
    }

    var name = unit.name.toTitleCase()
    log(`Unit Name: ${name}`);
    var embed = {
        color: pinkHexCode,
        author: {
            name: client.user.username,
            icon_url: client.user.avatarURL
        },
        thumbnail: {
             url: sprite(getMaxRarity(id))
        },
        title: name,
        url: "https://exvius.gamepedia.com/" + name.replaceAll(" ", "_"),
        fields: fields
    };

    receivedMessage.channel
        .send({
            embed: embed
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
}
function handleAbility(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, true);
}
function handlePassive(receivedMessage, search, parameters) {
    handleKit(receivedMessage, search, parameters, false);
}

// FLUFF
function handleReactions(receivedMessage) {
    const content = receivedMessage.content.toLowerCase();
    switch (content) {
        case commandCyra:
            receivedMessage.guild.emojis.forEach(customEmoji => {
                if (
                    customEmoji.name === "hinayay" ||
                    customEmoji.name === "2BLewd" ||
                    customEmoji.name === "hugpweez"
                ) {
                    receivedMessage.react(customEmoji);
                }
            });
            break;
        case commandJake:
            receivedMessage.react("🌹");
            receivedMessage.react("🛋");
            break;
        default:
            break;
    }
}
function handleEmote(receivedMessage, prefix) {
    var img = receivedMessage.content.split(" ")[0];
    img = img.toLowerCase().replace(prefix, "");

    var filename = validateEmote(img);
    if (filename) {
        var Attachment = new Discord.Attachment(filename);
        if (Attachment) {
            receivedMessage.channel
                .send(Attachment)
                .then(message => {
                    cacheBotMessage(receivedMessage.id, message.id);
                })
                .catch(console.error);
        }
    }

    log(filename + " doesn't exist");
    return null;
}
function handleQuote(receivedMessage, search) {
    //var s = getSearchString(quoteQueryPrefix, content).toLowerCase();
    switch (search) {
        case "morrow":
            receivedMessage.channel.send(new Discord.Attachment("morrow0.png"));
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

        var Attachment = new Discord.Attachment(filename);
        if (Attachment) {
            receivedMessage.channel
                .send(Attachment)
                .then(message => {
                    cacheBotMessage(receivedMessage.id, message.id);
                })
                .catch(console.error);
        }
    });
}

// INFORMATION
function handleRecentunits(receivedMessage, search, parameters) {

    ffbe.queryWikiFrontPage((links) => {
        receivedMessage.channel
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                title: "Recently Released Units",
                description: links,
                url: "https://exvius.gamepedia.com/Unit_List"
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    })
}
function handleWhatis(receivedMessage, search, parameters) {

    var info = config.getInformation(search)
    if (!info) {
        return;
    }
        
    client.fetchUser(renaulteUserID)
    .then(calculator => {

        receivedMessage.channel
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: calculator.username,
                    icon_url: calculator.avatarURL
                },
                title: info.title,
                description: info.description
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    });
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

    const guildId = receivedMessage.guild.id;
    const settings = config.getRankings("bestunits");

    var list = "";
    Object.keys(settings).forEach((v) => {

        var units = settings[v].split(" / ");
        var links = `**${v}:** `;
        units.forEach((u, ind) => {
            u = convertSearchTerm(u);
            u = convertValueToLink(u);
            links += u;
            if (ind < 2) {
                links += "/ ";
            }
        });

        list += "\n" + links;
    });

    client.fetchUser("159846139124908032")
    .then(general => {

        receivedMessage.channel
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: general.username,
                    icon_url: general.avatarURL
                },
                title: `Global Best 7★ Units (random order, limited units __excluded__)`,
                description: list,
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    });
}
function handleHelp(receivedMessage) {
    var data = fs.readFileSync("readme.json", "ASCII");
    var readme = JSON.parse(data);

    receivedMessage.author
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                description: readme.description,
                fields: readme.fields,
                title: readme.title
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
}

// DAMAGE
function handleDpt(receivedMessage, search, parameters, isBurst) {

    var calc = config.getCalculations(search);
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

        if (isBurst) {
            text += `**${element.name}:** ${element.damage} on turn ${element.turns}\n`;
        } else {
            text += `**${element.name}:** ${element.damage} : ${element.turns}\n`;
        }
    }

    var title = "";
    var s = search.replaceAll("_", " ").toTitleCase();
    if (isBurst) {
        title = `Burt damage for: ${s}. (damage on turn)`;
    } else {
        title = `DPT for: ${s}. (dpt - turns for rotation)`;
    }

    
    client.fetchUser(furculaUserID)
    .then(calculator => {

        receivedMessage.channel
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: calculator.username,
                    icon_url: calculator.avatarURL
                },
                title: title,
                url: "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0/edit#gid=0",
                description: text,
                footer: {
                    text: "visit the link provided for more calculations"
                },  
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    });
}
function handleBurst(receivedMessage, search, parameters) {
    handleDpt(receivedMessage, `burst_${search}`, parameters, true);
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
                    config.addAlias(w1, w2);
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

            receivedMessage.channel
                .send({ embed: embed })
                .then(message => {
                    cacheBotMessage(receivedMessage.id, message.id);
                    message.react(okEmoji);
                    message.react(cancelEmoji);

                    const filter = (reaction, user) =>
                        (reaction.emoji.name === okEmoji ||
                            reaction.emoji.name === cancelEmoji) &&
                        user.id !== message.author.id;
                    message
                        .awaitReactions(filter, { max: 1, time: 60000 })
                        .then(collected => {
                            const reaction = collected.first().emoji.name;
                            const count = collected.size;

                            if (count === 1 && reaction === okEmoji) {
                                fs.unlink(existing, err => {
                                    if (err) {
                                        log(err);
                                        return;
                                    }

                                    downloadFile(name, url, result => {
                                        log(result);

                                        const guildId = receivedMessage.guild.id;
                                        receivedMessage.guild.emojis.forEach(customEmoji => {
                                            if (customEmoji.name === config.getSuccess(guildId)) {
                                                message.delete();
                                                //receivedMessage.reply(`Emote has been replaced. :${customEmoji}:`);
                                                respondSuccess(receivedMessage);
                                            }
                                        });
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
                })
                .catch(console.error);
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
    if (config.validateEditor(guildId(receivedMessage), userId(receivedMessage))) {
        log("User is not an editor");
        return;
    }

    if (config.setShortcut(guildId(receivedMessage), search, command)) {
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
    const setting = config.getSettings(guildId, search);

    var reply = `Settings for '${search}':`;
    log(reply);
    receivedMessage.channel.send(reply);
    receivedMessage.channel.send(JSON.stringify(setting));
}
function handleSetrankings(receivedMessage, search, parameters) {
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

    if (config.setRankings(search, value)) {
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

    if (config.setInformation(search, title, desc)) {
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

    if (config.setInformation(search, "title", "desc")) {
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

        config.setPrefix(receivedMessage.guild.id, s[1]);
        config.save();
        config.init();

        respondSuccess(receivedMessage);
    }
}

// COMMANDS END


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
    log("Converted Link: " + link);
    return link;
}

// IMAGES

var unitsDump = null;
function getUnitKey(search) {
    if (unitsDump === null) {
        log("loading units list")
        var data = fs.readFileSync("data/unitkeys.json");
        unitsDump = JSON.parse(String(data));
    }

    if (!unitsDump[search]) {
        return null
    }

    return unitsDump[search];
}
function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}
function getMaxRarity(unit) {
    var rarity = unit[unit.length-1];
    var id = unit.substring(0, unit.length-1);
    log("Unit ID: " + unit);
    if (rarity === "5") {
        unit = id + "7";
    }
    return unit;
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

        receivedMessage.channel
            .send({
                embed: embed
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
    });
}
function getGif(search, param, callback) {
    log("getGif: " + search + `(${param})`);
    
    const filename = `tempgifs/${search}/${param}.gif`;
    if (fs.existsSync(filename)) {
        callback(filename);
        log("Returning cached gif");
        return;
    }

    var unit = getUnitKey(search);
    if (!unit)
        unit = search;

    var rarity = unit[unit.length-1];
    var id = unit.substring(0, unit.length-1);
    log("Unit ID: " + unit);
    
    var unitL = null; // ignore using othet source if JP
    if (isLetter(search[0])) {
        unitL = search.replaceAll("_", "+");
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
            //log(gifs);
            
            var img = gifs.find((n) => {
                if (param.includes("attack") || param.includes("atk")) {
                    return n.toLowerCase().includes("attack") || n.toLowerCase().includes("atk");
                } else if (param.includes("win")) {
                    return n.toLowerCase().includes(param) && !n.toLowerCase().includes("before");
                } else {
                    return n.toLowerCase().includes(param);
                }
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
                
                if (!fs.existsSync(`tempgifs/${search}/`))
                    fs.mkdirSync( `tempgifs/${search}/`, { recursive: true});
                    
                var file = null;
                var source = img.slice(0, 5) === 'https' ? https : http;
                source.get(img, function(response) {
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
        }
    };

    var uri = [ aniGL(unit), aniJP(unit) ];
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

    if (unitL) {
        for(var i = 0; i < 2; i++) {
            request(
                { uri: `${ffbegifEndpoint}?page=${i}&name=${unitL}` },
                function(error, response, body) {
                    const $ = cheerio.load(body);
                    $('img').each((ind, el) => {
                        var src = $(el).attr('src');
                        if (src === undefined)
                            return;

                        if (rarity === "5") {
                            if (!src.includes(id + "6")){
                                return;
                            }
                        }

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
    }

    queryEnd(count);
}

// Validation
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
function validateCommand(receivedMessage, command) {
    var roles = receivedMessage.member.roles.array();
    var guildId = receivedMessage.channel.guild.id;

    for (var i = 0; i < roles.length; i++) {
        log("Attempt to validate: " + roles[i].name);
        if (config.validateCommand(guildId, roles[i].name, command)) {
            log("Role Validated");
            return true;
        }
    }

    return false;
}

// Response
function respondSuccess(receivedMessage, toUser = false) {

    if (toUser) {
        receivedMessage.react(config.getSuccess());
        return;
    }

    const guildId = receivedMessage.guild.id;
    const emojis = receivedMessage.guild.emojis.array();

    var customEmoji = emojis.find(e => {
        return e.name === config.getSuccess(guildId);
    });

    if (customEmoji) {
        receivedMessage.react(customEmoji);
    } else {
        // If none of the servers custom emojis matches the saved one, then the server is set to use a unicode emoji
        receivedMessage.react(config.getSuccess(guildId));
    }
}
function respondFailure(receivedMessage, toUser = false) {

    if (toUser) {
        receivedMessage.react(config.getFailure());
        return;
    }

    const guildId = receivedMessage.guild.id;
    const emojis = receivedMessage.guild.emojis.array();

    var customEmoji = emojis.find(e => {
        return e.name === config.getFailure(guildId);
    });

    if (customEmoji) {
        receivedMessage.react(customEmoji);
    } else {
        // If none of the servers custom emojis matches the saved one, then the server is set to use a unicode emoji
        receivedMessage.react(config.getFailure(guildId));
    }
}

function convertCommand(command, content, prefix) {

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
            content: content.replace(`${prefix}damage`, `${prefix}dpt`)
        };
    }

    return null;
}
function runCommand(receivedMessage) {
    
}

function privateMessage(receivedMessage) {
    const content = receivedMessage.content;
    var copy = content.toLowerCase();

    var id = receivedMessage.author.id;
    log("Private Message From: " + id);
    log(content)
    if (editor.isEditing(id)) {
        log("Is Editor");
        editor.editorResponse(receivedMessage);
        return;
    }
    if (id != renaulteUserID && id != jimooriUserID) {
        return;
    }

    log("Settings Change Allowed");

    try {
        if (content.startsWith("?setinfo")) {
            log("Settings Change")
            editor.SetInfo(client, receivedMessage);
            return;
        }

        var params = getParameters(content);
        var parameters = params.parameters;
        copy = params.msg;

        var command = getCommandString(content, "?");
        const search = getSearchString(`?${command}`, copy);
        if (!search && parameters.length === 0) {
            log("Could not parse search string");
            respondFailure(receivedMessage, true);
            throw command;
        }

        if (content.startsWith("?addinfo")) {
            handleAddinfo(receivedMessage, search, parameters);
            editor.AddInfo(receivedMessage, search);
        } else if (content.startsWith("?setrank")) {
            handleSetrankings(receivedMessage, search, parameters);
        } else if (content.startsWith("?setinfo")) {
            handleSetinfo(receivedMessage, search, parameters);
        }
    } catch(e) {
        log("Failed: " + e);
        respondFailure(receivedMessage, true);
    }
}

function unitQuery(receivedMessage, command, search) {
    if (!search || !command || search.empty())
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

    searchAliases.forEach(regex => {
        if (checkString(search, regex.reg)) {
            //log(`Search contains a word to replace`);
            search = search.replace(regex.reg, regex.value);
            //log(`New Search: ${search}`);
        }
    });
    search = search.replaceAll(" ",".*")

    handleK(receivedMessage, search, id, command);
    return true;
}
function guildMessage(receivedMessage, guildId, prefix) {

    var copy = receivedMessage.content.toLowerCase();
    const attachment = receivedMessage.attachments.first();
    if (attachment) {
        log("Message Attachments");
        log(attachment.url);
    }

    // the command name
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

    try {
        var command = getCommandString(copy, prefix);
        var shortcut = config.getShortcut(guildId, command);
        if (shortcut) {
            log("Found Command Shortcut");
            copy = shortcut;
            command = getCommandString(copy, prefix);
            log(`New Command: ${command}`);
            log(`New Content: ${copy}`);
        }
        //log("Before");
        //log(command);
        //log(copy);

        // If the command has a shortcut convert it.
        var newCommand = convertCommand(command, copy, prefix);
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
        copy = params.msg;
        
        // Get search string for command.
        const search = getSearchString(`${prefix}${command}`, copy, (command !== "Dpt"));

        // Validate the user
        if (!validateCommand(receivedMessage, command)) {
            log(
                "Could not validate permissions for: " +
                receivedMessage.member.displayName
            );
            //respondFailure(receivedMessage);
            throw command;
        }

        // If no parameters or search provided exit.
        if (!search && parameters.length === 0) {
            log("Could not parse search string");
            throw command;
        }

        /*
        log("\ngetCommandString: " + command);
        log("getSearchString: " + search);
        log("getParameters:");
        log(parameters);
        */
        if (command.toLowerCase() === `addemo` && parameters.length === 0) {
            //log("Addemo but no parameters.");
            if (attachment) {
                //log("Message Has Attachments");
                //log(attachment.url);
                parameters[0] = attachment.url;
            }
        }
        var run = "handle" + command + "(receivedMessage, search, parameters)";

        //log("Running Command: " + command);
        eval(run);
    } catch (e) {
        //log(e);
        //log(`No search terms found for "${e}", run other commands: `);
        try {
            log("\nTrying Backup Command: " + "handle" + e);
            eval("handle" + e + "(receivedMessage)");
        } catch (f) {
            log(f);
            log("Command doesn't exist");
            if (validateCommand(receivedMessage, "emote")) {
                handleEmote(receivedMessage, prefix);
            } else {
                log("Emotes are disabled for this user");
            }
        }
    }
}

// HELPERS
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
function downloadFile(name, link, callback) {
    var ext = link.substring(link.lastIndexOf("."), link.length);
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
// PARSING HELPERS
function convertSearchTerm(search) {
    var s = search;
    var alias = config.getAlias(s.replaceAll(" ", "_"));
    if (alias) {
        log("Found Alias: " + alias);
        return alias.replaceAll(" ", "_");
    }

    search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}
function convertParametersToSkillSearch(parameters) {
    var search = "";
    parameters.forEach((param, ind) => {
        if (ind > 0) 
            search += "|";
        search += param;
    });

    searchAliases.forEach(regex => {
        if (checkString(search, regex.reg)) {
            //log(`Search contains a word to replace`);
            search = search.replace(regex.reg, regex.value);
            //log(`New Search: ${search}`);
        }
    });

    return search.replaceAll(" ",".*")
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
    split = split.replace(prefix, "").toTitleCase();

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
