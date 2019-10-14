//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../../util/string-extension.js";
import "../helper.js";
import * as Build from "../../ffbe/build.js";
import * as BuildImage from "../../ffbe/buildimage.js";
import * as Discord from "discord.js";
import * as fs from "fs";
import { log, error, debug } from "../../global.js";
import { Client } from "../../discord.js";
import { Cache } from "../../cache/cache.js";
import { Config } from "../../config/config.js";

const pinkHexCode = 0xffd1dc;

export function validateUnit(search): boolean {
    log(`validateUnit(${search})`);
    var unit = getUnitKey(search.replaceAll(" ", "_"));
    log(unit);
    
    return (unit != null);
}

export function validateEmote(emote) {
    var file = null;

    const types = Config.filetypes();
    for (var i = 0; i < types.length; i++) {
        var filename = "emotes/" + emote + types[i];
        if (fs.existsSync(filename)) {
            file = filename;
            break;
        }
    }

    return file;
}

export function getUnitKey(search) {

    let id = Cache.getUnitKey(search);
    if (id)
        return id;

    id = Cache.getUnitIDGL(search);
    if (id)
        return id;

    return Cache.getUnitIDJP(search);
}

export function getJPKey(search) {

    let id = Cache.getUnitKey(search);
    if (id)
        return id;

    id = Cache.getUnitIDGL(search);
    if (id)
        return id;

    return Cache.getUnitIDJP(search);
}

export function getUnitNameFromKey(search) {
    return Cache.getUnitName(search);
}

export function respondSuccess(receivedMessage, toUser = false) {
    Client.respondSuccess(receivedMessage, toUser);
}

export function respondFailure(receivedMessage, toUser = false) {
    Client.respondFailure(receivedMessage, toUser);
}

export function buildBuildImage(buildUrl: string, isCompact: boolean, unitIndex: number = 0): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        Build.CreateBuildsFromURL(buildUrl)
        .then(builds => {
            unitIndex = Math.max(unitIndex, builds.length - 1);
            BuildImage.BuildImage(builds[unitIndex], isCompact)
            .then(p => {
                    resolve(p);
                })
                .catch(reject);
        }).catch(reject);
    });
}

export function buildBuildImageEmbed(name: string, buildUrl: string, isCompact: boolean, unitIndex: number = 0) {
    return new Promise<Discord.RichEmbed>((resolve, reject) => {
        buildBuildImage(buildUrl, isCompact, unitIndex) 
        .then(p => {
            const attachment = new Discord.Attachment(p, 'build.png');
            var embed = new Discord.RichEmbed()
            embed.setColor(pinkHexCode)
                .setImage(`attachment://build.png`)
                .attachFile(attachment)
                .setTitle(name)
                .setURL(buildUrl);

            resolve(embed);
        }).catch(reject);
    });
}