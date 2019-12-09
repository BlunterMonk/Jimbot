//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


import * as fs from "fs";
import * as readline from 'readline';
import { google } from 'googleapis';
import { log, error } from "../global.js";

////////////////////////////////////////////////////////////

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
//const calcSheet = "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0";
const calcSheet = "https://docs.google.com/spreadsheets/d/1o-q9G1I1Z1QArbzrTySjjNs-OvmLE-sBRYljCX6EKUo";
const whaleSheet = "https://docs.google.com/spreadsheets/d/1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";
const sheetName = "Damage comparison";
const burstSheetName = "Burst Comparison";
const furcSheetID = "1o-q9G1I1Z1QArbzrTySjjNs-OvmLE-sBRYljCX6EKUo";
const whaleSheetID = "1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";
const furculaSaveLocation = "data/furculacalculations.json";
const whaleSaveLocation = "data/whalecalculations.json";

type UnitCalculations = {[key: string]: Calculation};
interface Calculation {
    name: string;
    type: string;
    damage: string;
    turns: string;
    burst?: string;
    burstTurn?: string;
    url?: string;
    wiki?: string;
    rotation?: string[];
}

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = './credentials/token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {

    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    // Check if we have previously stored a token.
    var token = fs.readFileSync(TOKEN_PATH);
    if (!token) {
        log("Error getting token");
        return;
    } 
    //token = getNewToken(oAuth2Client, callback);
    
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    return oAuth2Client;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    log('Authorize this app by visiting this url: ' + authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) 
                return console.error('Error while trying to retrieve access token', err);
            
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) 
                    return console.error(err);
                log('Token stored to ' + TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function GetPage(auth: any, sourceID: string, range: string): Promise<any> {
    var sheets = google.sheets({version: 'v4', auth});

    return new Promise<any>((resolve, reject) => {

        sheets.spreadsheets.values.get({
            spreadsheetId: sourceID,
            range: range
        }, (err, res) => {
            if (err) {
                reject(Error('The API returned an error: ' + err));
                return;
            }

            const rows = res.data.values;
            if (rows.length == 0) {
                reject("No Data Found.");
            }

            resolve(rows);
        });
    });
}


interface slotDef {
    pn:     number,
    pdpt:   number,
    pdpt1:  number,
    pturns: number,
    pgain?: number,
    mn:     number,
    mdpt:   number,
    mdpt1:  number,
    mturns: number,
    mgain?: number,
    hn:     number,
    hdpt:   number,
    hdpt1:  number,
    hturns: number,
    hgain?: number
}


function parseDamageSheet(def: slotDef, damageList, burstList): UnitCalculations {

    var phy: UnitCalculations = {};
    var mag: UnitCalculations = {};
    var hyb: UnitCalculations = {};
    var pJP = false;
    var mJP = false;
    var hJP = false;

    damageList.map((row) => {
        let pName = row[def.pn];
        let pDpt = row[def.pdpt];
        let pTurns = row[def.pturns];

        var mName = row[def.mn];
        let mDpt = row[def.mdpt];
        let mTurns = row[def.mturns];

        var hName = row[def.hn];
        let hDpt = row[def.hdpt];
        let hTurns = row[def.hturns];
        
        if (pName && !pName.includes("Unreleased")) {
            pName = pName.trim();
            phy[pName] = {
                name: pName,
                damage: pDpt,
                turns: pTurns,
                type: "physical"
            }
        }

        if (mName && !mName.includes("Unreleased")) {
            mName = mName.trim();
            mag[mName] = {
                name: mName,
                damage: mDpt,
                turns: mTurns,
                type: "magic"
            }
        } 

        if (hName && !hName.includes("Unreleased")) {
            hName = hName.trim();
            hyb[hName] = {
                name: hName,
                damage: hDpt,
                turns: hTurns,
                type: "hybrid"
            }
        }
    });

    burstList.map((row) => {
        var pName = row[def.pn];
        var mName = row[def.mn];
        var hName = row[def.hn];
        
        if (pName && phy[pName] && !pName.includes("Unreleased")) {
            pName = pName.trim();
            phy[pName].burst = row[def.pdpt];
            phy[pName].burstTurn = row[def.pturns];
        }

        if (mName && mag[mName] && !mName.includes("Unreleased")) {
            mName = mName.trim();
            mag[mName].burst = row[def.mdpt];
            mag[mName].burstTurn = row[def.mturns];
        }

        if (hName && hyb[hName] && !hName.includes("Unreleased")) {
            hName = hName.trim();
            hyb[hName].burst = row[def.hdpt];
            hyb[hName].burstTurn = row[def.hturns];
        }
    });

    return Object.assign({}, phy, mag, hyb);
}

function parseUnitPage(rows: any) {

    var buildURL = "";
    var wikiURL = "";
    var rotation = [];
    rows.map((row, ind) => {
        if (ind == 0) {
            wikiURL = row[1];
        } else if (ind == 1) {
            buildURL = row[1];
        } else if (ind > 3) {
            rotation.push(row[1]);
        }
    });

    return {w: wikiURL, b: buildURL, r: rotation};
}

function queryDamageAndBurst(oAuth: any, sourceID: string, saveLocation: string, def: slotDef, forced = false): Promise<UnitCalculations> {
    
    var units = {};
    var totalUnits = 0;

    return new Promise<UnitCalculations>((resolve, reject) => {

        // Read main comparison page 
        GetPage(oAuth, sourceID, `${sheetName}!A3:T`)
        .then(damageList => {
            log("Finished reading comparison sheet. Starting burst sheet.");
            totalUnits = Object.keys(damageList).length;

            // Read burst sheet
            GetPage(oAuth, sourceID, `${burstSheetName}!A3:Q`)
            .then(burstList => {
                log("Finished reading burst sheet. Parsing Damage.");

                let units = parseDamageSheet(def, damageList, burstList);
                let oldUnits: UnitCalculations = JSON.parse(fs.readFileSync(saveLocation).toString());
                let parsed: UnitCalculations = {};

                // Read through each units calculation page
                queryUnitPages(oAuth, sourceID, units, oldUnits, forced)
                .then(list => {
                    log("Finished parsing units.");

                    list.forEach(element => {
                        parsed[element.key] = element.calc;
                    });

                    resolve(parsed);
                })
                .catch(e => {
                    error("Failed to query unit pages: ", e);
                    reject(e);
                });
            })
            .catch(e => {
                error("Failed to get burst page: ", e);
                reject(e);
            });
        })
        .catch(e => {
            error("Failed to get damage page: ", e);
            reject(e);
        });
    });
}

type CalcPair = {key: string, calc: Calculation};
function queryUnitPages(oAuth: any, sourceID: string, units: UnitCalculations, oldUnits: UnitCalculations, forced: boolean): Promise<CalcPair[]> {
    
    var keys = Object.keys(units);
    var totalUnits = keys.length;

    log("Unit Fields");
    log("Total: " + totalUnits);
    log("Forced Update: ", forced);

    // Start getting unit pages
    let pages: Promise<CalcPair>[] = keys.map((key, ind) => {
        let old = oldUnits[key];
        let unit = units[key];

        if (forced == false && old) {
            if (unit.damage == old.damage
                && unit.burst == old.burst) {
                    
                log(`Skipping Unit: ${key}`);
                return Promise.resolve({
                    key: key,
                    calc: old
                });
            }
        }
        
        var index = key;
        index = index.replace(/(?!\(FFVII AC\))(?!\(KH\))(?!\(Xenogears\))\(.*\)/, "");
        index = index.replace(/\(\J\P\)/, "");
        index = index.trim();

        var range = `${index}!A1:AB20`

        return new Promise<CalcPair>((resolve, reject) => {

            setTimeout(() => {
                log(`[${ind}] Looking For: ${range}`);
                
                GetPage(oAuth, sourceID, range)
                .then(rows => {
                    let unitContent = parseUnitPage(rows);
                    units[key].wiki = unitContent.w;
                    units[key].url = unitContent.b;
                    units[key].rotation = unitContent.r;
                    resolve({
                        key: key,
                        calc: units[key]
                    });
                })
                .catch(e => {
                    error("failed to find unit page: ", e);
                    resolve({
                        key: key,
                        calc: units[key]
                    });
                });
            }, (ind+1) * 1500);
        });
    });

    // todo: finish parsing unit pages
    return Promise.all(pages);
}

export var UpdateCalculations = function(def: slotDef, forced: boolean, saveLocation: string, sourceID: string): Promise<UnitCalculations> {

    return new Promise(function (resolve, reject) {
        // Authorize a client with credentials, then call the Google Sheets API.
        let creds = JSON.parse(fs.readFileSync('./credentials/google.json').toString());
        let oauth = authorize(creds);

        // Read main comparison page 
        queryDamageAndBurst(oauth, sourceID, saveLocation, def, forced)
        .then(r => {
            fs.writeFileSync(saveLocation, JSON.stringify(r, null, "\t"));
            resolve(r);
        })
        .catch(e => {
            reject("Failed to cache damage caluclations: " + e);
        });
    })
}

export var UpdateFurculaCalculations = function(forced): Promise<UnitCalculations> {
    var furcDef = {
        pn: 1,
        pdpt: 2,
        pdpt1: 3,
        pturns: 4,
        mn: 7,
        mdpt: 8,
        mdpt1: 9,
        mturns: 10,
        hn: 13,
        hdpt: 14,
        hdpt1: 15,
        hturns: 16,
    }

    return UpdateCalculations(furcDef, forced, "./data/furculacalculations.json", furcSheetID);
}
export var UpdateWhaleCalculations = function(forced): Promise<UnitCalculations> {
    var shadDef = {
        pn: 1,
        pdpt: 2,
        pdpt1: 4,
        pturns: 4,
        pgain: 5,
        mn: 8,
        mdpt: 9,
        mdpt1: 10,
        mturns: 11,
        mgain: 12,
        hn: 15,
        hdpt: 16,
        hdpt1: 17,
        hturns: 18,
        hgian: 19
    }

    return UpdateCalculations(shadDef, forced, "./data/whalecalculations.json", whaleSheetID);
}
