//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import * as request from "request";
import * as Constants from "../constants.js";
import { log, debug, trace } from "../global.js";
import { Builder } from "./builder.js";
import { LoginTicket } from "google-auth-library/build/src/auth/loginticket";

////////////////////////////////////////////////////////////

const ignoreItemKeys = [
    "id", "access", "type", "icon", "wikiEntry",
    "sortId", "rarity", "maxNumber", "tmrUnit",
    "stmrUnit", "eventName", "exclusiveUnits",
    "skillEnhancement", "special", "enhancements",
    "damageVariance", "equipedConditions"
];
export const statValues = [
    "hp",  "mp",  "atk", "def", "mag", "spr",
    "hp%", "mp%", "atk%", "mag%", "def%", "spr%"
];
export const elementList = ['fire','ice','lightning','water','wind','earth','light','dark'];
export const ailmentList = ['poison','blind','sleep','silence','paralysis','confuse','disease','petrification','death'];
const simpleStats = [
    "evoMag","accuracy","jumpDamage","lbFillRate","mpRefresh"
];
const complesStatsToString = [
    "ailments", "element", "killers",
    "evade", "notStackableSkills",
    "resist",
    "lbFillRate",
    "lbDamage",
    "mpRefresh",
    "lbPerTurn",
    "jumpDamage",
    "evoMag",
    "drawAttacks",
];
const itemEffects = [
    "partialDualWield",
    "singleWieldingOneHanded",
    "singleWielding",
    "dualWielding",
];
const complexStats = [
    "ailments", "element", "killers",
    "evade", "notStackableSkills",
    "resist",
    "lbFillRate",
    "partialDualWield",
    "accuracy",
    "killers",
    // "damageVariance",
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
];

interface Stats {
    hp:  number; "hp%":  number;
    mp:  number; "mp%":  number;
    atk: number; "atk%": number;
    def: number; "def%": number;
    mag: number; "mag%": number;
    spr: number; "spr%": number;
}
interface Unit {
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
    enhancements: any[];
    skills: any[];
}
interface BuildItem {
    "slot": number;
    "id": string;
    "pinned": boolean;
}

// Data loaded from the FFBEEquip Build file
interface BuildData {
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

