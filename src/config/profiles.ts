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

export interface UserProfile {
    autobuild: boolean;
    compact: boolean; // if set, auto builds will display in compact mode
    friendcode: string;
    nickname: string;
    status: string;
    lead: string; // url for lead build
    builds: {[key: string]: string};
}

export class profile {
    configuration: {[key: string]: UserProfile};
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
    getProfile(id: string): UserProfile {
        return this.configuration[id];
    }
    addProfile(id: string, code: string, name: string) {
        this.configuration[id] = {
            autobuild: true,
            compact: false,
            friendcode: code,
            nickname: name,
            status: "",
            lead: null,
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
    setPreferCompact(id: string, enable: boolean) {
        if (!this.configuration[id])
            return;

        this.configuration[id].compact = enable;
        this.save()
    }
    getPreferCompact(id: string): boolean {
        if (!this.configuration[id])
            return false;

        return this.configuration[id].compact;
    }

    getProfileID(nickname: string): string {
        nickname = nickname.toLowerCase();
        var keys = Object.keys(this.configuration);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            const user = this.configuration[key];

            if (nickname == user.nickname.toLowerCase()) {
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

            if (name.toLowerCase() == user.nickname.toLowerCase()) {
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

    getStatus(id: string): string {
        if (!this.configuration[id])
            return "";
        if (!this.configuration[id].status)
            return "";
        
        return this.configuration[id].status;
    }
    setStatus(id: string, status: string) {
        if (!this.configuration[id])
            return;

        status = status.limitTo(128);

        this.configuration[id].status = status;
        this.save()
    }

    getLead(id: string): string {
        if (!this.configuration[id])
            return "";
        if (!this.configuration[id].lead)
            return "";
        
        return this.configuration[id].lead;
    }
    setLead(id: string, url: string) {
        if (!this.configuration[id])
            return;

        this.configuration[id].lead = url;
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