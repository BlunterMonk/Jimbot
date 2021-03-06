//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


const fs = require('fs');
const readline = require('readline');
import {google} from 'googleapis';
import { log } from "../global.js";

////////////////////////////////////////////////////////////

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
//const calcSheet = "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0";
const calcSheet = "https://docs.google.com/spreadsheets/d/14EirlM0ejFfm3fmeJjDg59fEJkqhkIbONPll5baPPvU";
const sheetName = "7* Damage Comparison";
const sheetID = "14EirlM0ejFfm3fmeJjDg59fEJkqhkIbONPll5baPPvU";
const saveLocation = "data/calculations/muspel.json";
var Reject = null;

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = './credentials/token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, finished) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    var token = fs.readFileSync(TOKEN_PATH);
    if (!token) 
        token = getNewToken(oAuth2Client, callback);

    oAuth2Client.setCredentials(JSON.parse(token));

    var units = {};

    // Read secondary burst damage page
    var queryEnd = function (list) {
        units = list;

        var save = JSON.stringify(units, null, "\t");
        fs.writeFileSync(saveLocation, save);

        finished();
    };

    // Read main comparison page 
    GetUnitComparison(oAuth2Client, `${sheetName}!A2:R`, queryEnd);
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
function GetUnitComparison(auth, range, callback) {
    var sheets = google.sheets({version: 'v4', auth});

    sheets.spreadsheets.values.get({
        spreadsheetId: sheetID,
        range: range
    }, (err, res) => {

        if (err) {
            log('The API returned an error: ' + err);
            Reject(Error('The API returned an error: ' + err));
            return;
        }

        const rows = res.data.values;
        if (rows.length) {
            //log('Name, DPT:');

            var phy = {};
            var mag = {};
            var hyb = {};
            var fin = {};

            rows.map((row) => {
                var pName = row[0];
                var mName = row[5];
                var hName = row[10];
                var fName = row[15];
                log(row);

                if (pName) {
                    phy[pName] = {
                        name: pName,
                        damage: row[1],
                        burst: row[2],
                        turns: row[3],
                        type: "physical",
                        url: null
                    }
                    log(phy[pName])
                }
                

                if (mName) {
                    mag[mName] = {
                        name: mName,
                        damage: row[6],
                        burst: row[7],
                        turns: row[8],
                        type: "magic",
                        url: null
                    }
                    log(mag[mName])
                }

                if (hName) {
                    hyb[hName] = {
                        name: hName,
                        damage: row[11],
                        burst: row[12],
                        turns: row[13],
                        type: "hybrid",
                        url: null
                    }
                    log(hyb[hName])
                }
                
                if (fName) {
                    fin[fName] = {
                        name: fName,
                        damage: row[16],
                        burst: row[16],
                        turns: row[17],
                        type: "finisher",
                        url: null
                    }
                    log(fin[fName])
                } else {
                    log("no finisher in row")
                }
            });

            var units = Object.assign({}, phy, mag, hyb, fin);
            //var save = JSON.stringify(units, null, "\t");
            //fs.writeFileSync(saveLocation, save);

            callback(units);
        } else {
            log('No data found.');
            callback(null);
        }
    });
}

export var UpdateMuspelCalculations = function(callback) {

    return new Promise(function (resolve, reject) {
        Reject = reject;//(Error('I was never going to resolve.'))
        
        fs.readFile('./credentials/google.json', (err, content) => {
            if (err) 
                return log('Error loading client secret file: ' + err);
            // Authorize a client with credentials, then call the Google Sheets API.
            authorize(JSON.parse(content), GetUnitComparison, callback);
        });
    });
}
