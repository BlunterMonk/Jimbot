
const fs = require('fs');
const filename = 'config.json';
const rankingFile = 'rankings.json';
const rankingDump = 'rankingsdump.json';

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
        var filename = `config-${this.guildId}.json`;
        if (fs.existsSync(filename)) {
            var data = fs.readFileSync(filename);
            this.settings = JSON.parse(data);
        } else {
            var data = fs.readFileSync(`config-default.json`);
            this.settings = JSON.parse(data);
        }
    }
    save() {
        var newData = JSON.stringify(this.settings, null, '\t');
        fs.writeFileSync(this.getFilename(), newData);
    }

    getFilename() {
        return `config-${this.guildId}.json`;
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

    getSettings() {
        return this.settings;
    }


    validateAdminRole(role) {
        console.log("Role is Admin");
        return this.settings.adminRoles.find(r => role.toLowerCase() === r.toLowerCase());
    }
    validateCommand(userRole, command) {
        if (this.settings.adminOnlyCommands.find(r => r.toLowerCase() === command.toLowerCase())) {
            console.log("Command is Admin only");
            return this.validateAdminRole(userRole);
        }
        return true;
    }
    validateConfig(guildId) {
        return fs.existsSync(`config-${guildId}.json`);
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
    guilds: {},
    init() {
        var data = fs.readFileSync(filename);
        this.configuration = JSON.parse(data);

        var rank = fs.readFileSync(rankingFile);
        this.rankings = JSON.parse(rank);
        
        var dump = fs.readFileSync(rankingDump);
        this.fullRankings = JSON.parse(dump);
    },
    save() {
        var newData = JSON.stringify(this.configuration);
        fs.writeFileSync(filename, newData);
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
    getRankings(category) {
        return this.rankings[category.toLowerCase()];
    },
    getUnitRank(name) {
        return this.fullRankings.find((r) => {
            return r["Unit"] === name;
        });
    },
    validateCommand(guildId, command) {
        if (!this.guilds[guildId]) {
            console.log("Unknown guild, allow");
            return true;
        }
        return this.guilds[guildId].validateCommand(command);
    }
};
  
