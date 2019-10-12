//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import * as fs from "fs";
import * as https from "https";
import { log, error } from "../global.js";

////////////////////////////////////////////////////////////

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
            file.on('error', function(e) {
                error(`Error while downloading file: ${path}, " from: ", ${link}`, " error: ", e.message);
                reject(`Failed to download file: ${link}, error: ${e.message}`);
            });
            file.on('finish', function() {
                log(`file downloaded: ${path}`);
                resolve(path);
            });
            return response.pipe(file);
        });
    });
}
