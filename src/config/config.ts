
const fs = require('fs');
import "../string/string-extension.js";
const filename = './config/config.json';
const rankingFile = 'data/rankings.json';
const rankingDump = 'data/rankingsdump.json';
const unitCalc = 'data/unitcalculations.json';
const infoJson = 'data/information.json';

/*interface GuildConfig {
    name: string;
    prefix: string;
    successEmote: "✅";
    failureEmote: "❌";
    adminRoles: string[];
    adminOnlyCommands: string[];
    disabledCommands: string[];
	editors: string[];
    shortcuts: {};
}*/

class GuildSettings {
    guildName: any;
    guildId: any;
    settings: any;
    constructor(name: string, guildId: any) {

        this.guildName = name;
        this.guildId = guildId;

        this.load();
        console.log("Guild Config Settings");
        console.log(this.settings);

        this.settings.name = name;
        this.save();
    }

    load() {
        var filename = `./config/config-${this.guildId}.json`;
        if (fs.existsSync(filename)) {
            var data = fs.readFileSync(filename);
            this.settings = JSON.parse(String(data));
        } else {
            var data = fs.readFileSync(`./config/config-default.json`);
            this.settings = JSON.parse(String(data));
        }
    }
    save() {
        var newData = JSON.stringify(this.settings, null, '\t');
        fs.writeFileSync(this.getFilename(), newData);
    }

    getFilename() {
        return `config/config-${this.guildId}.json`;
    }
    getPrefix() {
        return this.settings.prefix;
    }
    setPrefix(prefix: string) {
        this.settings.prefix = prefix;
        this.save();
    }

    getSuccessEmote() {
        return this.settings.successEmote;
    }
    getFailureEmote() {
        return this.settings.failureEmote;
    }

    getSettings(name: string) {
        if (name) {
            return this.settings[name];
        }

        return this.settings;
    }

    getShortcut(name: string) {
        name = name.toLowerCase();
        console.log(`Searching For Shortcut: ${name}`);
        if (!this.settings.shortcuts || !this.settings.shortcuts[name])
            return null;
            
        console.log(`Found Shortcut: ${this.settings.shortcuts[name]}`);
        return this.settings.shortcuts[name];
    }
    setShortcut(name: string, command: string) {
        name = name.toLowerCase();

        if (!this.settings[`shortcuts`]) {
            this.settings[`shortcuts`] = {}
        }

        this.settings.shortcuts[name] = command;
        this.save();
        return true;
    }

    validateAdminRole(role: string) {
        return this.settings.adminRoles.find((r) => role.toLowerCase() === r.toLowerCase());
    }
    validateEditor(userId: string) {
        return this.settings.editors.includes(userId);
    }
    validateCommand(userRole: string, command: string) {
        command = command.toLowerCase();

        var filtered = this.settings.adminOnlyCommands.filter(r => r.toLowerCase() === command);
        var includes = this.settings.disabledCommands.includes(command);
        if (filtered.length > 0 || includes) {
            console.log("Command is Admin only");
            return this.validateAdminRole(userRole);
        }
        return true;
    }
    validateConfig(guildId: string) {
        return fs.existsSync(`config/config-${guildId}.json`);
    }

};

export class Config {
    configuration: any;
    rankings: any;
    fullRankings: any;
    serverSettings: any;
    calculations: any;
    information: any;
    guilds: any;
    constructor() {
    }

    init() {
        this.guilds = {};
        
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
    loadGuild(name: string, guildId: string) {
        this.guilds[guildId] = new GuildSettings(name, guildId);
        //console.log("Loaded Guild");
        //console.log(this.guilds[guildId]);
    }
    unloadGuild(guildId: string) {
        if (this.guilds[guildId]) {
            //console.log("Unloaded Guild");
            //console.log(this.guilds[guildId]);
            delete this.guilds[guildId];
        }
    }
    reload(file: string) {
        if (file.includes("information.json")) {
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
    setPrefix(guildId: string, prefix: string) {
        if (!this.guilds[guildId]) {
            return;
        }
        this.guilds[guildId].setPrefix(prefix);
    }
    getPrefix(guildId: string) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultPrefix;
        }
        return this.guilds[guildId].getPrefix();
    }
    getSuccess(guildId: string) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultSuccessEmote;
        }
        return this.guilds[guildId].getSuccessEmote();
    }
    getFailure(guildId: string) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultFailureEmote;
        }
        return this.guilds[guildId].getFailureEmote();
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
    getSettings(guildId: string, name: string) {
        return this.guilds[guildId].getSettings(name);
    }
    getCalculations(search: string) {
        var category = this.calculations[search];

        if (!category) {
            var found: { [key: string]: string } = {};
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
    getShortcut(guildId: string, command: string) {
        return this.guilds[guildId].getShortcut(command);
    }
    setShortcut(guildId: string, name: string, command: string) {
        return this.guilds[guildId].setShortcut(name, command);
    }
    validateCommand(guildId: string, userRole: string, command: string) {
        //console.log(`Config Validate Command (${guildId})` + this.guilds[guildId]);
        if (!this.guilds[guildId]) {
            console.log("Unknown guild, allow");
            return true;
        }
        //console.log("Validate Command Guild: " + guildId);
        //console.log(this.guilds[guildId]);
        return this.guilds[guildId].validateCommand(userRole, command);
    }
    validateEditor(guildId: string, userId: string) {
        return this.guilds[guildId].validateEditor(userId);
    }
    getInfoSettings() {
        return this.information;
    }
};
