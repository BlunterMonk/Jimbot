
const fs = require('fs');
const filename = 'config.json';
const rankingFile = 'rankings.json';
const rankingDump = 'rankingsdump.json';

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
    setPrefix(serverId, prefix) {
        if (!this.configuration.servers[serverId]) {
            this.configuration.servers[serverId] = {
                prefix: prefix,
                successEmote: this.configuration.defaultSuccessEmote,
                failureEmote: this.configuration.defaultFailureEmote
            }
        }
        this.configuration.servers[serverId].prefix = prefix;
    },
    getPrefix(serverId) {
        if (!this.configuration.servers[serverId]) {
            return this.configuration.defaultPrefix;
        }
        return this.configuration.servers[serverId].prefix;
    },
    getSuccess(serverId) {
        if (!this.configuration.servers[serverId]) {
            return this.configuration.defaultSuccessEmote;
        }
        return this.configuration.servers[serverId].successEmote;
    },
    getFailure(serverId) {
        if (!this.configuration.servers[serverId]) {
            return this.configuration.defaultFailureEmote;
        }
        return this.configuration.servers[serverId].failureEmote;
    },
    getRankings(category) {
        return this.rankings[category.toLowerCase()];
    },
    getUnitRank(name) {
        return this.fullRankings.find((r) => {
            return r["Unit"] === name;
        });
    }
};
  
