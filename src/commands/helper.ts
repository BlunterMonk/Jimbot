//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import * as fs from "fs";
import { log, debug, error } from "../global.js";
import { Config } from "../config/config.js";

const wikiEndpoint = "https://exvius.gamepedia.com/";
const ffbegifEndpoint = "http://www.ffbegif.com/";
const exviusdbEndpoint = "https://exvius.gg/gl/units/205000805/animations/";
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

export function getMentionID(search): string {

    if (search && !search.empty()) {
        log("Getting friend code for mentioned user: ", search);

        search = search.replace("<", "");
        search = search.replace(">", "");
        search = search.replace("!", "");
        search = search.replace("@", "");

        if (!search.isNumber())
            return null;

        return search;
    }

    return null;
}

export function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}

export function convertSearchTerm(search) {
    var s = search;
    var alias = Config.getAlias(s.replaceAll(" ", "_"));
    if (alias) {
        //log("Found Alias: " + alias);
        return alias.replaceAll(" ", "_");
    }

    //search = search.toLowerCase();
    search = search.replaceAll(" ", "_");
    return search;
}

export function convertValueToLink(value) {
    
    var link = value;
    linkFilter.forEach(filter => {
        link = link.replace(filter, "");
    });
    
    var title = link.toTitleCase("_");
    title = title.replace("Ss_", "SS_");
    title = title.replace("Cg_", "CG_");
    title = title.replaceAll("_", " ");

    link = `[${title}](${wikiEndpoint + link.replaceAll(" ", "_")}) `;
    //log("Converted Link: " + link);
    return link;
}

export function getQuotedWord(str) {
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

export function getFileExtension(link) {
    return link.substring(link.lastIndexOf("."), link.length);
}
