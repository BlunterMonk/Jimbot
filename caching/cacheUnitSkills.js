const fs = require("fs");

log("loading units list")
//cacheUnit("401006805");
cacheAll();

function cacheUnit(id) {
    var data = getUnitData(id);
    if (data) {
    
        if (!fs.existsSync(`tempdata/`))
            fs.mkdirSync( `tempdata/`, { recursive: true});
        if (!fs.existsSync(`tempdata/units-54325${id}.json`)) {
            fs.createWriteStream(`tempdata/units-54325${id}.json`);
        }
        fs.writeFileSync(`tempdata/units-${id}.json`, JSON.stringify(data, null, "\t"));
    }
}

function cacheAll() {
    var data = fs.readFileSync("data/unitkeys.json");
    var unitsDump = JSON.parse(String(data));
    
    var units = Object.keys(unitsDump);
    var cachedUnits = {};

    for (let index = 0; index <= 9; index++) {
        log(`Loading Units: ${index}`);
        for (let i = 0; i < units.length; i++) {
            const key = units[i];
            const id = unitsDump[key];
            const cat = parseInt(id[0]);
            log(`key(${key}), id(${id}), cat(${cat})`);

            if (cat == index) {
                var data = getUnitData(id);
                if (data) {
                    cachedUnits[id] = data;
                }
            }
        }

        if (!fs.existsSync(`data/`))
            fs.mkdirSync( `data/`, { recursive: true});
        if (!fs.existsSync(`data/units-${index}.json`)) {
            fs.createWriteStream(`data/units-${index}.json`);
        }

        fs.writeFileSync(`data/units-${index}.json`, JSON.stringify(cachedUnits));
        cachedUnits = {};
    }
}


function log(data) {
    console.log(data);
}
function getUnitData(id) {

    var bigUnits = fs.readFileSync('../ffbe/units.json');
    var unitsList = JSON.parse(bigUnits.toString());

    var unit = unitsList[id];
    
    unitsList = null;
    bigUnits = null;
    var JP = ""; // this is to tell the skill search to use JP data.
    if (!unit) {
        unit = null;
        
        bigUnits = fs.readFileSync('../ffbe-jp/units.json');
        unitsList = JSON.parse(bigUnits.toString());

        JP = "-jp";
        unit = unitsList[id];
        unitsList = null;
        bigUnits = null;
        if (!unit) {
            log("Could not find unit data " + id);
            unit = null;
            return null;
        }
    }

    unit.skills = getSkillsFromUnit(unit, JP);
    var lb = getLBFromUnit(unit, JP);
    if (lb) unit.LB = lb;
    //unit.enhancements = getEnhancements(id, JP);

    log("Unit Saved");
    return unit;
}
function getSkillsFromUnit(unit, JP) {

    var skills = unit.skills;
    if (!skills) {
        return null;
    }

    var skillKeys = [];
    skills.forEach(skill => {
        skillKeys.push(skill.id);
    });

    var bigSkills = fs.readFileSync(`../ffbe${JP}/skills.json`);
    var skillList = JSON.parse(bigSkills.toString());
    bigSkills = null;
    
    var skillData = {};
    var keys = Object.keys(skillList);
    skillKeys.forEach(key => {
        skillData[key] = skillList[key];
    });
    keys = null;
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
function getEnhancementsFromUnit(unit, JP) {

    var bigEnh = fs.readFileSync(`../ffbe${JP}/enhancements.json`);
    var enhList = JSON.parse(bigEnh.toString());
    bigEnh = null;

}