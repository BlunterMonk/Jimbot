const fs = require("fs");

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

main();

function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}
function main() {

    var glUnits = getUnitsList("../ffbe/units.json");
    var jpUnits = getUnitsList("../ffbe-jp/units.json");

    var units = Object.assign({}, glUnits, jpUnits);
    var save = JSON.stringify(units, null, "\t");
    fs.writeFileSync("data/unitkeys.json", save);

    var jpKeys = getKeysList("../ffbe-jp/units.json");
    var glKeys = getKeysList("../ffbe/units.json");

    units = Object.assign({}, jpKeys, glKeys);
    save = JSON.stringify(units, null, "\t");
    fs.writeFileSync("data/unitids.json", save);

    var glKeys = getDexList("../ffbe/units.json");
    var jpKeys = getDexList("../ffbe-jp/units.json");
    save = JSON.stringify({gl: glKeys, jp: jpKeys}, null, "\t");
    fs.writeFileSync("data/unitid.json", save);

    console.log("Units Cached");
}

function getUnitsList(source) {
    var units = {};

    var data = fs.readFileSync(source);
    const dump = JSON.parse(data);
    
    const keys = Object.keys(dump);
    keys.forEach((k, i) =>{
        var unit = dump[k];
        if (unit.name) {
            var name = unit.name.toLowerCase().replaceAll(" ", "_");
                
            units[name] = k;
        }
    });

    return units
}

function getKeysList(source) {
    var units = {};

    var data = fs.readFileSync(source);
    const dump = JSON.parse(data);
    
    const keys = Object.keys(dump);
    keys.forEach((k, i) =>{
        var unit = dump[k];
        if (unit.name && unit.entries) {
            var name = unit.name.toLowerCase().replaceAll(" ", "_");
            var entries = Object.keys(unit.entries);
            entries.forEach(entry => {
                units[entry] = name;
            });
        }
    });

    return units
}

function getDexList(source) {
    var units = [];

    var data = fs.readFileSync(source);
    const dump = JSON.parse(data);
    
    const keys = Object.keys(dump);
    keys.forEach((k, i) =>{
        var unit = dump[k];
        if (unit.name && unit.entries) {
            var name = unit.name.toLowerCase().replaceAll(" ", "_");
            var ids = [];
            var entries = Object.keys(unit.entries);
            entries.forEach(entry => {
                ids.push({ id: entry, dex: unit.entries[entry].compendium_id });
            });

            units.push({
                name: name,
                entries: ids
            });
        }
    });

    return units
}
