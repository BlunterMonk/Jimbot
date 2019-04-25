const fs = require("fs");
const https = require("https");

dump = fs.readFileSync("../ffbe/summons.json");
var summons = JSON.parse(dump);

Object.keys(summons).forEach((key) => {
    const s = summons[key];
    const id = s.icon;
    const url = `https://exvius.gg/static/img/assets/esper/${id}`;
    const name = `${s.names[0]}.png`;
    
    downloadFile("summons/" + name, url, result => {
        //console.log(result);
        callback(name);
    });
});

function downloadFile(name, link, callback) {

    if (fs.existsSync(name)) {
        callback("success");
        return;
    }
    const file = fs.createWriteStream(name);
    const request = https.get(link, function (response) {
        response.pipe(file);
        callback("success");
    });
}
