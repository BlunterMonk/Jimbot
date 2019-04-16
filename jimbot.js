const Discord = require('discord.js')
const client = new Discord.Client()
const request = require('request');
const wiki = require('nodemw');
const fs = require('fs');
const cheerio = require('cheerio');
const config = require('./config.ts');
const wikiClient = new wiki({
    protocol: 'https',           // Wikipedia now enforces HTTPS
    server: 'exvius.gamepedia.com',  // host name of MediaWiki-powered site
    path: '/',                  // path to api.php script
    debug: false                 // is more verbose when set to true
});
var mainChannelID;
const pinkHexCode = 0xffd1dc;
const overviewRegexp = /\|(.*)=\s*(.*)/g;
const valueRegexp = /\|(.*)(?:=)(.*)/g;
const valueMultiLineRegexp = /\|(.*)(?:=)(.*[^|]+)/g;
// (?:\<.*\>) for commented elements
////(.*)=\s*(.*)/g;
const unicodeStar = "★";
const unicodeStarOpen = "✫";
const descCharLimit = 128;
const wikiEndpoint = "https://exvius.gamepedia.com/";
const similarityTreshold = 0.5;
const okEmoji = '🆗';
const cancelEmoji = '❌';

// Lookup Tables

const equipParameters = [
    'ATK', 'DEF', 'MAG', 'SPR', 'HP', 'MP'
]
const equipFields = [
    /*'Name',*/ "Type", /*"Desc",*/ "Reward", "Resist", "Effect", 
    "Trust", "STMR", "Element", "Ability", "Notes"
]
const unicodeNumbers = [
    "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"
]

// Commands
const commandCyra = `hi cyra`;
const commandJake = `hi jake`;

// Keep track of added messages
const botMessages = [];
function cacheBotMessage(received, sent) {
    botMessages[botMessages.length] = {
        received: received,
        sent: sent,
        time: new Date()
    };
    console.log("Cached Message");
    console.log(botMessages[botMessages.length-1]);
}

function log(data) {
    console.log(data);
}
function logData(data) {
    console.log(JSON.stringify(data))
}

