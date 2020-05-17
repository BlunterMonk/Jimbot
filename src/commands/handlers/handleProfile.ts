//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../../util/string-extension.js";
import "../helper.js";
import * as Discord from "discord.js";
import * as fs from "fs";
import * as Build from "../../ffbeequip/build.js";
import * as BuildImage from "../../ffbeequip/buildimage.js";
import { log, error, debug } from "../../global.js";
import { Profiles, UserProfile } from "../../config/profiles.js";
import { Client } from "../../discord.js";
import { getMentionID, getRandomInt } from "../helper.js";
import { buildBuildImageEmbed } from "./common.js";
import { handleTeam } from "./handleBuilds.js";

////////////////////////////////////////////////////////////////////

const pinkHexCode = 0xffd1dc;
const welcomePhrases = [
    "Hurray, a new cutie patootie, welcome %v!",
    "Banzai, atarashī kawaī %v ni yōkoso!",
    "Bravo, bienvenue à bord d'une nouvelle %v mignonne!",
    "Hurra, bienvenido a bordo del nuevo %v lindo!",
    "Hurra, willkommen an Bord der neuen süßen %v!",
];

function buildProfileEmbed(profile: UserProfile, user): Promise<Discord.MessageEmbed> {

    let text = "";
    let keys = Object.keys(profile.builds);
    keys = keys.sort();
    let status = (profile.status) ? profile.status : "";

    var embed = new Discord.MessageEmbed()
            .setColor(pinkHexCode)
            .setImage(`attachment://build.png`)
            .setThumbnail(user.avatarURL);

    text += "**__Status:__** " + status.capitalize() + "\n\u200B\n";
    text += (keys.length > 0) ? "**__Builds:__**\n\n" : "**__No Builds Added__**\n\n";

    // Add builds
    let tempText = "";
    keys.forEach((key, i) => {
        let n = key.replaceAll("_", " ").toTitleCase(" ");
        let u = profile.builds[key];
        tempText += `[${n}](${u})\n`;
    });
    if (tempText.length + text.length > 2000) {
        debug("Build text too long, removing links: ", tempText.length);

        tempText = "";
        keys.forEach((key, i) => {
            tempText += key.replaceAll("_", " ").toTitleCase(" ") + "\n";
        });
    }
    text += tempText + "\n";

    // Add username and friend code
    let name = (profile.nickname.empty()) ? user.username : profile.nickname.replaceAll("_", " ").toTitleCase(" ");
    let code = (profile.friendcode.empty()) ? "" : ": " + profile.friendcode.numberWithCommas();

    embed.setTitle(`${name}'s Profile${code}`)
         .setDescription(text);

    // add lead image
    let leadURL = profile.lead;
    if (!leadURL)
        return Promise.resolve(embed);

    embed.setDescription(text + "**__Lead:__**");

    return new Promise<Discord.MessageEmbed>((resolve, reject) => {
        Build.CreateBuildsFromURL(leadURL)
        .then(builds => {
            BuildImage.BuildImage(builds[0], "compact")
                .then(p => {
                    const attachment = new Discord.MessageAttachment(p, 'build.png');
                    embed.attachFiles([attachment]);

                    resolve(embed);
                })
                .catch((e) => {
                    error("Could not build lead image: ", e);
                    resolve(embed);
                });
        }).catch(reject);
    });
}

////////////////////////////////////////////////////////////////////

export function handleProfilehelp(receivedMessage: Discord.Message) {
    var data = fs.readFileSync("./data/help/help-profiles.json").toString();
    var readme = JSON.parse(data);

    var embed = {
        color: pinkHexCode,
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

export function handleProfile(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;
    let mention = getMentionID(search);
    if (mention) {
        log("Found mention: ", mention);
        id = mention;
    } else if (search && !search.empty()) {
        let newId = Profiles.getProfileID(search);
        if (!newId) {
            return;
        }

        log("Found User ID: ", newId, " from Nickname: ", search);
        id = newId;
    }

    let profile = Profiles.getProfile(id);
    if (!profile) {
        Client.send(receivedMessage, `oh, ${receivedMessage.author.username} baby, you gotta use "?Register" first 'kay?`);
        return;
    }

    log("Attempting to display profile for user: ", id);
    Client.fetchUser(id)
    .then(user => {
        buildProfileEmbed(profile, user)
        .then(embed => {
            Client.sendMessage(receivedMessage, embed);
        })
        .catch(error);
    }).catch(e => {
        error("Failed to fetch user information: ", e.message);
        Client.send(receivedMessage, "sorry, I messed up");
    })
}

export function handleFriend(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;
    let mention = getMentionID(search);
    if (mention) {
        id = mention;
    }
    let code = Profiles.getFriendCode(id);
    if (!code || code.empty()) {
        Client.send(receivedMessage, "looks like we aren't friends yet, sad...");
        return;
    }
    
    log("Friend Code success: (", id, "), Code: ", code);

    Client.send(receivedMessage, `${code}`);
}

export function handleUserbuild(receivedMessage: Discord.Message, search: string, parameters: string[], isCompact: boolean = false) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!parameters || parameters.length < 1) {
        debug(`User Build cancelled: ${username}(${id}), No parameter`);
        Client.send(receivedMessage, "hmm, you didn't tell me which build to give you")
    }

    let name = parameters[0].toLowerCase().replaceAll(" ", "_");
    let mention = getMentionID(search);
    if (mention) {
        id = mention;
    } else if (search && !search.empty()) {
        let newId = Profiles.getProfileID(search);
        if (!newId) {
            return;
        }

        log("Found User ID: ", newId, " from Nickname: ", search);
        id = newId;
    }
    let buildUrl = Profiles.getBuild(id, name);
    if (!buildUrl) {
        debug(`User Build cancelled: ${username}(${id}), No Build URL found with name: ${name}`);
        return;
    }

    name = name.replaceAll("_", " ").toTitleCase(" ");

    buildBuildImageEmbed(name, buildUrl, isCompact ? "compact" : "full")
    .then(embed => {
        log(`User Build success: ${username}(${id}), Build: ${buildUrl}`);
        Client.sendMessage(receivedMessage, embed);
    })
    .catch(e => {
        log(`User Build failed: ${username}(${id}), Error: `, e);
        Client.sendMessage(receivedMessage, "sorry, something went haywire in the mathamatification process");
    });
}

