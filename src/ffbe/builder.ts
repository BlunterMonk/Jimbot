//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as request from "request";
import * as fs from "fs";
import * as cheerio from "cheerio";

import { log, logData, checkString, compareStrings, escapeString } from "../global.js";
import "../string/string-extension.js";
import {Cache, cache} from "../cache/cache.js";
import * as constants from "../constants.js";
import * as https from "https";

const lyreUnitsEndpoint  = function(n) { return `https://raw.githubusercontent.com/lyrgard/ffbeEquip/master/tools/${n}/unitsWithPassives.json`; };
const lyreItemsEndpoint  = function(n) { return `https://raw.githubusercontent.com/lyrgard/ffbeEquip/master/tools/${n}/data.json`; };
const lyreEspersEndpoint = function(n) { return `https://raw.githubusercontent.com/lyrgard/ffbeEquip/master/tools/${n}/defaultBuilderEspers.json`; };

const lyreItemsJson  = function(n) { return `data/lyregard-${n}/lyregard-items.json`;  };
const lyreUnitsJson  = function(n) { return `data/lyregard-${n}/lyregard-units.json`;  };
const lyreEspersJson = function(n) { return `data/lyregard-${n}/lyregard-espers.json`; };

class builder {
    lyregardItems: any;
    lyregardUnits: any;
    lyregardEspers: any;
    constructor() {
        this.reload();
    }

    reload() {
        this.lyregardItems = {};
        this.lyregardUnits = {};
        this.lyregardEspers = {};

        var r = ["gl","jp"];
        r.forEach(element => {
            this.lyregardItems[element] = JSON.parse(fs.readFileSync(lyreItemsJson(element)).toString());
            this.lyregardUnits[element] = JSON.parse(fs.readFileSync(lyreUnitsJson(element)).toString());
            this.lyregardEspers[element]= JSON.parse(fs.readFileSync(lyreEspersJson(element)).toString());
        });
    }
    async update(callback) {

        var self = this;
        var success = function() {
            console.log(`Reloaded Lyregard Data`);

            callback(true, null);
        }
        var fail = function(e) {
            console.log(`failed to update Lyregard data: ${e}`);

            callback(false, e);
        }

        await cacheLyregardData(() =>{
            this.reload();
            success();
        }).catch(fail);
    }

    getItems(region: string, id: string): any[] {
        var items = [];
        this.lyregardItems[region].forEach(element => {
            if (element.id == id)
                items.push(element);
        });

        return items;
    }
    getUnit(region: string, id: string): any {
        return this.lyregardUnits[region][id];
    }

    getEsper(region: string, name: string): any {
        for (let index = 0; index < this.lyregardEspers[region].length; index++) {
            const element = this.lyregardEspers[region][index];
            
            if (element.id == name)
                return element;
        } 

        return null;
    }
}


export const Builder = new builder();

function downloadFile(path, link, callback) {

    var file = null;
    https.get(link, function(response) {
        if (response.statusCode !== 200) {
            log("page not found");
            callback(null);
            return;
        }
        file = fs.createWriteStream(path);
        file.on('finish', function() {
            callback(path);
        });
        return response.pipe(file);
    });
}

async function cacheLyregardData(callback) {

    return new Promise(function (resolve, reject) {
        
        var files = 6;
        var end = function() {
            files--;
            if (files <= 0) {
                callback();
            }
        }

        var r = ["gl","jp"];
        r.forEach(element => {
            var r1 = element.toUpperCase();

            downloadFile(lyreUnitsJson(element), lyreUnitsEndpoint(r1), (p) => {
                if (p == null) {
                    reject(Error('page not found '))
                } else {
                    end();
                }
            })
            downloadFile(lyreItemsJson(element), lyreItemsEndpoint(r1), (p) => {
                if (p == null) {
                    reject(Error('page not found '))
                } else {
                    end();
                }
            })
            downloadFile(lyreEspersJson(element), lyreItemsEndpoint(r1), (p) => {
                if (p == null) {
                    reject(Error('page not found '))
                } else {
                    end();
                }
            })
        });

    });
}


/////////////////////////////////////////////
/// BUILDER LOGIC

// Filter out the list of matching item objects based on the units equipment
// mostly used for materia requirements
// criteria: {equipedConditions: [], exclusiveUnits: []}
function filterItems(itemList: any[], criteria: any) {

}