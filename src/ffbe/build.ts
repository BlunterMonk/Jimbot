//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as request from "request";
import * as fs from "fs";
import * as cheerio from "cheerio";

import { log } from "../global.js";
import "../string/string-extension.js";
import {Cache, cache} from "../cache/cache.js";
import * as Constants from "../constants.js";
import {Builder} from "./builder.js";
import { LoginTicket } from "google-auth-library/build/src/auth/loginticket";

const ignoreItemKeys = [
    "id", "access", "type", "icon", "wikiEntry",
    "sortId", "rarity", "maxNumber", "tmrUnit",
    "stmrUnit", "eventName", "exclusiveUnits",
    "skillEnhancement", "special", "enhancements",
    "equipedConditions"
];
const statValues = [
    "hp", "hp%",
    "mp", "mp%",
    "atk", "atk%",
    "def", "def%",
    "mag", "mag%",
    "spr", "spr%",
    "lbFillRate", 
];
const otherStats = [
    "evoMag","accuracy","jumpDamage","lbFillRate","mpRefresh"
];
const simpleAddCombineProperties = [
    "hp","hp%","mp","mp%","atk","atk%","def","def%","mag","mag%","spr","spr%",
    "evoMag","accuracy","jumpDamage","lbFillRate","mpRefresh"
];
const complexStats = [
    "ailments", "element", "killers",
    "evade", "notStackableSkills",
    "resist",
    "lbFillRate",
    "partialDualWield",
    "accuracy",
    "damageVariance",
    "dualWielding",
    "lbDamage",
    "mpRefresh",
    "lbPerTurn",
    "singleWieldingOneHanded",
    "esperStatsBonus",
    "jumpDamage",
    "evoMag",
    "drawAttacks",
    "singleWielding",
    "allowUseOf"
]
class Stats {
    hp:  number; "hp%":  number;
    mp:  number; "mp%":  number;
    atk: number; "atk%": number;
    def: number; "def%": number;
    mag: number; "mag%": number;
    spr: number; "spr%": number;
}

interface Unit {
}
class Unit {
    name: string;
    id: string;
    max_rarity: string;
    min_rarity: string;
    sex: string;
    stats: {
        "maxStats": Stats,
        "minStats": Stats,
        "pots":     Stats
    };
    stats_pattern: number;
    equip: string[];
    enhancementSkills: string[];
    skills: any[];
}


class BuildItem {
    "slot": number;
    "id": string;
    "pinned": boolean;
}

// Data loaded from the FFBEEquip Build file
class BuildData {
    "id": string;
    "rarity": number;
    "goal": string;
    "innateElements": any[];
    "items": BuildItem[];
    "itemEnchantments": string[][]; // list of item enchantments sorted by slot
    "esperId": string;
    "esperPinned": boolean;
    "pots": { // total pots applied to unit
        "spr": 0,
        "mag": 0,
        "def": 0,
        "atk": 0,
        "mp" : 0,
        "hp" : 0
    };
    "buffs": {
        "spr": number,
        "mag": number,
        "def": number,
        "atk": number,
        "mp" : number,
        "hp" : number,
        "lbFillRate": number
    };
    "lbShardsPerTurn": number;
    "mitigation": {
        "physical": number;
        "magical": number;
        "global": number;
    };
    "drawAttacks": number;
    "level": number;
}

class Item {
    id: string;
    name: string;
    type: string;
    hp:  number; "hp%":  number;
    mp:  number; "mp%":  number;
    atk: number; "atk%": number;
    def: number; "def%": number;
    mag: number; "mag%": number;
    spr: number; "spr%": number;
    equipedConditions: string[];
    access: string[];
    maxNumber: number;
    icon: string; 
    sortId: number;
    rarity: number;
    killers: any[];
    resist: any[];
    special: any[];
    lbPerTurn: any;
    lbFillRate: any;
}

class Build {
    loadedItems: Item[]; // list of items loaded from data sheet
    loadedUnit: Unit; // unit information loaded from data sheet

