const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
//const calcSheet = "https://docs.google.com/spreadsheets/d/1cPQPPjOVZ1dQqLHX6nICOtMmI1bnlDnei9kDU4xaww0";
const calcSheet = "https://docs.google.com/spreadsheets/d/1RgfRNTHJ4qczJVBRLb5ayvCMy4A7A19U7Gs6aU4xtQE";
const sheetName = "Damage comparison";
const burstSheetName = "Burst comparison";
const sheetID = "1RgfRNTHJ4qczJVBRLb5ayvCMy4A7A19U7Gs6aU4xtQE";
const saveLocation = "data/unitcalculations.json";

var sheets = null;

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
    sheets = google.sheets({version: 'v4', oAuth2Client});

    /*var ranges = [
        { name: "physical", range: `${sheetName}!B3:D` },
        { name: "magical", range: `${sheetName}!G3:I` },
        { name: "hybrid", range: `${sheetName}!L3:N` },
        { name: "burst_physical", range: `${burstSheetName}!B3:D` },
        { name: "burst_magical", range: `${burstSheetName}!G3:I` },
        { name: "burst_hybrid", range: `${burstSheetName}!L3:N` }
    ]*/

    var units = {};
    var count = 1;
    var totalUnits = 0;
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

        if (totalUnits <= 1) {
            console.log("Finished Getting Unit Calcs");
            var save = JSON.stringify(units, null, "\t");
            fs.writeFileSync(saveLocation, save);
        }
    };

    var queryEnd = function (list) {
        count -= 1;

        units = list;
        totalUnits += Object.keys(list).length;

        if (count <= 0) {
            console.log("Unit Fields");
            console.log("Total: " + totalUnits);

            //var save = JSON.stringify(units, null, "\t");
            //fs.writeFileSync(saveLocation, save);

            var keys = Object.keys(units);
            keys.forEach((key, ind) => {
                var index = key;

                if (!key.includes("(KH)")) {
                    key = key.replace(/\(.*\)/, "").trim();
                } else {
                    var i = key.lastIndexOf("(");
                    key = key.substring(i, key.length);
                }

                var range = `${key}!A1:AB20`
                console.log(`[${ind}] Looking For: ` + range)
                setTimeout(() => {
                    GetBuildLink(oAuth2Client, index, range, queryEnd2)
                }, 1000 * ind);
            });
        }
    };

    // for (let ind = 0; ind < ranges.length; ind++) {
        // const range = ranges[ind];
        
        //setTimeout(() => {
            GetUnitComparison(oAuth2Client, `${sheetName}!A3:N`, queryEnd);
            //GetUnitComparison(oAuth2Client, "burst_", `${burstSheetName}!A3:N`, queryEnd);
        //}, 10000 * ind);
    // }
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

function GetSheet(auth, index, range, callback) {

    sheets.spreadsheets.values.get({
        spreadsheetId: sheetID,
    }, (err, res) => {

        if (err) 
            return console.log('The API returned an error: ' + err);

        const rows = res.data.values;
        if (rows.length) {
            var units = {};

            //console.log('Name, DPT:');

            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
                console.log(`${row}`);
            });

            /*
            var sorted = [];
            bySortedValue(units, function(key, value) {
                console.log(`${key}: ${value}`);
                sorted[sorted.length] = value;
            });*/

            //console.log(units);
            //callback(units, index);
        } else {
            console.log('No data found.');
            //callback(null, index);
        }
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

        if (err) 
            return console.log('The API returned an error: ' + err);

        const rows = res.data.values;
        if (rows.length) {
            //console.log('Name, DPT:');

            // Print columns A and E, which correspond to indices 0 and 4.
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

                if (pName) {
                    phy[pName] = {
                        name: pName,
                        damage: row[2],
                        turns: row[3],
                        type: "physical",
                        url: null
                    }
                }

                if (mName) {
                    mag[mName] = {
                        name: mName,
                        damage: row[7],
                        turns: row[8],
                        type: "magic",
                        url: null
                    }
                }

                if (hName) {
                    hyb[hName] = {
                        name: hName,
                        damage: row[12],
                        turns: row[13],
                        type: "hybrid",
                        url: null
                    }
                }
                /*units[row[0]] = {
                    name: row[0],
                    damage: row[1],
                    turns: parseInt(row[2])
                }*/
            });

            /*var sorted = [];
            bySortedValue(units, function(key, value) {
                console.log(`${key}: ${value}`);
                sorted[sorted.length] = value;
            });*/

            var units = Object.assign({}, phy, mag, hyb);
            var save = JSON.stringify(units, null, "\t");
            fs.writeFileSync(saveLocation, save);
        

            console.log("\nPhysical");
            console.log(phy);
            //console.log("\nMagic");
            //console.log(mag);
            //console.log("\nHybrid");
            //console.log(hyb);
            //console.log(rows);
            callback(units);
            //callback(mag, `${index}mag`);
            //callback(hyb, `${index}hyb`);
        } else {
            console.log('No data found.');
            callback(null, index);
        }
    });
}

function GetBuildLink(auth, index, range, callback) {
    var sheets = google.sheets({version: 'v4', auth});
       
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

            //console.log("Unit Data: ");
            //console.log(rotation);
            callback(w, b, rotation, index);
        } else {
            console.log('No data found.');
            callback(null, null, null, null);
        }
    });
}