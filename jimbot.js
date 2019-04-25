const Discord = require("discord.js");
const client = new Discord.Client();
const request = require("request");
const wiki = require("nodemw");
const fs = require("fs");
const cheerio = require("cheerio");
const http = require("https");
const htt = require("http");
const config = require("./config/config.ts");
const String = require("./string/string-extension.ts")
const wikiClient = new wiki({
    protocol: "https", // Wikipedia now enforces HTTPS
    server: "exvius.gamepedia.com", // host name of MediaWiki-powered site
    path: "/", // path to api.php script
    debug: false // is more verbose when set to true
});
var mainChannelID;
const pinkHexCode = 0xffd1dc;
const overviewRegexp = /\|(.*)=\s*(.*)/g;
const valueRegexp = /\|(.*)(?:=)(.*)/g;
const valueMultiLineRegexp = /\|(.*)(?:=)(.*[^|]+)/g;
const linkRegexp = /(\(.*Events.*\))|(\(.*Trial.*\))\s*|(\(.*Quest.*\))\s*|\[\[(.*)\]\]/g;
const linkRegexp2 = /\(\[\[(.*Events)(?:\|.*)\]\]\)|\(.*(Trial).*\)|(\(.*Quest.*\))|\[\[(.*)\]\]/g;
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
// (?:\<.*\>) for commented elements
////(.*)=\s*(.*)/g;
const unicodeStar = "★";
const unicodeStarOpen = "✫";
const descCharLimit = 128;
const wikiEndpoint = "https://exvius.gamepedia.com/";
const similarityTreshold = 0.5;
const okEmoji = "🆗";
const cancelEmoji = "❌";
const ffbegifEndpoint = "http://www.ffbegif.com/";
const exviusdbEndpoint = "https://exvius.gg/gl/units/205000805/animations/";
const renaulteUserID = "159846139124908032";
const jimooriUserID = "131139508421918721";
const furculaUserID = "344500120827723777";

const aniGL = (n) => `https://exvius.gg/gl/units/${n}/animations/`;
const aniJP = (n) => `https://exvius.gg/jp/units/${n}/animations/`;

// Lookup Tables

const statParameters = [ "atk", "def", "mag", "spr", "hp", "mp" ];
const defaultEquipParameters = [
  /*'name',*/ "type",
  /*"desc",*/ "reward",
    "resist",
    "effect",
    "trust",
    "stmr",
    "element",
    "ability",
    "notes"
];
const defaultAbilityParameters = [
    "name", "type", "effect", "chain", "hits", "atk_frm", "mp_cost", "learn"
]
// this is used to better display results with more accurate names
const abilityAliases = {
    "atk_frm": "Attack Frames",
    "mp_cost": "MP Cost",
    "learn": "Learned By",
    "trust": "tmr",
    "stmr": "stmr"
}
// Parameter aliases need to match the original parameter name from the wiki
const parameterAliases = {
    "frames": "atk_frm",
    "family": "chain",
    "learned": "learn",
    "owner": "learn",
    "trust": "tmr",
    "tm": "tmr"
}
const unicodeNumbers = [
    "0️⃣",
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟"
];
const defaultUnitParameters = [ 
    "name", "role", "origin", 
    "stmr", "trust", "chain", "rarity" 
]
const gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "win before",
    "win_before": "win before"
}

function isStat(name) {
    return statParameters.includes(name.toLowerCase().trim());
}

// Commands
const commandCyra = `hi cyra`;
const commandJake = `hi jake`;
var loading = true;

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

function LoadGuilds(callback) {
    // List servers the bot is connected to
    log("Loading Guilds:");
    client.guilds.forEach(guild => {
        log(` - ${guild.name} - ${guild.id}`);
        const guildId = guild.id;
        config.loadGuild(guild.name, guild.id);
    });
}

function sendToChannel(id, msg) {
    var channel = client.channels.get(id); // Replace with known channel ID
    channel.send(msg);
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

    config.init();
    LoadGuilds();

    log("Configuration Loaded");
    loading = false;
});

