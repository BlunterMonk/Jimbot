import * as fs from "fs";
import "../string/string-extension.js";

import * as furcDamage from "./cacheDamage.js";

var rankingDump = 'data/rankingsdump.json';
var unitCalc = 'data/unitcalculations.json';
var infoJson = 'data/information.json';

export class Cache {
    fullRankings: any;
    calculations: any;
    information: any;
    constructor() {
    }

    init() {
        var dump = fs.readFileSync(rankingDump);
        this.fullRankings = JSON.parse(dump.toString());
                
        var calcs = fs.readFileSync(unitCalc);
        this.calculations = JSON.parse(calcs.toString());

        var info = fs.readFileSync(infoJson);
        this.information = JSON.parse(info.toString());
    }
    saveInformation() {
        var newData = JSON.stringify(this.information, null, "\t");
        fs.writeFileSync(infoJson, newData);
    }
    reload() {
        console.log("Reloading Cached Data");
        this.fullRankings = JSON.parse(fs.readFileSync(rankingDump).toString());
        this.information = JSON.parse(fs.readFileSync(infoJson).toString());
        this.calculations = JSON.parse(fs.readFileSync(unitCalc).toString());
    }
    updateDamage() {
        furcDamage.UpdateFurculaCalculations(() =>{
            this.calculations = JSON.parse(fs.readFileSync(unitCalc).toString());
            console.log("Reloaded Calculations");
        });
    }

    // Wiki Rankings
    getUnitRank(name: string) {
        return this.fullRankings.find((r) => {
            return r["Unit"] === name;
        });
    }


    // Furcula Damage Calculations
    getCalculations(searchTerm: string, isBurst: boolean) {
        var category = this.calculations[searchTerm];
        if (category)
            return category;
        else if (isBurst && this.calculations["burst " + searchTerm]) {
            return this.calculations["burst " + searchTerm];
        }

        if (!category) {
            var found: { [key: string]: string } = {};
            var names = searchTerm.split("|");

            console.log("Get Calculations");
            console.log(names);
            names.forEach((search, index) => {

                search = search.trim();
                
                Object.keys(this.calculations).forEach((cat) => {
                    var category = this.calculations[cat];
                    
                    if (isBurst && !cat.includes("burst")) {
                        return;
                    } else if (!isBurst && cat.includes("burst")) {
                        return;
                    }

                    console.log(`Searching Category: ${cat}, for: ${search}`);
        
                    Object.keys(category).forEach((key) => {
                        var unit = category[key];
                        var name = unit.name.toLowerCase().replaceAll(" ", "_");
                        
                        console.log(`Found Unit: ${name}`);
                        if (name.includes(search.toLowerCase())) {
                            found[unit.name] = unit;
                        }
                    });
                });
            });

            return found;
        }
    }
};
