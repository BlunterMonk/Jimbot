//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

export const pinkHexCode = 0xffd1dc;

export const okEmoji = "🆗";
export const cancelEmoji = "❌";

export const ffbegifEndpoint = "http://www.ffbegif.com/";
export const exviusdbEndpoint = "https://exvius.gg/gl/units/205000805/animations/";

export const renaulteUserID = "159846139124908032";
export const jimooriUserID = "131139508421918721";
export const furculaUserID = "344500120827723777";


export const descCharLimit = 128;
export const similarityTreshold = 0.5;

export const linkFilter = [
    /\|Trial/,
    /\|Event/,
    /\|Quest/,
    /\]\]/,
    /\[\[/,
    /\[\[.*\]\]/,
    /\(/,
    /\)/
];
export const unicodeNumbers = [
    "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"
];

export const statParameters = [ "atk", "def", "mag", "spr", "hp", "mp" ];

export const weaponList = ["dagger", "sword", "greatSword", "katana", "staff", "rod", "bow", "axe", "hammer", "spear", "harp", "whip", "throwing", "gun", "mace", "fist"];
export const shieldList = ["lightShield", "heavyShield"];
export const headList = ["hat", "helm"];
export const bodyList = ["clothes", "robe", "lightArmor", "heavyArmor"];
export const babyWord = ["of", "the", "and"];

export const itemEnhancementAbilities = {
    "rare_3":{
        "dagger": {"lbFillRate":100},
        "sword": {"hp%":15, "atk%":15},
        "greatSword": {"hp%":15, "atk%":15},
        "katana": {"hp%":15, "atk%":15},
        "staff": {"mp%":15, "spr%":15},
        "rod": {"mp%":15, "mag%":15},
        "bow": {"atk%":30, "mag%":30},
        "axe": {"atk%":30},
        "hammer": {"hp%":15, "def%":15},
        "spear": {"hp%":15, "atk%":15},
        "harp": {"hp%":15, "spr%":15},
        "whip": {"mp%":30},
        "throwing": {"hp%":15, "mp%":15},
        "gun": {"atk%":30},
        "mace": {"hp%":30},
        "fist": {"hp%":15, "atk%":15},
        "fake": {}
    },
    "rare_4":{
        "dagger": {"lbFillRate":150},
        "sword": {"hp%":20, "atk%":20},
        "greatSword": {"hp%":20, "atk%":20},
        "katana": {"hp%":20, "atk%":20},
        "staff": {"mp%":20, "spr%":20},
        "rod": {"mp%":20, "mag%":20},
        "bow": {"atk%":35, "mag%":35},
        "axe": {"atk%":40},
        "hammer": {"hp%":20, "def%":20},
        "spear": {"hp%":20, "atk%":20},
        "harp": {"hp%":20, "spr%":20},
        "whip": {"mp%":40},
        "throwing": {"hp%":20, "mp%":20},
        "gun": {"atk%":40},
        "mace": {"hp%":40},
        "fist": {"hp%":20, "atk%":20},
        "fake": {}
    },
    "hp_15": {"hp%":15}, "hp_12": {"hp%":12}, "hp_10": {"hp%":10}, "hp_7": {"hp%":7}, "hp_5": {"hp%":5}, "hp_3": {"hp%":3}, "hp_1": {"hp%":1},
    "mp_15": {"mp%":15}, "mp_12": {"mp%":12}, "mp_10": {"mp%":10}, "mp_7": {"mp%":7}, "mp_5": {"mp%":5}, "mp_3": {"mp%":3}, "mp_1": {"mp%":1},
    "atk_15": {"atk%":15}, "atk_12": {"atk%":12}, "atk_10": {"atk%":10}, "atk_7": {"atk%":7}, "atk_5": {"atk%":5}, "atk_3": {"atk%":3}, "atk_1": {"atk%":1},
    "def_15": {"def%":15}, "def_12": {"def%":12}, "def_10": {"def%":10}, "def_7": {"def%":7}, "def_5": {"def%":5}, "def_3": {"def%":3}, "def_1": {"def%":1},
    "mag_15": {"mag%":15}, "mag_12": {"mag%":12}, "mag_10": {"mag%":10}, "mag_7": {"mag%":7}, "mag_5": {"mag%":5}, "mag_3": {"mag%":3}, "mag_1": {"mag%":1},
    "spr_15": {"spr%":15}, "spr_12": {"spr%":12}, "spr_10": {"spr%":10}, "spr_7": {"spr%":7}, "spr_5": {"spr%":5}, "spr_3": {"spr%":3}, "spr_1": {"spr%":1},
    "autoRefresh_2": {"mpRefresh":5},"autoRefresh_1": {"mpRefresh":3}
};
export const itemEnhancementLabels = {
    "rare_3":{
        "dagger": "+100% LB fill rate", 
        "sword": "HP/ATK + 15%", 
        "greatSword": "HP/ATK + 15%", 
        "katana": "HP/ATK + 15%", 
        "staff": "SPR/MP + 15%", 
        "rod": "MAG/MP +15%", 
        "bow": "ATK/MAG +30%", 
        "axe": "ATK +30%", 
        "hammer": "HP/DEF +15%", 
        "spear": "HP/ATK +15%", 
        "harp": "HP/SPR +15%", 
        "whip": "MP +30%", 
        "throwing": "HP/MP +15%", 
        "gun": "ATK +30%", 
        "mace": "HP +30%", 
        "fist": "HP/ATK +15%",
        "fake": "Rare"
    },
    "rare_4":{
        "dagger": "+150% LB fill rate",
        "sword": "HP/ATK + 20%",
        "greatSword": "HP/ATK + 20%",
        "katana": "HP/ATK + 20%",
        "staff": "SPR/MP + 20%",
        "rod": "MAG/MP +20%",
        "bow": "ATK/MAG +35%",
        "axe": "ATK +40%",
        "hammer": "HP/DEF +20%",
        "spear": "HP/ATK +20%",
        "harp": "HP/SPR +20%",
        "whip": "MP +40%",
        "throwing": "HP/MP +20%",
        "gun": "ATK +40%",
        "mace": "HP +40%",
        "fist": "HP/ATK +20%",
        "fake": "Rare+"
    },
    "hp_15": "HP +15%", "hp_12": "HP +12%", "hp_10": "HP +10%", "hp_7": "HP +7%", "hp_5": "HP +5%", "hp_3": "HP +3%", "hp_1": "HP +1%",
    "mp_15": "MP +15%", "mp_12": "MP +12%", "mp_10": "MP +10%", "mp_7": "MP +7%", "mp_5": "MP +5%", "mp_3": "MP +3%", "mp_1": "MP +1%",
    "atk_15": "ATK +15%", "atk_12": "ATK +12%", "atk_10": "ATK +10%", "atk_7": "ATK +7%", "atk_5": "ATK +5%", "atk_3": "ATK +3%", "atk_1": "ATK +1%",
    "def_15": "DEF +15%", "def_12": "DEF +12%", "def_10": "DEF +10%", "def_7": "DEF +7%", "def_5": "DEF +5%", "def_3": "DEF +3%", "def_1": "DEF +1%",
    "mag_15": "MAG +15%", "mag_12": "MAG +12%", "mag_10": "MAG +10%", "mag_7": "MAG +7%", "mag_5": "MAG +5%", "mag_3": "MAG +3%", "mag_1": "MAG +1%",
    "spr_15": "SPR +15%", "spr_12": "SPR +12%", "spr_10": "SPR +10%", "spr_7": "SPR +7%", "spr_5": "SPR +5%", "spr_3": "SPR +3%", "spr_1": "SPR +1%",
    "autoRegen_4": "Auto-Regen 4","autoRegen_3": "Auto-Regen 3","autoRegen_2": "Auto-Regen 2","autoRegen_1": "Auto-Regen 1",
    "autoRefresh_2": "Auto-Refresh 2","autoRefresh_1": "Auto-Refresh 1",
    "autoProtect_5": "Auto-Protect 5","autoProtect_4": "Auto-Protect 4","autoProtect_3": "Auto-Protect 3","autoProtect_2": "Auto-Protect 2","autoProtect_1": "Auto-Protect 1",
    "autoShell_5": "Auto-Shell 5","autoShell_4": "Auto-Shell 4","autoShell_3": "Auto-Shell 3","autoShell_2": "Auto-Shell 2","autoShell_1": "Auto-Shell 1",
};
