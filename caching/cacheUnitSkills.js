const fs = require("fs");

var unitsListGL = JSON.parse(fs.readFileSync('../ffbe/units.json').toString());
var unitsListJP = JSON.parse(fs.readFileSync('../ffbe-jp/units.json').toString());

var JP = "";
var passives = JSON.parse(fs.readFileSync(`../ffbe${JP}/skills_passive.json`).toString());
var abilities = JSON.parse(fs.readFileSync(`../ffbe${JP}/skills_ability.json`).toString());
var magic = JSON.parse(fs.readFileSync(`../ffbe${JP}/skills_magic.json`).toString());
var skillList = Object.assign({}, passives, abilities, magic);
passives = null;
abilities = null;
magic = null;

var limitburstsList = JSON.parse(fs.readFileSync(`../ffbe${JP}/limitbursts.json`).toString());
var enhList = JSON.parse(fs.readFileSync(`../ffbe${JP}/enhancements.json`).toString());
var equipList = JSON.parse(fs.readFileSync(`../ffbe${JP}/equipment.json`).toString());
var materiaList = JSON.parse(fs.readFileSync(`../ffbe${JP}/materia.json`).toString());
// var equipList = Object.assign({}, passives, abilities, magic);

function log(data) {
    console.log(data);
}

log("loading units list")
//cacheUnit("401001405");
//cacheUnit("401006805");
cacheAll();
log("Finished Updating Skills");

function cacheUnit(id) {
    var data = getUnitData(id);
    if (data) {
    
        if (!fs.existsSync(`tempdata/`))
            fs.mkdirSync( `tempdata/`, { recursive: true});

        fs.writeFileSync(`tempdata/${id}.json`, JSON.stringify(data, null, "\t"));
    }
}

function cacheAll() {
    var data = fs.readFileSync("data/unitkeys.json");
    var unitsDump = JSON.parse(String(data));
    
    var jpUnits = [];

    var units = Object.values(unitsDump);
    units = units.sort();

    var grandTotal = {};
    for (let i = 0; i < units.length; i++) {
        const id = units[i];
        const cat = id.slice(0, 3);
        if (!grandTotal[cat]) {
            grandTotal[cat] = {};
        }

        if (!grandTotal[cat][id]) {
            // log(`id(${id}), cat(${cat})`);

            var data = getUnitData(unitsListGL, id);
            if (data) {
                grandTotal[cat][id] = data; 
            } else {
                // log(`JP: ${id}`);
                jpUnits.push(id);
            }
        }
    }

    var cats = Object.keys(grandTotal);
    cats.forEach(cat => {
        if (!fs.existsSync(`data/units/`))
            fs.mkdirSync( `data/units/`, { recursive: true});
        if (!fs.existsSync(`data/units/units-${cat}.json`)) {
            fs.createWriteStream(`data/units/units-${cat}.json`);
        }
        
        fs.writeFileSync(`data/units/units-${cat}.json`, JSON.stringify(grandTotal[cat]));
    });

    // log("Units unique to JP");
    // log(jpUnits);
    cacheJP(jpUnits);
}

function cacheJP(units) {
    JP = "-jp";
    passives = JSON.parse(fs.readFileSync(`../ffbe${JP}/skills_passive.json`).toString());
    abilities = JSON.parse(fs.readFileSync(`../ffbe${JP}/skills_ability.json`).toString());
    magic = JSON.parse(fs.readFileSync(`../ffbe${JP}/skills_magic.json`).toString());
    skillList = Object.assign({}, passives, abilities, magic);
    passives = null;
    abilities = null;
    magic = null;
    limitburstsList = JSON.parse(fs.readFileSync(`../ffbe${JP}/limitbursts.json`).toString());
    enhList = JSON.parse(fs.readFileSync(`../ffbe${JP}/enhancements.json`).toString());
    equipList = JSON.parse(fs.readFileSync(`../ffbe${JP}/equipment.json`).toString());
    materiaList = JSON.parse(fs.readFileSync(`../ffbe${JP}/materia.json`).toString());

    units = units.sort();

    var grandTotal = {};
    for (let i = 0; i < units.length; i++) {
        const id = units[i];
        const cat = id.slice(0, 3);
        if (!grandTotal) {
            grandTotal = {};
        }

        if (!grandTotal[id]) {
            // log(`id(${id}), cat(${cat})`);

            var data = getUnitData(unitsListJP, id);
            if (data) {
                grandTotal[id] = data; 
            } else {
                log(`Couldn't cache ${id}`);
            }
        }
    }

    if (!fs.existsSync(`data/units/`))
        fs.mkdirSync( `data/units/`, { recursive: true});
    if (!fs.existsSync(`data/units/units-jp.json`)) {
        fs.createWriteStream(`data/units/units-jp.json`);
    }
    
    fs.writeFileSync(`data/units/units-jp.json`, JSON.stringify(grandTotal));
}