    unitID: string; // ID of unit being built
    buildData: BuildData; // unit information
    // Stat totals
    total: any; // total stats
    equipmentTotal: any; // total stats attained from equipment
    // Data from parsed build
    equipment: any[]; // list of valid equipment
    // Extra boons from equipment
    equipedConditions: string[]; // Criteria that has been met based on the items given
    allowUseOf: string[]; // equipment types allowed to be used by current items
    killers: any; // total killers, {name:{physical:number,magical:number}}
    resist: any; // total resistances, {percent:number}
    TDW: any; // total TDH equipment bonus
    DH: any; // total DH equipment bonus
    TDH: any; // total TDW equipment bonus
    constructor(buildData: any) {
        this.buildData = buildData;
        this.unitID = buildData.id;

        var lu = Builder.getUnit(buildData.id);
        if (this.buildData.rarity == 6) {
            this.loadedUnit = lu["6_form"];
        } else {
            this.loadedUnit = lu;
        }

        log("this.loadedUnit");
        log(this.loadedUnit);
        log("this.buildData");
        log(this.buildData);

        this.total = {
            "hp":  "0", "hp%":  "0",
            "mp":  "0", "mp%":  "0",
            "atk": "0", "atk%": "0",
            "def": "0", "def%": "0",
            "mag": "0", "mag%": "0",
            "spr": "0", "spr%": "0"
        };

        this.TDW = {
            "atk": "0",
            "mag": "0",
            "def": "0",
            "spr": "0",
            "accuracy": "0"
        };

        this.TDH = this.DH = {
            "atk": "0",
            "mag": "0",
            "def": "0",
            "spr": "0",
            "accuracy": "0"
        };
        
        this.killers = {};
        this.resist = {};
        this.equipedConditions = [];
        this.loadedItems = [];
        this.equipment = [];
        this.equipmentTotal = {};
    }

    // Finalize the item as equipment and add its stats to the build total
    addToTotal(item2: any) {
        this.total = addToTotal(this.total, item2);
    }
    addToEquipmentTotal(item2: any) {
        this.equipmentTotal = addToTotal(this.equipmentTotal, item2);
    }
    addItem(item: any) {

        var stats = Object.keys(this.total);
        stats.forEach(s => {
            if (item[s] != null) {
                this.total[s] = parseInt(this.total[s]) + parseInt(item[s]);
            }
        });
        
        if (!this.equipedConditions.includes(item.type)) {
            this.equipedConditions.push(item.type)
        }

        this.addToEquipmentTotal(item);

        if (item.killers) {
            item.killers.forEach(element => {
                if (!this.killers[element.name]) 
                    this.killers[element.name] = {
                        physical: 0,
                        magical: 0
                    };

                if (element.physical)
                    this.killers[element.name].physical += element.physical;
                if (element.magical)
                    this.killers[element.name].magical += element.magical;
            });
        }

        if (item.resist) {
            item.resist.forEach(element => {
                if (!this.resist[element.name]) 
                    this.resist[element.name] = 0;

                this.resist[element.name] += element.percent;
            });
        }

        this.equipment.push(item);
    }

    // Add the full list of items found based on the build.
    addItemData(items: any[]) {
        this.setItemData(this.loadedItems.concat(items));
    }
    setItemData(items: any[]) {
        this.loadedItems = items;
        // this.loadedItems.forEach((item, ind) => {
        //     if (!this.equipedConditions.includes(item.type)) {
        //         this.equipedConditions.push(item.type)
        //     }
        // });
    }

    getItemEnchantments(slot: number): any[] {
        return this.buildData.itemEnchantments[slot];
    }

    // Calculate final build stats using all data loaded
    getTotalStats() {
     
        var passives = getUnitPassiveStats(this, this.loadedUnit);
        log("Unit Passive Stats");
        log(passives);

        var unitStats = getUnitMaxStats(this.loadedUnit, passives, this.buildData.pots, this.equipmentTotal);
        log("Unit Stats");
        log(unitStats);

        return this.total;
    }

