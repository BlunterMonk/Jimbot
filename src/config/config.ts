//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


const fs = require('fs');
import "../string/string-extension.js";
const filename = './config/config.json';
const rankingFile = 'data/rankings.json';
const rankingDump = 'data/rankingsdump.json';
const unitCalc = 'data/unitcalculations.json';
const infoJson = 'data/information.json';

export class Config {
    configuration: any;
    rankings: any;
    fullRankings: any;
    serverSettings: any;
    calculations: any;
    information: any;
    constructor() {
    }

    init() {
        var data = fs.readFileSync(filename);
        this.configuration = JSON.parse(data);

        var rank = fs.readFileSync(rankingFile);
        this.rankings = JSON.parse(rank);
        
        var dump = fs.readFileSync(rankingDump);
        this.fullRankings = JSON.parse(dump);
                
        var calcs = fs.readFileSync(unitCalc);
        this.calculations = JSON.parse(calcs);

        var info = fs.readFileSync(infoJson);
        this.information = JSON.parse(info);
    }
    save() {
        var newData = JSON.stringify(this.configuration, null, "\t");
        fs.writeFileSync(filename, newData);
    }
    saveRankings() {
        var newData = JSON.stringify(this.rankings, null, "\t");
        fs.writeFileSync(rankingFile, newData);
    }
    saveInformation() {
        var newData = JSON.stringify(this.information, null, "\t");
        fs.writeFileSync(infoJson, newData);
    }
    reload(file: string) {
        if (!file) {
            var data = fs.readFileSync(filename);
            this.configuration = JSON.parse(data);
    
            var rank = fs.readFileSync(rankingFile);
            this.rankings = JSON.parse(rank);
            
            var dump = fs.readFileSync(rankingDump);
            this.fullRankings = JSON.parse(dump);
                    
            var calcs = fs.readFileSync(unitCalc);
            this.calculations = JSON.parse(calcs);
    
            var info = fs.readFileSync(infoJson);
            this.information = JSON.parse(info);
        } else if (file.includes("information.json")) {
            console.log("Reploading Information.json");
            this.information = JSON.parse(fs.readFileSync(infoJson));
        }
    }
    alias() {
        return this.configuration.unitAliases;
    }
    emotes() {
        return this.configuration.emotes;
    }
    filetypes() {
        return this.configuration.filetypes;
    }
    getAlias(value: any) {
        value = value.toLowerCase();
        if (this.configuration.unitAliases[value]) {
            console.log("found alias");
            return this.configuration.unitAliases[value];
        } else {
            return null;
        }
    }
    addAlias(name: string, value: any) {
        this.configuration.unitAliases[name.toLowerCase()] = value;
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
    getUnitRank(name: string) {
        return this.fullRankings.find((r) => {
            return r["Unit"] === name;
        });
    }

    getCalculations(searchTerm: string) {
        var category = this.calculations[searchTerm];

        if (!category) {
            var found: { [key: string]: string } = {};
            var names = searchTerm.split("|");
            console.log("Get Calculations");
            console.log(names);
            names.forEach((search, index) => {
                search = search.trim();
                var burst = search.includes("burst_");
                search = search.replace("burst_", "");
                
                Object.keys(this.calculations).forEach((cat) => {
                    var category = this.calculations[cat];
                    
                    if (burst && !cat.includes("burst_")) {
                        return;
                    } else if (!burst && cat.includes("burst_")) {
                        return;
                    }
                    
                    Object.keys(category).forEach((key) => {
                        var unit = category[key];
                        var name = unit.name.toLowerCase().replaceAll(" ", "_");
                        
                        if (name.includes(search.toLowerCase())) {
                            found[unit.name] = unit;
                        }
                    });
                });
            });

            return found;
        } else {
            return category;
        }
    }
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

    getInfoSettings() {
        return this.information;
    }
};
