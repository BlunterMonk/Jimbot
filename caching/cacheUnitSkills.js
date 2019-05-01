const fs = require("fs");

log("loading units list")
var data = fs.readFileSync("data/unitkeys.json");
var unitsDump = JSON.parse(String(data));

var units = Object.keys(unitsDump);
var cachedUnits = {};
for (let index = 9; index <= 9; index++) {
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