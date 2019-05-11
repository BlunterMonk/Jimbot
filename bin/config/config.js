"use strict";
//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
require("../string/string-extension.js");
var filename = './config/config.json';
var rankingFile = 'data/rankings.json';
var rankingDump = 'data/rankingsdump.json';
var unitCalc = 'data/unitcalculations.json';
var infoJson = 'data/information.json';
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
var GuildSettings = /** @class */ (function () {
    function GuildSettings(name, guildId) {
        this.guildName = name;
        this.guildId = guildId;
        this.load();
        console.log("Guild Config Settings");
        console.log(this.settings);
        this.settings.name = name;
        this.save();
    }
    GuildSettings.prototype.load = function () {
        var filename = "./config/config-" + this.guildId + ".json";
        if (fs.existsSync(filename)) {
            var data = fs.readFileSync(filename);
            this.settings = JSON.parse(String(data));
        }
        else {
            var data = fs.readFileSync("./config/config-default.json");
            this.settings = JSON.parse(String(data));
        }
    };
    GuildSettings.prototype.save = function () {
        var newData = JSON.stringify(this.settings, null, '\t');
        fs.writeFileSync(this.getFilename(), newData);
    };
    GuildSettings.prototype.getFilename = function () {
        return "config/config-" + this.guildId + ".json";
    };
    GuildSettings.prototype.getPrefix = function () {
        return this.settings.prefix;
    };
    GuildSettings.prototype.setPrefix = function (prefix) {
        this.settings.prefix = prefix;
        this.save();
    };
    GuildSettings.prototype.getSuccessEmote = function () {
        return this.settings.successEmote;
    };
    GuildSettings.prototype.getFailureEmote = function () {
        return this.settings.failureEmote;
    };
    GuildSettings.prototype.getSettings = function (name) {
        if (name) {
            return this.settings[name];
        }
        return this.settings;
    };
    GuildSettings.prototype.getShortcut = function (name) {
        name = name.toLowerCase();
        console.log("Searching For Shortcut: " + name);
        if (!this.settings.shortcuts || !this.settings.shortcuts[name])
            return null;
        console.log("Found Shortcut: " + this.settings.shortcuts[name]);
        return this.settings.shortcuts[name];
    };
    GuildSettings.prototype.setShortcut = function (name, command) {
        name = name.toLowerCase();
        if (!this.settings["shortcuts"]) {
            this.settings["shortcuts"] = {};
        }
        this.settings.shortcuts[name] = command;
        this.save();
        return true;
    };
    GuildSettings.prototype.validateAdminRole = function (role) {
        return this.settings.adminRoles.find(function (r) { return role.toLowerCase() === r.toLowerCase(); });
    };
    GuildSettings.prototype.validateEditor = function (userId) {
        return this.settings.editors.includes(userId);
    };
    GuildSettings.prototype.validateCommand = function (userRole, command) {
        command = command.toLowerCase();
        var filtered = this.settings.adminOnlyCommands.filter(function (r) { return r.toLowerCase() === command; });
        var includes = this.settings.disabledCommands.includes(command);
        if (filtered.length > 0 || includes) {
            console.log("Command is Admin only");
            return this.validateAdminRole(userRole);
        }
        return true;
    };
    GuildSettings.prototype.validateConfig = function (guildId) {
        return fs.existsSync("config/config-" + guildId + ".json");
    };
    return GuildSettings;
}());
exports.GuildSettings = GuildSettings;
;
var Config = /** @class */ (function () {
    function Config() {
    }
    Config.prototype.init = function () {
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
    };
    Config.prototype.save = function () {
        var newData = JSON.stringify(this.configuration, null, "\t");
        fs.writeFileSync(filename, newData);
    };
    Config.prototype.saveRankings = function () {
        var newData = JSON.stringify(this.rankings, null, "\t");
        fs.writeFileSync(rankingFile, newData);
    };
    Config.prototype.saveInformation = function () {
        var newData = JSON.stringify(this.information, null, "\t");
        fs.writeFileSync(infoJson, newData);
    };
    Config.prototype.loadGuild = function (name, guildId) {
        this.guilds[guildId] = new GuildSettings(name, guildId);
        //console.log("Loaded Guild");
        //console.log(this.guilds[guildId]);
    };
    Config.prototype.unloadGuild = function (guildId) {
        if (this.guilds[guildId]) {
            //console.log("Unloaded Guild");
            //console.log(this.guilds[guildId]);
            delete this.guilds[guildId];
        }
    };
    Config.prototype.reload = function (file) {
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
        }
        else if (file.includes("information.json")) {
            console.log("Reploading Information.json");
            this.information = JSON.parse(fs.readFileSync(infoJson));
        }
    };
    Config.prototype.alias = function () {
        return this.configuration.unitAliases;
    };
    Config.prototype.emotes = function () {
        return this.configuration.emotes;
    };
    Config.prototype.filetypes = function () {
        return this.configuration.filetypes;
    };
    Config.prototype.getAlias = function (value) {
        value = value.toLowerCase();
        if (this.configuration.unitAliases[value]) {
            console.log("found alias");
            return this.configuration.unitAliases[value];
        }
        else {
            return null;
        }
    };
    Config.prototype.addAlias = function (name, value) {
        this.configuration.unitAliases[name.toLowerCase()] = value;
    };
    Config.prototype.setPrefix = function (guildId, prefix) {
        if (!this.guilds[guildId]) {
            return;
        }
        this.guilds[guildId].setPrefix(prefix);
    };
    Config.prototype.getPrefix = function (guildId) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultPrefix;
        }
        return this.guilds[guildId].getPrefix();
    };
    Config.prototype.getSuccess = function (guildId) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultSuccessEmote;
        }
        return this.guilds[guildId].getSuccessEmote();
    };
    Config.prototype.getFailure = function (guildId) {
        if (!this.guilds[guildId]) {
            return this.configuration.defaultFailureEmote;
        }
        return this.guilds[guildId].getFailureEmote();
    };
    Config.prototype.setRankings = function (category, data) {
        console.log("setRankings: category(" + category + "), data(" + data + ")");
        if (this.rankings.bestunits[category]) {
            console.log(this.rankings.bestunits[category]);
            this.rankings.bestunits[category] = data;
            this.saveRankings();
            return true;
        }
        return false;
    };
    Config.prototype.getRankings = function (category) {
        return this.rankings[category.toLowerCase()];
    };
    Config.prototype.getUnitRank = function (name) {
        return this.fullRankings.find(function (r) {
            return r["Unit"] === name;
        });
    };
    Config.prototype.getSettings = function (guildId, name) {
        return this.guilds[guildId].getSettings(name);
    };
    Config.prototype.getCalculations = function (searchTerm) {
        var _this = this;
        var category = this.calculations[searchTerm];
        if (!category) {
            var found = {};
            var names = searchTerm.split("|");
            console.log("Get Calculations");
            console.log(names);
            names.forEach(function (search, index) {
                search = search.trim();
                var burst = search.includes("burst_");
                search = search.replace("burst_", "");
                Object.keys(_this.calculations).forEach(function (cat) {
                    var category = _this.calculations[cat];
                    if (burst && !cat.includes("burst_")) {
                        return;
                    }
                    else if (!burst && cat.includes("burst_")) {
                        return;
                    }
                    Object.keys(category).forEach(function (key) {
                        var unit = category[key];
                        var name = unit.name.toLowerCase().replaceAll(" ", "_");
                        if (name.includes(search.toLowerCase())) {
                            found[unit.name] = unit;
                        }
                    });
                });
            });
            return found;
        }
        else {
            return category;
        }
    };
    Config.prototype.setInformation = function (name, title, data) {
        if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }
        this.information[name] = {
            title: title,
            description: data
        };
        this.saveInformation();
        return true;
    };
    Config.prototype.getInformation = function (name) {
        if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }
        if (this.information[name]) {
            return this.information[name];
        }
        return null;
    };
    Config.prototype.getShortcut = function (guildId, command) {
        return this.guilds[guildId].getShortcut(command);
    };
    Config.prototype.setShortcut = function (guildId, name, command) {
        return this.guilds[guildId].setShortcut(name, command);
    };
    Config.prototype.validateCommand = function (guildId, userRole, command) {
        //console.log(`Config Validate Command (${guildId})` + this.guilds[guildId]);
        if (!this.guilds[guildId]) {
            console.log("Unknown guild, allow");
            return true;
        }
        //console.log("Validate Command Guild: " + guildId);
        //console.log(this.guilds[guildId]);
        return this.guilds[guildId].validateCommand(userRole, command);
    };
    Config.prototype.validateEditor = function (guildId, userId) {
        return this.guilds[guildId].validateEditor(userId);
    };
    Config.prototype.getInfoSettings = function () {
        return this.information;
    };
    return Config;
}());
exports.Config = Config;
;
