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

const lyreUnitsEndpoint = "https://raw.githubusercontent.com/lyrgard/ffbeEquip/master/tools/GL/units.json";
const lyreItemsEndpoint = "https://raw.githubusercontent.com/lyrgard/ffbeEquip/master/tools/GL/data.json";

const lyreItemsJson = 'data/lyregard-items.json';
const lyreUnitsJson = 'data/lyregard-units.json';

class builder {
    lyregardItems: any;
    lyregardUnits: any;
    constructor() {
        this.reload();
    }

    reload() {
        this.lyregardItems = JSON.parse(fs.readFileSync(lyreItemsJson).toString());
        this.lyregardUnits = JSON.parse(fs.readFileSync(lyreUnitsJson).toString());
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
            this.lyregardItems = JSON.parse(fs.readFileSync(lyreItemsJson).toString());
            this.lyregardUnits = JSON.parse(fs.readFileSync(lyreUnitsJson).toString());
            success();
        }).catch(fail);
    }

    getItems(id: string): any[] {

        var items = [];
        this.lyregardItems.forEach(element => {
            if (element.id == id)
                items.push(element);
        });

        return items;
    }
    getUnit(id: string): any {
        return this.lyregardUnits[id];
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
        var files = 2;
        var end = function() {
            files--;
            if (files <= 0) {
                callback();
            }
        }
    
        downloadFile("data/lyregard-units.json", lyreUnitsEndpoint, (p) => {
            if (p == null) {
                reject(Error('page not found '))
            } else {
                end();
            }
        })
        downloadFile("data/lyregard-items.json", lyreItemsEndpoint, (p) => {
            if (p == null) {
                reject(Error('page not found '))
            } else {
                end();
            }
        })
    });
}


/////////////////////////////////////////////
/// BUILDER LOGIC

// Filter out the list of matching item objects based on the units equipment
// mostly used for materia requirements
// criteria: {equipedConditions: [], exclusiveUnits: []}
function filterItems(itemList: any[], criteria: any) {

}