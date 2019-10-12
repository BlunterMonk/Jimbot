//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as fs from "fs";
import "../util/string-extension.js";

import * as furcDamage from "./cacheDamage.js";
import * as muspDamage from "./cacheMuspel.js";
import * as cacheWiki from "./cacheWiki.js";
import { log } from "../global.js";

////////////////////////////////////////////////////////////

const rankingDump = 'data/rankingsdump.json';
const furcCalc = 'data/furculacalculations.json';
const muspCalc = 'data/muspelcalculations.json';
const whaleCalc = 'data/whalecalculations.json';

const infoJson = 'data/information.json';
const skillsJson = 'data/skills.json';
const limitburstsJson = 'data/limitbursts.json';
const rankingFile = 'data/rankings.json';
const unitKeysJson = "data/unitkeys.json";
const unitIDsJson = "data/unitid.json";

export class Cache {
    fullRankings: any;
    calculations: any;
    muspelCalculations: any;
    whaleCalculations: any;
    information: any;
    skillset: any;
    limitbursts: any;
    rankings: any;
    unitsDump: any;
    unitIDs: any;
    isUpdating: any;
    constructor() {
        this.init();
    }

    init() {
        this.isUpdating = false;

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
        log("Reloading Cached Data");
        this.fullRankings = JSON.parse(fs.readFileSync(rankingDump).toString());
        this.information = JSON.parse(fs.readFileSync(infoJson).toString());
        
        this.calculations = JSON.parse(fs.readFileSync(furcCalc).toString());
        this.muspelCalculations = JSON.parse(fs.readFileSync(muspCalc).toString());
        this.whaleCalculations = JSON.parse(fs.readFileSync(whaleCalc).toString());

        this.rankings = JSON.parse(fs.readFileSync(rankingFile).toString());
        this.unitsDump = JSON.parse(fs.readFileSync(unitKeysJson).toString());
        this.unitIDs = JSON.parse(fs.readFileSync(unitIDsJson).toString());

        var skills = JSON.parse(fs.readFileSync(skillsJson).toString());
        var lbs = JSON.parse(fs.readFileSync(limitburstsJson).toString());
        this.skillset = Object.assign({}, skills, lbs);
    }

    async updateDamage(source: string, force: boolean, callback) {
        this.isUpdating = true;

        var self = this;
        var success = function() {
            log(`Reloaded ${source} Calculations`);

            callback(true, null);

            self.isUpdating = false;
        }
        var fail = function(e) {
            log(`failed to update ${source} calculations`, e);

            self.isUpdating = false;

            callback(false, e);
        }

        switch (source) {
        case "muspel":
            await muspDamage.UpdateMuspelCalculations(() =>{
                this.muspelCalculations = JSON.parse(fs.readFileSync(muspCalc).toString());
                success()
            }).catch(fail);
            break;

        case "wiki":
            await cacheWiki.cacheWikiRankings(rankingDump, () => {
                this.fullRankings = JSON.parse(fs.readFileSync(rankingDump).toString());
                success();
            }).catch(fail);
            break;
 
        case "lyregard": 
            break;

        case "furcula":
            await furcDamage.UpdateFurculaCalculations(force, () =>{
                this.calculations = JSON.parse(fs.readFileSync(furcCalc).toString());
                success()
            }).catch(fail);
            break;

        case "whale":
        case "shado":
            await furcDamage.UpdateWhaleCalculations(force, () =>{
                this.whaleCalculations = JSON.parse(fs.readFileSync(whaleCalc).toString());
                success()
            }).catch(fail);
            break;
        }
    }

