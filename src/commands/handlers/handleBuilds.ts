//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../../util/string-extension.js";
import * as Discord from "discord.js";
import * as fs from "fs";
import * as Build from "../../ffbeequip/build.js";
import * as BuildImage from "../../ffbeequip/buildimage.js";
import { log, error } from "../../global.js";
import { Cache } from "../../cache/cache.js";
import { Client } from "../../discord.js";
import { Builder } from "../../ffbeequip/builder.js";
import { getUnitKey, getUnitNameFromKey, buildBuildImageEmbed, buildBuildImage } from "./common.js";
import { start } from "repl";

////////////////////////////////////////////////////////////////////

const sheetURL = "https://docs.google.com/spreadsheets/d/1RgfRNTHJ4qczJVBRLb5ayvCMy4A7A19U7Gs6aU4xtQE";
const whaleSheet = "https://docs.google.com/spreadsheets/d/1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";
const furculaUserID = "344500120827723777";
const shadoUserID   = "103785126026043392";

export async function sendBuildText(receivedMessage: Discord.Message, url) {

    Build.CreateBuildsFromURL(url)
    .then(builds => {
        var build = builds[0];
        var name = getUnitNameFromKey(build.unitID).replaceAll("_", " ").toTitleCase(" ");
        var text = build.getText();
        if (!text) {
            Client.send(receivedMessage, "Sorry hun, something went wrong.");
            error("Could not build text");
            return;
        }

        var desc = text.text.replaceAll("\\[", "**[");
        desc = desc.replaceAll("\\]:", "]:**");

        var embed = <any>{
            title: `Build: ${name}`,
            url: url,
            description: desc,
            thumbnail: {
                url: `https://ffbeequip.com/img/units/unit_icon_${build.unitID}.png`
            }
        }

        // log(text);
        Client.sendMessage(receivedMessage, embed);
    }).catch(e => {
        error(e);
    });
}

export async function sendBuild(receivedMessage: Discord.Message, url: string, unitIndex: number, calculation, style: string, force = false): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        var fail = function(e) {
            Client.send(receivedMessage, "Sorry hun, something went wrong.");
            error("Could not build image");
            reject(e);
        }

        var sendImage = function(imagePath) {
            const attachment = new Discord.Attachment(imagePath, 'build.png');
            var embed = new Discord.RichEmbed()
            embed.setImage(`attachment://build.png`)
                .attachFile(attachment);

            if (calculation) {
                var text = `**[${calculation.name.trim()}](${calculation.wiki})\n[(sheet)](${(calculation.source == "furcula") ? sheetURL : whaleSheet}) - [(wiki)](${calculation.wiki}) - [(build)](${calculation.url})**\n`;
            
                embed.setDescription(text);

                // log(text);
                Client.sendMessageWithAuthor(receivedMessage, embed, (calculation.source == "furcula") ? furculaUserID : shadoUserID);
            } else {
                Client.sendMessage(receivedMessage, embed);
            }

            resolve(url);
        }

        var id = Build.getBuildID(url);
        if (id == null)
            return;
        
        let p = `./tempbuilds/full/${id.slice(1, id.length)}.png`;
        if (fs.existsSync(p)) {
            sendImage(p);
        } else if (style == "full") {
            Client.send(receivedMessage, "Ok let me get that for you, just a minute!")
            .then(m =>{
                buildBuildImage(url, style, unitIndex)
                .then(sendImage)
                .catch(fail);
            })
            .catch(fail);
        } else {
            buildBuildImage(url, style, unitIndex)
            .then(sendImage)
            .catch(fail);
        }
    });
}

////////////////////////////////////////////////////////////////////

