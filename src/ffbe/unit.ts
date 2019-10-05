//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import * as fs from "fs";
import * as constants from "../constants.js";
import { log, checkString, trace } from "../global.js";

////////////////////////////////////////////////////////////

const chainFamilies = JSON.parse(String(fs.readFileSync("data/chainfamilies.json")));
const ignoreEffectRegex = /grants.*passive|unlock.*\[.*CD\]/i;
const searchAliases = [
    { reg: /imbue/i, value: "add element" },
    { reg: /break/i, value: "break|reduce def|reduce atk|reduce mag|reduce spr"},
    { reg: /buff/i, value: "increase|increase atk|increase def|increase mag|increase spr"},
    { reg: /debuff/i, value: "debuff|decrease|reduce"},
    { reg: /imperil/i, value: "reduce resistance"},
    { reg: /mitigate/i, value: "mitigate|reduce damage"},
    { reg: /evoke/i, value: "evoke|evocation"},
    { reg: /tdh/i, value: "armed with a single weapon"},
    { reg: /tdw/i, value: "armed with two weapons"},
    { reg: /killers/i, value: "damage against"}
]
var unitDefaultSearch = "tmr|stmr";

////////////////////////////////////////////////////////////

// Convert search into valid regex
function convertToSkillSearch(search) {

    searchAliases.forEach(regex => {
        if (checkString(search, regex.reg)) {
            log(`Search contains a word to replace: ${regex.reg}`);
            search = search.replace(regex.reg, regex.value);
            log(`New Search: ${search}`);
        }
    });

    return search.replaceAll(" ",".*")
}

// Convert search parameters into valid regex
function convertParametersToSkillSearch(parameters) {
    var search = "";
    parameters.forEach((param, ind) => {
        if (ind > 0) 
            search += "|";
        search += param;
    });

    searchAliases.forEach(regex => {
        if (checkString(search, regex.reg)) {
            log(`Search contains a word to replace: ${regex.reg}`);
            search = search.replace(regex.reg, regex.value);
            log(`New Search: ${search}`);
        }
    });

    return search.replaceAll(" ",".*")
}


// Convert equipment to string
function equipToString(equip) {
    var effects = "";
    var slot = "";
    var stats = "";
    var fields = [];

    log(`Equip Name: ${equip.name}, Type: ${equip.type}`);

    if (equip.type == "EQUIP") {
        if (equip.effects) {
            equip.effects.forEach(effect => {
                if (!checkString(effect, /grants.*passive/i))
                    effects += `${effect}\n`;
            });
        }
    }
    
    if (equip.stats) {
        var statKeys = Object.keys(equip.stats);
        statKeys.forEach(key => {
            const stat = equip.stats[key];
            if (!stat) return;

            if (constants.statParameters.includes(key.toLowerCase())) {
                trace(`${key}; ${stat}, `);
                stats += `${key}: ${stat}, `;
            } else {
                stats += `\n${key.replaceAll("_", " ").toTitleCase(" ")}:\n`;
                var substatKeys = Object.keys(stat);
                substatKeys.forEach(subkey => {
                    const sub = stat[subkey];
                    if (!sub) return;
        
                    trace(`${subkey}; ${sub}, `);
                    stats += `${subkey}: ${sub}, `;
                });
            }
        });
    }

    if (equip.skills) {
        var skillKeys = Object.keys(equip.skills);
        skillKeys.forEach(key => {
            const skill = equip.skills[key];
            if (!skill) return;

            let subskill = "";
            skill.effects.forEach(eff => {
                trace(`${key}: ${eff}`);
                subskill += `${eff}\n`;
            });

            fields[fields.length] = {
                name: `${skill.name}`,
                value: subskill
            };
        });
    }

    if (equip.slot === "Weapon")
        slot = constants.weaponList[equip.type_id-1].toTitleCase(" ");
    else if (equip.type == "MATERIA")
        slot = "Materia";
    else
        slot = equip.slot;

    fields[fields.length] = {
        name: `${equip.name} - ${slot}`,
        value: `${stats}\n${effects}`
    };

    return fields;
}