    isUnitKey(search) {
        return this.unitsDump[search] != null;
    }
    getUnitKey(search) {
        if (!this.unitsDump[search]) {
            return null
        }

        return this.unitsDump[search];
    }
    getUnitName(id: string) {

        var keys = Object.keys(this.unitsDump);
        for (let index = 0; index < keys.length; index++) {
            const k = keys[index];
            
            if (this.unitsDump[k] == id)
                return k;
        }

        return null;
    }
    getUnitIDJP(id: string) {
        return this.getUnitID(id, this.unitIDs.jp);
    }
    getUnitIDGL(id: string) {
        return this.getUnitID(id, this.unitIDs.gl);
    }
    getUnitID(id: string, source: any[]) {

        for (let index = 0; index < source.length; index++) {
            const unit = source[index];
            
            var first = unit.entries[0];
            for (let i = 0; i < unit.entries.length; i++) {
                const e = unit.entries[i];
                
                if (e.dex == id || e.id == id)
                   return first.id;
            }
        }

        return null;
    }

    // Wiki Rankings
    getUnitRank(name: string) {
        return this.fullRankings[name];
    }
    setRankings(category: string, data: any) {
        log(`setRankings: category(${category}), data(${data})`);
        if (this.rankings.bestunits[category]) {
            log(this.rankings.bestunits[category]);
            this.rankings.bestunits[category] = data;
            this.saveRankings();
            return true;
        }
        return false;
    }
    getRankings(category: string) {
        return this.rankings[category.toLowerCase()];
    }

    // TOP UNITS
    addTopUnit(category: string, name: string) {
        if (!this.rankings.topunits[category]) {
            log(`Category (${category}), not found`);
            return false;
        }

        this.rankings.topunits[category].push(name);
        this.saveRankings();
        return true;
    }
    removeTopUnit(category: string, name: string) {
        if (!this.rankings.topunits[category]) {
            log(`Category (${category}), not found`);
            return false;
        }

        log("removeTopUnit", name, this.rankings.topunits[category])
        this.rankings.topunits[category].forEach((element, index) => {
            if (element == name) {
                this.rankings.topunits[category].splice(index, 1);
            }
        });
        log(this.rankings.topunits[category])
        this.saveRankings();
        return true;
    }
    getTopUnits(category: string) {
        if (!this.rankings.topunits[category]) {
            return this.rankings.topunits;
        }

        return this.rankings.topunits[category];
    }


    getUnitCalculation(source: string, searchTerm: string) {
        switch (source) {
            case "furcula":
                return getUnitCalc(searchTerm, this.calculations);
            case "whale":
            case "shado":
                return getUnitCalc(searchTerm, this.whaleCalculations);
            case "muspel":
                return getUnitCalc(searchTerm, this.muspelCalculations);
            default:
                return null;
        }
    }

    // Furcula Damage Calculations
    getCalculations(source: string, searchTerm: string) {
        switch (source) {
            case "muspel":
                return getCalc(searchTerm, this.muspelCalculations);
            case "furcula":
                return getCalc(searchTerm, this.calculations);
            case "whale":
            case "shado":
                return getCalc(searchTerm, this.whaleCalculations);
            default:
                return null;
        }
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

function getCalc(searchTerm: string, source: any) {
    if (source[searchTerm])
        return source[searchTerm];

    var found = [];
    //var found: { [key: string]: string } = {};
    var names = searchTerm.split("|");
    if (!names || names.length == 1) 
        names = searchTerm.split(",");

    log("Get Calculations", names);
    names.forEach((search, index) => {

        search = search.trim();
        
        Object.keys(source).forEach((key) => {
            var unit = source[key];
            var name = unit.name.toLowerCase();
            
            //log(`Searching For: ${search}`);
            //log(`Found Unit: ${name}`);
            if (name.includes(search.toLowerCase())) {
                found[found.length] = unit;
            }
        });
    });

    return found;
}
function getUnitCalc(searchTerm: string, source: any) {
    searchTerm = searchTerm.replaceAll("_", " ").toLowerCase();

    log(`Searching Calculations For: ${searchTerm}`);
    
    var units = Object.keys(source);
    for (let index = 0; index < units.length; index++) {
        const unit = source[units[index]];
        const name = unit.name.toLowerCase();
        
        if (name.includes(searchTerm)) {
            return unit;
        }
    }

    var match = searchTerm.closestMatchIn(units, 0.25);
    if (!match) 
        return null;

    return source[match];
}

export const cache = new Cache();