export function handleUserbuildcompact(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleUserbuild(receivedMessage, search, parameters, true)
}

export function handleMybuild(receivedMessage: Discord.Message, search: string, parameters: string[], isFull: boolean) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }
    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    let profile = Profiles.getProfile(id);
    if (!profile)
        return;
    var url = profile.builds[search];
    if (!url) {
        debug(`Mybuild cancelled: ${username}(${id}), Could not find build with name: ${search}`);
        return;
    }

    search = search.replaceAll("_", " ").toTitleCase(" ");
         
    var ind = 0;
    if (parameters && parameters.length > 0 && parameters[0].isNumber()) {
        ind = parseInt(parameters[0]);
        log("Parameter used for build: ", ind);
    }

    buildBuildImageEmbed(search, url, isFull ? "full" : "compact", ind)
    .then(embed => {
        log(`Mybuild success: ${username}(${id}), Build: ${search}(${url})`);
        Client.sendMessage(receivedMessage, embed);
    })
    .catch(error);
}

export function handleMybuildfull(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleMybuild(receivedMessage, search, parameters, true);
}

export function handleMyteam(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let profile = Profiles.getProfile(receivedMessage.author.id);
    if (!profile)
        return;

    var url = profile.builds[search];
    if (!url) {
        error("Could not find build with name: ", search, " for user: ", receivedMessage.author.id);
        return;
    }

    var name = search.replaceAll("_", " ").toTitleCase(" ");

    handleTeam(receivedMessage, url, [name]);
}


// PROFILE SETTINGS

export function handleRegister(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (Profiles.getProfile(id)) {
        Client.send(receivedMessage, "silly billy, you're already registered");
        return;
    }

    let code  = "";
    let name = "";
    if (search && !search.empty()) {
        search = search.replaceAll(",", "").trim();

        if (parameters.length > 0) {
            let n = parameters[0].toLowerCase().replaceAll(" ", "_");
            debug("Attempting to add nickname: ", n);
            if (Profiles.nicknameTaken(n)) {
                error(`Register cancelled: ${username}(${id}), Nickname in use: `, n);
                Client.send(receivedMessage, "seems like that nickname is already taken, try another ok?");
                return;
            } else {
                name = n;
            }
        } 
        
        let c = parseInt(search);
        debug("Attempting to add friend code: ", c);
        if (search.length > 9 || Number.isNaN(c) || !search.isNumber()) {
            error(`Register cancelled: ${username}(${id}), friend code invalid: `, c);
            Client.send(receivedMessage, "no can do boss, make sure you just send the numbers 'kay?");
            return;
        }

        code = search;
    }

    log("Registering New User: ", id);
    Client.fetchUser(id).then(user => {
        
        if (Profiles.nicknameTaken(name)) {
            name = user.username;
        }
        
        log(`Register success: ${username}(${id})`);
        Profiles.addProfile(id, code, name);

        var msg = welcomePhrases[getRandomInt(welcomePhrases.length)]
        msg = msg.replaceAll("%v", name.replaceAll("_", " ").toTitleCase(" "));
        
        Client.send(receivedMessage, msg);
    });
}

export function handleAddbuild(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    if (!parameters || parameters.length < 1) {
        debug(`Add Build cancelled: ${username}(${id}), not enough parameters: `);
        Client.send(receivedMessage, "sorry hun, you're missing some info, follow this format ok?\n```\n?addbuild \"name\" \"url\"\n```");
    }

    let name = parameters[0].trim();
    name = name.replace(/[^\w\s]/gi, '')
    if (name.length > 128) {
        debug(`Add Build cancelled: ${username}(${id}), name too long`);
        Client.send(receivedMessage, "stop stop stop, that name is way too long!");
        return;
    }
    let url = "";
    if (search && !search.empty() && parameters.length < 2) {
        url = search.trim();
    } else {
        url = parameters[1].trim();
    }

    Build.requestBuildData(url).then(response => {

        Profiles.addBuild(id, name.replaceAll(" ", "_"), url);
        Client.send(receivedMessage, `OK, i'll remember that, ${name}`);

        log(`Add Build success:  ${username}(${id}), Unit: (${response.buildData.id}), URL: ${url}`);
    }).catch(e => {
        error(`Add Build failed: ${username}(${id}), Error: `, e);
        Client.send(receivedMessage, "looks like the build you sent isn't quite right");
    });
}

