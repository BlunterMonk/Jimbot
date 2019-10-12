//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import "../util/string-extension.js";
import * as fs from "fs";
import { log } from "../global.js";

////////////////////////////////////////////////////////////

const filename = './data/profiles.json';

interface userProfile {
    autobuild: boolean;
    friendcode: string;
    nickname: string;
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
    addProfile(id: string, code: string, name: string) {
        this.configuration[id] = {
            autobuild: false,
            friendcode: code,
            nickname: name,
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

    getProfileID(nickname: string): string {
        var keys = Object.keys(this.configuration);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            const user = this.configuration[key];

            if (nickname == user.nickname) {
                return key;
            }
        }

        return null;
    }

    addBuild(id: string, name: string, url: string) {
        if (!this.configuration[id])
            return;

        this.configuration[id].builds[name] = url;
        this.save()
    }
    getBuild(id: string, name: string): string {
        if (!this.configuration[id])
            return null;

        return this.configuration[id].builds[name];
    }
    removeBuild(id: string, name: string): boolean  {
        if (!this.configuration[id])
            return false;
        if (!this.configuration[id].builds[name])
            return false;

        delete this.configuration[id].builds[name];
        this.save()
        return true;
    }

    setFriendCode(id: string, code: string) {
        if (!this.configuration[id])
            return;

        this.configuration[id].friendcode = code;
        this.save()
    }
    getFriendCode(id: string) {
        if (!this.configuration[id])
            return;

        return this.configuration[id].friendcode;
    }

    nicknameTaken(name: string): boolean {

        var keys = Object.keys(this.configuration);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            const user = this.configuration[key];

            if (name == user.nickname) {
                return true;
            }
        }

        return false;
    }
    saveNickname(id: string, name: string) {
        if (!this.configuration[id])
            return;

        this.configuration[id].nickname = name;
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