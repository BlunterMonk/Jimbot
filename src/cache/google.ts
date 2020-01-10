//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as fs from "fs";
import "../util/string-extension.js";

import * as readline from 'readline';
import { log } from "../global.js";
import { google } from "googleapis";

////////////////////////////////////////////////////////////

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = './credentials/token.json';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

////////////////////////////////////////////////////////////

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
export function generateAuth(credentials) {

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
export function getNewToken(oAuth2Client, callback) {
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
export function GetPage(auth: any, sourceID: string, range: string): Promise<any> {
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