export function handleRemovebuild(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;
    if (!search || search.empty()) {
        return;
    }

    log("Attempting to remove build: ", search, " From user: ", id);
    
    let name = search.replaceAll(" ", "_")
    let removed = Profiles.removeBuild(id, name);
    if (removed) {
        log(`Remove Build success: ${username}(${id}), Build: ${search}`);
        Client.send(receivedMessage, `if you insist... *jimbot forgot "${search.replaceAll("_", " ").toTitleCase(" ")}"*`);
    } 
}

export function handleEnableautobuild(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    log(`Enable Auto Build success: ${username}(${id})`);
    Profiles.setAutoBuild(id, true);

    Client.send(receivedMessage, "all set, auto build engage!");
}

export function handleDisableautobuild(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    log(`Disable Auto Build success: ${username}(${id})`);
    Profiles.setAutoBuild(id, false);

    Client.send(receivedMessage, "okay, no more auto builds...");
}

export function handleEnableprefercompact(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    log(`Enable Prefer Compact success: ${username}(${id})`);
    Profiles.setPreferCompact(id, true);

    Client.send(receivedMessage, "okie dokie, your default auto builds will be compact!");
}

export function handleDisableprefercompact(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    log(`Disable Prefer Compact success: ${username}(${id})`);
    Profiles.setPreferCompact(id, false);

    Client.send(receivedMessage, "okay, bigger is better right?");
}


export function handleSetfriendcode(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    if (!search || search.empty())
        return;

    search = search.replaceAll(",", "").trim();

    let code = parseInt(search);
    log("Attempting to add friend code: ", code);
    if (search.length > 9 || Number.isNaN(code) || !search.isNumber()) {
        error(`Set Friendcode cancelled: ${username}(${id}), code invalid: `, search);
        Client.send(receivedMessage, "no can do boss, make sure you just send the numbers 'kay?");
        return;
    }

    log(`Set Friendcode success: ${username}(${id}), Code: ${search}`);
    Profiles.setFriendCode(id, search);

    Client.send(receivedMessage, "so exciting! I love making new friends!");
}

export function handleSetnickname(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    if (!Profiles.getProfile(id))
        return;

    search = search.trim();
    if (search.length > 64) {
        debug(`Set Nickname cancelled: ${username}(${id}), name too long`);
        Client.send(receivedMessage, "that's way too long to be a name, no can do.")
        return;
    }

    if (Profiles.nicknameTaken(search)) {
        debug(`Set Nickname cancelled: ${username}(${id}), name taken`);
        Client.send(receivedMessage, "that name is already taken, sorry!");
        return;
    }

    Profiles.saveNickname(id, search);

    let newName = search.replaceAll("_", " ").toTitleCase(" ");

    log(`Set Nickname success: ${username}(${id}), Nickname: ${newName}`);
    Client.send(receivedMessage, `Got it, ${newName}!`);
}

export function handleSetstatus(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleProfilehelp(receivedMessage);
        return;
    }

    let username = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    let profile = Profiles.getProfile(id);
    if (!profile)
        return;
    
    if (!parameters || parameters.length == 0 || parameters[0].empty()) {
        return;
    }

    let status = parameters[0];

    log(`Set Status success: ${username}(${id}), Status: ${status}`);
    Profiles.setStatus(id, status);

    Client.send(receivedMessage, "Got it! Your profile has been updated");
}

export function handleSetlead(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    let uname = receivedMessage.author.username;
    let id = receivedMessage.author.id;
    let profile = Profiles.getProfile(id);
    if (!profile)
        return;
    if (!search || search.empty()) {
        if (parameters && parameters.length > 0) {
            search = parameters[0];
        } else {
            Client.send(receivedMessage, "you forgot to tell me which build");
        }
    }

    let url = search;
    let b = Profiles.getBuild(id, search);
    if (b) {
        url = b;
        log("Got Stored build from user: ", search);
    }

    let username = (profile.nickname && !profile.nickname.empty()) ? profile.nickname : receivedMessage.author.username;

    Build.requestBuildData(url).then(response => {
        let d = response.buildData;

        Profiles.setLead(id, url);

        buildBuildImageEmbed(`${username}'s Lead`, url, "compact")
        .then(embed => {
            log(`Set Lead success: ${username}(${id}), Unit: (${d.id}), URL: ${url}`);

            Client.send(receivedMessage, `lookin good, I'm sure everyone will like it!`);
            Client.sendMessage(receivedMessage, embed);
        })
        .catch(error);

    }).catch(e => {
        error(`Set Lead failed: ${username}(${id}), Error: `, e);
        Client.send(receivedMessage, "sorry hun, looks like the build you sent isn't quite right")
    });
}