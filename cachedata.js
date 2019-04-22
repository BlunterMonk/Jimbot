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

    //var ut = fs.readFileSync("unittranslations.json");
    //const translated = JSON.parse(ut);

    var units = Object.assign({}, glUnits, jpUnits/*, translated*/);
    var save = JSON.stringify(units, null, "\t");
    fs.writeFileSync("unitkeys.json", save);
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
