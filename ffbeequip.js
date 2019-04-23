const Discord = require("discord.js");
const request = require("request");
const fs = require("fs");
const cheerio = require("cheerio");
const https = require("https");
const http = require("http");

var buildURL = "http://ffbeEquip.com/builder.html?server=GL#beffeb70-4ba9-11e9-9e10-93b8df10f245";
requestBuild();

function requestBuild(url, callback) {

    var buildId = "beffeb70-4ba9-11e9-9e10-93b8df10f245";
    
    request(
        { uri: `https://firebasestorage.googleapis.com/v0/b/ffbeequip.appspot.com/o/PartyBuilds%2F${buildId}.json?alt=media` },
        function(error, response, body) {
            const $ = cheerio.load(body);
            console.log(body)
        }
    );

}