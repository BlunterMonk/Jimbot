//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import * as fs from "fs";
import "../util/string-extension.js";

////////////////////////////////////////////////////////////

const filename = './config/config.json';

export class config {
    configuration: any;
    serverSettings: any;
    constructor() {
        this.init();
    }

    init() {
        this.reload();
    }
    save() {
        var newData = JSON.stringify(this.configuration, null, "\t");
        fs.writeFileSync(filename, newData);
    }
    
    reload() {
        this.configuration = JSON.parse(fs.readFileSync(filename).toString());
    }

    alias() {
        return this.configuration.unitAliases;
    }
    filetypes() {
        return this.configuration.filetypes;
    }

    // ALIASES
    getAlias(value: any) {
        value = value.toLowerCase();
        if (this.configuration.unitAliases[value]) {
            // log("found alias");
            return this.configuration.unitAliases[value];
        } else {
            return null;
        }
    }
    setAlias(name: string, value: any) {
        this.configuration.unitAliases[name.toLowerCase()] = value;
    }
    removeAlias(name: string) {
        if (!this.configuration.unitAliases[name])
            return;

        delete this.configuration.unitAliases[name];
        this.save();
    }

    // COMMAND ALIASES
    getCommandAlias(name: string) {
        name = name.toLowerCase();
        // log(`Searching For Command Alias: ${name}`);
        if (!this.configuration.commandAliases || !this.configuration.commandAliases[name])
            return null;
            
        // log(`Found Command Alias: ${this.configuration.commandAliases[name]}`);
        return this.configuration.commandAliases[name];
    }
    setCommandAlias(name: string, command: string) {
        name = name.toLowerCase().replaceAll(" ", "_");

        this.configuration.commandAliases[name] = command;
        this.save();
        return true;
    }

    // SHORTCUTS
    getShortcut(name: string) {
        name = name.toLowerCase();
        // log(`Searching For Shortcut: ${name}`);
        if (!this.configuration.shortcuts || !this.configuration.shortcuts[name])
            return null;
            
        // log(`Found Shortcut: ${this.configuration.shortcuts[name]}`);
        return this.configuration.shortcuts[name];
    }
    setShortcut(name: string, command: string) {
        name = name.toLowerCase();

        if (!this.configuration[`shortcuts`]) {
            this.configuration[`shortcuts`] = {}
        }

        this.configuration.shortcuts[name] = command;
        this.save();
        return true;
    }

    // USERS
    isIDAuthorized(id: string) {
        return this.configuration.authorizedUsers[id] != null;
    }
    getAuthorizedUsers() {
        return this.configuration.authorizedUsers;
    }
    getUserNameFromID(id: string) {
        return this.configuration.authorizedUsers[id];
    }
    getUserIDFromName(name: string) {
        
        var id = "";
        Object.keys(this.configuration.authorizedUsers).forEach(key => {
            if (name == this.configuration.authorizedUsers[key]) {
                id = key
            }
        });
        // log(`getUserIDFromName(${name}) return:(${id})`)
        return id;
    }

    getLogLevel(): string {
        return this.configuration.loglevel;
    }
};

export const Config = new config();