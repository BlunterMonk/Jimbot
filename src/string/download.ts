
import * as request from "request";
import * as fs from "fs";

import { log } from "../global.js";
import "../string/string-extension.js";
import * as http from "http";
import * as https from "https";

export function downloadFile(path, link): Promise<string> {

    return new Promise<string>((resolve, reject) => {
        
        var file = null;
        https.get(link, function(response) {
            if (response.statusCode !== 200) {
                log("page not found");
                reject(Error("page not found"));
                return;
            }
            file = fs.createWriteStream(path);
            file.on('finish', function() {
                console.log(`file downloaded: ${path}`);
                resolve(path);
            });
            return response.pipe(file);
        });
    });
}
