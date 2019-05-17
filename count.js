const fs = require("fs");
const saveLocation = "data/unitkeys.json";

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
    //var jpUnits = getUnitsList("../ffbe-jp/units.json");

    /*
    var units = Object.assign({}, glUnits, jpUnits);
    var save = JSON.stringify(units, null, "\t");
    fs.writeFileSync(saveLocation, save);
    */

    console.log("Units Cached");
}

function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}
function getUnitsList(source) {
    var units = {};

    var data = fs.readFileSync(source);
    const dump = JSON.parse(data);

    console.log("Count for: " + source);
    var limitedCount = 0;
    var rainbowPoolCount = 0;
    var nonLimitedCount = 0;
    var maxCount = 0;
    var starCount = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
    };
    var limitedStarCount = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
    };
    var jpunits = [];
    var glunits = [];
    var notFF = [];

    const keys = Object.keys(dump);
    keys.forEach((k, i) =>{
        var unit = dump[k];
        if (unit.name) {
            var name = unit.name.toLowerCase().replaceAll(" ", "_");
            
            if (unit.is_summonable && unit.game) {
                if (!isLetter(unit.name.charAt(0))) {
                    jpunits[jpunits.length] = unit.name;
                } else if (!unit.game.startsWith("FF")) {
                    notFF[notFF.length] = unit.game;
                    limitedCount++;

                    limitedStarCount[unit.rarity_min] = limitedStarCount[unit.rarity_min] + 1;
                } else {

                    nonLimitedCount++;
                    console.log(unit.name);
                    starCount[unit.rarity_min] = starCount[unit.rarity_min] + 1;
                    if (unit.rarity_min == "5") {
                        glunits[glunits.length] = unit.name;
                        rainbowPoolCount++;
                    }
                }

                maxCount++;
            }

            units[name] = k;
        }
    });

    /*
    console.log("probably JP in GL datamine: " + jpunits.length);
    console.log(jpunits);
    console.log("max unit count: " + maxCount);
    console.log("limited count: " + limitedCount);
    console.log("non limited count: " + nonLimitedCount);
    console.log("non limited")
    console.log(starCount);
    console.log("limited")
    console.log(limitedStarCount);
    console.log("5* in pool: " + rainbowPoolCount);
    console.log("Not FF");
    console.log(notFF);
    console.log("GL datamine: " + glunits.length);
    console.log(glunits);
*/

    return units
}
