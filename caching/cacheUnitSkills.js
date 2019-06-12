const fs = require("fs");

var unitsList = JSON.parse(fs.readFileSync('../ffbe/units.json').toString());
var unitsListJP = JSON.parse(fs.readFileSync('../ffbe-jp/units.json').toString());
Object.keys(unitsListJP).forEach(key => {
    if (!unitsList[key]) { // if GL list doesn't have the JP key, add it
        unitsList[key] = unitsListJP[key];
    }
});
unitsListJP = null;
function getUnit(ID, JP) {
    return skillList[ID];
}

var skillList = JSON.parse(fs.readFileSync(`../ffbe/skills.json`).toString());
var skillListJP = JSON.parse(fs.readFileSync(`../ffbe-jp/skills.json`).toString());
Object.keys(skillListJP).forEach(key => {
    if (!skillList[key]) { // if GL list doesn't have the JP key, add it
        skillList[key] = skillListJP[key];
    }
});
skillListJP = null;
function getSkill(ID, JP) {
    return skillList[ID];
}

var enhList = JSON.parse(fs.readFileSync(`../ffbe/enhancements.json`).toString());
var enhListJP = JSON.parse(fs.readFileSync(`../ffbe-jp/enhancements.json`).toString());
Object.keys(enhListJP).forEach(key => {
    if (!enhList[key]) { // if GL list doesn't have the JP key, add it
        enhList[key] = enhListJP[key];
    }
});
enhListJP = null;
function getEnhancedSkill(ID, JP) {
    return enhList[ID];
}

var equipList = JSON.parse(fs.readFileSync(`../ffbe/equipment.json`).toString());
var equipListJP = JSON.parse(fs.readFileSync(`../ffbe-jp/equipment.json`).toString());
Object.keys(equipListJP).forEach(key => {
    if (!equipList[key]) { // if GL list doesn't have the JP key, add it
        equipList[key] = equipListJP[key];
    }
});
equipListJP = null;
function getEquip(ID, JP) {
    return equipList[ID];
}

var materiaList = JSON.parse(fs.readFileSync(`../ffbe/materia.json`).toString());
var materiaListJP = JSON.parse(fs.readFileSync(`../ffbe-jp/materia.json`).toString());
Object.keys(materiaListJP).forEach(key => {
    if (!materiaList[key]) { // if GL list doesn't have the JP key, add it
        materiaList[key] = materiaListJP[key];
    }
});
materiaListJP = null;
function getMateria(ID, JP) {
    return materiaList[ID];
}

var limitburstsList = JSON.parse(fs.readFileSync(`../ffbe/limitbursts.json`).toString());
var limitburstsListJP = JSON.parse(fs.readFileSync(`../ffbe-jp/limitbursts.json`).toString());
Object.keys(limitburstsListJP).forEach(key => {
    if (!limitburstsList[key]) { // if GL list doesn't have the JP key, add it
        limitburstsList[key] = limitburstsListJP[key];
    }
});
limitburstsListJP = null;
function getLimitBurst(ID, JP) {
    return limitburstsList[ID];
}


log("loading units list")
//cacheUnit("401001405");
//cacheUnit("401006805");
cacheAll();

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
    
    var units = Object.values(unitsDump);
    units = units.sort();

    let index = 1;
    var cachedUnits = {};
    for (let i = 0; i < units.length; i++) {
        const id = units[i];
        const cat = parseInt(id[0]);

        if (!cachedUnits[id]) {
            log(`id(${id}), cat(${cat})`);
            var data = getUnitData(id);
            if (data) {
                cachedUnits[id] = data;
            }
        }
        
        if (cat > index) {
            if (Object.keys(cachedUnits).length == 0) {
                log(`Empty Buffer`);
                index++;
                continue;
            }
            
            if (!fs.existsSync(`data/`))
                fs.mkdirSync( `data/`, { recursive: true});
            if (!fs.existsSync(`data/units-${index}.json`)) {
                fs.createWriteStream(`data/units-${index}.json`);
            }
            
            fs.writeFileSync(`data/units-${index}.json`, JSON.stringify(cachedUnits));
            cachedUnits = {};

            index = cat;
        }
    }
}


