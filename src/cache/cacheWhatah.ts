//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import * as fs from "fs";
import * as readline from 'readline';
import { google } from 'googleapis';
import { log, error } from "../global.js";
import { UnitCalculations, Calculation } from "./cache.js";
import { GetPage, generateAuth } from "./google.js";

////////////////////////////////////////////////////////////

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const sheetURL = "https://docs.google.com/spreadsheets/d/1bXWLfFu2ECQ3JR-5XAAALkhnnEUMr0pUxYxgI1QAgHw";
const sheetName = "Compare All";
const sheetID = "1bXWLfFu2ECQ3JR-5XAAALkhnnEUMr0pUxYxgI1QAgHw";

function parseDamageSheet(damageList): UnitCalculations {

    var calcs: UnitCalculations = {};

    damageList.map((row) => {
        log("Row: ", row);
        let name = row[0];
        let turns = row[3];
        let damage = row[4];
        let burst = row[5];
        let bturn = row[6];
        
        if (name) {
            name = name.trim();
            calcs[name] = {
                name: name,
                damage: damage,
                turns: turns,
                burst: burst,
                burstTurn: bturn,
                type: "physical"
            }
        }
    });

    return calcs;
}

function queryDamageAndBurst(oAuth: any, sourceID: string, saveLocation: string, forced = false): Promise<UnitCalculations> {
    
    var units = {};
    var totalUnits = 0;

    return new Promise<UnitCalculations>((resolve, reject) => {

        // Read main comparison page 
        GetPage(oAuth, sourceID, `${sheetName}!F4:L`)
        .then(damageList => {

            log(`Finished reading ${sheetName} sheet.`);

            resolve(parseDamageSheet(damageList));
        })
        .catch(e => {
            error("Failed to get damage page: ", e);
            reject(e);
        });
    });
}

export var UpdateCalculations = function(forced: boolean, saveLocation: string): Promise<UnitCalculations> {

    return new Promise(function (resolve, reject) {
        // Authorize a client with credentials, then call the Google Sheets API.
        let creds = JSON.parse(fs.readFileSync('./credentials/google.json').toString());
        let oauth = generateAuth(creds);

        // Read main comparison page 
        queryDamageAndBurst(oauth, sheetID, saveLocation, forced)
        .then(r => {
            fs.writeFileSync(saveLocation, JSON.stringify(r, null, "\t"));
            resolve(r);
        })
        .catch(e => {
            reject("Failed to cache Whatah damage caluclations: " + e);
        });
    })
}

