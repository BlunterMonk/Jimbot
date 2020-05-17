//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "discord.js";
import "../../util/string-extension.js";
import * as Discord from "discord.js";
import * as fs from "fs";
import { log, logData, error, escapeString, debug } from "../../global.js";
import { Cache, UnitCalculations, Calculation } from "../../cache/cache.js";
import { Config } from "../../config/config.js";
import { Client } from "../../discord.js";
import { unitSearch, unitSearchWithParameters } from "../../ffbe/unit.js";
import { downloadFile } from "../../util/download.js";
import { getUnitKey, validateUnit } from "./common.js";
import { convertSearchTerm, convertValueToLink, isLetter } from "../helper.js";

////////////////////////////////////////////////////////////////////

const furcSheetURL = "https://docs.google.com/spreadsheets/d/1o-q9G1I1Z1QArbzrTySjjNs-OvmLE-sBRYljCX6EKUo";
const muspelSheetURL = "https://docs.google.com/spreadsheets/d/14EirlM0ejFfm3fmeJjDg59fEJkqhkIbONPll5baPPvU";
const whaleSheetURL = "https://docs.google.com/spreadsheets/d/1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";
const whatahSheetURL = "https://docs.google.com/spreadsheets/d/1bXWLfFu2ECQ3JR-5XAAALkhnnEUMr0pUxYxgI1QAgHw";
const furculaUserID = "344500120827723777";
const muspelUserID  = "114545824989446149";
const shadoUserID   = "103785126026043392";
const whatahUserID  = "147586823588151296";

export function buildMuspelDamageString(search: string, isBurst: boolean): string {
    var calc = Cache.getCalculations("muspel", search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return;
    }

    var text = "";
        
    const keys = Object.keys(calc);
    for (let ind = 0; ind < keys.length; ind++) {
        const key = keys[ind];
        const element = calc[key];

        if (element.damage.empty())
            continue;

        if (element.type == "finisher") {
            text += `**${element.name} (${element.type}):** ${element.damage} on turn ${element.turns}\n`;
        } else {
            if (isBurst && element.burst) {
                text += `**${element.name} (${element.type}):** ${element.burst}\n`;
            } else {
                text += `**${element.name} (${element.type}):** ${element.damage} : ${element.turns}\n`;
            }
        }
    }

    return text;
}

////////////////////////////////////////////////////////////////////

function buildDPTEmbed(search, isBurst, source) {
    var calc = Cache.getCalculations(source, search);
    if (!calc) {
        log("Could not find calculations for: " + search);
        return null;
    }

    log("Calc found: ", calc);

    var text = "";
        
    const keys = Object.keys(calc);
    for (let ind = 0; ind < keys.length; ind++) {
        const key = keys[ind];
        const element = calc[key];

        if (isBurst) {
            if (element.burst && !element.burst.empty())
                text += `**${element.name}:** ${element.burst} on turn ${element.burstTurn}\n`;
        } else if (element.damage && !element.damage.empty()) {
            let t = element.turns.empty() ? "" : ` : ${element.turns}`;
            text += `**${element.name}:** ${element.damage}${t}\n`;
        }
    }

    var title = "";
    var s = search.toTitleCase();
    if (isBurst) {
        title = `Burst damage for: ${s}. (damage on turn)`;
    } else {
        title = `DPT for: ${s}. (dpt - turns for rotation)`;
    }

    var embed = <any>{
        title: title,
        url: furcSheetURL,
        description: text,
        footer: {
            text: "visit the link provided for more calculations"
        },
    }

    return embed
}
function buildRotationEmbed(search, source) {

    var calc = Cache.getUnitCalculation(source, search);
    if (!calc || !calc.rotation) {
        log("Could not find calculations for: " + search);
        return;
    }

    var bturn = 0;
    var text = `**Damage Per Turn: ${calc.damage}**\n`;
    if (calc.burst && !calc.burst.empty()) {
        text += `**Highest Burst: ${calc.burst} on turn ${calc.burstTurn}**\n`;
        bturn = parseInt(calc.burstTurn);
    }
    text += `**[(spreadsheet)](${(source == "furcula") ? furcSheetURL : whaleSheetURL}) - [(wiki)](${calc.wiki}) - [(build)](${calc.url})**\n\n`;
    calc.rotation.forEach((txt, ind) => {
        if (txt.empty()) 
            return;

        if (ind+1 === bturn) {
            text += `**[${ind+1}]: ${txt}**\n`;
        } else {
            text += `**[${ind+1}]**: ${txt}\n`;
        }
    });

    var embed = <any>{
        title: `Optimal Rotation For: ${calc.name}`,
        description: text,
    }

    return embed;
}

