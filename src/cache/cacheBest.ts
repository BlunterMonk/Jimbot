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
const sheetURL = "https://docs.google.com/spreadsheets/d/17PBt2IOmTziYej6uOUH25qVDSDpAmRmDKARz13dY374";
const sheetName = "Tier List";
const sheetID = "17PBt2IOmTziYej6uOUH25qVDSDpAmRmDKARz13dY374";

function parseTierList(tierList) {

    tierList.map((row) => {
        log("Row: ", row);
    });

}

function queryRankings(oAuth: any, sourceID: string): Promise<UnitCalculations> {
    
    var units = {};
    var totalUnits = 0;

    return new Promise<UnitCalculations>((resolve, reject) => {

        // Read main comparison page 
        GetPage(oAuth, sourceID, `${sheetName}!A1:K16`)
        .then(tierList => {

            log(`Finished reading ${sheetName} sheet.`);

            parseTierList(tierList);
        })
        .catch(e => {
            error("Failed to get damage page: ", e);
            reject(e);
        });
    });
}

export var UpdateRatings = function(saveLocation: string): Promise<UnitCalculations> {

    return new Promise(function (resolve, reject) {
        // Authorize a client with credentials, then call the Google Sheets API.
        let creds = JSON.parse(fs.readFileSync('./credentials/google.json').toString());
        let oauth = generateAuth(creds);

        // Read main comparison page 
        queryRankings(oauth, sheetID)
        .then(r => {
            // fs.writeFileSync(saveLocation, JSON.stringify(r, null, "\t"));
            // resolve(r);
        })
        .catch(e => {
            reject("Failed to cache Whatah damage caluclations: " + e);
        });
    })
}

