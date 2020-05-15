//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "../util/string-extension.js";
import * as fs from "fs";
import { log } from "../global.js";

////////////////////////////////////////////////////////////

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

export class GuildSettings {
    guildName: any;
    guildId: any;
    settings: any;
    constructor(name: string, guildId: any) {

        this.guildName = name;
        this.guildId = guildId;

        this.load();

        this.settings.name = name;
        this.save();
    }

    load() {
        var filename = `./config/guilds/config-${this.guildId}.json`;
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
        return `config/guilds/config-${this.guildId}.json`;
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
        if (!this.settings.shortcuts || !this.settings.shortcuts[name])
            return null;
            
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

    getResponse(name: string) {
        return this.settings.response[name];
    }
    setResponse(name: string, value: string) {
        this.settings.response[name] = value;
        this.save();
        return (this.settings.response[name]);
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
            //log("Command is Admin only");
            return this.validateAdminRole(userRole);
        }
        return true;
    }
    validateConfig(guildId: string) {
        return fs.existsSync(`config/guilds/config-${guildId}.json`);
    }
};