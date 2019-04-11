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
const valueRegexp = /(.*)=\s*(.*)/g;
const cheerio = require('cheerio');
const botPrefix = "!";
const unitQueryPrefix = `${botPrefix}unit`;
const equipQueryPrefix = `${botPrefix}equip`;

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

function sendToChannel(msg, id) {
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
    //getMainChannelID()

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
    var search = "Beastlord";
    getEquipmentPageID(search, function (id) {
        if (!id) {
            console.log("Could not find page: " + search);
            return;
        }

        wikiClient.getArticle(id, function (err, content, redirect) {
            if (err) {
                console.log(err);
                return;
            }
            console.log(content);
            console.log("\n\n-----\n\n");

            wikiClient.parse( content, 'search', function ( err, html, images ) {
                if ( err ) {
                    console.error( err );
                    return;
                }
            
                log( 'HTML');
                log( html );
                log( 'Images');
                log( images );
            });
            
            var regex = /\|(.*?)\n/g;
            var match = regex.exec(content);
            //var matched = match[1];
            console.log(match);
            //console.log(matched);
            
            var ind = 0;
            var nodes = [];
            while (match != null) {

                if (match[1][match[1].length - 1] === "=") {
                    console.log("No Value for: " + match[1]);
                }
                
                nodes[nodes.length] = {
                    name: match[1].replace("\t", ""),
                    value: match[2]
                }
                
                //console.log(match)
                match = overviewRegexp.exec(content);
                ind++;
            }
            
            console.log(nodes);
            

            wikiClient.getImageInfo(`Icon-${search}.png`, function (err, info) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log(info);
            });
        });
    });
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
    wikiClient.getPagesInCategory( `Equipment`, function ( err, redirect, content ) {
		if (err) {
			console.log(err);
			return;
        }
 
		console.log(redirect);
		console.log(content);
       
        var id = null;
        for (var i = 0; i < redirect.length; i++) {
            var page = redirect[i];
            if (page.title === search) {
                id = page.pageid;
                break;
            }
        }
        
        callback(id);
	});
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
function toTitleCase(text) {
    return text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
}
function handleQueryRequest(receivedMessage) {

    var ind = unitQueryPrefix.length + 1;
    var search = receivedMessage.content.slice(ind, receivedMessage.content.length);
    search = toTitleCase(search);
    search = search.replaceAll(" ", "_");
 
    console.log("Searching for: " + search);

    queryWiki(search, function (info, imgurl, description) {
            
        var fields = parseUnitOverview(info);
        
        receivedMessage.channel.send({embed: {
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
            fields: fields,
            timestamp: new Date(),
            footer: {
                icon_url: client.user.avatarURL,
                text: "Yahoo! here's your result!"
            }
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
            //queryWiki(page, callback);
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
    var match = overviewRegexp.exec(overview);
    while (match != null) {

        fields[fields.length] = {
            name: match[1],
            value: match[2],
            inline: true
        }

        match = overviewRegexp.exec(overview);
    }

    return fields;
}

function handleEquipQueryRequest(receivedMessage) {

    var ind = equipQueryPrefix.length + 1;
    var search = receivedMessage.content.slice(ind, receivedMessage.content.length);
    search = toTitleCase(search);
    search = search.replaceAll(" ", "_");

    console.log(search);
}
function queryWikiForPageWithCategory(category, title, callback) {

}

client.on('message', (receivedMessage) => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user) {
        return
    }
    const content = receivedMessage.content;
    if (receivedMessage.content.startsWith("!unit")) {
        handleQueryRequest(receivedMessage);
    } else if (content.startsWith(equipQueryPrefix)) {
        handleEquipQueryRequest(receivedMessage);
    }
  
    if (content.toLowerCase() === "dab") {

        // Provide a path to a local file
        const localFileAttachment = new Discord.Attachment('dab.png')
        receivedMessage.channel.send(localFileAttachment)
    } else if (receivedMessage.content.includes("hi cyra")) {

        receivedMessage.guild.emojis.forEach(customEmoji => {
            if (customEmoji.name === "hinayay" ||
            customEmoji.name === "2BLewd" ||
            customEmoji.name === "hugpweez") {
               
                receivedMessage.react(customEmoji)
            }
        })
    } else if (receivedMessage.content.includes("hi jake")) {
        receivedMessage.react('🌹')
        receivedMessage.react('🛋')
    }
})

// Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click to Reveal Token"
bot_secret_token = "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg"
bot_secret_token_test = "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

client.login(bot_secret_token_test)