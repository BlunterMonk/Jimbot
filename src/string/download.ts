
import * as request from "request";
import * as fs from "fs";

import { log } from "../global.js";
import "../string/string-extension.js";
import * as http from "http";
import * as https from "https";

export function downloadFile(path, link, callback): http.ClientRequest {

    var file = null;
    return https.get(link, function(response) {
        if (response.statusCode !== 200) {
            log("page not found");
            callback(null);
            return;
        }
        file = fs.createWriteStream(path);
        file.on('finish', function() {
            console.log(`file downloaded: ${path}`);
            callback(path);
        });
        return response.pipe(file);
    });
}