    // get a string representation of the build
    getText() {

        var total = this.getTotalStats();
        var text = "";
        this.equipment.forEach((itemInfo, ind) => {
    
            text += `[${itemInfo.type}]: ${itemInfo.name}`;
    
            var stats = Object.keys(itemInfo);
            stats.forEach(s => {
                if (statValues.includes(s) && itemInfo[s] != null) {
                    text += `, ${s} ${itemInfo[s]}`;
                }
            });

            text += "\n";
        });
        
        var stats = Object.keys(total);
        stats.forEach(s => {
            if (otherStats.includes(s)) {
                if (total[s] != null) {
                    text += `[${s}]: ${total[s]}\n`;
                }
            }
        });

        var rkeys = Object.keys(this.resist);
        if (rkeys.length > 0) {
            text += "[resist]: ";
            rkeys.forEach((element, index) => {
                if (index > 0) text += ", ";
                text += `${element} ${this.resist[element]}`;
            });
            text += "\n";
        }
             
        var kkeys = Object.keys(this.killers);
        if (kkeys.length > 0) {
            kkeys.forEach((element, index) => {
                text += `[${element} killer]: physical ${this.killers[element].physical}, magical ${this.killers[element].magical}\n`;
            });
        }

        return text;
    }

}

/////////////////////////////////////////////
/// BUILDER LOGIC

function isApplicable(item, unit: Unit) {
    if (item.exclusiveSex && item.exclusiveSex != unit.sex) {
        return false;
    }
    if (item.exclusiveUnits && !item.exclusiveUnits.includes(unit.id)) {
        return false;
    }
    return true;
}
function areConditionOK(item, B: Build, level = 0) {
    if (level && item.levelCondition && item.levelCondition > level) {
        return false;
    }
    if (item.equipedConditions) {
        for (var conditionIndex = item.equipedConditions.length; conditionIndex--;) {
            if (!isEquipedConditionOK(B, item.equipedConditions[conditionIndex])) {
                return false;
            }
        }
    }
    return true;
}
function isEquipedConditionOK(B: Build, condition) {
    var equiped = B.equipment;

    if (Array.isArray(condition)) {
        return condition.some(c => isEquipedConditionOK(B, c));
    } else {
        /*if (elementList.includes(condition)) {
            if ((equiped[0] && equiped[0].element && equiped[0].element.includes(condition)) || (equiped[1] && equiped[1].element && equiped[1].element.includes(condition))) {
                return true;
            }
        } else */if (B.equipedConditions.includes(condition)) {
            for (var equipedIndex = 0; equipedIndex < 10; equipedIndex++) {
                if (equiped[equipedIndex] && equiped[equipedIndex].type == condition) {
                    return true;
                }
            }
        } else if (condition == "unarmed") {
            if (!equiped[0] && ! equiped[1]) {
                return true;
            }
        } else {
            for (var equipedIndex = 0; equipedIndex < 10; equipedIndex++) {
                if (equiped[equipedIndex] && equiped[equipedIndex].id == condition) {
                    return true;
                }
            }
        }
    }
    return false;
}

/////////////////////////////////////////////
/// BUILD STAT CALCULATIONS
// calculate the units max stats with the provided pots
function getUnitMaxStats(unit: Unit, passives: any, pots: any, equipmentTotal: any): any {

    log("getUnitMaxStats:");
    log("pots");
    log(pots);
    log("equipmentTotal");
    log(equipmentTotal);
    log("passives");
    log(passives);

    var bonus = addToTotal(passives, equipmentTotal);

    log("total bonuses");
    log(bonus);

    var total = {};
    var keys = Object.keys(pots);
    keys.forEach((k, i) => {
        
        let max = unit.stats.maxStats[k];
        let percent = bonus[`${k}%`];
        if (!percent) {
            percent = 0;
        }
        
        let pot = pots[k];
        let eq = 0;
        if (equipmentTotal[k]) {
            eq = equipmentTotal[k];
        }
        
        log(`${k}: ${unit.stats.maxStats[k]} + ${pot}`);
        let base = max + pot;
        log(`${k}: ${base} * ${eq} + (${percent / 100} * ${base})`);
        total[k] = base + eq + ((percent / 100) * base);
    });

    return total;
}
function getUnitPassiveStats(B: Build, unit: Unit): Stats {
    var stats = new Stats();

    var passives = [];
    unit.skills.forEach((skill, i) => {
        if (skill.equipedConditions && isEquipedConditionOK(B, skill.equipedConditions)) {
            passives.push(skill);
        }
    });

    log("passives");
    log(passives);

    passives.forEach((p, i) => {
        stats = addToTotal(stats, p);
    });

    return stats;
}

