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
var Config = /** @class */ (function () {
    function Config() {
    }
    Config.prototype.init = function () {
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
    Config.prototype.getInfoSettings = function () {
        return this.information;
    };
    return Config;
}());
exports.Config = Config;
;
