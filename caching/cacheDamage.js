const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const calcSheet = "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0/edit#gid=0";
const sheetName = "Damage comparison";
const sheetID = "1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0";

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
console.log(TOKEN_PATH);
// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) 
        return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), GetUnitComparison);
});


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    var token = fs.readFileSync(TOKEN_PATH);
    if (!token) 
        token = getNewToken(oAuth2Client, callback);

    oAuth2Client.setCredentials(JSON.parse(token));

    var ranges = [
        { name: "physical", range: `${sheetName}!B3:D` },
        { name: "magical", range: `${sheetName}!G3:I` },
        { name: "hybrid", range: `${sheetName}!L3:N` }
    ]

    var units = {};
    var count = 3;
    var totalUnits = 0;
    var queryEnd2 = function (url, index) {
        console.log(`[${totalUnits}]${index}: ${url}`)
        totalUnits--;

        /*
        var cats = Object.keys(units);
        cats.forEach((cat) => {
            var keys = Object.keys(units[cat]);
            keys.forEach((key, ind) => {
                if (!key.includes("(KH)")) {
                    key = key.replace(/\(.*\)/, "").trim();
                } else {
                    var i = key.lastIndexOf("(");
                    key = key.substring(i, key.length);
                }

                var range = `${key}!A1:B1`
                console.log("Saving To: " + range)
            });
        });*/

        if (units["physical"][index]) {
            units["physical"][index].url = url;
        } else if (units["magical"][index]) {
            units["magical"][index].url = url;
        } else if (units["hybrid"][index]) {
            units["hybrid"][index].url = url;
        } else {
            console.log("Could not find unit to add link to, " + index)
        }

        if (totalUnits <= 0) {
            var save = JSON.stringify(units, null, "\t");
            fs.writeFileSync("unitcalculations.json", save);
        }
    };

    var queryEnd = function (list, index) {
        count -= 1;

        units[index] = list;
        totalUnits += Object.keys(list).length;

        if (count <= 0) {
            console.log("Unit Fields");
            console.log("Total: " + totalUnits);
            //console.log(units);

            //var save = JSON.stringify(units, null, "\t");
            //fs.writeFileSync("unitcalculations.json", save);

            /*if (callback) {
                callback(fields, limited, rarity);
            }*/
            var cats = Object.keys(units);
            cats.forEach((cat) => {
                console.log("Category: " + cat);
                var keys = Object.keys(units[cat]);
                keys.forEach((key, ind) => {
                    var index = key;

                    if (!key.includes("(KH)")) {
                        key = key.replace(/\(.*\)/, "").trim();
                    } else {
                        var i = key.lastIndexOf("(");
                        key = key.substring(i, key.length);
                    }

                    var range = `${key}!A1:B1`
                    console.log("Looking For: " + range)
                    setTimeout(() => {
                        GetBuildLink(oAuth2Client, index, range, queryEnd2)
                    }, 1000 * ind);
                });
            });
        }
    };

    for (let ind = 0; ind < ranges.length; ind++) {
        const range = ranges[ind];
        
        GetUnitComparison(oAuth2Client, range.name, range.range, queryEnd);
    }
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
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function bySortedValue(obj, callback, context) {
    var tuples = [];

    for (var key in obj) {
        tuples.push([key, obj[key]]);
    }

    tuples.sort(function(a, b) {
        return a[1].damage - b[1].damage// ? 1 : a[1].damage < b[1].damage ? -1 : 0
    });

    var length = tuples.length;
    while (length--) 
        callback.call(context, tuples[length][0], tuples[length][1]);
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function GetUnitComparison(auth, index, range, callback) {
    const sheets = google.sheets({version: 'v4', auth});

    sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: range
    }, (err, res) => {

        if (err) 
            return console.log('The API returned an error: ' + err);

        const rows = res.data.values;
        if (rows.length) {
            var units = {};

            //console.log('Name, DPT:');

            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
            //console.log(`${row}`);
                units[row[0]] = {
                    name: row[0],
                    damage: row[1],
                    turns: parseInt(row[2])
                }
            });

            /*
            var sorted = [];
            bySortedValue(units, function(key, value) {
                console.log(`${key}: ${value}`);
                sorted[sorted.length] = value;
            });*/

            //console.log(units);
            callback(units, index);
        } else {
            console.log('No data found.');
            callback(null, index);
        }
    });
}

function GetBuildLink(auth, index, range, callback) {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: range
    }, (err, res) => {
        if (err) {
            callback(null, index);
            console.log('The API returned an error: ' + err);
            return 
        }

        const rows = res.data.values;
        if (rows.length) {
            var units = {};

            var b = "";
            rows.map((row) => {
                b = row[1];
            });

            callback(b, index);
        } else {
            console.log('No data found.');
            callback(null, index);
        }
    });
}