//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as fs from "fs";
import "../string/string-extension.js";

import * as furcDamage from "./cacheDamage.js";

const rankingDump = 'data/rankingsdump.json';
const unitCalc = 'data/unitcalculations.json';
const infoJson = 'data/information.json';
const skillsJson = 'data/skills.json';
const limitburstsJson = 'data/limitbursts.json';
const rankingFile = 'data/rankings.json';
const unitKeysJson = "data/unitkeys.json";

export class Cache {
    fullRankings: any;
    calculations: any;
    information: any;
    skillset: any;
    limitbursts: any;
    rankings: any;
    unitsDump: any;
    constructor() {
        this.init();
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
        this.unitsDump = JSON.parse(fs.readFileSync(unitKeysJson).toString());
        
        var skills = JSON.parse(fs.readFileSync(skillsJson).toString());
        var lbs = JSON.parse(fs.readFileSync(limitburstsJson).toString());
        this.skillset = Object.assign({}, skills, lbs);
    }

    updateDamage(callback) {
        furcDamage.UpdateFurculaCalculations(() =>{
            this.calculations = JSON.parse(fs.readFileSync(unitCalc).toString());
            console.log("Reloaded Calculations");
            callback();
        });
    }

    getUnitKey(search) {
        if (!this.unitsDump[search]) {
            return null
        }

        return this.unitsDump[search];
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

    getUnitCalc(searchTerm: string) {
        searchTerm = searchTerm.replaceAll("_", " ").toLowerCase();

        console.log(`Searching Calculations For: ${searchTerm}`);
        
        var units = Object.keys(this.calculations);
        for (let index = 0; index < units.length; index++) {
            const unit = this.calculations[units[index]];
            const name = unit.name.toLowerCase();
            
            if (name.includes(searchTerm)) {
                return unit;
            }
        }

        var match = searchTerm.closestMatchIn(units, 0.25);
        if (!match) 
            return null;

        return this.calculations[match];
    }
    // Furcula Damage Calculations
    getCalculations(searchTerm: string) {
        if (this.calculations[searchTerm])
            return this.calculations[searchTerm];

        var found = [];
        //var found: { [key: string]: string } = {};
        var names = searchTerm.split("|");
        if (!names || names.length == 1) 
            names = searchTerm.split(",");

        console.log("Get Calculations");
        console.log(names);
        names.forEach((search, index) => {

            search = search.trim();
            
            Object.keys(this.calculations).forEach((key) => {
                var unit = this.calculations[key];
                var name = unit.name.toLowerCase();
                
                //console.log(`Searching For: ${search}`);
                //console.log(`Found Unit: ${name}`);
                if (name.includes(search.toLowerCase())) {
                    found[found.length] = unit;
                }
            });
        });

        return found;
    }
    getAllCalculations() {
        var total = [];
        Object.keys(this.calculations).forEach(key => {
            total[total.length] = this.calculations[key];
        });
        return total;
    }

    // Information
    setInformation(name: string, title: string, data: any, author: string) {
        if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }

        this.information[name] = {
            author: author,
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
    

    getSkill(searchTerm: string): any {
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

export const cache = new Cache();