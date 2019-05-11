"use strict";
//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
require("../string/string-extension.js");
var constants = require("../constants.js");
var config = require("../config/config.js");
var wiki = require("nodemw");
var cheerio = require("cheerio");
var wikiEndpoint = "https://exvius.gamepedia.com/";
var wikiClient = new wiki({
    protocol: "https",
    server: "exvius.gamepedia.com",
    path: "/",
    debug: false // is more verbose when set to true
});
var defaultEquipParameters = [
    /*'name',*/
    "type",
    /*"desc",*/
    "reward",
    "resist",
    "effect",
    "trust",
    "stmr",
    "element",
    "ability",
    "notes"
];
var defaultAbilityParameters = [
    "name", "type", "effect", "chain", "hits", "atk_frm", "mp_cost", "learn"
];
var defaultUnitParameters = [
    "name", "role", "origin",
    "stmr", "trust", "chain", "rarity"
];
var statParameters = ["atk", "def", "mag", "spr", "hp", "mp"];
// this is used to better display results with more accurate names
var abilityAliases = {
    "atk_frm": "Attack Frames",
    "mp_cost": "MP Cost",
    "learn": "Learned By",
    "trust": "tmr",
    "stmr": "stmr"
};
// Parameter aliases need to match the original parameter name from the wiki
var parameterAliases = {
    "frames": "atk_frm",
    "family": "chain",
    "learned": "learn",
    "owner": "learn",
    "trust": "tmr",
    "tm": "tmr"
};
var equipmentCategories = [
    'Items', 'Ability Materia'
];
var abilityCategories = [
    'Special Abilities (Active)', 'Special Abilities (Passive)', 'Magic'
];
var overviewRegexp = /\|(.*)=\s*(.*)/g;
var valueRegexp = /\|(.*)(?:=)(.*)/g;
var valueMultiLineRegexp = /\|(.*)(?:=)(.*[^|]+)/g;
var linkRegexp = /(\(.*Events.*\))|(\(.*Trial.*\))\s*|(\(.*Quest.*\))\s*|\[\[(.*)\]\]/g;
var linkRegexp2 = /\(\[\[(.*Events)(?:\|.*)\]\]\)|\(.*(Trial).*\)|(\(.*Quest.*\))|\[\[(.*)\]\]/g;
var unicodeStar = "★";
var unicodeStarOpen = "✫";
function log(data) {
    console.log(data);
}
function isStat(name) {
    return statParameters.includes(name.toLowerCase().trim());
}
function convertValueToLink(value) {
    var link = value;
    constants.linkFilter.forEach(function (filter) {
        link = link.replace(filter, "");
    });
    var title = link.toTitleCase("_");
    title = title.replace("Ss_", "SS_");
    title = title.replace("Cg_", "CG_");
    title = title.replaceAll("_", " ");
    link = "[" + title + "](" + (wikiEndpoint + link.replaceAll(" ", "_")) + ") ";
    log("Converted Link: " + link);
    return link;
}
function convertBatchToLinks(batch) {
    //log("Matching Links");
    //log(batch);
    var value = "";
    batch.forEach(function (link) {
        constants.linkFilter.forEach(function (filter) {
            link = link.replace(filter, "");
        });
        link = "[" + link + "](" + (wikiEndpoint + link.replaceAll(" ", "_")) + ") ";
        log("Converted Link: " + link);
        value += link;
    });
    return value;
}
function convertTitlesToLinks(batch) {
    var value = "";
    batch.forEach(function (page) {
        log("converTitle: " + page.title);
        var title = page.title.replaceAll(" ", "_");
        value += wikiEndpoint + title + "\n";
    });
    return value;
}
function removeHTMLComments(value) {
    if (/<!.*>/g.test(value)) {
        value = value.replace(/<!.*>/g, "");
    }
    return value;
}
function getCollectedTipText(tooltip, collected) {
    var firstDiv = tooltip.find("div").first();
    while (firstDiv && firstDiv.length > 0) {
        var text = firstDiv.text();
        //log("\nDiv Text: " + text);
        var child = firstDiv.find(".tip.module-tooltip");
        if (child && child.length > 0) {
            collected = getCollectedTipText(child, collected);
        }
        else {
            collected += text + "\n";
        }
        firstDiv = firstDiv.next();
    }
    //log("\nCurrent Collected Text: ");
    //log(collected);
    return collected;
}
function parseTipsFromPage($) {
    var tips = [];
    $(".tip.module-tooltip").each(function (tip) {
        var tipTitle = $(this).find("img").attr("title");
        var collected = getCollectedTipText($(this), "");
        //log(`Collected Tip Text: ${tipTitle} (${tip})`);
        //log(collected);
        if (!tips.find(function (t) { return t.value === collected; })) {
            //log("Adding Tip");
            //log(collected);
            //log("\n");
            tips[tips.length] = {
                title: tipTitle,
                value: collected
            };
        }
    });
    //log("Tips:");
    //log(tips);
    return tips;
}
function queryPage(id, paramName, callback) {
    wikiClient.getArticle(id, function (err, content, redirect) {
        if (err) {
            log(err);
            return;
        }
        wikiClient.parse(content, "search", function (err, xml, images) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = cheerio.load(xml);
            var regex = /\|(.*?)\n/g;
            var match = regex.exec(content);
            //log(match);
            // TODO: parse item ability description.
            var ignore = "<!";
            var nodes = [];
            while (match != null) {
                var name = match[1].replace("\t", "").capitalize();
                name = name.replaceAll(" ", "");
                var value = match[2];
                //log(`${name} = '${value}' isParam: ${isParam}`);
                // Fix string to remove any unecessary information
                if (value) {
                    value = removeHTMLComments(value);
                    var m = value.match(linkRegexp2);
                    if (m) {
                        value = convertBatchToLinks(m);
                    }
                    if (value.includes("Unstackable")) {
                        value = "Unstackable Materia";
                    }
                }
                var infoFields = [
                    "Resist",
                    "Effect",
                    "Element",
                    "Ability",
                ];
                var isParam = isStat(name);
                var isParsable = infoFields.includes(name);
                if (value && !value.includes(ignore) && (isParam || isParsable)) {
                    var notEmpty = /\S/.test(value);
                    if (abilityAliases[name]) {
                        name = abilityAliases[name];
                    }
                    value = value.replaceAll("\n", "");
                    value = value.replace("[", "\n\[");
                    if (notEmpty) {
                        nodes[nodes.length] = {
                            name: name,
                            value: value,
                            inline: name !== "Effect"
                        };
                    }
                }
                match = valueMultiLineRegexp.exec(content);
            }
            var tips = [];
            $(".tip.module-tooltip").each(function (tip) {
                var tipTitle = $(this).find("img").attr("title");
                var collected = getCollectedTipText($(this), "");
                //log(`Collected Tip Text: ${tipTitle} (${tip})`);
                //log(collected);
                if (!tips.find(function (t) { return t.value === collected; })) {
                    //log("Adding Tip");
                    //log(collected);
                    //log("\n");
                    tips[tips.length] = {
                        title: tipTitle,
                        value: collected
                    };
                }
            });
            //log("Tips:");
            //log(tips);
            var totalValue = "";
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].name === "Effect") {
                    //log("Adding tips to effect");
                    tips.forEach(function (n) {
                        nodes[i].value += "\n" + n.value;
                    });
                }
                totalValue += nodes[i].value;
                if (isStat(nodes[i].name)) {
                    totalValue += "-";
                }
                totalValue += nodes[i].name;
            }
            //log(nodes);
            totalValue = totalValue.replace("Effect", "");
            //log("Parsed Total Value: " + name);
            //log(totalValue);
            callback(paramName, totalValue);
        });
    });
}
function getPageID(search, categories, callback) {
    var count = categories.length;
    var similar = [];
    var queryEnd = function (id, name) {
        count -= 1;
        if (id) {
            callback(id, name);
            callback = null;
            count = 0;
        }
        else if (!id && count <= 0) {
            if (callback && similar.length > 0) {
                var highest = similar.sort(function (a, b) {
                    return b.similarity - a.similarity;
                })[0];
                log("Highest");
                log(highest);
                id = highest.id;
                name = highest.title;
                var other = convertTitlesToLinks(similar);
                callback(id, name, other);
                callback = null;
            }
        }
    };
    categories.forEach(function (category) {
        wikiClient.getPagesInCategory(category, function (err, redirect, content) {
            if (err) {
                log(err);
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
                var match = title.similarity(search);
                if (match >= constants.similarityTreshold) {
                    //log(`Very Similar ${title} -vs- ${search} (${match})`)
                    similar[similar.length] = {
                        id: page.pageid,
                        title: page.title,
                        similarity: match
                    };
                } /* else if (match >= similarityTreshold * 0.5) {
                    log(`Kinda Similar ${title} -vs- ${search}`)
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
function getRarityString(min, max) {
    min = parseInt(min);
    max = parseInt(max);
    var rarityString = "";
    for (var i = 0; i < max; i++) {
        rarityString += i < min ? unicodeStar : unicodeStarOpen;
    }
    return rarityString;
}
function parsePage(content, parameters, tips) {
    var regex = /\|(.*?)\n/g;
    var match = regex.exec(content);
    parameters.forEach(function (n, i) {
        if (parameterAliases[n]) {
            log("'" + parameters[i] + "' changed to '" + parameterAliases[n] + "'");
            parameters[i] = parameterAliases[n];
        }
    });
    var ignore = "<!";
    var nodes = [];
    while (match != null) {
        var name = match[1].replace("\t", "").toLowerCase();
        name = name.trim();
        var isParam = isStat(name);
        var value = match[2];
        //log(`${name} = '${value}' isParam: ${isParam}`);
        // Fix string to remove any unecessary information
        if (value) {
            value = removeHTMLComments(value);
            var m = value.match(linkRegexp2);
            if (m) {
                value = convertBatchToLinks(m);
            }
            if (name === "Chain") {
                value = convertValueToLink(value);
            }
            if (value.includes("Unstackable")) {
                value = "Unstackable Materia";
            }
        }
        //log("Expected Value: " + name);
        //log(value);
        var isParsable = parameters.includes(name);
        if (value && !value.includes(ignore) && (isParam || isParsable)) {
            var notEmpty = /\S/.test(value);
            if (abilityAliases[name]) {
                name = abilityAliases[name];
            }
            if (isParam || name === "stmr") {
                name = name.toUpperCase();
            }
            if (notEmpty) {
                nodes[nodes.length] = {
                    name: name.capitalize(),
                    value: value,
                    inline: name !== "Effect"
                };
            }
        }
        match = valueMultiLineRegexp.exec(content);
    }
    tips.forEach(function (t, i) {
        nodes[nodes.length] = {
            name: t.title,
            value: t.value
        };
    });
    //log(nodes);
    return nodes;
}
function parseUnitOverview(overview, tips, params, callback) {
    var parameters = defaultUnitParameters;
    if (params.length > 0) {
        log("Found Parameters");
        log(params);
        parameters = params;
    }
    var fields = [];
    var match = overviewRegexp.exec(overview);
    var minR = null;
    var maxR = null;
    var limited = false;
    // ★★★★★✫✫
    var count = 1;
    var queryEnd = function (name, value) {
        count -= 1;
        if (name && value) {
            for (var i = 0; i < fields.length; i++) {
                //log(`Finished Query: ${fields[i].name} -vs- ${name}`);
                if (fields[i].name === name) {
                    //log("Found Queried field");
                    fields[i].name = name;
                    fields[i].value = value;
                }
            }
        }
        if (count <= 0) {
            log("Unit Fields");
            log(fields);
            if (callback) {
                callback(fields, limited);
            }
        }
    };
    parameters.forEach(function (n, i) {
        if (parameterAliases[n]) {
            log("'" + parameters[i] + "' changed to '" + parameterAliases[n] + "'");
            parameters[i] = parameterAliases[n];
        }
    });
    while (match != null) {
        var inline = true;
        var name = match[1].replaceAll(" ", "").toLowerCase();
        var value = match[2];
        if (name.includes("min-rarity")) {
            minR = value;
            match = overviewRegexp.exec(overview);
            continue;
        }
        else if (name.includes("max-rarity")) {
            maxR = value;
            match = overviewRegexp.exec(overview);
            continue;
        }
        if (name === "limited") {
            match = overviewRegexp.exec(overview);
            limited = value === "Yes";
            continue;
        }
        if (abilityAliases[name]) {
            name = abilityAliases[name];
        }
        if (parameters.includes(name) && !value.empty()) {
            if (name == "tmr" || name == "stmr" || name == "STMR") {
                name = name.toUpperCase();
                var tip = tips.find(function (t) {
                    return t.title === value;
                });
                if (tip) {
                    name += " - " + value;
                    value = tip.value;
                }
                else {
                    log("Attempting to query for: " + value);
                    count++;
                    queryPage(value, name, function (n, v) {
                        queryEnd(n, v);
                    });
                }
                inline = false;
            }
            fields[fields.length] = {
                name: name.capitalize(),
                value: value,
                inline: inline
            };
        }
        match = overviewRegexp.exec(overview);
    }
    var tip = tips.find(function (t) {
        return t.title === "Chain Families";
    });
    if (tip && parameters.includes("chain")) {
        fields[fields.length] = {
            name: "Chain Families",
            value: tip.value
        };
    }
    var rarity = null;
    if (minR && parameters.includes("rarity")) {
        rarity = getRarityString(minR, maxR);
        fields[fields.length] = {
            name: "Rarity",
            value: rarity,
            inline: true
        };
    }
    queryEnd(null, null);
    return fields;
}
/*
interface FFBE {
    queryWikiForUnit(search, parameters, callback);
};
*/
var FFBE = /** @class */ (function () {
    function FFBE() {
    }
    FFBE.prototype.queryWikiForUnit = function (search, parameters, callback) {
        wikiClient.getArticle(search, function (err, content, redirect) {
            if (err || !content) {
                console.error(err);
                return;
            }
            if (redirect) {
                log("Redirect Info: ");
                log(redirect);
            }
            var firstLine = content.indexOf("Unit Infobox");
            if (firstLine < 0) {
                var redirectRegex = /(?:.*)\[(.*)\]]/g;
                var page = redirectRegex.exec(content);
                log("Redirect To: " + page[1]);
                this.queryWikiForUnit(page[1], callback);
                return;
            }
            var preString = "Unit Infobox";
            var searchString = "}}";
            var preIndex = content.indexOf(preString);
            var searchIndex = preIndex + content.substring(preIndex).indexOf(searchString);
            var overview = content.substring(firstLine, searchIndex);
            wikiClient.parse(content, search, function (err, xml, images) {
                if (err) {
                    log(err);
                    return;
                }
                var match = xml.match(/\"\/Chaining\/(.*)\"\s/g);
                var unique = [];
                var family = null;
                if (match) {
                    family = "";
                    match.forEach(function (m) {
                        if (!unique.includes(m)) {
                            unique[unique.length] = m;
                        }
                    });
                    //log("Parsed Family:\n\n");
                    unique.forEach(function (m) {
                        m = m.replace("/", "").replaceAll('"', "").replaceAll(" ", "");
                        var name = m.replace("Chaining/", "").replaceAll("_", " ");
                        var link = "[" + name + "](" + wikiEndpoint + m + ")";
                        //log(name);
                        //log(link);
                        if (link.length > 200) {
                            return;
                        }
                        family += link + "\n";
                        //log("--------------");
                    });
                    //log(family);
                }
                var $ = cheerio.load(xml);
                var imgurl = $(".big-pixelate").attr("src");
                var description = $(".mw-parser-output").children("p").first().text();
                description = description.limitTo(constants.descCharLimit);
                var tips = parseTipsFromPage($);
                if (family) {
                    tips[tips.length] = {
                        title: "Chain Families",
                        value: family
                    };
                }
                //log(search);
                //log(typeof search);
                parseUnitOverview(overview, tips, parameters, function (fields, limited) {
                    callback(search, imgurl, description, limited, fields);
                });
            });
        });
    };
    FFBE.prototype.queryWikiForEquipment = function (search, params, callback) {
        var parameters = defaultEquipParameters;
        if (params.length > 0) {
            parameters = params;
        }
        this.queryWikiPage(search, parameters, equipmentCategories, callback);
    };
    FFBE.prototype.queryWikiForAbility = function (search, params, callback) {
        var parameters = defaultAbilityParameters;
        if (params.length > 0) {
            parameters = params;
        }
        this.queryWikiPage(search, parameters, abilityCategories, callback);
    };
    FFBE.prototype.queryWikiPage = function (search, params, categories, callback) {
        getPageID(search, categories, function (id, pageName, other) {
            wikiClient.getArticle(id, function (err, content, redirect) {
                if (err) {
                    log(err);
                    return;
                }
                wikiClient.parse(content, "search", function (err, xml, images) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    var $ = cheerio.load(xml);
                    var imgurl = $(".mw-parser-output").find("img").attr("src");
                    var links = $(".mw-parser-output").children("a");
                    var tips = parseTipsFromPage($);
                    var nodes = parsePage(content, params, tips);
                    if (other) {
                        nodes[nodes.length] = {
                            name: "Similar Results",
                            value: other
                        };
                    }
                    callback(imgurl, pageName, nodes);
                });
            });
        });
    };
    FFBE.prototype.queryWikiWithSearch = function (search, callback) {
        wikiClient.search(search, function (err, results) {
            if (err) {
                log(err);
                return;
            }
            var batch = results.slice(0, 5);
            var fields = [
                {
                    name: "Results For " + search,
                    value: "Nothing Found"
                }
            ];
            fields[0].value = convertTitlesToLinks(batch);
            callback(fields);
        });
    };
    FFBE.prototype.queryWikiFrontPage = function (callback) {
        wikiClient.getArticle("Final_Fantasy_Brave_Exvius_Wiki", function (err, content, redirect) {
            if (err) {
                log(err);
                return;
            }
            var firstLine = content.indexOf("Recent");
            content = content.substring(firstLine, content.length);
            var units = "";
            var unitsRegex = /\|unit.*=\s(.*)\|/g;
            var match = unitsRegex.exec(content);
            while (match != null) {
                units += convertValueToLink(match[1]) + "\n";
                match = unitsRegex.exec(content);
            }
            wikiClient.parse(content, "Final_Fantasy_Brave_Exvius_Wiki", function (err, xml, images) {
                if (err) {
                    log(err);
                    return;
                }
                log(images);
            });
            var m = content.match(linkRegexp2);
            if (m) {
                var value = convertBatchToLinks(m);
                log(value);
            }
            callback(units);
        });
    };
    return FFBE;
}());
exports.FFBE = FFBE;
;