function getPageID(search, categories, callback) {
    var count = categories.length;
    var similar = [];
    var queryEnd = function (id, name) {
        count -= 1;

        if (id) {
            callback(id, name);
            callback = null;
            count = 0;
        } else if (!id && count <= 0) {
            if (callback && similar.length > 0) {
                var highest = similar.sort((a, b) => {
                    return b.similarity - a.similarity;
                })[0];

                log("Highest");
                log(highest);

                id = highest.id;
                name = highest.title;

                var other = convertTitlesToLinks(similar);

                callback(id, name, other);
                callback = null;
            }
        }
    };

    categories.forEach(function (category) {
        wikiClient.getPagesInCategory(category, function (err, redirect, content) {
            if (err) {
                log(err);
                return;
            }

            var id = null;
            var name = search;
            for (var i = 0; i < redirect.length; i++) {
                if (!callback) {
                    return;
                }

                var page = redirect[i];

                var title = page.title.toLowerCase();
                search = search.toLowerCase();

                if (!title.startsWith(search[0])) {
                    continue;
                }

                var match = String.similarity(title, search);
                if (match >= similarityTreshold) {
                    //log(`Very Similar ${title} -vs- ${search} (${match})`)
                    similar[similar.length] = {
                        id: page.pageid,
                        title: page.title,
                        similarity: match
                    };
                } /* else if (match >= similarityTreshold * 0.5) {
                    log(`Kinda Similar ${title} -vs- ${search}`)
                }*/

                title = title.replaceAll(" ", "_");
                if (title === search) {
                    id = page.pageid;
                    name = page.title;
                    break;
                }
            }

            queryEnd(id, name);
        });
    });
}

