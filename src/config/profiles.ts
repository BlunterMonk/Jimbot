//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "../util/string-extension.js";
import * as fs from "fs";
import { log } from "../global.js";
import { userInfo } from "os";
import { UserProfile } from "discord.js";

////////////////////////////////////////////////////////////

const filename = './data/profiles.json';

interface userProfile {
    autobuild: boolean;
    builds: {[key: string]: string};
}

export class profile {
    configuration: {[key: string]: userProfile};
    constructor() {
        this.init();
    }

    init() {
        this.configuration = JSON.parse(fs.readFileSync(filename).toString());
    }
    save() {
        var newData = JSON.stringify(this.configuration, null, "\t");
        fs.writeFileSync(filename, newData);
    }
    reload() {
        this.configuration = JSON.parse(fs.readFileSync(filename).toString());
    }

    // ALIASES
    getProfile(id: string): userProfile {
        return this.configuration[id];
    }
    addProfile(id: string) {
        this.configuration[id] = {
            autobuild: false,
            builds: {}
        };

        this.save()
    }

    setAutoBuild(id: string, enable: boolean) {
        if (!this.configuration[id])
            return;

        this.configuration[id].autobuild = enable;
        this.save()
    }
    getAutoBuild(id: string): boolean {
        if (!this.configuration[id])
            return false;

        return this.configuration[id].autobuild;
    }

    addBuild(id: string, name: string, url: string) {
        if (!this.configuration[id])
            return;

        this.configuration[id].builds[name] = url;
        this.save()
    }
    

    // setProfileField(name: string, field: string, value: any) {
    //     if (!this.configuration[name])
    //         return;
    //     this.configuration[name][field.toLowerCase()] = value;
    //     this.save()
    // }
    // getProfileField(name: string, field: string) {
    //     if (!this.configuration[name])
    //         return;
    //     return this.configuration[name][field.toLowerCase()];
    // }
};

export const Profiles = new profile();