function buildDamageEmbed(search) {

    search = search.replaceAll("_", " ");

    var furc = Cache.getUnitCalculation("furcula", search);
    var whale = Cache.getUnitCalculation("whale", search);
    var musp = Cache.getUnitCalculation("muspel", search);
    if (!furc && !whale && !musp) {
        log("Could not find calculations for: " + search);
        return;
    }

    var text = "";
    text += `**[(furcula sheet)](${furcSheetURL}) - [(shado sheet)](${whaleSheetURL}) - [(muspel sheet)](${muspelSheetURL})**\n\u200B\n`;

    if (furc && furc.damage && !furc.damage.empty()) {
        
        text += `**[Damage Per Turn:](${furc.url})** ${furc.damage} : ${furc.turns}\n`;
        if (furc.burst && !furc.burst.empty()) {
            text += `**[Highest Burst:](${furc.url})** ${furc.burst} on turn ${furc.burstTurn}\n`;
        }
    }

    if (whale && whale.damage && !whale.damage.empty()) {
        text += `**[Whale Damage Per Turn:](${whale.url})** ${whale.damage} : ${whale.turns}\n`;
        if (whale.burst && !whale.burst.empty()) {
            text += `**[Whale Highest Burst:](${whale.url})** ${whale.burst} on turn ${whale.burstTurn}\n`;
        }
    }

    if (musp && musp.damage && !musp.damage.empty()) {
        if (musp.type == "finisher") {
            text += `**Muspel's Calc (${musp.type}):** ${musp.damage} on turn ${musp.turns}\n`;
        } else {
            text += `**Muspel's Calc (${musp.type}):** ${musp.damage} : ${musp.turns}\n`;
        }
    }

    return <any>{
        title: `**__${furc.name}__**`,
        url: furc.wiki,
        description: text,
    }
}

function getTopDPSText(source: string, category: string, limit: number) {

    const calcs: Calculation[] = Cache.getAllCalculations(source);

    const culled: Calculation[] = [];
    calcs.forEach(unit => {

        if (unit.name.includes("JP)"))
            return;
        if (category && !unit.type.startsWith(category))
            return;
        if (!unit.damage || unit.damage === undefined || unit.damage.empty())
            return;
        if (unit.damage.includes("M"))
            return;

        var ad = parseInt(unit.damage.replaceAll(",", ""));

        if (Number.isNaN(ad)) return;

        culled.push(unit);
    });

    const sorted = culled.sort((a, b) => {

        var ad = parseFloat(a.damage.replace(/[A-Za-z,]/g, ""));
        var bd = parseFloat(b.damage.replace(/[A-Za-z,]/g, ""));

        if (Number.isNaN(ad)) {
            return -1;
        } else if (Number.isNaN(bd)) {
            return 1;
        }

        if (bd < ad)
            return -1;
        else 
            return 1;
    });

    var text = "";
    var count = Math.min(limit, sorted.length);
    for (let index = 0; index < count; index++) {
        const unit = sorted[index];
        
        if (category)
            text += `**${unit.name}:** ${unit.damage}\n`;
        else 
            text += `**${unit.name} (${unit.type}):** ${unit.damage}\n`;
    }

    return text;
}

////////////////////////////////////////////////////////////////////

export function handleDpthelp(receivedMessage: Discord.Message) {
    var data = fs.readFileSync("./data/help/help-damage.json").toString();
    var readme = JSON.parse(data);

    var embed = {
        description: readme.description,
        fields: readme.fields,
        title: readme.title
    };

    Client.sendPrivateMessage(receivedMessage, embed);
}