// Transform array into frame data string
function arrayToString(array) {
    let str = "";
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        let num = parseInt(element);

        if (index > 0) {
            let prev = parseInt(array[index-1]);
            num = num - prev;
            if (num > 0) {
                str += `-${num}`;
            }
        } else {
            str += `${element}`;
        }
    }

    var fam = "Orphans";
    var keys = Object.keys(chainFamilies);
    for (let ind = 0; ind < keys.length; ind++) {
        const key = keys[ind];
        if (chainFamilies[key] === str.trim()) {
            fam = `${key}`;
            break;
        }
    }
    return {str: str, fam: fam };
}

/**function loadUnitItems(JP, tmr, stmr) {
    
    var equipment = fs.readFileSync(`../ffbe${JP}/equipment.json`);
    var equipList = JSON.parse(equipment.toString());
    equipment = null;

    var TMR = equipList[tmr];
    var STMR = equipList[stmr];
    equipList = null;

    if (!TMR || !STMR) {
        var materia = fs.readFileSync(`../ffbe${JP}/materia.json`);
        var materiaList = JSON.parse(materia.toString());

        if (materiaList[tmr]) TMR = materiaList[tmr];
        if (materiaList[stmr]) STMR = materiaList[stmr];

        materia = null;
        materiaList = null;
    }

    return {
        TMR: TMR,
        STMR: STMR
    }
} */

// Load unit data and cache.
function getUnitData(id) {

    var filename = `tempdata/${id}.json`;
    if (fs.existsSync(filename)) {
        log(`Loading cached unit: ${id}`)
        var u = fs.readFileSync(filename);
        return JSON.parse(u.toString());
    }

    var cat = id.slice(0, 3);
    var bigUnits = fs.readFileSync(`data/units/units-${cat}.json`);
    var unitsList = JSON.parse(bigUnits.toString());

    var unit = unitsList[id];
    
    unitsList = null;
    bigUnits = null;
    if (!unit) {
        log("Could not find unit data in GL");

        let jpList = JSON.parse(fs.readFileSync(`data/units/units-jp.json`).toString());
        if (!jpList[id]) {
            log("Could not find unit data in JP");
            return null;
        }

        unit = jpList[id];
    }

    log("Caching unit");
    if (!fs.existsSync(`tempdata/`))
        fs.mkdirSync( `tempdata/`, { recursive: true});
    if (!fs.existsSync(filename)) {
        fs.createWriteStream(filename);
    }
    fs.writeFileSync(filename, JSON.stringify(unit, null, "\t")); 

    return unit;
}

// Collect skill effect information
function collectSkillEffects(key, skills, keyword, total) {

    var skill = skills[key];
    var all = checkString(skill.name, keyword);
    //log(`Skill Name: ${skill.name}, All: ${all}`);
    
    let added = false;
    var reg = /\([^\)]+\)/g;
    let tempText = "";
    let skillMatches = false;
    for (let ind = 0; ind < skill.effects.length; ind++) {

        const effect = skill.effects[ind]
        if (checkString(effect, ignoreEffectRegex))
            continue;
        
        trace(`Skill Effect ${skill.name}: ${effect}, Keyword: ${keyword}, all: ${all}`);

        // Attempt to match the effect information with the search keywords.
        if (all || checkString(effect, keyword)) {
            skillMatches = true;

            trace(`adding skill: `, total);
            total += `${effect.replace(/\s\([0-9]+\)/g, "")}.\n`;

            // Find any subsequent ability ID's within the effect information and get their effects as well.
            let match = reg.exec(effect);
            do {
                if (!match) break;

                let k = match[0].replace("(", "").replace(")", "");
                let subskill = skills[k];
                if (k != key && subskill && subskill.name.includes(skill.name) 
                    && !checkString(subskill.effects[0], ignoreEffectRegex)) {

                    //log(match);
                    //log(`Sub Skill: ${subskill.name}, Effect: ${subskill.effects}`);
                    subskill.effects.forEach(sub => {
                        total += `${sub.replace(/\s\([0-9]+\)/g, "")}\n`;
                        added = true;
                    });

                    //total += collectSkillEffects(k, skills, keyword, total);
                }

                match = reg.exec(effect);
            } while(match);
        }
    }
        
    return total;
}

