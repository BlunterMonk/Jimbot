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
var Config = /** @class */ (function () {
    function Config() {
    }
    Config.prototype.init = function () {
        var data = fs.readFileSync(filename);
        this.configuration = JSON.parse(data);
    };
    Config.prototype.save = function () {
        var newData = JSON.stringify(this.configuration, null, "\t");
        fs.writeFileSync(filename, newData);
    };
    Config.prototype.reload = function () {
        var data = fs.readFileSync(filename);
        this.configuration = JSON.parse(data);
    };
    Config.prototype.alias = function () {
        return this.configuration.unitAliases;
    };
    Config.prototype.filetypes = function () {
        return this.configuration.filetypes;
    };
    // ALIASES
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
    Config.prototype.setAlias = function (name, value) {
        this.configuration.unitAliases[name.toLowerCase()] = value;
    };
    // SHORTCUTS
    Config.prototype.getShortcut = function (name) {
        name = name.toLowerCase();
        console.log("Searching For Shortcut: " + name);
        if (!this.configuration.shortcuts || !this.configuration.shortcuts[name])
            return null;
        console.log("Found Shortcut: " + this.configuration.shortcuts[name]);
        return this.configuration.shortcuts[name];
    };
    Config.prototype.setShortcut = function (name, command) {
        name = name.toLowerCase();
        if (!this.configuration["shortcuts"]) {
            this.configuration["shortcuts"] = {};
        }
        this.configuration.shortcuts[name] = command;
        this.save();
        return true;
    };
    return Config;
}());
exports.Config = Config;
;
