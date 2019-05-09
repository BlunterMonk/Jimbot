const fs = require("fs");

var gldump = fs.readFileSync('../ffbe/units.json');
var unitsListGL = JSON.parse(gldump.toString());
var jpdump = fs.readFileSync('../ffbe-jp/units.json');
var unitsListJP = JSON.parse(jpdump.toString());
gldump = null;
jpdump = null;

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

    // var bigUnits = fs.readFileSync('../ffbe/units.json');
    // var unitsList = JSON.parse(bigUnits.toString());

    let unit = unitsListGL[id];
    
    //unitsList = null;
    //bigUnits = null;
    let JP = ""; // this is to tell the skill search to use JP data.
    if (!unit) {
        unit = null;

        JP = "-jp";
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


    var bigSkills = fs.readFileSync(`../ffbe${JP}/skills.json`);
    var skillList = JSON.parse(bigSkills.toString());
    bigSkills = null;
    
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



    skillList = null;
        
    //log(skillData);
    return skillData;
}
function getSkillWithIDs(skillKeys, JP) {

    var bigSkills = fs.readFileSync(`../ffbe${JP}/skills.json`);
    var skillList = JSON.parse(bigSkills.toString());
    bigSkills = null;
    
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
    skillList = null;

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
    
    var limitbursts = fs.readFileSync(`../ffbe${JP}/limitbursts.json`);
    var limitburstsList = JSON.parse(limitbursts.toString());
    limitbursts = null;

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

    var bigEnh = fs.readFileSync(`../ffbe${JP}/enhancements.json`);
    var enhList = JSON.parse(bigEnh.toString());
    bigEnh = null;

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
    
    var equipment = fs.readFileSync(`../ffbe${JP}/equipment.json`);
    var equipList = JSON.parse(equipment.toString());
    equipment = null;

    var TMR = equipList[tmr];
    var STMR = equipList[stmr];
    equipList = null;

    if (TMR) TMR.type = "EQUIP";
    if (STMR) STMR.type = "EQUIP";

    if (!TMR || !STMR) {
        var materia = fs.readFileSync(`../ffbe${JP}/materia.json`);
        var materiaList = JSON.parse(materia.toString());

        if (materiaList[tmr]) {
            TMR = materiaList[tmr];
            TMR.type = "MATERIA";
        }
        if (materiaList[stmr]) {
            STMR = materiaList[stmr];
            STMR.type = "MATERIA";
        } 

        materia = null;
        materiaList = null;
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