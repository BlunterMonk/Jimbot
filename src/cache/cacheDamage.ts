//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


const fs = require('fs');
const readline = require('readline');
import {google} from 'googleapis';
import { rejects } from 'assert';
var sleep = require('thread-sleep');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
//const calcSheet = "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0";
const calcSheet = "https://docs.google.com/spreadsheets/d/1RgfRNTHJ4qczJVBRLb5ayvCMy4A7A19U7Gs6aU4xtQE";
const whaleSheet = "https://docs.google.com/spreadsheets/d/1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";
const sheetName = "Damage comparison";
const burstSheetName = "Burst comparison";
const sheetID = "1RgfRNTHJ4qczJVBRLb5ayvCMy4A7A19U7Gs6aU4xtQE";
const whaleSheetID = "1bpoErKiAqbJLjCYdGTBTom7n_NHGTuLK7EOr2r94v5o";
const furculaSaveLocation = "data/furculacalculations.json";
const whaleSaveLocation = "data/whalecalculations.json";
var Reject;

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, sourceID, saveLocation, callback, finished) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    var token = fs.readFileSync(TOKEN_PATH);
    if (!token) 
        token = getNewToken(oAuth2Client, callback);

    oAuth2Client.setCredentials(JSON.parse(token));

    var units = {};
    var oldUnits = JSON.parse(fs.readFileSync(saveLocation).toString());
    var totalUnits = 0;

    // Add unit page info to data
    var queryEnd2 = function (wiki, url, rotation, index) {
        console.log(`[${totalUnits}] ${index}: ${url}`)
        totalUnits--;

        if (index) {
            if (units[index]) {
                units[index].wiki = wiki;
                units[index].url = url;
                units[index].rotation = rotation;
            } else {
                console.log("Could not find unit to add link to, " + index)
            }
        }
        
        if (totalUnits <= 0) {
            console.log("Finished Getting Unit Calcs");

            var save = JSON.stringify(units, null, "\t");
            fs.writeFileSync(saveLocation, save);

            finished();
        }
    };

    // Add unit burst damage info
    var queryEndBurst = function (list) {
        var keys = Object.keys(units);
        keys.forEach((key, ind) => {
            var unit = list[key];
            if (!unit) {
                console.log("Missing Unit Information: " + key);
                return;
            }
            units[key].burst = unit.damage;
            units[key].burstTurn = unit.turns;
        });

        console.log("Unit Fields");
        console.log("Total: " + totalUnits);

        // Start getting unit pages
        var timer = 1;
        var keys = Object.keys(units);
        keys.forEach((key, ind) => {

            if (oldUnits[key] 
                && units[key].damage == oldUnits[key].damage
                && units[key].burst == oldUnits[key].burst) {
                    
                console.log(`Skipping Unit: ${key}`);
                units[key] = oldUnits[key];
                queryEnd2(null, null, null, null);
                return;
            }
            
            var index = key;

            if (!key.includes("(KH)")) {
                key = key.replace(/\(.*\)/, "").trim();
            }

            var range = `${key}!A1:AB20`
            console.log(`[${ind}] Looking For: ${range}`)

            setTimeout(() => {
                GetBuildLink(oAuth2Client, sourceID, index, range, queryEnd2);
            }, timer * 1000);

            timer++;
            // sleep(1000)//sleep for 1 seconds
        });
    }

    // Read secondary burst damage page
    var queryEnd = function (list) {
        units = list;

        var save = JSON.stringify(list, null, "\t");
        fs.writeFileSync(saveLocation, save);

        totalUnits += Object.keys(list).length;

        GetUnitComparison(oAuth2Client, sourceID, `${burstSheetName}!A3:N`, queryEndBurst);
    };

    // Read main comparison page 
    GetUnitComparison(oAuth2Client, sourceID, `${sheetName}!A3:N`, queryEnd);
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
    console.log('Authorize this app by visiting this url:', authUrl);
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
                console.log('Token stored to', TOKEN_PATH);
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
function GetUnitComparison(auth, sourceID, range, callback) {
    var sheets = google.sheets({version: 'v4', auth});

    sheets.spreadsheets.values.get({
        spreadsheetId: sourceID,
        range: range
    }, (err, res) => {

        if (err) {
            console.log('The API returned an error: ' + err);
            Reject(Error('The API returned an error: ' + err));
            return;
            //throw new Error(`The API returned an error: ${err}`);
        }

        const rows = res.data.values;
        if (rows.length) {
            //console.log('Name, DPT:');

            var phy = {};
            var mag = {};
            var hyb = {};

            rows.map((row) => {
                //console.log("Row: ");
                var pName = row[1];
                var mName = row[6];
                var hName = row[11];
                //console.log(`Physical { ${pName}: ${row[2]} - ${row[3]} }`);
                //console.log(`Magic { ${mName}: ${row[7]} - ${row[8]} }`);
                //console.log(`Hybrid { ${hName}: ${row[12]} - ${row[13]} }`);
                
                if (pName && !pName.includes("Unreleased")) {
                    phy[pName] = {
                        name: pName,
                        damage: row[2],
                        turns: row[3],
                        type: "physical",
                        url: null
                    }
                }

                if (mName && !mName.includes("Unreleased")) {
                    mag[mName] = {
                        name: mName,
                        damage: row[7],
                        turns: row[8],
                        type: "magic",
                        url: null
                    }
                }

                if (hName && !hName.includes("Unreleased")) {
                    hyb[hName] = {
                        name: hName,
                        damage: row[12],
                        turns: row[13],
                        type: "hybrid",
                        url: null
                    }
                }
            });

            var units = Object.assign({}, phy, mag, hyb);

            callback(units);
        } else {
            console.log('No data found.');
            callback(null);
        }
    });
}

function GetBuildLink(auth, sourceID, index, range, callback) {
    var sheets = google.sheets({version: 'v4', auth});
    
    sheets.spreadsheets.values.get({
        spreadsheetId: sourceID,
        range: range
    }, (err, res) => {

        if (err) {
            console.log('The API returned an error: ' + err);

            var s = `${err}`;
            if (!s.toLowerCase().includes("unable to parse")) {
                Reject(Error('The API returned an error: ' + err));
                return;
            }

            callback(null, null, null, null);
        }

        const rows = res.data.values;
        if (rows.length) {
            var b = "";
            var w = "";
            var rotation = [];
            rows.map((row, ind) => {
                if (ind == 0) {
                    w = row[1];
                } else if (ind == 1) {
                    b = row[1];
                } else if (ind > 3) {
                    rotation.push(row[1]);
                }
            });

            callback(w, b, rotation, index);
        } else {
            console.log('No data found.');
            callback(null, null, null, null);
        }
    });
}

export var UpdateFurculaCalculations = function(callback) {

    return new Promise(function (resolve, reject) {
        Reject = reject;//(Error('I was never going to resolve.'))

        fs.readFile('credentials.json', (err, content) => {
            if (err) 
                return console.log('Error loading client secret file:', err);
            // Authorize a client with credentials, then call the Google Sheets API.
            authorize(JSON.parse(content), sheetID, furculaSaveLocation, GetUnitComparison, callback);
        });
    })
}

export var UpdateWhaleCalculations = function(callback) {

    return new Promise(function (resolve, reject) {
        Reject = reject;//(Error('I was never going to resolve.'))

        fs.readFile('credentials.json', (err, content) => {
            if (err) 
                return console.log('Error loading client secret file:', err);
            // Authorize a client with credentials, then call the Google Sheets API.
            authorize(JSON.parse(content), whaleSheetID, whaleSaveLocation, GetUnitComparison, callback);
        });
    });
}