// Search unit data for skill information
function searchUnitSkills(unit, keyword: RegExp, active: boolean) {
    log(`Search Unit Skills: ${keyword}, active: ${active}`)

    var reg = /\([^\)]+\)/g;
    const LB = unit.LB;
    const skills = unit.skills;
    var found = [];
    var keys = Object.keys(skills);
    keys.forEach(key => {
        var skill = skills[key];
        var isPassive = skill.attack_type != "None" && !skill.cost;
        if ((active === false && !isPassive) || (active === true && isPassive)) {
            log(`Skipping Skill: ${skill.name} - ${skill.attack_type}`);
            return;
        }

        let total = collectSkillEffects(key, skills, keyword, "");
        //log("\nTotal Text\n");
        //log(total);
        
        for (let index = 0; index < found.length; index++) {
            const el = found[index];
            if (el.name == skill.name && el.value == total) {
                //log(`Found Duplicate`);
                //log(`Name: ${el.name}, Value: ${el.value}, S: ${s}`);
                return;
            }
        }

        if (total.empty()) return;

        // let unlocked = "";
        // if (skill.parentID) {
        //     let parent = `${skills[skill.parentID].name} (${skill.parentID})`;
        //     unlocked = ` - Unlocked By: ${parent}`;
        // }
        found[found.length] = {
            name: `${skill.name} - (${key}) - ${isPassive ? "Passive" : "Active"}`,
            value: total
        };
    });
        
    // Search LB
    if (LB && (active === undefined || active == true)) {
        let n = found.length;
        let s = "";
        let f = false;

        let all = checkString(LB.name, keyword);
        log(`LB Name: ${LB.name}, All: ${all}`);

        LB.max_level.forEach(effect => {
            s += `*${effect.replace(/\s\([0-9]+\)/g, "")}*\n`;
            if (all || checkString(effect, keyword)) {
                f = true;
            }
        });

        if (f) {
            found[n] = {
                name: `${LB.name} - MAX`,
                value: s
            };
        }
    }

    //log(`Searched Skills For: ${keyword}`);
    //log(found);

    return found;
}

// Search unit data for items
function searchUnitItems(unit, keyword: RegExp) {
    log(`searchUnitItems(${unit.name}, ${keyword})`);

    var found = [];

    // Collect information for unit LB
    const LB = unit.LB;
    if (LB && (checkString(LB.name, keyword) || checkString("lb", keyword))) {
        var n = found.length;
        var s = "";

        log(`LB Name: ${LB.name}`);

        LB.max_level.forEach(effect => {
            s += `*${effect}*\n`;
            found[n] = {
                name: `${LB.name} - MAX`,
                value: s
            };
        });
    }

    // Collect information for unit TMR
    const TMR = unit.TMR;
    if (TMR && checkString("tmr", keyword)) {
        var n = found.length;

        log(`TMR Name: ${TMR.name}, Type: ${TMR.type}`);
        found = found.concat(equipToString(TMR));
    }

    // Collect information for unit STMR
    const STMR = unit.STMR;
    if (STMR && checkString("stmr", keyword)) {
        var n = found.length;

        log(`STMR Name: ${STMR.name}, Type: ${STMR.type}`);
        found = found.concat(equipToString(STMR));
    }

    return found;
}