export async function handleBuildhelp(receivedMessage: Discord.Message) {
    var data = fs.readFileSync("./data/help/help-damage.json", "ASCII");
    var readme = JSON.parse(data);

    var embed = {
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

export async function handleStats(receivedMessage: Discord.Message, search: string, parameters: string[], isCompact: boolean) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    sendBuild(receivedMessage, search, ind, null, "stats")
    .catch((e) => {
        error("Build Failed: ", e);
    });
}


export async function handleBuild(receivedMessage: Discord.Message, search: string, parameters: string[], style: string = "") {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var calculation = null;
    var unitID = getUnitKey(search);
    if (unitID) {
        var calc = Cache.getUnitCalculation("furcula", search)
        if (calc) {
            calc.source = "furcula";
            calculation = calc;
            search = calc.url;
            log(`Loading Unit Calculation Build: ${calc.url}`);
        }
    }
    
    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    var buildStyle = (style && !style.empty()) ? style : "full";
    sendBuild(receivedMessage, search, ind, calculation, buildStyle)
    .then(m => {
        if (calculation && unitName.toLowerCase().replaceAll(" ", "_") != calculation.name.toLowerCase().replaceAll(" ", "_"))
            Client.send(receivedMessage, "```" + `Sorry I couldn't find "${unitName}" in Furcula's damage sheet, maybe you meant ${calc.name}?` + "```");
    })
    .catch((e) => {
        error("Build Failed: ", e);
    });
}

export async function handleBuildcompact(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleBuild(receivedMessage, search, parameters, "compact");
}

export async function handleBuildbox(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleBuild(receivedMessage, search, parameters, "box");
}

export async function handleBis(receivedMessage: Discord.Message, search: string, parameters: string[], style: string) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");
    var original = search;
    var calc = Cache.getUnitCalculation("whale", search)
    if (!calc) {
        Client.send(receivedMessage, "Sorry, no build was found for " + search);
        return;
    }

    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    calc.source = "whale";

    log(`Loading Unit Build: ${calc.url}`);
    sendBuild(receivedMessage, calc.url, ind, calc, (style && !style.empty()) ? style : "full")
    .then(m => {
        if (original.toLowerCase().replaceAll(" ", "_") != calc.name.toLowerCase().replaceAll(" ", "_"))
            Client.send(receivedMessage, "```" + `Sorry I couldn't find "${original}" in ShadoWalker's damage sheet, maybe you meant ${calc.name}?` + "```");
    })
    .catch((e) => {
        error(`Unable to find build: ${search}`);    
    });
}

export async function handleBiscompact(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleBis(receivedMessage, search, parameters, "compact");
}

export async function handleBisbox(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleBis(receivedMessage, search, parameters, "box");
}

export async function handleBuildtext(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitName = search;
    unitName = unitName.toTitleCase("_").replaceAll("_", "%20");

    var unitID = getUnitKey(search);
    if (unitID) {
        var calc = Cache.getUnitCalculation("furcula", search)
        if (calc) {
            search = calc.url;
            log(`Loading Unit Build: ${calc.url}`);
        }
    }

    sendBuildText(receivedMessage, search);
}

export async function handleBistext(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }

    var unitID = getUnitKey(search);
    if (!unitID)
        return;

    var calc = Cache.getUnitCalculation("whale", search)
    if (calc) {
        search = calc.url;
        log(`Loading Unit Build: ${calc.url}`);
    }

    sendBuildText(receivedMessage, search);
}

export async function handleTeam(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    if (search == "help") {
        handleBuildhelp(receivedMessage);
        return;
    }
    
    Build.requestBuildData(search)
    .then(response => {
        let d = response.buildData;
        
        var sendImg = function(p) {
            const attachment = new Discord.Attachment(p, 'build.png');
            var embed = new Discord.RichEmbed()
                    .attachFile(attachment)
                    .setImage(`attachment://build.png`);
                
            if (parameters && parameters.length > 0 && !parameters[0].empty()) {
                embed.setTitle(parameters[0])
                     .setURL(search);
            }

            Client.send(receivedMessage, `Hey <@${receivedMessage.author.id}>, build finished!`);
            Client.sendMessage(receivedMessage, embed);
        }

        let imgPath = `./tempbuilds/${response.id}.png`;
        if (fs.existsSync(imgPath)) {
            sendImg(imgPath);
            return;
        }

        Client.send(receivedMessage, "oof, ok, this may take a while!")
        .then(m => {

            let team : Build.Build[] = d.units.map((buildData, index) => {
                return Build.CreateBuild(response.id, response.region, buildData);
            });
            if (team.length > 5) {
                team = team.slice(0, Math.min(5, team.length-1));
            }

            BuildImage.BuildTeamImage(imgPath, team).then(sendImg).catch(e => {
                Client.send(receivedMessage, "Sorry hun, something went wrong.");
                error("Could not build image");
            })
        });

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