function getUnitData(unitsList, id) {

    let unit = unitsList[id];
    if (!unit) {
        return null;
    }

    // load unit skills
    let skills = getSkillsFromUnit(unit, id);

    // load unit LB
    let lb = getLBFromUnit(unit);
    if (lb) unit.LB = lb;

    // load unit items
    let tmr = -1;
    let stmr = -1;
    if (unit.TMR) tmr = unit.TMR[1];
    if (unit.sTMR) stmr = unit.sTMR[1];
    let items = getUnitItems(tmr, stmr);
    if (items.TMR) {
        if (items.TMR.skills && items.TMR.skills.length > 0)
            items.TMR.skills = getSkillWithIDs(items.TMR.skills)
    }
    if (items.STMR) {
        if (items.STMR.skills && items.STMR.skills.length > 0)
            items.STMR.skills = getSkillWithIDs(items.STMR.skills)
    }

    // load unit enhancements 
    //unit.enhancements = getEnhancements(id);

    return {
        rarity_min: unit.rarity_min,
        rarity_max: unit.rarity_max,
        name:       unit.name,
        game:       unit.game,
        job:        unit.job,
        sex:        unit.sex,
        equip:      unit.equip,
        entries:    unit.entries,
        skills:     skills,
        LB:         lb,
        TMR:        items.TMR,
        STMR:       items.STMR,
    };
}
function getSkillsFromUnit(unit, unitId) {

    let skills = unit.skills;
    if (!skills || !unit) {
        return null;
    }

    let skillKeys = [];
    skills.forEach(skill => {
        skillKeys.push(skill.id);
    });
    
    var reg = /\([^\)]+\)/g;
    let extraKeys = [];
    let skillData = {};
    skillKeys.forEach(key => {
        skillData[key] = trimSkill(skillList[key], "");
                    
        skillList[key].effects.forEach(effect => {
            let match = reg.exec(effect);
            while(match) {
                //log(match);
                extraKeys.push(match[0].replace("(", "").replace(")", ""));
                match = reg.exec(effect);
            }
        });
    });
    //log(`\nExtra Keys`);
    //log(extraKeys);
    extraKeys.forEach(key => {
        if (!skillList[key] || skillData[key]) return;

        //log(skillList[key]);
        skillData[key] = trimSkill(skillList[key], "");
    });

    let enhancements = getEnhancementsFromUnit(parseInt(unitId), skillList, JP);
    if (enhancements.length > 0) {
        //log(enhancements);
        //skillKeys = skillKeys.concat(enhancements);
        enhancements.forEach(enh => {
            const key = enh.skill_id_new;
            const old = enh.skill_id_old;
            //log(`Enh: ${old}, ${key}, ${key - old}`);
            if (key - old == 1) {
                skillData[key] = trimSkill(skillList[key], "+2");
            } else {
                skillData[key] = trimSkill(skillList[key], "+1");
            }
        });
    }

    //log(skillData);
    return skillData;
}
function getSkillWithIDs(skillKeys) {
    
    var skillData = {};
    skillKeys.forEach(key => {
        var desc = "";
        if (skillList[key].strings && skillList[key].strings.desc_short)
            desc = skillList[key].strings.desc_short[0];

        skillData[key] = {
            name: skillList[key].name,
            type: skillList[key].type,
            active: skillList[key].active,
            cost: skillList[key].cost,
            attack_frames: skillList[key].attack_frames,
            attack_type: skillList[key].attack_type,
            element_inflict: skillList[key].element_inflict,
            effects: skillList[key].effects,
            icon: skillList[key].icon,
            desc: desc
        }
    });

    return skillData;
}
function getLBFromUnit(unit) {
    var entries = unit.entries;
    if (!entries) {
        return null;
    }

    var keys = Object.keys(entries);
    if (keys.length == 0) {
        return null;
    }

    var id = entries[keys[keys.length-1]].limitburst_id;

    var limit = limitburstsList[id];
    if (!limit) {
        return null;
    }

    //log("Found Limit");
    //log(limit);
    return {
        name: limit.name,
        attack_count: limit.attack_count,
        attack_frames: limit.attack_frames,
        damage_type: limit.damage_type,
        element_inflict: limit.element_inflict,
        min_level: limit.min_level,
        max_level: limit.max_level,
        string: limit.strings
    };
}
function getEnhancementsFromUnit(unit, skillList, JP) {

    var IDs = [];
    var enhancements = Object.values(enhList);
    enhancements.forEach(enh => {
        if (enh.units.includes(unit)) {
            IDs[IDs.length] = enh;
        }
    });

    return IDs;
}
function getUnitItems(tmr, stmr) {

    var TMR = equipList[tmr];
    var STMR = equipList[stmr];

    if (TMR) TMR.type = "EQUIP";
    if (STMR) STMR.type = "EQUIP";

    if (!TMR || !STMR) {
        if (materiaList[tmr]) {
            TMR = materiaList[tmr];
            TMR.type = "MATERIA";
        }
        if (materiaList[stmr]) {
            STMR = materiaList[stmr];
            STMR.type = "MATERIA";
        } 
    }

    return {
        TMR: TMR,
        STMR: STMR
    }
}


function trimSkill(skill, enh) {
    return {
        name:               `${skill.name}${enh}`,
        type:               skill.type,
        active:             skill.active,
        cost:               skill.cost,
        attack_frames:      skill.attack_frames,
        attack_type:        skill.attack_type,
        element_inflict:    skill.element_inflict,
        effects:            skill.effects,
        icon:               skill.icon,
        strings:            skill.strings
    }
}
