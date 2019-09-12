//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as request from "request";
import * as fs from "fs";
import * as cheerio from "cheerio";

import { log, logData, checkString, compareStrings, escapeString } from "../global.js";
import "../string/string-extension.js";
import {Cache, cache} from "../cache/cache.js";
import * as constants from "../constants.js";
import {Builder} from "./builder.js";

class Stats {
    hp:  number; "hp%":  number;
    mp:  number; "mp%":  number;
    atk: number; "atk%": number;
    def: number; "def%": number;
    mag: number; "mag%": number;
    spr: number; "spr%": number;
}

class Unit {
    name: string;
    id: string;
    max_rarity: string;
    min_rarity: string;
    sex: string;
    stats: any;
    stats_pattern: number;
    equip: string[];
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
}

class Build {
    loadedItems: Item[]; // list of loaded items
    unitID: string; // ID of unit being built
    unit: Unit; // unit information
    total: any; // total stats
    equipment: any[]; // list of valid equipment
    // Extra boons from equipment
    equipedConditions: string[]; // Criteria that has been met based on the items given
    allowUseOf: string[]; // equipment types allowed to be used by current items
    killers: any; // total killers, {name:{physical:number,magical:number}}
    resist: any; // total resistances, {percent:number}
    TDW: any; // total TDH equipment bonus
    TDH: any; // total TDW equipment bonus
    constructor(unitID: string) {
        this.unitID = unitID;
        this.unit = Builder.getUnit(unitID);

        this.total = {
            "hp":  "0", "hp%":  "0",
            "mp":  "0", "mp%":  "0",
            "atk": "0", "atk%": "0",
            "def": "0", "def%": "0",
            "mag": "0", "mag%": "0",
            "spr": "0", "spr%": "0",
            "lbFillRate": "0"
        };

        this.TDW = {
            "atk": "0",
            "mag": "0",
            "def": "0",
            "spr": "0",
            "accuracy": "0"
        };

        this.TDH = {
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
    }

    // Finalize the item as equipment and add its stats to the build total
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


    // get a string representation of the build
    getText() {
        var text = "";
        this.equipment.forEach((itemInfo, ind) => {
    
            text += `[${itemInfo.type}]: ${itemInfo.name}`;
    
            var stats = Object.keys(this.total);
            stats.forEach(s => {
                if (itemInfo[s] != null) {
                    text += `, ${s} ${itemInfo[s]}`;
                }
            });
            text += "\n";
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
function findBestItemVersion(B: Build, itemWithVariation: any[], unit: Unit) {

    if (itemWithVariation.length == 1) {
        // if there are no variations of the item, it is fine
        //if (isApplicable(item, unit) && (!item.equipedConditions || areConditionOK(item, build))) {
            return itemWithVariation[0];    
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
            if (isApplicable(itemWithVariation[index], unit) && areConditionOK(itemWithVariation[index], B)) {
                // if (item.enhancements) {
                //     return applyEnhancements(itemWithVariation[index], item.enhancements);
                // } else {
                    return itemWithVariation[index];
                // }
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
    var unitInfo = Builder.getUnit(unit.id);
    
    var build = new Build(unit.id); 

    var items = [];
    var allItems = [];
    
    unit.items.forEach((element, ind) => {
        
        // If only one item is found, equip it right away, otherwise wait for validation
        var itemInfo = Builder.getItems(element.id);
        var best = findBestItemVersion(build, itemInfo, build.unit);
        log("Best Item Found");
        log(best);

        build.addItem(best);

        allItems = allItems.concat(itemInfo);
    });

    build.setItemData(allItems);
    // allItems.forEach(element => {
    //     build.addItem(element);
    // });

    //log(build);
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