export function handleTopdps(receivedMessage: Discord.Message, search: string, parameters: string[], source = "furcula") {

    var limit = 10;
    var category = null;

    // set limit to search term if it's a number, if not check parameters for a value
    if (!search.empty()) {

        var s = parseInt(search);
        if (!Number.isNaN(s)) {
            limit = s;
        } else {
            category = search[0];
            
            var p = parseInt(parameters[0]);
            if (!Number.isNaN(p))
                limit = p;
        }
    }

    var text = getTopDPSText(source, category, limit);

    var embed = <any>{
        title: `Top DPT`,
        description: text,
    }

    var author = "";
    switch (source) {
        case "furcula": 
            author = furculaUserID;
        break;
        case "whale":
            author = shadoUserID;
        break;
        case "muspel":
            author = muspelUserID;
        case "whatah":
            author = whatahUserID;
        break;
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, author);
}
export function handleWtopdps(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleTopdps(receivedMessage, search, parameters, "whale");
}
export function handleMtopdps(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleTopdps(receivedMessage, search, parameters, "muspel");
}
export function handleWhatahtopdps(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleTopdps(receivedMessage, search, parameters, "whatah");
}

export function handleDamage(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    
    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }
    if (search.empty()) {
        var text = "";
        text += `Furcula sheet: <${furcSheetURL}>\nShado sheet: <${whaleSheetURL}>\nMuspel sheet: <${muspelSheetURL}>\n`;
        Client.send(receivedMessage, text);
        return;
    }

    let embed = buildDamageEmbed(search);
    Client.sendMessage(receivedMessage, embed);
}

export function handleDpt(receivedMessage: Discord.Message, search: string, parameters: string[], isBurst) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    let channel: any = receivedMessage.channel;
    if (channel.name.includes("wiki")) {
        handleMuspel(receivedMessage, search, parameters);
        return;
    }
    
    search = search.replaceAll("_", " ");

    var embed = buildDPTEmbed(search, isBurst, "furcula");
    
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}

export function handleWhale(receivedMessage: Discord.Message, search: string, parameters: string[], isBurst) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var embed = buildDPTEmbed(search, isBurst, "whale");
    embed.url = whaleSheetURL;

    Client.sendMessageWithAuthor(receivedMessage, embed, shadoUserID);
}

export function handleWhatah(receivedMessage: Discord.Message, search: string, parameters: string[], isBurst) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    log("Building DPT Embed");
    var embed = buildDPTEmbed(search, isBurst, "whatah");
    embed.url = whatahSheetURL;

    Client.sendMessageWithAuthor(receivedMessage, embed, whatahUserID);
}

export function handleBurst(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    let channel: any = receivedMessage.channel;
    if (channel.name.includes("wiki")) {
        handleMuspelburst(receivedMessage, search, parameters);
        return;
    }

    handleDpt(receivedMessage, search, parameters, true);
}

export function handleWhaleburst(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleWhale(receivedMessage, search, parameters, true);
}

export function handleWhatahburst(receivedMessage: Discord.Message, search: string, parameters: string[]) {
    handleWhatah(receivedMessage, search, parameters, true);
}

export function handleRotation(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var embed = buildRotationEmbed(search, "furcula");
    Client.sendMessageWithAuthor(receivedMessage, embed, furculaUserID);
}

export function handleWhaletation(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var embed = buildRotationEmbed(search, "whale");
    embed.url = whaleSheetURL;

    Client.sendMessageWithAuthor(receivedMessage, embed, shadoUserID);
}

export function handleMuspel(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var text = buildMuspelDamageString(search, false);

    var s = search.toTitleCase();
    var embed = <any>{
        title: `Muspel Damage Comparisons: ${s}`,
        url: muspelSheetURL,
        description: text,
        footer: {
            text: "visit the link provided for more calculations"
        },
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, muspelUserID);
}

export function handleMuspelburst(receivedMessage: Discord.Message, search: string, parameters: string[]) {

    if (search == "help") {
        handleDpthelp(receivedMessage);
        return;
    }

    search = search.replaceAll("_", " ");

    var text = buildMuspelDamageString(search, true);

    var s = search.toTitleCase();
    var embed = <any>{
        title: `Muspel Burst Comparisons: ${s}`,
        url: muspelSheetURL,
        description: text,
        footer: {
            text: "visit the link provided for more calculations"
        },
    }
    
    Client.sendMessageWithAuthor(receivedMessage, embed, muspelUserID);
}