/////////////////////////////////////////////
/// COMBINING AND MANAGING STATS

function isStat(name) {
    return simpleAddCombineProperties.includes(name);
}
function addToStat(skill, stat, value): any {
    if (!skill[stat]) {
        skill[stat] = value;
    } else {
        skill[stat] += value;
    }

    return skill;
}
function addStatObject(item, key, values): any {
    if (!item[key]) {
        item[key] = {};
    }

    var stats = Object.keys(values);
    for (var index = stats.length; index--;) {
        var stat = stats[index];

        // skip combining the name
        log(stat);
        if (stat == "name")
            continue;
        
        if (!stat[stat]) {
            stat[stat] = values[stat];
        }

        item[key][stat] = item[key][stat] + values[stat];
    }

    return item;
}

function addToTotal(total: any, item2: any): any {
    var finalItem = total;
    var rightKeys = Object.keys(item2);

    for (let index = 0; index < rightKeys.length; index++) {
        const statKey = rightKeys[index];
        const statObj = item2[statKey];

        if (ignoreItemKeys.includes(statKey))
            continue;

        if (simpleAddCombineProperties.includes(statKey)) {
            if (!finalItem[statKey]) 
                finalItem[statKey] = 0;
            
            finalItem = addToStat(finalItem, statKey, item2[statKey]);
        } else if(Array.isArray(statObj)) {
            if (!finalItem[statKey]) 
                finalItem[statKey] = [];
        
            finalItem[statKey] = finalItem[statKey].concat(statObj);
        } else if(complexStats.includes(statKey)) {
            if (!finalItem[statKey]) 
                finalItem[statKey] = {};
        
            finalItem = addStatObject(finalItem, statKey, item2[statKey]);
        }
    }

    return finalItem;
}

// Combine two item sets, usually for item enhancements
function combineTwoItems(item1, item2) {
    var finalItem = item1;

    // Combine the item keys
    // var leftKeys = Object.keys(item1);
    var rightKeys = Object.keys(item2);
    // rightKeys.forEach((k, i) => {
    //     if (!leftKeys.includes(k)) {
    //         leftKeys.push(k);
    //     }
    // }); 

    for (let index = 0; index < rightKeys.length; index++) {
        const statKey = rightKeys[index];
        const statObj = item2[statKey];

        log(`Stat Key: ${statKey}`);

        if (simpleAddCombineProperties.includes(statKey)) {
            if (!finalItem[statKey]) 
                finalItem[statKey] = 0;
            
            finalItem = addToStat(finalItem, statKey, item2[statKey]);
        } else if(Array.isArray(statObj)) {
            if (!finalItem[statKey]) 
                finalItem[statKey] = [];
        
            finalItem[statKey] = finalItem[statKey].concat(statObj);
        } else { //if(complexStats.includes(statKey)) {
            if (!finalItem[statKey]) 
                finalItem[statKey] = {};
        
            finalItem = addStatObject(finalItem, statKey, item2[statKey]);
        }
    }
   
    return finalItem;
}