    buildID: string; // build UUID from link
    buildRegion: string; // enum { gl, jp }
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
    constructor(buildID: string, region: string, buildData: any) {
        this.buildData = buildData;
        this.buildID = buildID;
        this.buildRegion = region;
        this.unitID = buildData.id;

        var lu = Builder.getUnit(region, buildData.id);
        if (this.buildData.rarity == 6 && lu["6_form"]) {
            this.loadedUnit = lu["6_form"];
        } else {
            this.loadedUnit = lu;
        }

        if (!this.loadedUnit)
            return null;

        // log("this.loadedUnit");
        // log(this.loadedUnit);
        // log("this.buildData");
        // log(this.buildData);

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

    init(loadedUnit: Unit, loadedItems: Item[]) {
    }

    getSlots(): any[] {
        return this.buildData.items;
    }
    getEquipment(): any[] {
        return this.equipment;
    }
    getEsperId(): string {
        return this.buildData.esperId;
    }
    getEquipmentInSlot(slot: number): any {

        const slots = this.getSlots();
        const element = slots.find((v, i) => {
            return v.slot == slot;
        });

        if (!element) 
            return null;

        const item = this.equipment.find((v, i) => {
            return v.id == element.id;
        });

        return item;
    }

    isDualWielding() {
        var s0 = this.getEquipmentInSlot(0);
        var s1 = this.getEquipmentInSlot(1);
        return (s0 && s1);
    }
    isDoublehanding() {
        var s0 = this.getEquipmentInSlot(0);
        var s1 = this.getEquipmentInSlot(1);
        return ((s0 && !s1) || (s1 && !s0))
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

        // log("add to equipment total");
        // log(item);
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
    combineNonStats(left: any, right: any): any {

    }
    getTotalBonuses() {

    }
    getTotalStats() {
     
        var passives = getUnitPassiveStats(this, this.loadedUnit);
        // log("\nUnit Passive Stats");
        // log(passives);
        var esper = Builder.getEsper(this.buildRegion, this.buildData.esperId);
        // log("\nEsper");
        // log(esper);
        var equipped = this.equipmentTotal;

        var unitStats = getUnitMaxStats(this.loadedUnit, passives, this.buildData.pots, 
            this.equipmentTotal, esper, this);
        // log("\nUnit Stats");
        // log(unitStats);

        // log("\nEquipment Total");
        // log(this.equipmentTotal);

        // log("\nStat Totals\n{\n");

        var totalBonuses = unitStats.bonuses;// getTotalBonuses(passives, equipped, esper);
        var totalStats = addOtherStats(unitStats.stats, passives);
        // log("\n{\nUnit Stats + Pasives");
        // log(total);

        // total = addOtherStats(total, this.equipmentTotal);
        // log("Unit Stats + Pasives + Equipment Total");
        // log(total);
        
        // if (esper)
            // total = addOtherStats(total, esper);

        // log("Unit Stats + Pasives + Equipment Total + Esper");
        // log(total);

        // log("\n}\n");
        //var killers = addOtherStats(total.killers)

        debug("Total Stats: ", totalStats);
        debug("Total Bonuses: ", totalBonuses);

        return {
            stats: totalStats,
            bonuses: totalBonuses
        };
    }

    // get a string representation of the build
    getText() {

        var text = "";
        var fields : {
            name: "",
            value: "",
            inline: true
        }[] = [];

        var add = function(n, v) {
            fields[fields.length] = {
                name: n,
                value: v,
                inline: true
            }
        }

        var total = this.getTotalStats().stats;

        // Total stats
        var across = 0;
        var stats = statValues;
        for (let index = 0; index < stats.length; index++) {
            const key = stats[index];

            if (!total[key])
                continue;

            across++;
            text += `[${key}]: ${total[key]} \t`;
            if (across % 3 == 0) {
                text += "\n";
            }

            add(key, total[key]);
        }

        stats = Object.keys(total);
        for (let index = 0; index < stats.length; index++) {
            const key = stats[index];
            const substat = total[key];

            if (!simpleStats.includes(key)) {
                // log("skipped substat: " + key);
                // log(substat);
                continue;
            }
            
            text += `[${key}]: ${substat}\n`;
            add(key, substat);
        }

        if (total.lbPerTurn) {
            text += `[lbPerTurn]: ${total.lbPerTurn.max}\n`;
            add("lbPerTurn", total.lbPerTurn.max);
        }
        
        // Add equipment
        this.equipment.forEach((itemInfo, ind) => {
    
            var n = `[${itemInfo.type}]: ${itemInfo.name}`;
            var v = itemToString(itemInfo);

            text += `${n}, ${v.toUpperCase()}\n`;
            add(n, v);
        });

        if (total.resist) {

            var resistance = total.resist;// getResistTotal(total.resist);
            // log(resistance);

            var a = "";
            var e = "";
            var resistKeys = Object.keys(resistance);
            resistKeys.forEach(resist => {
                if (ailmentList.includes(resist))
                    a += `${resist} ${resistance[resist].percent}, `;
                else
                    e += `${resist} ${resistance[resist].percent}, `;
            });

            add("ailment resist", a);
            add("element resist", e);
            
            text += `[element resist]: ${e}\n[ailment resist]: ${a}\n`;
        }
        
        if (total.killers) {

            var killers = total.killers;// getKillerTotal(total.killers);
            // log(killers);

            var killerKeys = Object.keys(killers);
            killerKeys.forEach(killer => {
                var k = `physical ${killers[killer].physical}, magical ${killers[killer].magical}`;
                text += `[${killer} killer]: ${k}\n`;
                add(`${killer} killer`, k);
            });

            text += "\n";
        }

        return {
            fields: fields,
            text: text
        };
    }

}

/////////////////////////////////////////////
/// BUILDER LOGIC

function isApplicable(item, unit: Unit) {
    if (item.exclusiveSex && item.exclusiveSex != unit.sex) {
        debug(`Item fails gender exlusivity`);
        return false;
    }
    if (item.exclusiveUnits && !item.exclusiveUnits.includes(unit.id)) {
        debug(`Item fails Unit exclusivity: `);
        debug(item.exclusiveUnits);
        return false;
    }
    return true;
}
function areConditionOK(item, B: Build, level = 0) {
    if (level && item.levelCondition && item.levelCondition > level) {
        debug(`Item fails to meet level condition`);
        return false;
    }
    if (item.equipedConditions) {
        for (var conditionIndex = item.equipedConditions.length; conditionIndex--;) {
            if (!isEquipedConditionOK(B, item.equipedConditions[conditionIndex])) {
                debug(`Item fails to meet equipment conditions`);
                debug(item.equipedConditions[conditionIndex]);
                return false;
            }
        }
    }
    return true;
}
function isEquipedConditionOK(B: Build, condition) {
    var equiped = B.equipment;
    debug("isEuipedConditionOk: Condition");
    debug(condition);

    if (Array.isArray(condition)) {
        return condition.some(c => isEquipedConditionOK(B, c));
    } else {
        if (elementList.includes(condition)) {
            debug("Checking Equipment Element Condition");
            if ((equiped[0] && equiped[0].element && equiped[0].element.includes(condition)) || (equiped[1] && equiped[1].element && equiped[1].element.includes(condition))) {
                return true;
            }
        } else if (B.equipedConditions.includes(condition)) {
            debug("Checking Equipment Condition");
            for (var equipedIndex = 0; equipedIndex < 10; equipedIndex++) {
                if (equiped[equipedIndex] && equiped[equipedIndex].type == condition) {
                    debug("Passed Equipment Condition");
                    return true;
                }
            }
        } else if (condition == "unarmed") {
            debug("Checking Unarmed Condition")
            if (!equiped[0] && ! equiped[1]) {
                debug("Passed Unarmed Condition");
                return true;
            }
        } else {
            debug("Checking Remaining Conditions");
            debug(equiped);
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

function getTotalBonuses(passives: any, equipmentTotal: any, esper: any) {
    
    // log("pots");
    // log(pots);
    // log("equipmentTotal");
    // log(equipmentTotal);
    // log("passives");
    // log(passives);

    var bonus = addToTotal(passives, equipmentTotal);
    if (esper) {
        // log("esper");
        // log(esper);

        bonus = addToTotal(bonus, esper);
    }

    return bonus;
}

// calculate the units max stats with the provided pots
function getUnitMaxStats(unit: Unit, passives: any, pots: any, equipmentTotal: any, esper: any, build: Build): any {

    debug("getUnitMaxStats:");
    debug("pots");
    debug(pots);
    debug("equipmentTotal");
    debug(equipmentTotal);
    debug("passives");
    debug(passives);
    if (esper) {
        debug("esper");
        debug(esper);
    }

    var bonus = getTotalBonuses(passives, equipmentTotal, esper);

    if (esper && esper.conditional) {
        esper.conditional.forEach((condition, i) => {
            if (condition.equipedCondition) {
                let equips = build.getEquipment();
                equips.forEach((e, j) => {
                    if (e.type == condition.equipedCondition) {
                        let keys = Object.keys(condition);
                        keys.forEach((k, ki) => {
                            if (!bonus[k]) 
                                bonus[k] = condition[k];
                            else
                                bonus[k] = parseInt(bonus[k]) + parseInt(condition[k]);
                        });
                    }
                });
            }
        });
    }

    debug("total bonuses");
    debug(bonus);

    debug("Applying Base Stats, Pots, and Bonus %");
    var total = {};
    var keys = Object.keys(pots);
    keys.forEach((k, i) => {
        
        let max = unit.stats.maxStats[k];
        let percent = bonus[`${k}%`];
        if (!percent) {
            percent = 0;
        } else if (percent > 400) {
            percent = 400;
        }
        
        let pot = pots[k];
        let eq = 0;
        if (equipmentTotal[k]) {
            eq = equipmentTotal[k];
        }
        
        let base = max + pot;
        trace(`${k}: max_stats + pot = base`);
        trace(`${k}: ${max} + ${pot} = ${base}`);
        let b1 = base + eq + ((percent / 100) * base);
        trace(`${k}: base + eq + (percent * base)`);
        trace(`${k}: ${base} + ${eq} + (${percent / 100} * ${base}) = ${b1}`);
        total[k] = b1;
    });

    // Add equipment bonuses
    debug("Adding Wielding Bonus")
    if (bonus.dualWielding && build.isDualWielding()) {
        // Add DW bonuses
        var keys = Object.keys(bonus.dualWielding);
        keys.forEach((k, i) => {
            if (!equipmentTotal[k])
                return;

            var b = bonus.dualWielding[k];
            if (b > 200)
                b = 200;

            if (k == "accuracy") {
                if (!total[k]) 
                    total[k] = b;

                total[k] = total[k] + b;
                return;
            }

            var t = (equipmentTotal[k] * (b / 100));
            trace(`${k}: (equipmentTotal} * (b / 100) = t`);
            trace(`${k}: (${equipmentTotal[k]} * ${b / 100}) = ${t}`);
            let t1 = total[k] + t;
            trace(`${k}: total_${k} + t`);
            trace(`${k}: ${total[k]} + ${t} = ${t1}`);
            total[k] = t1;
         });
    } else if (bonus.singleWielding && build.isDoublehanding()) {
        var keys = Object.keys(bonus.singleWielding);
        keys.forEach((k, i) => {
            if (!equipmentTotal[k])
                return;

            var b = bonus.singleWielding[k];
            if (b > 300)
                b = 300;

            if (k == "accuracy") {
                if (!total[k]) 
                    total[k] = b;

                total[k] = total[k] + b;
                return;
            }

            var t = (equipmentTotal[k] * (b / 100));
            trace(`${k}: (equipmentTotal} * (b / 100) = t`);
            trace(`${k}: (${equipmentTotal[k]} * ${b / 100}) = ${t}`);
            let t1 = total[k] + t;
            trace(`${k}: total_${k} + t`);
            trace(`${k}: ${total[k]} + ${t} = ${t1}`);
            total[k] = t1;
        });
    }

    // Add esper bonus
    debug("Add Esper Bonus: ");
    if (esper) {

        var keys = Object.keys(pots);
        keys.forEach((k, i) => {
            
            var e = Math.round(esper[k] / 100);
            trace(`${k}: esper_${k} / 100 = e`);
            var b = 0;
            if (bonus.esperStatsBonus && bonus.esperStatsBonus[k]) {
                b = e * (bonus.esperStatsBonus[k] / 100);
                trace(`${k}: e * esper_stats_bonus_${k}% = b`);
            }
            
            let e0 = total[k] + e + b;
            trace(`${k}: total_${k} + e + b`);
            trace(`${k}: ${total[k]} + ${e} + ${b} = ${e0}`);
            total[k] = e0;
        });
    }

    // Round all the stats to the right value
    var keys = Object.keys(total);
    keys.forEach((k, i) => {
        if (!Number.isNaN(parseInt(total[k]))) {
            debug(`Round(${total[k]}) = ${Math.round(total[k])}`);
            total[k] = Math.round(total[k]);
        }
    });

    return {
        stats: total,
        bonuses: bonus
    };
}
function getUnitPassiveStats(B: Build, unit: Unit): any {
    var stats = {};

    if (!unit.skills)
        return {};

    var passives = [];
    unit.skills.forEach((skill, i) => {
        //log("\nTesting Passive");
        //logData(skill);

        if (skill.equipedConditions && !isEquipedConditionOK(B, skill.equipedConditions)) {
            //log("Passive Skill Not Activated");
            return;
        }
        passives.push(skill);
        //log("Passive Passed\n");
    });

    passives.forEach((p, i) => {
        stats = addToTotal(stats, p);
    });

    if (unit.enhancements) {

        unit.enhancements.forEach(element => {
            //og("\nTesting Enhancement");
            //logData(element);
            if (element.levels && element.levels[2]) {
                let enh = element.levels[2];
                //logData(enh);

                if (enh.equipedConditions && !isEquipedConditionOK(B, enh.equipedConditions)) {
                    //log("Passive Enhancement Not Activated");
                    return;
                }

                enh.forEach(e => {
                    stats = addToTotal(stats, e);
                });
                //log("Enhancement Passed\n");
            }
        });
    }

    // log("passives");
    // log(passives);

    return stats;
}


function itemEffectToString(key: string, item: any): string {

    var t = JSON.stringify(item);
    t = t.replace(/[\[\]\(\"\{\}\"\)]/gi,'');
    t = t.replace(/:/gi, " ");
    t = t.replace(/,/gi, ", ");
    // log("Effect Text:" + t)
    t = t.replace(/accuracy.*?(|\w+|\n)(,|\S+)/g, " ");
    t = t.trim();
    // log("Edited Text: " + t)
    if (t.lastIndexOf(",") == t.length-1)
        t = t.slice(0, t.length - 1);

    var k = key.replace(/partialDualWield/g, "dw");
    k = k.replace(/singleWieldingOneHanded/g, "DH");
    k = k.replace(/singleWielding/g, "TDH");
    k = k.replace(/dualWielding/g, "TDW");

    return `${k}(${t})`;
}
export function itemToString(item: any): string {

    var v = "";
    var text = [];

    var stats = Object.keys(item);
    stats.forEach((s, i) => {

        if (statValues.includes(s) && item[s] != null) {
            if (s.includes("%"))
                text[text.length] = `${s.replace("%", "")} ${item[s]}%`;
            else
                text[text.length] = `${s} ${item[s]}`;
        } else if (itemEffects.includes(s)) {
            text[text.length] = `${itemEffectToString(s, item[s])}`;
        } else {
            // log(`${itemInfo.name}: [${s}]`)
            // log(itemInfo[s]);
        }
    });

    // log("unsorted");
    // log(text);

    text = sortStats(text);
    text.forEach((s, i) => {
        if (i > 0)
            v += `, `;

        v += s;
    });

    return v;
}
export function itemEnhancementsToString(item: any): string {

    var v = "";

    if (item.enhancements) {
        item.enhancements.forEach((element, index) => {
            if (index > 0 && index < item.enhancements.length)
                v += ", ";

            var label = Constants.itemEnhancementLabels[element];
            if (!label)
                return;
            
            if (element == "rare_3" || element == "rare_4") 
                v += label[item.type];
            else
                v += label;
        });
    }

    return v;
}

// Sorts a list of strings based on stat priority
export function sortStats(stats: string[]): string[] {
    var sorted = stats;

    sorted.sort((a, b): number  => {
        a = a.replace(/([0-9\s])\w+/g,"");
        b = b.replace(/([0-9\s])\w+/g,"");

        var ai = statValues.indexOf(a);
        var bi = statValues.indexOf(b);
        // log(`Compare: (${a})[${ai}] - (${b})[${bi}]`);

        if (ai < 0)
            return 1;
        if (bi < 0)
            return -1;

        if (ai > bi)
            return 1;
        else if (ai < bi || ai < 0)
            return -1;

        return 0;
    });

    // log("sorted");
    // log(sorted);
    return sorted;
}

/////////////////////////////////////////////
/// COMBINING AND MANAGING STATS

function isStat(name) {
    return simpleStats.includes(name) || statValues.includes(name);
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

        if (!item[key][stat]) {
            item[key][stat] = values[stat];
            continue;
        }

        item[key][stat] = item[key][stat] + values[stat];
    }

    return item;
}

function addStats(item1: any, item2: any): any {
    
    if (!item1) {
        item1 = item2;
    } else {
        item1 += item2;
    }

    return item1;
}
function addStatArrays(item1: any[], item2: any[]): any {

    let arrayTotal = {};

    if (!item1 || !Array.isArray(item1)) {
        arrayTotal = item1;
        item1 = [];
    }
    if (!arrayTotal)
        arrayTotal = {};
/*
    log("combine arrays")
    log(item1);
    log(item2);
    log(`Current Array Total`);
    log(arrayTotal);
    */

    /*
    var totalIndex = -1;
    var total = item1.find((v, i) => { 
        if (v.name == "total") { 
            totalIndex = i; 
            return true;
        }
        return false;
    });
    if (!total) {
        total = item2.find((v, i) => { 
            if (v.name == "total") { 
                totalIndex = i; 
                return true;
            }
            return false;
        });
    }*/

    item1 = item1.concat(item2);
    item1.forEach((element, index) => {
        if (!arrayTotal[element.name])
            arrayTotal[element.name] = {};

        arrayTotal[element.name] = addStatObjects(arrayTotal[element.name], element);
    });

    /*
    if (total) {
        item1[totalIndex] = addStatObjects(total, arrayTotal);
    }
    */

    // log(`Array Total`);
    // log(arrayTotal);

    return arrayTotal;
}
function addStatObjects(item1, item2): any {

    // log("addStatObjects");
    // log(item1);
    // log(item2);

    var stats = Object.keys(item2);
    for (var index = stats.length; index--;) {
        var stat = stats[index];
        var left = parseInt(item1[stat]);
        var right = parseInt(item2[stat]);

        if (Number.isNaN(right))
            continue;

        if (!item1[stat] || Number.isNaN(left)) {
            item1[stat] = right;
            continue;
        }

        item1[stat] = left + right;
    }

    return item1;
}
function combineStat(item1: any, item2: any, statKey) {
    var finalItem = item1;

    if (isStat(statKey)) {

        // log(`Combining Simple Stat: ${statKey}`);
        // log(finalItem);

        finalItem = addStats(finalItem, item2);
    } else if(Array.isArray(item2)) {

        // log(`Combining Stat Array: ${statKey}`);
        // log(finalItem);

        finalItem = addStatArrays(finalItem, item2);
    } else if(complexStats.includes(statKey)) {

        // log(`Combining Complex Stat: ${statKey}`);
        if (!finalItem) finalItem = {};

        // log(finalItem[statKey]);

        if (!finalItem) 
            finalItem = {};
    
        finalItem = addStatObjects(finalItem, item2);
    }

    // log("New Total");
    // log(finalItem);
    // log("---------");
    return finalItem;
}
function addToTotal(total: any, item2: any): any {
    var finalItem = total;
    var rightKeys = Object.keys(item2);

    for (let index = 0; index < rightKeys.length; index++) {
        const statKey = rightKeys[index];
        const statObj = item2[statKey];

        if (ignoreItemKeys.includes(statKey))
            continue;


        if (isStat(statKey)) {

            // log(`Combining Simple Stat: ${statKey}`);
            // log(finalItem[statKey]);

            if (!finalItem[statKey]) 
                finalItem[statKey] = 0;
            
            finalItem = addToStat(finalItem, statKey, item2[statKey]);
        } else if(Array.isArray(statObj)) {

            // log(`Combining Stat Array: ${statKey}`);
            // log(finalItem[statKey]);

            if (!finalItem[statKey]) 
                finalItem[statKey] = [];
        
            finalItem[statKey] = finalItem[statKey].concat(statObj);
        } else if(complexStats.includes(statKey)) {

            // log(`Combining Complex Stat: ${statKey}`);
            // log(finalItem[statKey]);

            if (!finalItem[statKey]) 
                finalItem[statKey] = {};
        
            finalItem = addStatObject(finalItem, statKey, item2[statKey]);
        }
    }

    return finalItem;
}
function addOtherStats(total: any, item2: any): any {
    var finalItem = total;
    var rightKeys = Object.keys(item2);

    // log("Add Other Stats Item 1");
    // log(total);
    // log("Add Other Stats Item 2");
    // log(item2);
    
    for (let index = 0; index < rightKeys.length; index++) {
        const statKey = rightKeys[index];
        const statObj = item2[statKey];

        if (ignoreItemKeys.includes(statKey) || statValues.includes(statKey))
            continue;

        finalItem[statKey] = combineStat(finalItem[statKey], statObj, statKey);

        /*
        if (isStat(statKey)) {
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
        */
    }

    return finalItem;
}

function getResistTotal(resistList: any[]): any {
    var resistance = {};
    resistList.forEach(resist => {
        if (!resistance[resist.name])
            resistance[resist.name] = 0;

        resistance[resist.name] = parseInt(resistance[resist.name]) + parseInt(resist.percent);
    });

    return resistance;
}

function getKillerTotal(killerList: any[]): any {
    var killers = {};
    killerList.forEach(kill => {
        if (!killers[kill.name]) 
            killers[kill.name] = {physical:0, magical:0};

        killers[kill.name].physical = parseInt(killers[kill.name].physical) + parseInt(kill.physical);
        killers[kill.name].magical  = parseInt(killers[kill.name].magical ) + parseInt(kill.magical);
    });

    return killers;
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

        // log(`Stat Key: ${statKey}`);

        if (isStat(statKey)) {
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

            trace("Adding Enchantment: ", enhancementValue);
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

    if (itemWithVariation.length == 0) {
        log(`Error, could not find item in slot, ${slot}`);
        return null;
    }

    var item = itemWithVariation[0];
    trace("Find Best Item")
    trace("Base Item: ", item)

    if (itemWithVariation.length == 1) {
        // if there are no variations of the item, it is fine
        if (isApplicable(item, B.loadedUnit) 
            && (!item.equipedConditions || areConditionOK(item, B))) {
            
            var enh = B.getItemEnchantments(slot);
            if (enh) {
                trace("Has Enhancements: ", enh)
                return applyEnchantments(item, enh);
            }

            return item;
        }

        log(`Conditions Not Met`);

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
        trace("Variations: ", itemWithVariation)

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
                    trace("Variant Item With Enchantments ", itemWithVariation[index]);
                    return applyEnchantments(itemWithVariation[index], enh);
                } else {
                    trace("Best Found ", itemWithVariation[index]);
                    return itemWithVariation[index];
                }
            }
        }

        item = itemWithVariation[0];
        var result = {
            "id":item.id, "name":item.name, "jpname":item.jpname, 
            "icon":item.icon, "type":item.type, 
            "access":["Conditions not met"], "enhancements":item.enhancements
        };

        if (item.special && item.special.includes("notStackable")) {
            result["special"] = ["notStackable"];
        }
        
        trace("Default Found", item);
        return result;
    }
}

export function getBuildID(buildURL: string) {
    return buildURL.match(/#(.*)/)[0];
}
export function getBuildRegion(buildURL: string) {
    return buildURL.match(/server=(.*)#/)[1];
}
export function requestBuildData(buildURL: string, callback) {

    log(`Request Build Data URL: ${buildURL}`);
    var region = getBuildRegion(buildURL).toLowerCase();
    var id = getBuildID(buildURL);
    id = id.slice(1, id.length);
    // log(region);
    // log(id);

    request(
        { uri: `https://firebasestorage.googleapis.com/v0/b/ffbeequip.appspot.com/o/PartyBuilds%2F${id}.json?alt=media` },
        function(error, response, body) {
            if (error || response.statusCode != 200 || body.empty()) {
                error(`Build Not Found: ${id}`);
                return;
            }

            log(`Build Found: (${region}) - ${id}`);
            callback(id, region, body);
        }
    );
}
export function getBuildText(id: string, region: string, buildData) {

    var build = CreateBuild(id, region, buildData);
    if (!build)
        return null;

    var text = build.getText();
    return text;
}
export function CreateBuild(id: string, region: string, buildData): Build {

    var build = new Build(id, region, buildData);
    if (!build)
        return null;

    log("Create Build: ", buildData);

    var allItems = [];
    buildData.items.forEach((element, ind) => {
        
        // If only one item is found, equip it right away, otherwise wait for validation
        var itemInfo = Builder.getItems(region, element.id);
        var best = findBestItemVersion(build, ind, itemInfo);
        if (best == null)
            return;
        // log("Best Item Found");
        // log(best);

        build.addItem(best);

        allItems = allItems.concat(itemInfo);
    });

    build.setItemData(allItems);

    return build;
}