function log(data) {
    console.log(data);
}
function getUnitData(id) {

    let unit = unitsList[id];
    
    let JP = false; // this is to tell the skill search to use JP data.
    if (!unit) {
        unit = null;

        JP = true;
        unit = unitsListJP[id];
    
        if (!unit) {
            log("Could not find unit data " + id);
            unit = null;
            return null;
        }
    }

    // load unit skills
    let skills = getSkillsFromUnit(unit, JP, id);

    // load unit LB
    let lb = getLBFromUnit(unit, JP);
    if (lb) unit.LB = lb;

    // load unit items
    let tmr = -1;
    let stmr = -1;
    if (unit.TMR) tmr = unit.TMR[1];
    if (unit.sTMR) stmr = unit.sTMR[1];
    let items = getUnitItems(JP, tmr, stmr);
    if (items.TMR) {
        if (items.TMR.skills && items.TMR.skills.length > 0)
            items.TMR.skills = getSkillWithIDs(items.TMR.skills, JP)
    }
    if (items.STMR) {
        if (items.STMR.skills && items.STMR.skills.length > 0)
            items.STMR.skills = getSkillWithIDs(items.STMR.skills, JP)
    }

    // load unit enhancements 
    //unit.enhancements = getEnhancements(id, JP);

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
function getSkillsFromUnit(unit, JP, unitId) {

    let skills = unit.skills;
    if (!skills || !unit) {
        return null;
    }

    let skillKeys = [];1
    skills.forEach(skill => {
        skillKeys.push(skill.id);
    });

    var reg = /\([^\)]+\)/g;
    let extraKeys = [];
    let skillData = {};
    skillKeys.forEach(key => {
        const skill = getSkill(key, JP);
        skillData[key] = trimSkill(skill, "");
                    
        skill.effects.forEach(effect => {
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
        const skill = getSkill(key, JP);
        if (!skill || skillData[key])
            return;

        //log(skillList[key]);
        skillData[key] = trimSkill(skill, "");
    });

    let enhancements = getEnhancementsFromUnit(parseInt(unitId), JP);
    if (enhancements.length > 0) {
        //log(enhancements);
        //skillKeys = skillKeys.concat(enhancements);
        enhancements.forEach(enh => {
            const key = enh.skill_id_new;
            const old = enh.skill_id_old;
            const skill = getSkill(key, JP);
            //log(`Enh: ${old}, ${key}, ${key - old}`);
            if (key - old == 1) {
                skillData[key] = trimSkill(skill, "+2");
            } else {
                skillData[key] = trimSkill(skill, "+1");
            }
        });
    }

    //log(skillData);
    return skillData;
}
function getSkillWithIDs(skillKeys, JP) {

    var skillData = {};
    skillKeys.forEach(key => {
        const skill = getSkill(key, JP);
        var desc = "";
        if (skill.strings && skill.strings.desc_short)
            desc = skill.strings.desc_short[0];

        skillData[key] = {
            name:            skill.name,
            type:            skill.type,
            active:          skill.active,
            cost:            skill.cost,
            attack_frames:   skill.attack_frames,
            attack_type:     skill.attack_type,
            element_inflict: skill.element_inflict,
            effects:         skill.effects,
            icon:            skill.icon,
            desc: desc
        }
    });

    return skillData;
}
function getLBFromUnit(unit, JP) {
    var entries = unit.entries;
    if (!entries) {
        return null;
    }

    var keys = Object.keys(entries);
    if (keys.length == 0) {
        return null;
    }

    var id = entries[keys[keys.length-1]].limitburst_id;
    
    var limit = getLimitBurst(id);
    if (!limit) {
        return null;
    }

    //log("Found Limit");
    //log(limit);
    return trimLimit(limit);
}
function getEnhancementsFromUnit(unit, JP) {

    var IDs = [];
    var enhancements = Object.values(enhList);
    enhancements.forEach(enh => {
        if (enh.units.includes(unit)) {
            IDs[IDs.length] = enh;
        }
    });

    return IDs;
}
function getUnitItems(JP, tmr, stmr) {
    
    var TMR = getEquip(tmr);
    var STMR = getEquip(stmr);

    if (TMR) TMR.type = "EQUIP";
    if (STMR) STMR.type = "EQUIP";

    if (!TMR || !STMR) {

        if (getMateria(tmr)) {
            TMR = getMateria(tmr);
            TMR.type = "MATERIA";
        }
        if (getMateria(stmr)) {
            STMR = getMateria(stmr);
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
function trimLimit(limit) {
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