function getMainChannelID() {
    // List servers the bot is connected to
    console.log("Servers:")
    client.guilds.forEach((guild) => {
        console.log(` - ${guild.name} - ${guild.id}`)

        // List all channels
        for(var i = 0; i < guild.channels.length; i++){
            var channel = guild.channels[i];
            console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`)

            if (channel.type === "text") {
                mainChannelID = channel.id;
                console.log("Main Channel ID: " + channel.id);
                break;
            }
        }
    });
}

function sendToChannel(id, msg) {
    var channel = client.channels.get(id) // Replace with known channel ID
    channel.send(msg)  
}

const http = require('https');
client.on('ready', () => {
    console.log("Connected as " + client.user.tag)
    getMainChannelID()

    /*
    request('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', { json: true }, (err, res, body) => {
    if (err) { return console.log(err); }
        console.log(body.url);
        console.log(body.explanation);
    });
    */
   loadRankingsList();

    // Synchronous read
    config.init();
    //config.addAlias("turtle","ryunan");
    //config.addEmote("tifamad", "https://cdn.discordapp.com/attachments/566737026762932224/566749975933878275/angry_tifa.png");

    //config.save();
})

function loadRankingsList() {
    
    var search = "Unit_Rankings";
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            return;
        }
        if (redirect) {
            console.log("Redirect Info: ");
            console.log(redirect);
        }

        wikiClient.parse(content, search, function (err, xml, images) {
            if (err) {
                console.log(err);
                return;
            }
            console.log("Parsing Page");
            //console.log(xml);

            const $ = cheerio.load(xml);
            //const table = $('table#wikitable.sortable.jquery-tablesorter').first();
            //console.log(table);
            var table = $('.wikitable.sortable');
            fs.writeFileSync('rankingsdump.txt', xml);

            if(!table.is('table')) {
                console.log("Not Table");
                return;
            }
            console.log("Is Table");
            var results = [],
                headings = [];
        
            table.first().find('th').each(function(index, value) {
                var head = $(value).text();
                if (!head.empty() && index > 0) {
                    head = head.replaceAll("\n", "");
                    //console.log("thead tr th: " + head);
                    headings.push(head);
                }
            });

            table.each((tableIndex, element) => {
                console.log("Started Table: " + tableIndex);
                //console.log($(element).html());

                var count = 1;
                $(element).find('tbody').children('tr').each(function(indx, obj ) {
                    var row = {};
                    var tds = $(this).children('td');
                    if (count > 0) {
                        console.log("tr: " + indx);
                    }

                    tds.each(function(ind) {
                        var value = $(this).text();
                        value = value.replaceAll("\n", "");
                        value = value.replaceAll(" ", "_");
                        if (count > 0) {
                            console.log("td: " + value);
                        }

                        if (ind == 0) {
                            var img = $(this).find('img').attr('src');
                            row["imgurl"] = img;
                            //console.log("Imgurl: " + img);
                        }

                        var links = $(this).children('img');
                        links.each(function(i) {
                            if (count > 0) {
                                console.log("img: " + $(this).attr('alt'));
                            }
                            value += $(this).attr('alt') + "\n";
                        });

                        var key = headings[ind];
                        if (ind < 4) {
                            //console.log(`Add (${value}) To: ${key}`);
                            row[key] = value;
                        }
                    });

                    var unitName = row["Unit"];
                    
                    if (row["Unit"]) {
                        var escpaedName = row["Unit"].replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
                        
                        try {
                            var notes = $(`#${escpaedName}_2`);
                            if (notes && notes.length > 0) {
                                row["notes"] = notes.parent().next().text();
                            } else {
                                //console.log(`Could not find '${escpaedName}_2', trying '${escpaedName}'.`);

                                try {
                                    var notes = $(`#${escpaedName}`);
                                    if (notes && notes.length > 0) {
                                        row["notes"] = notes.parent().next().text();
                                    } else {
                                        console.log(`Found '${escpaedName}', could not find notes.`);
                                    }
                                } catch (f) {
                                    console.log("Could not get notes for: " + escpaedName);
                                }
                            }
                        } catch(e) {
                            console.log("Big Error: " + e);
                            console.log("Could not get notes for: " + escpaedName);
                        }
                        
                        if (count > 0) {
                            console.log(row);
                        }

                        count--;
                        results.push(row);
                    }
                });
            });
        
            //console.log("Results:");
            //console.log(results)
            var j = JSON.stringify(results);
            //console.log(j);
            fs.writeFileSync('rankingsdump.json', j);
            console.log("Unit Rankings Updated");
        });
    });
}
function toJson(table) {
  
    if(!table.is('table')) {
        return;
    }

    var results = [],
        headings = [];

    table.find('thead tr th').each(function(index, value) { 
        headings.push($(value).text());
    });


    table.find('tbody tr').each(function(indx, obj ){
        var row = { };
        var tds = $(obj).children('td');
        headings.forEach(function(key, index){
            var value = tds.eq(index).text();
            row[key] = value;
        });
        results.push(row);
    });

    return results;
}

