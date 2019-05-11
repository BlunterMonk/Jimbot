const fs = require("fs");

var data = fs.readFileSync(`../ffbe/skills.json`);
var SkillList = JSON.parse(data.toString());
var lbs = fs.readFileSync(`../ffbe/limitbursts.json`);
var LimitBursts = JSON.parse(lbs.toString());

cacheSkills();
cacheLimitBursts();


function cacheSkills() {
    var keys = Object.keys(SkillList);

    var batch = getSkillWithIDs(keys);
    
    fs.writeFileSync(`data/skills.json`, JSON.stringify(batch));
}
function cacheLimitBursts() {

    var keys = Object.keys(LimitBursts);

    var batch = getLBFromUnit(keys);
    
    fs.writeFileSync(`data/limitbursts.json`, JSON.stringify(batch));
}

function getSkillWithIDs(skillKeys) {

    var skillData = {};
    skillKeys.forEach(key => {
        var desc = "";
        var skill = SkillList[key];
        if (skill.strings && skill.strings.desc_short)
            desc = skill.strings.desc_short[0];

        skillData[key] = {
            name:               skill.name,
            type:               skill.type,
            active:             skill.active,
            cost:               skill.cost,
            attack_count:       skill.attack_count,
            attack_damage:      skill.attack_damage,
            attack_frames:      skill.attack_frames,
            attack_type:        skill.attack_type,
            element_inflict:    skill.element_inflict,
            effects:            skill.effects,
            icon:               skill.icon,
            desc:               desc
        }
    });

    return skillData;
}
function getLBFromUnit(keys) {

    var skillData = {};
    keys.forEach(key => {
        var limit = LimitBursts[key];
        var desc = "";
        if (limit.strings && limit.strings.desc)
            desc = limit.strings.desc[0];

        skillData[key] = {
            name:               limit.name,
            attack_count:       limit.attack_count,
            attack_damage:      limit.attack_damage,
            attack_frames:      limit.attack_frames,
            damage_type:        limit.damage_type,
            element_inflict:    limit.element_inflict,
            min_level:          limit.min_level,
            max_level:          limit.max_level,
            desc:               desc
        }
    });

    return skillData;
}
