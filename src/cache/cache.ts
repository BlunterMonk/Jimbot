//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as fs from "fs";
import "../string/string-extension.js";

import * as furcDamage from "./cacheDamage.js";

var rankingDump = 'data/rankingsdump.json';
var unitCalc = 'data/unitcalculations.json';
var infoJson = 'data/information.json';
var skillsJson = 'data/skills.json';
var limitburstsJson = 'data/limitbursts.json';
const rankingFile = 'data/rankings.json';

export class Cache {
    fullRankings: any;
    calculations: any;
    information: any;
    skillset: any;
    limitbursts: any;
    rankings: any;
    constructor() {
    }

    init() {
        this.reload();
    }
    saveInformation() {
        var newData = JSON.stringify(this.information, null, "\t");
        fs.writeFileSync(infoJson, newData);
    }
    saveRankings() {
        var newData = JSON.stringify(this.rankings, null, "\t");
        fs.writeFileSync(rankingFile, newData);
    }

    reload() {
        console.log("Reloading Cached Data");
        this.fullRankings = JSON.parse(fs.readFileSync(rankingDump).toString());
        this.information = JSON.parse(fs.readFileSync(infoJson).toString());
        this.calculations = JSON.parse(fs.readFileSync(unitCalc).toString());
        this.rankings = JSON.parse(fs.readFileSync(rankingFile).toString());
        
        var skills = JSON.parse(fs.readFileSync(skillsJson).toString());
        var lbs = JSON.parse(fs.readFileSync(limitburstsJson).toString());
        this.skillset = Object.assign({}, skills, lbs);
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
    setRankings(category: string, data: any) {
        console.log(`setRankings: category(${category}), data(${data})`);
        if (this.rankings.bestunits[category]) {
            console.log(this.rankings.bestunits[category]);
            this.rankings.bestunits[category] = data;
            this.saveRankings();
            return true;
        }
        return false;
    }
    getRankings(category: string) {
        return this.rankings[category.toLowerCase()];
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

    // Information
    setInformation(name: string, title: string, data: any) {
        if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }

        this.information[name] = {
            title: title,
            description: data
        } 
        this.saveInformation();
        return true;
    }
    getInformation(name: string)  {
        if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }

        if (this.information[name]) {
            return this.information[name];
        }
        return null;
    }
    

    getSkill(searchTerm: string) {
        var found: { [key: string]: string } = {};

        if (this.skillset[searchTerm]) {

            found[searchTerm] = this.skillset[searchTerm];
            return found;
        }

        
        var keys = Object.keys(this.skillset);
        for (let index = 0; index < keys.length; index++) {
            const k = keys[index]
            const skill = this.skillset[k];
         
            if (skill.name.toLowerCase().includes(searchTerm))
                found[k] = skill;
        }

        return found;
    }
};