function getPageID(search, categories, callback) {

    var count = categories.length;
    var similar = [];
    var queryEnd = function(id, name) {
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
        
                console.log("Highest");
                console.log(highest);
        
                id = highest.id;
                name = highest.title;
        
                var other = convertTitlesToLinks(similar);
        
                callback(id, name, other);
                callback = null;
            }
        } 
    };


    categories.forEach(function (category) {
        wikiClient.getPagesInCategory(category, function ( err, redirect, content) {
            if (err) {
                console.log(err);
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

                var match = similarity(title, search);
                if (match >= similarityTreshold) {
                    //console.log(`Very Similar ${title} -vs- ${search} (${match})`)
                    similar[similar.length] = {
                        id: page.pageid,
                        title: page.title,
                        similarity: match
                    }
                }/* else if (match >= similarityTreshold * 0.5) {
                    console.log(`Kinda Similar ${title} -vs- ${search}`)
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

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1)
}
String.prototype.limitTo = function(limit) {
    if (this.length <= limit) {
        return this;
    }
    return this.substring(0, limit) + "...";
}
String.prototype.empty = function() {
    return this.length === 0 || !/\S/.test(this);
}
String.prototype.indexOfAfter = function(search, start) {
    var string = this;
    var preIndex = string.indexOf(start);
    return preIndex + string.substring(preIndex).indexOf(search);
}
String.prototype.indexOfAfterIndex = function(search, start) {
    return start + this.substring(start).indexOf(search);
}
String.prototype.matches = function(other) {
    return this === other;
}
function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                var newValue = costs[j - 1];
                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                    newValue = Math.min(Math.min(newValue, lastValue),
                    costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
function getSearchString(prefix, msg) {

    var ind = prefix.length + 1;
    var search = msg.slice(ind, msg.length);

    if (search.empty()) {
        return null;
    }

    var s = search
    var alias = config.getAlias(s.replaceAll(" ", "_"));
    if (alias) {
        console.log("Found Alias: " + alias);
        return alias.replaceAll(" ", "_");
    }

    search = toTitleCase(search);
    search = search.replaceAll(" ", "_");
    return search;
}
function getCommandString(msg, prefix) {

    var split = msg.split(" ")[0];
    split = toTitleCase(split.replace(prefix, ""));

    if (split.empty()) {
        return null;
    }

    return split;
}
function toTitleCase(text) {
    return text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
}

/*
const reactionFilter = (reaction, user) => {
    return true;// ['👎'].includes(reaction.emoji.name) && user.id === message.author.id;
};
    const filter = (reaction, user) => reaction.emoji.name === '👌'
*/


// COMMANDS
function handleUnit(receivedMessage, search, parameters) {

    console.log("Searching Units For: " + search);
    queryWikiForUnit(search, function (pageName, info, imgurl, description, tips) {
        pageName = pageName.replaceAll("_", " ");
        parseUnitOverview(info, tips, parameters, 
            (fields, limited, rarity) => {

                var embed = {
                    color: pinkHexCode,
                    author: {
                        name: client.user.username,
                        icon_url: client.user.avatarURL
                    },
                    thumbnail: {
                        url: imgurl,
                    },
                    title: pageName,
                    url: "https://exvius.gamepedia.com/"+search,
                    fields: fields
                };
        
                // TODO: Create a function to better wrap this since it will be common
                if (parameters.length == 0 || 
                    (parameters.length > 0 && parameters.includes("Description"))) {
                    embed.description = description;
                }
                if (limited) {
                    embed.footer = {
                        "text": "Unit Is Limited"
                    };
                }
                
                receivedMessage.channel.send({
                    embed: embed
                })
                .then(message => {
                    cacheBotMessage(receivedMessage.id, message.id);
                })
                .catch(console.error);
            });
    });
}
function handleEquip(receivedMessage, search) {

    console.log(`Searching Equipment For: ${search}...`);
    queryWikiForEquipment(search, function(imgurl, pageName, nodes) {
        var title = pageName;
        pageName = pageName.replaceAll(" ", "_");

        receivedMessage.channel.send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                thumbnail: {
                    url: imgurl,
                },
                title: title,
                fields: nodes,
                url: "https://exvius.gamepedia.com/"+pageName
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    })
}
function handleSkill(receivedMessage, search) {

    console.log(`Searching Skills For: ${search}...`);
    queryWikiForAbility(search, function(imgurl, pageName, nodes) {
        var title = pageName;
        pageName = pageName.replaceAll(" ", "_");

        receivedMessage.channel.send(mainChannelID, {
            embed: {
                color: pinkHexCode,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                thumbnail: {
                    url: imgurl,
                },
                title: title,
                fields: nodes,
                url: "https://exvius.gamepedia.com/"+pageName
            }
        })
        .then(message => {
            cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    })
}
function handleReactions(receivedMessage) {

    const content = receivedMessage.content.toLowerCase();
    switch (content) {
        case commandCyra:
            receivedMessage.guild.emojis.forEach(customEmoji => {
                if (customEmoji.name === "hinayay" ||
                customEmoji.name === "2BLewd" ||
                customEmoji.name === "hugpweez") {
                
                    receivedMessage.react(customEmoji)
                }
            })
            break;
        case commandJake:
            receivedMessage.react('🌹')
            receivedMessage.react('🛋')
            break;
        default:
            break;
    }
}
function handleSearch(receivedMessage, search) {

    console.log(`Searching For: ${search}...`);
    queryWikiWithSearch(search, function (batch){
        receivedMessage.channel.send(mainChannelID, {
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
    })
}
function handleAddalias(receivedMessage) {
    if (receivedMessage.content.replace(/[^"]/g, "").length < 4) {
        console.log("Invalid Alias");
        return;
    }

    var copy = receivedMessage.content;
    var w1 = getQuotedWord(copy);
    if (!w1) {
        console.log("Invalid Alias");
        return;
    }
    copy = copy.replace(`\"${w1}\"`, "");
    var w2 = getQuotedWord(copy);
    if (!w2) {
        console.log("Invalid Alias");
        return;
    }
    copy = copy.replace(`\"${w2}\"`, "");

    validatePage(w1, (valid) => {
        if (valid) {
            respondFailure(receivedMessage);
        } else {
            validatePage(w2, (valid) => {
                if (valid) {
        
                    console.log("Unit is valid");
                    
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
function handleAddemo(receivedMessage) {
    var s = receivedMessage.content.split(" ");
    if (s) {
        if (!s[1] || !s[2]) {
            return;
        }

        var name = s[1];
        var url = s[2];

        var existing = validateEmote(name);
        if (existing) {

            var Attachment = new Discord.Attachment(existing);
            if (Attachment) {
                var embed = {
                    title: "Conflict",
                    description: "This emote already exists with this name, do you want to overwrite it?",
                    color: pinkHexCode,
                    image: {
                        url: `attachment://${existing}`
                    },
                    files: [{ attachment: `${existing}`, name: existing }] 
                };

                receivedMessage.channel.send({ embed: embed })
                    .then(message => {
                        cacheBotMessage(receivedMessage.id, message.id);
                        message.react(okEmoji);
                        message.react(cancelEmoji);

                        const filter = (reaction, user) => (reaction.emoji.name === okEmoji || reaction.emoji.name === cancelEmoji) && user.id !== message.author.id;
                        message.awaitReactions(filter, { max: 1, time: 60000 })
                                .then(collected => {
                                    const reaction = collected.first().emoji.name;
                                    const count = collected.size;

                                    if (count === 1 && reaction === okEmoji) {
                                        fs.unlink(existing, (err) => {
                                            if (err) {
                                                console.log(err);
                                                return;
                                            }

                                            downloadFile(name, url, (result) => {
                                                console.log(result);

                                                const serverId = receivedMessage.guild.id;
                                                receivedMessage.guild.emojis.forEach(customEmoji => {
                                                    if (customEmoji.name === config.getSuccess(serverId)) {
                                                        message.delete();
                                                        //receivedMessage.reply(`Emote has been replaced. :${customEmoji}:`);
                                                        respondSuccess(receivedMessage);
                                                    }
                                                });
                                            });                                            
                                        });
                                    } else if(count === 0 || reaction === cancelEmoji) {
                                        console.log("AddEmo - no response");
                                        message.delete();
                                        respondFailure(receivedMessage);
                                    }
                                })
                                .catch(collected => {
                                    console.log("AddEmo - no response");
                                    message.delete();
                                    respondFailure(receivedMessage);
                                });
                    })
                    .catch(console.error);
            }
                
        } else {
            downloadFile(name, url, (result) => {
                console.log(result);
                respondSuccess(receivedMessage);
            });
        }
    }
}
function handleEmote(receivedMessage, prefix, replace) {
    var img = receivedMessage.content.split(" ")[0];
    img = img.toLowerCase().replace(prefix, "");

    var filename = validateEmote(img);
    if (filename) {
        var Attachment = new Discord.Attachment(filename);
        if (Attachment) {
            receivedMessage.channel.send(Attachment)
                .then(message => {
                    cacheBotMessage(receivedMessage.id, message.id);
                })
                .catch(console.error);
        }
    }
    
    console.log(filename + " doesn't exist");
    return null;
}
function handleQuote(receivedMessage, search) {
    //var s = getSearchString(quoteQueryPrefix, content).toLowerCase();
    switch (search)
    {
        case "morrow":
            receivedMessage.channel.send(new Discord.Attachment('morrow0.png'))
            break;
        default:
            break;
    }
}
function handleHelp(receivedMessage) {
    var data = fs.readFileSync('readme.md', "ASCII");
    receivedMessage.channel.send(mainChannelID, {
        embed: {
            color: pinkHexCode,
            author: {
                name: client.user.username,
                icon_url: client.user.avatarURL
            },
            description: data,
        }
    })
    .then(message => {
        cacheBotMessage(receivedMessage.id, message.id);
    })
    .catch(console.error);
}
function handlePrefix(receivedMessage) {
    if(receivedMessage.member.roles.find(r => r.name === "Admin") || 
        receivedMessage.member.roles.find(r => r.name === "Mod")) {
        
        // TODO: Add logic to change prefix to a valid character.
        console.log("User Is Admin");
        var s = receivedMessage.content.split(" ");
        if (!s[1] || s[1].length !== 1) {
            console.log("Invalid Prefix");
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

    console.log("\nSearching Rankings for: " + search);
    if (search) {
        console.log("Unit Rank FOr: " + search);
        
        const unit = config.getUnitRank(search);
        console.log(unit);
       
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
            }
        }


        receivedMessage.channel.send({
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
    console.log("\nRankings");
    console.log(rankings);
    rankings.forEach((rank) => {
        embeds[embeds.length] = {
            title: rank.name,
            url : rank.pageurl,
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

    console.log("\nEmbeds");
    console.log(embeds);
    embeds.forEach((embed) => {

        receivedMessage.channel.send({
            embed: embed
        })
        .then(message => {
            //cacheBotMessage(receivedMessage.id, message.id);
        })
        .catch(console.error);
    });
}
// COMMANDS END

const defaultUnitParameters = [
    /*'Name', */"Limited", /*"Exclusive", *//*"Job", */"Role", "Origin", 
    /*"Gender", */"STMR", "Trust", /*"Race", *//*"Number"*/, "Chain", "Rarity"
];
function parseUnitOverview(overview, tips, params, callback) {
            
    var parameters = defaultUnitParameters;
    if (params.length > 0) {
        console.log("Found Parameters");
        console.log(params);
        parameters = params;
    }

    var fields = [];
    var match = overviewRegexp.exec(overview);
    var minR = null;
    var maxR = null;
    var limited = false;
    // ★★★★★✫✫

    while (match != null) {

        var inline = true;
        var name = match[1].replaceAll(" ", "").capitalize();
        var value = match[2];
        if (name.includes("Min-rarity")) {
            minR = value;
            match = overviewRegexp.exec(overview);
            continue;
        } else if (name.includes("Max-rarity")) {
            maxR = value;
            match = overviewRegexp.exec(overview);
            continue;
        }

        if (name === "Limited") {
            match = overviewRegexp.exec(overview);
            limited = value === "Yes";
            continue;
        }
        
        if (parameters.includes(name) && !value.empty()) {
            var tip = tips.find((t) => {return t.title === value;});
            if (tip) {
                name += " - " + value;
                value = tip.value;
                inline = false;
            }

            fields[fields.length] = {
                name: name,
                value: value,
                inline: inline
            }
        }

        match = overviewRegexp.exec(overview);
    }

    var tip = tips.find((t) => {return t.title === "Chain Families";});
    if (tip && parameters.includes("Chain")) {
        fields[fields.length] = {
            name: "Chain Families",
            value: tip.value,
        }
    }

    var rarity = null;
    if (minR && parameters.includes("Rarity")) {
        rarity = getRarityString(minR, maxR);
        fields[fields.length] = {
            name: "Rarity",
            value: rarity,
            inline: true
        }
    }

    console.log("Unit Fields");
    console.log(fields);

    if (callback) {
        callback(fields, limited, rarity);
    }
    return fields;
}
function getRarityString(min, max) {
    min = parseInt(min);
    max = parseInt(max);
    var rarityString = "";
    for (var i = 0; i < max; i++) {
        rarityString += (i < min) ? unicodeStar : unicodeStarOpen;
    }
    return rarityString;
}

function getCollectedTipText(tooltip, collected) {
    var firstDiv = tooltip.find('div').first();
   
    while (firstDiv && firstDiv.length > 0) {
        var text = firstDiv.text();
        console.log("\nDiv Text: " + text);

        var child = firstDiv.find('.tip.module-tooltip');
        if (child && child.length > 0) {
            collected = getCollectedTipText(child, collected);
        } else {
            collected += text + "\n";
        }  

        firstDiv = firstDiv.next();
    }

    console.log("\nCurrent Collected Text: ");
    console.log(collected);
    return collected;
}

function queryWikiForUnit(search, callback) {
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            return;
        }
        if (redirect) {
            console.log("Redirect Info: ");
            console.log(redirect);
        }
        
        const firstLine = content.indexOf("Unit Infobox");
        if (firstLine < 0) {
            const redirectRegex = /(?:.*)\[(.*)\]]/g;
            const page = redirectRegex.exec(content);
            console.log("Redirect To: " + page[1]);
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
                console.log(err);
                return;
            }

            var match = xml.match(/\"\/Chaining\/(.*)\"\s/g)
            var unique = [];
            var family = null;
            if (match) {

                family = "";
                match.forEach((m) => {
                    if (!unique.includes(m)) {
                        unique[unique.length] = m;
                    }
                });
                console.log("Parsed Family:\n\n");
                unique.forEach((m) => {
                    m = m.replace("/", "").replaceAll("\"","").replaceAll(" ", "");
                    var name = m.replace("Chaining/", "").replaceAll("_", " ");
                    var link = `[${name}](${wikiEndpoint}${m})`;
                    console.log(name);
                    console.log(link);
                    family += link + "\n";
                });
                console.log(family);
            }

            const $ = cheerio.load(xml);
            const imgurl = $('.big-pixelate').attr('src');
            var description = $('.mw-parser-output').children('p').first().text();
            description = description.limitTo(descCharLimit);

            var tips = [];
            $('.tip.module-tooltip').each(function (tip) {

                var tipTitle = $(this).find('img').attr('title');
                var tipInfo = $(this).find('div').first().text();
                var collected = getCollectedTipText($(this), "");

                if (!tips.find((t) => {return t.value === tipInfo})) {
                    console.log("Adding Tip");
                    console.log(tipInfo);
                    console.log("\n");
                    tips[tips.length] = {
                        title: tipTitle,
                        value: collected
                    }
                }
            });

            console.log("Tips:");
            console.log(tips);

            if (family) {

                tips[tips.length] = {
                    title: "Chain Families",
                    value: family
                }
            }

            console.log(search)
            console.log(typeof search)
            callback(search, overview, imgurl, description, tips);
        });
    });
}
function queryWikiForEquipment(search, callback) {

    getPageID(search, config.equipmentCategories, function (id, pageName, other) {
        if (!id) {
            console.log("Could not find page: " + pageName);
            return;
        }

        wikiClient.getArticle(id, function (err, content, redirect) {
            if (err) {
                console.log(err);
                return;
            }

            wikiClient.parse( content, 'search', function ( err, xml, images ) {
                if ( err ) {
                    console.error( err );
                    return;
                }
            
                const $ = cheerio.load(xml);
                const imgurl = $('.mw-parser-output').find('img').attr('src');
                const links = $('.mw-parser-output').children('a');
                //console.log("Links on Page");
                //console.log(links.length);
                
                var regex = /\|(.*?)\n/g;
                var match = regex.exec(content);
                //console.log(match);
                
                // TODO: parse item ability description.

                var ignore = "<!";
                var nodes = [];
                while (match != null) {
                    
                    var name = match[1].replace("\t", "").capitalize();
                    name = name.replaceAll(" ", "");
                    var value = match[2];

                    //console.log(`${name} = '${value}' isParam: ${isParam}`);

                    // Fix string to remove any unecessary information
                    if (value) {

                        if (value.includes(ignore)) {
                            var open = value.indexOf("<!");
                            var close = value.indexOf(">");
                            value = value.substring(0, open) + value.substring(close + 1, value.length);
                        }
                        if (value.includes("[[")) {

                            var open = value.indexOf("[[");
                            while (open > 0) {

                                var close = value.indexOfAfter("]]", open);
                                var link = value.substring(open + 3, close+1);
                                link = link.replaceAll(" ", "_");

                                value = value.replace("(", "");
                                value = value.replace(")", "");
                                value = value.substring(0, open) + value.substring(close + 3, value.length);

                                // Skip category links
                                var linkFilter = [ "|Trial", "|Event", "|Quest" ];
                                if (!linkFilter.find((f) => { return link.includes(f)})) {
                                    value += wikiEndpoint + link + "\n";
                                }
                                
                                open = value.indexOf("[[");
                            }
                        }
                        if (value.includes("Unstackable")) {
                            value = "Unstackable Materia";
                        }
                    }

                    var isParam = equipParameters.includes(name)
                    var isParsable = equipFields.includes(name);
                    if (value && !value.includes(ignore) &&
                        (isParam || isParsable)) {
                        
                        var notEmpty = /\S/.test(value);
                        
                        if (notEmpty) {

                            nodes[nodes.length] = {
                                name: name,
                                value: value,
                                inline: (name !== "Effect")
                            }
                        }
                    }
                    
                    match = valueMultiLineRegexp.exec(content);
                }

                if (other) {
                    nodes[nodes.length] = {
                        name: "Similar Results",
                        value: other,
                    }
                }
                
                console.log(nodes);

                callback(imgurl, pageName, nodes);
            });
        });
    });
}
function queryWikiForAbility(search, callback) {

    getPageID(search, config.abilityCategories, function (id, pageName, other) {
        wikiClient.getArticle(id, function (err, content, redirect) {
            if (err) {
                console.log(err);
                return;
            }
            wikiClient.parse( content, 'search', function ( err, xml, images ) {
                if ( err ) {
                    console.error( err );
                    return;
                }

                const $ = cheerio.load(xml);
                const imgurl = $('.mw-parser-output').find('img').attr('src');
                const links = $('.mw-parser-output').children('a');
                //console.log("Links on Page");
                //console.log(links.length);
                
                var regex = /\|(.*?)\n/g;
                var match = regex.exec(content);
                console.log(match);
                
                // TODO: parse item ability description.

                var ignore = "<!";
                var nodes = [];
                while (match != null) {
                    
                    var name = match[1].replace("\t", "").capitalize();
                    name = name.replaceAll(" ", "");
                    var value = match[2];

                    //console.log(`${name} = '${value}' isParam: ${isParam}`);

                    // Fix string to remove any unecessary information
                    if (value) {

                        if (value.includes(ignore)) {
                            var open = value.indexOf("<!");
                            var close = value.indexOf(">");
                            value = value.substring(0, open) + value.substring(close + 1, value.length);
                        }
                        if (value.includes("[[")) {

                            var open = value.indexOf("[[");
                            while (open > 0) {

                                var close = value.indexOfAfter("]]", open);
                                var link = value.substring(open + 3, close+1);
                                link = link.replaceAll(" ", "_");

                                value = value.replace("(", "");
                                value = value.replace(")", "");
                                value = value.substring(0, open) + value.substring(close + 3, value.length);

                                // Skip category links
                                var linkFilter = [ "|Trial", "|Event", ];
                                if (!linkFilter.find((f) => { return link.includes(f)})) {
                                    value += wikiEndpoint + link + "\n";
                                }
                                
                                open = value.indexOf("[[");
                            }
                        }
                        if (value.includes("Unstackable")) {
                            value = "Unstackable Materia";
                        }
                    }

                    var isParam = equipParameters.includes(name)
                    var isParsable = equipFields.includes(name);
                    if (value && !value.includes(ignore) &&
                        (isParam || isParsable)) {
                        
                        var notEmpty = /\S/.test(value);
                        
                        if (notEmpty) {

                            nodes[nodes.length] = {
                                name: name,
                                value: value,
                                inline: (name !== "Effect")
                            }
                        }
                    }
                    
                    match = valueMultiLineRegexp.exec(content);
                }

                if (other) {
                    nodes[nodes.length] = {
                        name: "Similar Results",
                        value: other,
                    }
                }
                
                console.log(nodes);

                callback(imgurl, pageName, nodes);
            });
        });
    });
}
function queryWikiWithSearch(search, callback) {
    wikiClient.search(search, (err, results) => {
        if (err) {
            console.log(err);
            return;
        }
        
        var batch = results.slice(0, 5);
        var fields = [{
            name: "Results For " + search,
            value: "Nothing Found" 
        }];
        fields[0].value = convertTitlesToLinks(batch);

        callback(fields);
    });
}

function convertTitlesToLinks(batch) {

    var value = "";
    batch.forEach(function (page) {
        console.log("converTitle: " + page.title);
        var title = page.title.replaceAll(" ", "_")
        value += wikiEndpoint + title + "\n";
    })

    return value;
}

function validatePage(search, callback) {
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            callback(false);
            return;
        }

        if (redirect) {
            console.log("Redirect Info: ");
            console.log(redirect);
        }
        
        const firstLine = content.indexOf("Unit Infobox");
        if (firstLine < 0) {
            const redirectRegex = /(?:.*)\[(.*)\]]/g;
            const page = redirectRegex.exec(content);
            console.log("Redirect To: " + page[1]);
            validatePage(page, callback);
            return;
        }

        callback(true);
    });
}
function validateEmote(emote) {

    var file = null;
    const types = config.filetypes();
    for (var i = 0; i < types.length; i++) {
        
        var filename = "emotes/" + emote + types[i];
        if (fs.existsSync(filename)) {
            file = filename
            break;
        }
    }

    return file;
}

// Response
function respondSuccess(receivedMessage) {
    const serverId = receivedMessage.guild.id;

    receivedMessage.guild.emojis.forEach(customEmoji => {
        if (customEmoji.name === config.getSuccess(serverId)) {
            receivedMessage.react(customEmoji)
        }
    });
}
function respondFailure(receivedMessage) {
    const serverId = receivedMessage.guild.id;

    receivedMessage.guild.emojis.forEach(customEmoji => {
        if (customEmoji.name === config.getFailure(serverId)) {
            receivedMessage.react(customEmoji)
        }
    });
}

client.on('message', (receivedMessage) => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user) {
        return
    }

    const content = receivedMessage.content;
    const serverId = receivedMessage.guild.id;
    const prefix = config.getPrefix(serverId);

    if (!content.startsWith(prefix)) {
        handleReactions(receivedMessage);
        return;
    }

    try {
        
        var copy = content;
        var parameters = [];
        if (content.startsWith(`${prefix}unit`)) {

            var loaded = getQuotedWord(copy);
            while (loaded) {
                console.log("Loaded Word");
                console.log(loaded);
                copy = copy.replace(`\"${loaded}\"`, "");
                loaded = toTitleCase(loaded.toLowerCase());
                parameters[parameters.length] = loaded;
                loaded = getQuotedWord(copy);
            }
            console.log("Loaded Parameters");
            console.log(parameters);
            
            copy = copy.trim();
            console.log("Copy: " + copy);
        }

        var split = getCommandString(copy, prefix);
        const search = getSearchString(`${prefix}${split}`, copy);
        if (!search) {
            throw split;
        }

        //console.log("getCommandString: " + split);
        //console.log("getSearchString: " + search);
        var command = "handle" + split + "(receivedMessage, search, parameters)";

        console.log("Running Command: " + command);
        eval(command);
    } catch(e) {
        console.log(e);
        console.log(`No search terms found for "${e}", run other commands: `);
        try{
            console.log("\nTrying Backup Command: " + "handle" + e + "(receivedMessage)");
            eval("handle" + e + "(receivedMessage)");
        }
        catch (f) {
            console.log(f + " (doesn't exist)");
            handleEmote(receivedMessage, prefix);
        }
    }
})

client.on('messageDelete', (deletedMessage) => {
    console.log("Message Deleted");
    console.log(deletedMessage.id);

    for(var i = 0; i < botMessages.length; i++) {
        var msg = botMessages[i];

        if (msg.received === deletedMessage.id) {
            var sent = deletedMessage.channel.fetchMessage(msg.sent)
                .then(sent => {
                    if (sent) {
                        console.log("Deleted Message");
                        sent.delete();
        
                        botMessages.splice(i, 1);
                    }
                })
                .catch(console.error);
            break;
        }
    }
});

function getQuotedWord(str) {
                
    if (str.replace(/[^\""]/g, "").length < 2) {
        return null;
    }

    var start = str.indexOf("\"");
    var end = str.indexOfAfterIndex("\"", start+1);
    var word = str.substring(start+1, end);
    console.log(start)
    console.log(end);
    console.log("Quoted Word: " + word);

    if (word.empty()) {
        return null;
    }

    return word;
}
function downloadFile(name, link, callback) {
    var ext = link.substring(link.lastIndexOf("."), link.length);
    if (!config.filetypes().includes(ext)) {
        console.log("Invalid img URL");
        return;
    }

    const file = fs.createWriteStream("emotes/" + name + ext);
    const request = http.get(link, function(response) {
        response.pipe(file);
        callback("success");
    });
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

// Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click to Reveal Token"
bot_secret_token = "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg"
bot_secret_token_test = "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

client.login(bot_secret_token)

/**
    { "name": "Name",		"value": "9S" 			,	"inline": true },
    { "name": "Limited",	"value": "Yes" 			,	"inline": true },
    { "name": "Exclusive", 	"value": "No" 			,	"inline": true },
    { "name": "Job",		"value": "YoRHa Troop" 	,	"inline": true },
    { "name": "Role",		"value": "Debuffer" 	,	"inline": true },
    { "name": "Origin",		"value": "NieR:Automata",	"inline": true },
    { "name": "Gender",		"value": "Male" 		,	"inline": true },
    { "name": "Race",		"value": "Machina" 		,	"inline": true },
    { "name": "Number",		"value": "776, 777, 778",	"inline": true },
    { "name": "Trust",		"value": "Pod 153" 		,	"inline": true },
    { "name": "Rarity",		"value": "★★★★✫✫" 		,	"inline": true }



{
  "content": "this `supports` __a__ **subset** *of* ~~markdown~~ 😃 ```js\nfunction foo(bar) {\n  console.log(bar);\n}\n\nfoo(1);```",
  "embed": {
    "title": "title ~~(did you know you can have markdown here too?)~~",
    "description": "this supports [named links](https://discordapp.com) on top of the previously shown subset of markdown. ```\nyes, even code blocks```",
    "url": "https://discordapp.com",
    "color": 16765404,
    "thumbnail": {
      "url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "author": {
      "name": "Jimbot",
      "url": "https://discordapp.com",
      "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "fields": [
		{ "name": "Name",		"value": "9S" 			,	"inline": true },
		{ "name": "Limited",	"value": "Yes" 			,	"inline": true },
		{ "name": "Exclusive", 	"value": "No" 			,	"inline": true },
		{ "name": "Job",		"value": "YoRHa Troop" 	,	"inline": true },
		{ "name": "Role",		"value": "Debuffer" 	,	"inline": true },
		{ "name": "Origin",		"value": "NieR:Automata",	"inline": true },
		{ "name": "Gender",		"value": "Male" 		,	"inline": true },
		{ "name": "Race",		"value": "Machina" 		,	"inline": true },
		{ "name": "Number",		"value": "776, 777, 778",	"inline": true },
		{ "name": "Trust",		"value": "Pod 153" 		,	"inline": true },
		{ "name": "Rarity",		"value": "★★★★✫✫" 		,	"inline": true }
    ]
  }
}
 */