// COMMANDS
function handleUnit(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    log("Searching Units For: " + search);
    queryWikiForUnit(search, function (pageName, info, imgurl, description, tips) {
        pageName = pageName.replaceAll("_", " ");
        parseUnitOverview(info, tips, parameters, (fields, limited, rarity) => {
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
                fields: fields
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
    });
}
function handleEquip(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");
    log(`Searching Equipment For: ${search}...`);
    queryWikiForEquipment(search, parameters, function (imgurl, pageName, nodes) {
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
    queryWikiForAbility(search, parameters, function (imgurl, pageName, nodes) {
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
function handleSprite(receivedMessage, search, parameters) {
    search = search.toTitleCase("_");

    log("Searching Unit Sprite For: " + search);
    validatePage(search, function (valid, imgurl) {
        search = search.replaceAll("_", " ");

        var embed = {
            color: pinkHexCode,
            image: {
                url: imgurl
            },
            title: search,
            url: "https://exvius.gamepedia.com/" + search,
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
function handleSearch(receivedMessage, search) {
    log(`Searching For: ${search}...`);
    queryWikiWithSearch(search, function (batch) {
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
function handleAddalias(receivedMessage, search, parameters) {
    if (receivedMessage.content.replace(/[^"]/g, "").length < 4) {
        log("Invalid Alias");
        return;
    }

    var w1 = parameters[0];
    var w2 = parameters[1];
    /*
      var copy = receivedMessage.content;
      var w1 = getQuotedWord(copy);
      if (!w1) {
          log("Invalid Alias");
          return;
      }
      copy = copy.replace(`\"${w1}\"`, "");
      var w2 = getQuotedWord(copy);
      if (!w2) {
          log("Invalid Alias");
          return;
      }
      copy = copy.replace(`\"${w2}\"`, "");
      */

    validatePage(w1, valid => {
        if (valid) {
            respondFailure(receivedMessage);
        } else {
            validatePage(w2, valid => {
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
function handleEmote(receivedMessage, prefix, replace) {
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
function handleHelp(receivedMessage) {
    var data = fs.readFileSync("readme.md", "ASCII");
    receivedMessage.author
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                description: data
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
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
function handleRank(receivedMessage, search, parameters) {
    log("\nSearching Rankings for: " + search);
    if (search) {
        const unit = config.getUnitRank(search.toLowerCase());
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

        receivedMessage.channel
            .send({
                embed: embed
            })
            .then(message => {
                cacheBotMessage(receivedMessage.id, message.id);
            })
            .catch(console.error);
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
}
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
function handleGetsettings(receivedMessage) {
    const guildId = receivedMessage.guild.id;
    const settings = config.getSettings(guildId);
    const json = JSON.stringify(settings, null, "\t");
    log(json);

    receivedMessage.author
        .send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                description: "Current settings for your server",
                fields: [
                    {
                        name: "settings",
                        value: json
                    }
                ]
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
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
function handleSetrankings(receivedMessage, search, parameters) {
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
        title = `Unit calculations For ${s}. (bust damage on turn)`;
    } else {
        title = `Unit calculations For ${s}. (dpt - turns for rotation)`
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
function handleRecentunits(receivedMessage, search, parameters) {

    queryWikiFrontPage((links) => {
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

// COMMANDS END

function parseUnitOverview(overview, tips, params, callback) {
    var parameters = defaultUnitParameters;
    if (params.length > 0) {
        log("Found Parameters");
        log(params);
        parameters = params;
    }

    var fields = [];
    var match = overviewRegexp.exec(overview);
    var minR = null;
    var maxR = null;
    var limited = false;
    // ★★★★★✫✫

    var count = 1;
    var queryEnd = function (name, value) {
        count -= 1;

        if (name && value) {
            for (let i = 0; i < fields.length; i++) {
                //log(`Finished Query: ${fields[i].name} -vs- ${name}`);
                if (fields[i].name === name) {
                    //log("Found Queried field");
                    fields[i].name = name;
                    fields[i].value = value;
                }
            }
        }

        if (count <= 0) {
            log("Unit Fields");
            log(fields);
        
            if (callback) {
                callback(fields, limited, rarity);
            }
        }
    };

    parameters.forEach((n, i) => {
        if (parameterAliases[n]) {
            log(`'${parameters[i]}' changed to '${parameterAliases[n]}'`)
            parameters[i] = parameterAliases[n];
        }  
    })

    while (match != null) {
        var inline = true;
        var name = match[1].replaceAll(" ", "").toLowerCase();
        var value = match[2];
        if (name.includes("min-rarity")) {
            minR = value;
            match = overviewRegexp.exec(overview);
            continue;
        } else if (name.includes("max-rarity")) {
            maxR = value;
            match = overviewRegexp.exec(overview);
            continue;
        }

        if (name === "limited") {
            match = overviewRegexp.exec(overview);
            limited = value === "Yes";
            continue;
        }

        if (abilityAliases[name]) {
            name = abilityAliases[name];
        }

        if (parameters.includes(name) && !value.empty()) {
            if (name == "tmr" || name == "stmr" || name == "STMR") {

                name = name.toUpperCase();

                var tip = tips.find(t => {
                    return t.title === value;
                });
                if (tip) {
                    name += " - " + value;
                    value = tip.value;
                } else {
                    log("Attempting to query for: " + value);
                    count++;
                    queryPage(value, name, (n, v) => {
                        queryEnd(n, v);
                    });
                }

                inline = false;
            }

            fields[fields.length] = {
                name: name.capitalize(),
                value: value,
                inline: inline
            };
        }

        match = overviewRegexp.exec(overview);
    }

    var tip = tips.find(t => {
        return t.title === "Chain Families";
    });
    if (tip && parameters.includes("chain")) {
        fields[fields.length] = {
            name: "Chain Families",
            value: tip.value
        };
    }

    var rarity = null;
    if (minR && parameters.includes("rarity")) {
        rarity = getRarityString(minR, maxR);
        fields[fields.length] = {
            name: "Rarity",
            value: rarity,
            inline: true
        };
    }

    queryEnd();
    return fields;
}
function getRarityString(min, max) {
    min = parseInt(min);
    max = parseInt(max);
    var rarityString = "";
    for (var i = 0; i < max; i++) {
        rarityString += i < min ? unicodeStar : unicodeStarOpen;
    }
    return rarityString;
}

function getCollectedTipText(tooltip, collected) {
    var firstDiv = tooltip.find("div").first();

    while (firstDiv && firstDiv.length > 0) {
        var text = firstDiv.text();
        //log("\nDiv Text: " + text);

        var child = firstDiv.find(".tip.module-tooltip");
        if (child && child.length > 0) {
            collected = getCollectedTipText(child, collected);
        } else {
            collected += text + "\n";
        }

        firstDiv = firstDiv.next();
    }

    //log("\nCurrent Collected Text: ");
    //log(collected);
    return collected;
}

function parsePage(match, params, callback) {
}
function queryPage(id, paramName, callback) {
    wikiClient.getArticle(id, function (err, content, redirect) {
        if (err) {
            log(err);
            return;
        }

        wikiClient.parse(content, "search", function (err, xml, images) {
            if (err) {
                console.error(err);
                return;
            }

            const $ = cheerio.load(xml);

            var regex = /\|(.*?)\n/g;
            var match = regex.exec(content);
            //log(match);

            // TODO: parse item ability description.

            var ignore = "<!";
            var nodes = [];
            while (match != null) {
                var name = match[1].replace("\t", "").capitalize();
                name = name.replaceAll(" ", "");
                var value = match[2];

                //log(`${name} = '${value}' isParam: ${isParam}`);

                // Fix string to remove any unecessary information
                if (value) {
                    value = removeHTMLComments(value);

                    var m = value.match(linkRegexp2);
                    if (m) {
                        value = convertBatchToLinks(m);
                    }
                    if (value.includes("Unstackable")) {
                        value = "Unstackable Materia";
                    }
                }

                const infoFields = [
                    "Resist",
                    "Effect",
                    "Element",
                    "Ability",
                ]
                var isParam = isStat(name);
                var isParsable = infoFields.includes(name);
                if (value && !value.includes(ignore) && (isParam || isParsable)) {
                    var notEmpty = /\S/.test(value);

                    if (abilityAliases[name]) {
                        name = abilityAliases[name];
                    }

                    value = value.replaceAll("\n", "");
                    value = value.replace("[", "\n\[");
                    if (notEmpty) {
                        nodes[nodes.length] = {
                            name: name,
                            value: value,
                            inline: name !== "Effect"
                        };
                    }
                }

                match = valueMultiLineRegexp.exec(content);
            }

            var tips = [];
            $(".tip.module-tooltip").each(function (tip) {
                var tipTitle = $(this).find("img").attr("title");
                var collected = getCollectedTipText($(this), "");
                //log(`Collected Tip Text: ${tipTitle} (${tip})`);
                //log(collected);
                if (!tips.find(t => {return t.value === collected;})) {
                    //log("Adding Tip");
                    //log(collected);
                    //log("\n");
                    tips[tips.length] = {
                        title: tipTitle,
                        value: collected
                    };
                }
            });

            //log("Tips:");
            //log(tips);

            var totalValue = "";
            for(var i = 0; i < nodes.length; i++ ) {
                if (nodes[i].name === "Effect") {
                    //log("Adding tips to effect");
                    tips.forEach((n) => {
                        nodes[i].value += "\n" + n.value;
                    });
                }

                totalValue += nodes[i].value;
                if (isStat(nodes[i].name)) {
                    totalValue += "-";
                }
                totalValue += nodes[i].name;
            }

            //log(nodes);

            totalValue = totalValue.replace("Effect", "");
            //log("Parsed Total Value: " + name);
            //log(totalValue);

            callback(paramName, totalValue);
        });
    });
}

function parseEquipmentPage(match, content, params, tips) {

    var parameters = defaultEquipParameters;
    if (params.length > 0) {
        parameters = params;
    }

    parameters.forEach((n, i) => {
        if (parameterAliases[n]) {
            log(`'${parameters[i]}' changed to '${parameterAliases[n]}'`)
            parameters[i] = parameterAliases[n];
        }  
    })

    var ignore = "<!";
    var nodes = [];
    while (match != null) {
        var name = match[1].replace("\t", "").toLowerCase();
        name = name.trim();
        var isParam = isStat(name);
        var value = match[2];
        
        //log(`${name} = '${value}' isParam: ${isParam}`);

        // Fix string to remove any unecessary information
        if (value) {
            value = removeHTMLComments(value);

            var m = value.match(linkRegexp2);
            if (m) {
                value = convertBatchToLinks(m);
            }
            if (value.includes("Unstackable")) {
                value = "Unstackable Materia";
            }
        }

        var isParsable = parameters.includes(name);
        if (value && !value.includes(ignore) && (isParam || isParsable)) {
            var notEmpty = /\S/.test(value);

            if (isParam || name === "stmr") {
                name = name.toUpperCase();
            }

            if (notEmpty) {
                nodes[nodes.length] = {
                    name: name.capitalize(),
                    value: value,
                    inline: name !== "Effect"
                };
            }
        }

        match = valueMultiLineRegexp.exec(content);
    }

    tips.forEach((t, i) => {
        nodes[nodes.length] = {
            name: t.title,
            value: t.value
        }    
    });

    log(nodes);
    return nodes;
}
function parseAbilityPage(match, content, params, tips) {

    var parameters = defaultAbilityParameters;
    if (params.length > 0) {
        parameters = params;
    }

    parameters.forEach((n, i) => {
        if (parameterAliases[n]) {
            log(`'${parameters[i]}' changed to '${parameterAliases[n]}'`)
            parameters[i] = parameterAliases[n];
        }  
    })

    var ignore = "<!";
    var nodes = [];
    while (match != null) {
        var name = match[1].replace("\t", "").toLowerCase();
        name = name.trim();
        var isParam = isStat(name);
        var value = match[2];

        //log(`${name} = '${value}' isParam: ${isParam}`);

        // Fix string to remove any unecessary information
        if (value) {
            value = removeHTMLComments(value);
            var m = value.match(linkRegexp2);
            if (m) {
                value = convertBatchToLinks(m);
            }
            if (name === "Chain") {
                value = convertValueToLink(value);
            }
            if (value.includes("Unstackable")) {
                value = "Unstackable Materia";
            }
        }

        //log("Expected Value: " + name);
        //log(value);
        var isParsable = parameters.includes(name);
        if (value && !value.includes(ignore) && isParsable) {
            var notEmpty = /\S/.test(value);

            if (abilityAliases[name]) {
                name = abilityAliases[name];
            }
            if (isParam || name === "stmr") {
                name = name.toUpperCase();
            }

            if (notEmpty) {
                nodes[nodes.length] = {
                    name: name.capitalize(),
                    value: value,
                    inline: name !== "Effect"
                };
            }
        }

        match = valueMultiLineRegexp.exec(content);
    }
    
    tips.forEach((t, i) => {
        nodes[nodes.length] = {
            name: t.title,
            value: t.value
        }    
    });

    log(nodes);
    return nodes;
}

function queryWikiForUnit(search, callback) {
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            return;
        }
        if (redirect) {
            log("Redirect Info: ");
            log(redirect);
        }

        const firstLine = content.indexOf("Unit Infobox");
        if (firstLine < 0) {
            const redirectRegex = /(?:.*)\[(.*)\]]/g;
            const page = redirectRegex.exec(content);
            log("Redirect To: " + page[1]);
            queryWikiForUnit(page[1], callback);
            return;
        }

        var preString = "Unit Infobox";
        var searchString = "}}";
        var preIndex = content.indexOf(preString);
        var searchIndex = preIndex + content.substring(preIndex).indexOf(searchString);
        const overview = content.substring(firstLine, searchIndex);

        wikiClient.parse(content, search, function (err, xml, images) {
            if (err) {
                log(err);
                return;
            }

            var match = xml.match(/\"\/Chaining\/(.*)\"\s/g);
            var unique = [];
            var family = null;
            if (match) {
                family = "";
                match.forEach(m => {
                    if (!unique.includes(m)) {
                        unique[unique.length] = m;
                    }
                });
                log("Parsed Family:\n\n");
                unique.forEach(m => {
                    m = m.replace("/", "").replaceAll('"', "").replaceAll(" ", "");
                    var name = m.replace("Chaining/", "").replaceAll("_", " ");
                    var link = `[${name}](${wikiEndpoint}${m})`;
                    log(name);
                    log(link);
                    if (link.length > 200) {
                        return;
                    }
                    family += link + "\n";
                    log("--------------");
                });
                log(family);
            }

            const $ = cheerio.load(xml);
            const imgurl = $(".big-pixelate").attr("src");
            var description = $(".mw-parser-output").children("p").first().text();
            description = description.limitTo(descCharLimit);

            var tips = [];
            $(".tip.module-tooltip").each(function (tip) {
                var tipTitle = $(this).find("img").attr("title");
                var tipInfo = $(this).find("div").first().text();
                var collected = getCollectedTipText($(this), "");
                log(`Collected Tip Text: ${tipTitle} (${tip})`);
                log(collected);
                if (!tips.find(t => {return t.value === collected;})) {
                    log("Adding Tip");
                    log(collected);
                    log("\n");
                    tips[tips.length] = {
                        title: tipTitle,
                        value: collected
                    };
                }
            });

            log("Tips:");
            log(tips);

            if (family) {
                tips[tips.length] = {
                    title: "Chain Families",
                    value: family
                };
            }

            //log(search);
            //log(typeof search);
            callback(search, overview, imgurl, description, tips);
        });
    });
}
function queryWikiForEquipment(search, params, callback) {
    getPageID(search, config.equipmentCategories, function (id, pageName, other) {
        if (!id) {
            log("Could not find page: " + pageName);
            return;
        }

        wikiClient.getArticle(id, function (err, content, redirect) {
            if (err) {
                log(err);
                return;
            }

            wikiClient.parse(content, "search", function (err, xml, images) {
                if (err) {
                    console.error(err);
                    return;
                }

                const $ = cheerio.load(xml);
                const imgurl = $(".mw-parser-output").find("img").attr("src");
                const links = $(".mw-parser-output").children("a");
                //log("Links on Page");
                //log(links.length);

                var regex = /\|(.*?)\n/g;
                var match = regex.exec(content);
                //log(match);

                var tips = parseTipsFromPage($);
                var nodes = parseEquipmentPage(match, content, params, tips);

                if (other) {
                    nodes[nodes.length] = {
                        name: "Similar Results",
                        value: other
                    };
                }

                //log(nodes);

                callback(imgurl, pageName, nodes);
            });
        });
    });
}
function queryWikiForAbility(search, params, callback) {
    getPageID(search, config.abilityCategories, function (id, pageName, other) {
        wikiClient.getArticle(id, function (err, content, redirect) {
            if (err) {
                log(err);
                return;
            }
            wikiClient.parse(content, "search", function (err, xml, images) {
                if (err) {
                    console.error(err);
                    return;
                }

                const $ = cheerio.load(xml);
                const imgurl = $(".mw-parser-output").find("img").attr("src");
                const links = $(".mw-parser-output").children("a");
                //log("Links on Page");
                //log(links.length);

                var regex = /\|(.*?)\n/g;
                var match = regex.exec(content);
                //log(match);

                var tips = parseTipsFromPage($);
                var nodes = parseAbilityPage(match, content, params, tips);

                if (other) {
                    nodes[nodes.length] = {
                        name: "Similar Results",
                        value: other
                    };
                }

                callback(imgurl, pageName, nodes);
            });
        });
    });
}
function queryWikiWithSearch(search, callback) {
    wikiClient.search(search, (err, results) => {
        if (err) {
            log(err);
            return;
        }

        var batch = results.slice(0, 5);
        var fields = [
            {
                name: "Results For " + search,
                value: "Nothing Found"
            }
        ];
        fields[0].value = convertTitlesToLinks(batch);

        callback(fields);
    });
}
function queryWikiFrontPage(callback) {
    wikiClient.getArticle("Final_Fantasy_Brave_Exvius_Wiki", (err, content, redirect) => {
        if(err) {
            log(err);
            return;
        }

        const firstLine = content.indexOf("Recent");
        content = content.substring(firstLine, content.length);

        var units = "";
        var unitsRegex = /\|unit.*=\s(.*)\|/g
        var match = unitsRegex.exec(content);
        while (match != null) {
            
            units += convertValueToLink(match[1]) + "\n";
        
            match = unitsRegex.exec(content);
        }

        wikiClient.parse(content, "Final_Fantasy_Brave_Exvius_Wiki", function (err, xml, images) {
            if(err) {
                log(err);
                return;
            }

            log(images);
        });

        var m = content.match(linkRegexp2);
        if (m) {
            var value = convertBatchToLinks(m);
            log(value)
        }

        callback(units)
    });
}

function removeHTMLComments(value) {
    if (/<!.*>/g.test(value)) {
        value = value.replace(/<!.*>/g, "");
    }

    return value;
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
    log("Converted Link: " + link);
    return link;
}
function convertBatchToLinks(batch) {
    //log("Matching Links");
    //log(batch);

    var value = "";
    batch.forEach(link => {
        linkFilter.forEach(filter => {
            link = link.replace(filter, "");
        });

        link = `[${link}](${wikiEndpoint + link.replaceAll(" ", "_")}) `;
        log("Converted Link: " + link);
        value += link;
    });

    return value;
}
function convertTitlesToLinks(batch) {
    var value = "";
    batch.forEach(function (page) {
        log("converTitle: " + page.title);
        var title = page.title.replaceAll(" ", "_");
        value += wikiEndpoint + title + "\n";
    });

    return value;
}

function parseTipsFromPage($) {
    var tips = [];
    $(".tip.module-tooltip").each(function (tip) {
        var tipTitle = $(this).find("img").attr("title");
        var collected = getCollectedTipText($(this), "");
        log(`Collected Tip Text: ${tipTitle} (${tip})`);
        log(collected);
        if (!tips.find(t => {return t.value === collected;})) {
            log("Adding Tip");
            log(collected);
            log("\n");
            tips[tips.length] = {
                title: tipTitle,
                value: collected
            };
        }
    });

    log("Tips:");
    log(tips);
    return tips;
}

// GIFS

var unitsDump = null;
function getUnitKey(search) {
    if (unitsDump === null) {
        log("loading units list")
        var data = fs.readFileSync("unitkeys.json");
        unitsDump = JSON.parse(data);

    }

    if (!unitsDump[search]) {
        return null
    }

    return unitsDump[search];
}
function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
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
            log(gifs);
            
            img = gifs.find((n) => {
                return n.toLowerCase().includes(param);
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
                    fs.mkdirSync( `tempgifs/${search}/`, { recursive: true}, (err) => {
                        if (err) throw err;
                    });

                const file = fs.createWriteStream(filename);

                var source = img.slice(0, 5) === 'https' ? http : htt;
                source.get(img, function(response) {
                    return response.pipe(file);
                });

                file.on('finish', function() {
                    callback(filename);
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
function validatePage(search, callback) {
    /*
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            callback(false);
            return;
        }

        if (redirect) {
            log("Redirect Info: ");
            log(redirect);
        }

        const firstLine = content.indexOf("Unit Infobox");
        if (firstLine < 0) {
            const redirectRegex = /(?:.*)\[(.*)\]]/g;
            const page = redirectRegex.exec(content);
            log("Redirect To: " + page[1]);
            validatePage(page, callback);
            return;
        }

        wikiClient.parse(content, search, function (err, xml, images) {
            if (err) {
                log(err);
                return;
            }

            const $ = cheerio.load(xml);
            const imgurl = $(".big-pixelate").attr("src");
            callback(true, imgurl);
        });
    });*/

    log(search)
    var unit = getUnitKey(search);
    log(unit)
    callback(unit != null)
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
function respondSuccess(receivedMessage, toUser) {

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
function respondFailure(receivedMessage, toUser) {

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

client.on("message", receivedMessage => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user || loading) {
        return;
    }

    const content = receivedMessage.content;
    var copy = content.toLowerCase();
    if (!receivedMessage.guild) {
        var id = receivedMessage.author.id;
        log("Private Message From: " + id);
        log(content)
        if (id != renaulteUserID && id != jimooriUserID) {
            return;
        }

        log("Settings Change Allowed");

        try {

            var params = getParameters(copy);
            var parameters = params.parameters;
            copy = params.msg;

            var command = getCommandString(content, "?");
            const search = getSearchString(`?${command}`, copy);
            if (!search && parameters.length === 0) {
                log("Could not parse search string");
                //respondFailure(receivedMessage, true);
                throw command;
            }

            if (content.startsWith("?setrank")) {
                handleSetrankings(receivedMessage, search, parameters);
            }
        } catch(e) {
            log("Failed: " + e);
            respondFailure(receivedMessage, true);
        }

        return;
    }

    const guildId = receivedMessage.guild.id;
    const prefix = config.getPrefix(guildId);
    if (!content.startsWith(prefix)) {
        handleReactions(receivedMessage);
        return;
    }

    const attachment = receivedMessage.attachments.first();
    if (attachment) {
        log("Message Attachments");
        log(attachment.url);
    }

    try {
         // the command name
        var command = getCommandString(content, prefix);
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
        const search = getSearchString(`${prefix}${command}`, copy);
        

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
            log("\nTrying Backup Command: " + "handle" + e + "(receivedMessage)");
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
    log("Unhandled Rejection at: Promise", p, "reason:", reason);
    // application specific logging, throwing an error, or other logic here
});

// Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click to Reveal Token"
bot_secret_token =
    "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg";
bot_secret_token_test =
    "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

client.login(bot_secret_token);

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
    const request = http.get(link, function (response) {
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
function getSearchString(prefix, msg) {
    var ind = prefix.length + 1;
    var search = msg.slice(ind, msg.length);

    if (search.empty()) {
        return null;
    }

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
    var params = msg.match(/"[^"]+"/g);
    if (params) {
        parameters = params;

        parameters.forEach((p, ind) => {
            msg = msg.replace(p, "");
            parameters[ind] = p.replaceAll('"', "");
        });
        msg = msg.trim();
    }

    return { msg: msg, parameters: parameters };
}