// Search unit data for attack frames
function searchUnitFrames(unit) {
    log(`Search Unit Frames: ${unit}`)

    const LB = unit.LB;
    const skills = unit.skills;
    var families = {};

    // Search skills for frame data
    var keys = Object.keys(skills);
    keys.forEach(key => {
        var skill = skills[key];
        if (skill.attack_type == "None" || !skill.attack_frames || 
            skill.attack_frames.length == 0 || skill.attack_frames[0].length <= 1) return;

        let frames = [];

        skill.attack_frames.forEach(element => {
            frames = frames.concat(element)
        });

        frames = frames.sort((a,b) => {
            return a - b;
        });
        //log(frames);
        let str = arrayToString(frames);
        if (!str.str.empty()) {
            let fam = `${str.fam}: ${str.str}`;
            if (!families[fam])
                families[fam] = [];

            if (families[fam].find(n => {return n == skill.name})) return;
            families[fam].push(skill.name);
        }
    });
        
    // Search LB
    if (LB && LB.attack_frames &&
        LB.attack_frames.length > 0 && LB.attack_frames[0].length > 1) {
        //log(LB.attack_frames);

        let str = arrayToString(LB.attack_frames[0]);
        if (str) {
            let fam = `${str.fam}: ${str.str}`;
            if (!families[fam])
                families[fam] = [];
            
            families[fam].push(`${LB.name} (LB)`);
        }
    }

    //log(`Searched Skill Frames`);
    //log(families);

    // Add the frame data to the fields array.
    var found = [];
    let famKeys = Object.keys(families);
    famKeys.sort((a, b) => {
        if (a.startsWith("Orphan"))
            return -1;
        else if (a < b)
            return 1;
        else 
            return -1;
    });
    famKeys.forEach(key => {
        const fam = families[key];
        let text = "";

        fam.forEach(skill => {
            text += `${skill}\n`;
        });

        found[found.length] = {
            name: key,
            value: text
        }
    });

    return found;
}

// Used to search unit information with search string
export function unitSearch(id: string, search: string): any {

    var unit = getUnitData(id);
    if (!unit) {
        log(`Could not find unit data: ${unit}`);
        return null;
    }

    if (!search || search.empty()) {
        search = unitDefaultSearch;
    }

    var fields = null;
    if (checkString(search, /frames|chain/i)) {
        log(`Search Unit Frames`)
        fields = searchUnitFrames(unit);
    } else if (checkString(search, /enhancement/i)) {
        log(`Search Unit Enhancemenents`)
        fields = searchUnitSkills(unit, /\+2$|\+1$/i, undefined);
    } else if (checkString(search, /cd/i)) {
        log(`Search Unit CD`)
        fields = searchUnitSkills(unit, /one.*use.*every.*turns/i, undefined);
    } else {
        log(`Search Unit Kit`)
        
        // Resolve search string
        
        var key = convertToSkillSearch(search);
        var keyword = new RegExp(key.replace(/_/g,".*"), "i");
        var items = searchUnitItems(unit, keyword);
        var skills = searchUnitSkills(unit, keyword, true);
        
        fields = skills.concat(items);
    }

    if (!fields || fields.length == 0) {
        log(`Failed to get unit skill list: ${search}`);
        return null;
    }

    return { name: unit.name, fields: fields };
}
export function unitSearchWithParameters(id: string, active: boolean, parameters): any {
    
    var unit = getUnitData(id);
    if (!unit) {
        log(`Could not find unit data: ${unit}`);
        return null;
    }

    var key = convertParametersToSkillSearch(parameters);
    var keyword = new RegExp(key.replace(/_/g,".*"), "i");
    var fields = searchUnitSkills(unit, keyword, active);
    if (!fields || fields.length == 0) {
        log(`Failed to get unit skill list: ${keyword}`);
        return null;
    }
    keyword = null;

    return { name: unit.name, fields: fields };
}