// Apply any item enhancements to the build
function applyEnchantments(item, enchantments) {
    if (enchantments) {
        // log("Item Enchantments")
        // log(enchantments);

        var result = JSON.parse(JSON.stringify(item));
        result.enhancements = enchantments.slice();
        for (var i = enchantments.length; i--;) {
            var enhancement = enchantments[i];

            // Add item enhancements to the items stats
            var enhancementValue;
            if (enhancement == "rare_3" || enhancement == "rare_4") {
                enhancementValue = Constants.itemEnhancementAbilities[enhancement][item.type];
            } else {
                enhancementValue = Constants.itemEnhancementAbilities[enhancement];
            }

            // log("Adding Enchantment");
            // log(enhancementValue);
            if (enhancementValue) {
                result = combineTwoItems(result, enhancementValue);
            }
        }

        // log("Final Item");
        // log(result);
        return result;
    } else {
        return item;
    }
}
function findBestItemVersion(B: Build, slot, itemWithVariation: any[]) {

    if (itemWithVariation.length == 1) {
        var item = itemWithVariation[0];
        // if there are no variations of the item, it is fine
        if (isApplicable(item, B.loadedUnit) 
            && (!item.equipedConditions || areConditionOK(item, B))) {
            
            var enh = B.getItemEnchantments(slot);
            if (enh) {
                // log("has enhancements")
                return applyEnchantments(item, enh);
            }

            return item;
        }
        // } else {
        //     var result = {
        //         "id":item.id, "name":item.name, "jpname":item.jpname, "icon":item.icon, 
        //         "type":item.type,"access":["Conditions not met"], "enhancements":item.enhancements
        //     };
        //     if (item.special && item.special.includes("notStackable")) {
        //         result["special"] = ["notStackable"];
        //     }
        //     return result;
        // }
    } else {

        // sort the list of item variations by priority
        itemWithVariation.sort(function (item1, item2) {
            var conditionNumber1 = 0; 
            var conditionNumber2 = 0;
            if (item1.equipedConditions) {
                conditionNumber1 = item1.equipedConditions.length;
            }
            if (item1.exclusiveUnits) {
                conditionNumber1++;
            }
            if (item2.equipedConditions) {
                conditionNumber2 = item2.equipedConditions.length;
            }
            if (item2.exclusiveUnits) {
                conditionNumber2++;
            }
            return conditionNumber2 - conditionNumber1;
        });

        // Check to see if each item is valid
        for (var index in itemWithVariation) {
            if (isApplicable(itemWithVariation[index], B.loadedUnit) && areConditionOK(itemWithVariation[index], B)) {
                var enh = B.getItemEnchantments(slot);
                if (enh) {
                    return applyEnchantments(itemWithVariation[index], item.enhancements);
                } else {
                    return itemWithVariation[index];
                }
            }
        }

        var item = itemWithVariation[0];
        var result = {
            "id":item.id, "name":item.name, "jpname":item.jpname, 
            "icon":item.icon, "type":item.type, 
            "access":["Conditions not met"], "enhancements":item.enhancements
        };

        if (item.special && item.special.includes("notStackable")) {
            result["special"] = ["notStackable"];
        }
        
        return result;
    }
}

export function getBuildID(buildURL: string) {
    return buildURL.match(/#(.*)/)[0];
}
export function requestBuild(buildURL: string, callback) {
    
    var id = getBuildID(buildURL);
    id = id.slice(1, id.length);
    // log(id);

    request(
        { uri: `https://firebasestorage.googleapis.com/v0/b/ffbeequip.appspot.com/o/PartyBuilds%2F${id}.json?alt=media` },
        function(error, response, body) {
            const $ = cheerio.load(body);
            log(`Build Found: ${id}`);
            callback(body);
        }
    );
}
export function getBuildText(buildData) {

    var unit = buildData.units[0];
    
    var build = new Build(unit);

    var allItems = [];
    
    unit.items.forEach((element, ind) => {
        
        // If only one item is found, equip it right away, otherwise wait for validation
        var itemInfo = Builder.getItems(element.id);
        var best = findBestItemVersion(build, element.slot, itemInfo);
        // log("Best Item Found");
        // log(best);

        build.addItem(best);

        allItems = allItems.concat(itemInfo);
    });

    build.setItemData(allItems);
    // allItems.forEach(element => {
    //     build.addItem(element);
    // });

    // log("Total Stats: ");
    // log(build.getTotalStats());

    var text = build.getText();

    //     text += `[${itemInfo.type}]: ${itemInfo.name}`;

    //     log(itemInfo);
    //     var stats = Object.keys(stat.total);
    //     stats.forEach(s => {
    //         if (itemInfo[s] != null) {
    //             text += `, ${s} ${itemInfo[s]}`;
    //         }
    //     });

    //     text += "\n";
    // });

    return text;
}