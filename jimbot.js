const Discord = require('discord.js')
const client = new Discord.Client()
const request = require('request');
const wiki = require('nodemw');
const fs = require('fs');
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
const cheerio = require('cheerio');
const botPrefix = "!";
const unitQueryPrefix = `${botPrefix}unit`;
const equipQueryPrefix = `${botPrefix}equip`;
const quoteQueryPrefix = `${botPrefix}quote`;
const searchQueryPrefix = `?search`;
const imageEndpoint = `https://exvius.gamepedia.com/Special:FilePath/`;
const unicodeStar = "★";
const unicodeStarOpen = "✫";
const descCharLimit = 128;
const wikiEndpoint = "https://exvius.gamepedia.com/";
const config = require('./config.ts');
console.log(config.equipmentCategories);

// Lookup Tables

const equipParameters = [
    'ATK', 'DEF', 'MAG', 'SPR', 'HP', 'MP'
]
const equipFields = [
    /*'Name',*/ "Type", /*"Desc",*/ "Reward", "Resist", "Effect", 
    "Trust", "STMR", "Element", "Ability", "Notes"
]

// Commands
const commandDab = `${botPrefix}dab`;
const commandGL = `${botPrefix}gl`;
const commandCyra = `${botPrefix}hi cyra`;
const commandJake = `${botPrefix}hi jake`;


//console.log(equipmentCategories);

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
        console.log(" - " + guild.name)

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

})

function getEquipmentPageID(search, callback) {

    // TODO: fix category search for pages
    config.equipmentCategories.forEach(function (category) {
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

                title = title.replaceAll(" ", "_");
                if (title === search) {
                    id = page.pageid;
                    name = page.title;
                    break;
                }
            }
            
            callback(id, name);
            if (id) {
                callback = null;
            }
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

function getSearchString(prefix, msg) {

    var ind = prefix.length + 1;
    var search = msg.slice(ind, msg.length);

    if (search.empty()) {
        return null;
    }
    
    search = toTitleCase(search);
    search = search.replaceAll(" ", "_");
    return search;
}
function toTitleCase(text) {
    return text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
}

function handleUnitQueryRequest(receivedMessage) {

    const search = getSearchString(unitQueryPrefix, receivedMessage.content);
    if (!search) {
        console.log("Empty Search");
        return;
    }
 
    console.log("Searching Units For: " + search);
    queryWikiForUnit(search, function (info, imgurl, description) {
            
        var fields = parseUnitOverview(info);
        
        receivedMessage.channel.send({
            embed: {
                color: pinkHexCode,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                thumbnail: {
                    url: imgurl,
                },
                title: search,
                url: "https://exvius.gamepedia.com/"+search,
                description: description,
                fields: fields
            }
        });
    });
}
function handleEquipQueryRequest(receivedMessage) {

    const search = getSearchString(equipQueryPrefix, receivedMessage.content);
    if (!search) {
        console.log("Empty Search");
        return;
    }

    console.log(`Searching Equipment For: ${search}...`);
    queryWikiForEquipment(search, function(imgurl, pageName, nodes) {
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
                title: search.replaceAll("_", " "),
                fields: nodes,
                url: "https://exvius.gamepedia.com/"+pageName
            }
        });
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
function handleSearch(receivedMessage) {
    
    const search = getSearchString(searchQueryPrefix, receivedMessage.content);
    if (!search) {
        console.log("Empty Search");
        return;
    }

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
        });
    })
}


function parseUnitOverview(overview) {
            
    var fields = [];
    var parameters = [
        /*'Name', */"Limited", "Exclusive", "Job", "Role", "Origin", 
        "Gender", "STMR", "Trust", "Race", "Number"
    ]
    var match = overviewRegexp.exec(overview);
    var minR = null;
    var maxR = null;
    // ★★★★★✫✫

    while (match != null) {

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
        
        if (parameters.includes(name)) {
            fields[fields.length] = {
                name: name,
                value: value,
                inline: (name !== "Name")
            }
        }

        match = overviewRegexp.exec(overview);
    }

    if (minR) {
        fields[fields.length] = {
            name: "Rarity",
            value: getRarityString(minR, maxR),
            inline: true
        }
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
            queryWikiForUnit(page, callback);
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

            const $ = cheerio.load(xml);
            const imgurl = $('.big-pixelate').attr('src');
            var description = $('.mw-parser-output').children('p').first().text();
            description = description.limitTo(descCharLimit);

            callback(overview, imgurl, description);
        });
    });
}
function queryWikiForEquipment(search, callback) {

    getEquipmentPageID(search, function (id, pageName) {
        if (!id) {
            console.log("Could not find page: " + pageName);
            return;
        }

        wikiClient.getArticle(id, function (err, content, redirect) {
            if (err) {
                console.log(err);
                return;
            }
            
            //console.log("QUERY CONTENT:\n");
            //console.log(content);
            //console.log("\n\n-----\n\n");

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
                    
                    if (match[1][match[1].length - 1] === "=") {
                        console.log("No Value for: " + match[1]);
                    }

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
                                var link = value.substring(open + 2, close+1);
                                link = link.replaceAll(" ", "_");

                                value = value.substring(0, open) + value.substring(close + 3, value.length);
                                
                                // Skip category links                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
                                if (!link.includes("|Trial")) {
                                    console.log("Link: " + link);
                                    value += wikiEndpoint + link;
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
        var value = "";
        batch.forEach(function (page) {
            var title = page.title.replaceAll(" ", "_")
            value += wikiEndpoint + title + "\n";
            fields[0] = {
                name: "Results For " + search,
                value: value 
            }
        })

        callback(fields);
    });
}

client.on('message', (receivedMessage) => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user) {
        return
    }

    const content = receivedMessage.content;
    if (content.startsWith(searchQueryPrefix)) {
        handleSearch(receivedMessage);
        return;
    } else if (!content.startsWith(botPrefix)) {
        handleReactions(receivedMessage);
        return;
    }

    if (content.startsWith(unitQueryPrefix)) {
        handleUnitQueryRequest(receivedMessage);
    } else if (content.startsWith(equipQueryPrefix)) {
        handleEquipQueryRequest(receivedMessage);
    } else if (content.startsWith(quoteQueryPrefix)) {
        var s = getSearchString(quoteQueryPrefix, content).toLowerCase();
        console.log(s);
        switch (s)
        {
            case "morrow":
                receivedMessage.channel.send(new Discord.Attachment('morrow0.png'))
                break;
            default:
                break;
        }
    } else {

        var img = content.toLowerCase().replace(botPrefix, "");
        var filename = `${img}.png`;
        if (fs.existsSync(filename)) {
            var Attachment = new Discord.Attachment(filename);
            if (Attachment) {
                receivedMessage.channel.send(Attachment)
            }
        } else {
            console.log(filename + " doesn't exist");
        }
    }
})

// Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click to Reveal Token"
bot_secret_token = "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg"
bot_secret_token_test = "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

client.login(bot_secret_token_test)

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