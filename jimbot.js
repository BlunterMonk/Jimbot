const Discord = require('discord.js')
const client = new Discord.Client()
const request = require('request');
const wiki = require('nodemw');
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
// (?:\<.*\>) for commented elements
////(.*)=\s*(.*)/g;
const cheerio = require('cheerio');
const botPrefix = "!";
const unitQueryPrefix = `${botPrefix}unit`;
const equipQueryPrefix = `${botPrefix}equip`;
const imageEndpoint = `https://exvius.gamepedia.com/Special:FilePath/`;

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

let imageArray = [];

function getBatch( start ) {
    wikiClient.getImagesFromArticle( start, function ( err, data, next ) {
        imageArray = imageArray.concat( data );
        if ( next ) {
            console.log( `Getting next batch (starting from ${next})...` );
            getBatch( next );
        } else {
            console.log( JSON.stringify( imageArray, null, '\t' ) );
            console.log( `Image count: ${imageArray.length}` );
        }
    } );
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
    /*wikiClient.getCategories(function (err, cats) {
        console.log('All categories:');
        console.log(JSON.stringify(cats));
    });*/

    /*
    wikiClient.search( '2b', (err, results) => {
        console.log( 'Search results:')
        console.log(results);
        console.log("search error:")
        console.log(err)
    });
    */
})

function getEquipmentPageID(search, callback) {
    /*
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            return;
        }
        console.log("getArticle Content");
        console.log(content);
        if (redirect) {
            
            console.log("Redirect Info: ");
            console.log(redirect);
        }
    });
    */


    wikiClient.getPagesInCategory( `Items`, function ( err, redirect, content ) {
		if (err) {
			console.log(err);
			return;
        }

        // TODO: fix category search for pages
 
		//console.log(redirect);
		//console.log(content);
       
        var id = null;
        var name = search;
        for (var i = 0; i < redirect.length; i++) {
            var page = redirect[i];

            var title = page.title.toLowerCase();
            search = search.toLowerCase();

            if (!title.startsWith(search[0])) {
                continue;
            }

            title = title.replaceAll(" ", "_");

            //console.log(`Comparing: ${title} -vs- ${search}`);
            /*
            if (title.startsWith(search[0])) {
                console.log(page);
            }
            */
            if (title === search) {
                id = page.pageid;
                name = page.title;
                break;
            }
        }
        
        callback(id, name);
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
function handleQueryRequest(receivedMessage) {

    const search = getSearchString(unitQueryPrefix, receivedMessage.content);
    if (!search) {
        console.log("Empty Search");
        return;
    }
 
    console.log("Searching for: " + search);

    queryWiki(search, function (info, imgurl, description) {
            
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

function queryWiki(search, callback) {
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
            console.log(content);
            const redirectRegex = /(?:.*)\[(.*)\]]/g;
            const page = redirectRegex.exec(content);
            console.log(page[1]);
            queryWiki(page, callback);
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
            if (description.length > 150) {
                description = description.substring(0, 200);
                description += "...";
            }

            callback(overview, imgurl, description);
        });
    });
}
function parseUnitOverview(overview) {
            
    var fields = [];
    var parameters = [
        'Name', "Limited", "Exclusive", "Job", "Role", "Origin", 
        "Gender", "STMR", "Trust", "Race", "Number"
    ]
    var match = overviewRegexp.exec(overview);
    var minR = null;
    var maxR = null;


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

    fields[fields.length] = {
        name: "Rarity",
        value: `${minR} / ${maxR}`,
        inline: true
    }

    return fields;
}

function handleEquipQueryRequest(receivedMessage) {

    const search = getSearchString(equipQueryPrefix, receivedMessage.content);
    if (!search) {
        console.log("Empty Search");
        return;
    }

    console.log(`Searching for: ${search}...`);
    queryWikiForPageWithCategory(search, function(imgurl, pageName, nodes) {
        pageName = pageName.replaceAll(" ", "_");
        console.log(`Page Found: ${pageName}`);

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
                title: search,
                fields: nodes,
                url: "https://exvius.gamepedia.com/"+pageName
            }
        });
    })
}
function queryWikiForPageWithCategory(search, callback) {

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
            //console.log(content);
            //console.log("\n\n-----\n\n");

            wikiClient.parse( content, 'search', function ( err, xml, images ) {
                if ( err ) {
                    console.error( err );
                    return;
                }
            
                //log( 'HTML');
                //log( html );
                log( 'Images');
                log( images );

                
                const $ = cheerio.load(xml);
                const imgurl = $('.mw-parser-output').find('img').attr('src');
                const links = $('.mw-parser-output').children('a');
                //console.log("Links on Page");
                //console.log(links.length);
                
                var regex = /\|(.*?)\n/g;
                var match = regex.exec(content);
                //console.log(match);
                
                var parameters = [
                    'ATK', 'DEF', 'MAG', 'SPR', 'HP', 'MP'
                ]
                var fields = [
                    'Name', "Type", "Desc", "Reward", "Resist", "Effect", 
                    "Trust", "STMR", "Element", "Ability", "Notes"
                ]
                var ignore = "<!";
                var nodes = [];
                while (match != null) {
                    
                    if (match[1][match[1].length - 1] === "=") {
                        console.log("No Value for: " + match[1]);
                    }

                    var name = match[1].replace("\t", "").capitalize();
                    name = name.replaceAll(" ", "");
                    var value = match[2];

                    console.log(`${name} = '${value}' isParam: ${isParam}`);

                    var isParam = parameters.includes(name)
                    if (value && !value.includes(ignore) &&
                        (isParam || fields.includes(name))) {
                        
                        var notEmpty = /\S/.test(value);
                        console.log(` ValueLength: ${value.length}`);
                        /*if (isParam && value.empty()) {
                            console.log("Empty Parameter");
                            value = "0";
                            notEmpty = true;
                        }*/
                        
                        if (notEmpty) {

                            nodes[nodes.length] = {
                                name: name,
                                value: value.limitTo(128),
                                inline: true
                            }
                        }
                        
                    }
                    
                    match = valueRegexp.exec(content);
                }
                
                console.log(nodes);
                //console.log(imgurl);

                callback(imgurl, pageName, nodes);
            });
        });
    });
}

client.on('message', (receivedMessage) => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user) {
        return
    }
    const content = receivedMessage.content;
    if (!content.startsWith(botPrefix)) {
        return;
    }

    if (receivedMessage.content.startsWith("!unit")) {
        handleQueryRequest(receivedMessage);
    } else if (content.startsWith(equipQueryPrefix)) {
        handleEquipQueryRequest(receivedMessage);
    }
  
    const commandDab = `${botPrefix}dab`;
    const commandGL = `${botPrefix}gl`;
    const commandCyra = `${botPrefix}hi cyra`;
    const commandJake = `${botPrefix}hi jake`;
    switch (content.toLowerCase()) {

        case commandDab: 
            receivedMessage.channel.send(new Discord.Attachment('dab.png'))
            break;
        case commandGL:
            receivedMessage.channel.send(new Discord.Attachment('believe.png'))
            break;
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
})

// Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click to Reveal Token"
bot_secret_token = "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg"
bot_secret_token_test = "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

client.login(bot_secret_token)