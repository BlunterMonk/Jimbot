
const fs = require('fs');
const filename = 'config/config.json';
const rankingFile = 'data/rankings.json';
const rankingDump = 'data/rankingsdump.json';
const unitCalc = 'data/unitcalculations.json';

class GuildSettings {
    constructor(name, guildId) {

        this.guildName = name;
        this.guildId = guildId;
        this.settings = {};

        this.load();

        this.settings.name = name;
        this.save();
    }


    load() {
        var filename = `config/config-${this.guildId}.json`;
        if (fs.existsSync(filename)) {
            var data = fs.readFileSync(filename);
            this.settings = JSON.parse(data);
        } else {
            var data = fs.readFileSync(`config/config-default.json`);
            this.settings = JSON.parse(data);
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
    setPrefix(prefix) {
        this.settings.prefix = prefix;
        this.save();
    }

    getSuccessEmote() {
        return this.settings.successEmote;
    }
    getFailureEmote() {
        return this.settings.failureEmote;
    }

    getSettings(name) {
        if (name) {
            return this.settings[name];
        }

        return this.settings;
    }


    validateAdminRole(role) {
        return this.settings.adminRoles.find(r => role.toLowerCase() === r.toLowerCase());
    }
    validateCommand(userRole, command) {
        command = command.toLowerCase();

        var filtered = this.settings.adminOnlyCommands.filter(r => r.toLowerCase() === command);
        var includes = this.settings.disabledCommands.includes(command);
        if (filtered.length > 0 || includes) {
            console.log("Command is Admin only");
            return this.validateAdminRole(userRole);
        }
        return true;
    }
    validateConfig(guildId) {
        return fs.existsSync(`config/config-${guildId}.json`);
    }

};

module.exports = {
    equipmentCategories: [
        'Items', 'Ability Materia'
    ],
    abilityCategories: [
        'Special Abilities (Active)', 'Special Abilities (Passive)', 'Magic'
    ],
    configuration: null,
    rankings: null,
    fullRankings: null,
    serverSettings: null,
    calculations: null,
    guilds: {},
    init() {
        var data = fs.readFileSync(filename);
        this.configuration = JSON.parse(data);

        var rank = fs.readFileSync(rankingFile);
        this.rankings = JSON.parse(rank);
        
        var dump = fs.readFileSync(rankingDump);
        this.fullRankings = JSON.parse(dump);
                
        var calcs = fs.readFileSync(unitCalc);
        this.calculations = JSON.parse(calcs);
    },
    save() {
        var newData = JSON.stringify(this.configuration, null, "\t");
        fs.writeFileSync(filename, newData);
    },
    saveRankings() {
        var newData = JSON.stringify(this.rankings, null, "\t");
        fs.writeFileSync(rankingFile, newData);
    },
    loadGuild(name, guildId) {
        this.guilds[guildId] = new GuildSettings(name, guildId);
        //console.log("Loaded Guild");
        //console.log(this.guilds[guildId]);
    },
    unloadGuild(guildId) {
        if (this.guilds[guildId]) {
            //console.log("Unloaded Guild");
            //console.log(this.guilds[guildId]);
            delete this.guilds[guildId];
        }
    },
    alias() {
        return this.configuration.unitAliases;
    },
    emotes() {
        return this.configuration.emotes;
    },
    filetypes() {
        return this.configuration.filetypes;
    },
    getAlias(value) {
        value = value.toLowerCase();
        if (this.configuration.unitAliases[value]) {
            console.log("found alias");
            return this.configuration.unitAliases[value];
        } else {
            return null;
        }
    },
    addAlias(name, value) {
        this.configuration.unitAliases[name.toLowerCase()] = value;
    },
    addEmote(name, url) {
        this.configuration.emotes[this.configuration.emotes.length] = {
            name: name,
            value: url
        }
    },
    getEmote(name) {
        //console.log("getEmote");
        //console.log(this.configuration.emotes);

        var found =  this.configuration.emotes.find((e) => {
            //console.log("looper item");
            //console.log(e);
            //console.log(`${e.name} -vs- ${name}`);
            return e.name == name;
        });

        if (found) {
            return found.value;
        } else {
            return null;
        }
    },
    setPrefix(guildId, prefix) {
        if (!this.guilds[guildId]) {
            return;
        }
        this.guilds[guildId].setPrefix(prefix);
    },
    getPrefix(guildId) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultPrefix;
        }
        return this.guilds[guildId].getPrefix();
    },
    getSuccess(guildId) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultSuccessEmote;
        }
        return this.guilds[guildId].getSuccessEmote();
    },
    getFailure(guildId) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultFailureEmote;
        }
        return this.guilds[guildId].getFailureEmote();
    },
    setRankings(category, data) {
        console.log(`setRankings: category(${category}), data(${data})`);
        if (this.rankings.bestunits[category]) {
            console.log(this.rankings.bestunits[category]);
            this.rankings.bestunits[category] = data;
            this.saveRankings();
            return true;
        }
        return false;
    },
    getRankings(category) {
        return this.rankings[category.toLowerCase()];
    },
    getUnitRank(name) {
        return this.fullRankings.find((r) => {
            return r["Unit"] === name;
        });
    },
    getSettings(guildId, name) {
        return this.guilds[guildId].getSettings(name);
    },
    getCalculations(search) {
        var category = this.calculations[search];

        if (!category) {
            var found = {};
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
    },
    validateCommand(guildId, userRole, command) {
        //console.log(`Config Validate Command (${guildId})` + this.guilds[guildId]);
        if (!this.guilds[guildId]) {
            console.log("Unknown guild, allow");
            return true;
        }
        //console.log("Validate Command Guild: " + guildId);
        //console.log(this.guilds[guildId]);
        return this.guilds[guildId].validateCommand(userRole, command);
    }
};
  
