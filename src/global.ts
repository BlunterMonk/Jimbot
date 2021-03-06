//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import { logger } from "./util/logger.js";

////////////////////////////////////////////////////////////

function printf(msg: any[]): string {
    let text = "";
    msg.forEach((t,i) => {
        if (typeof t == "string") {
            text += t;
        } else if (t instanceof Error) {
            text += t.message;
        } else {
            let s = JSON.stringify(t);
            text += s+" ";//.slice(1, s.length-1);
        }
    });
    return text;
}

export function log(...data: any[]) {
    let s: string = printf(data);
    logger.info(s);
}
export function logData(msg: string, data: any) {
    logger.info(`${msg}, ${JSON.stringify(data)}`);
}
export function debug(...data: any[]) {
    let s: string = printf(data);
    logger.debug(s);
}
export function trace(...data: any[]) {
    let s: string = printf(data);
    logger.silly(s);
}
export function error(...data: any[]) {
    let s: string = printf(data);
    logger.error(s);

    // Log any exceptions to the console.
    data.forEach(e => {
        if (e instanceof Error) {
            console.error(e);
        }
    });
}
export function logCommand(data: any) {
    log(data);
}
export function checkString(text: string, keyword: RegExp): boolean {
    // log(`${keyword}.test(${text.replace(/\s*/g,"")})`);
    // log(`${keyword.test(text.replace(/\s*/g,""))}`);
    return keyword.test(text.replace(/\s*/g,""));
}
export function compareStrings(text: string, search: string): boolean {
    var keyword = new RegExp(search.replace(/_/g,".*").replace(/ /g,".*"), "i");
    //log(`compareStrings(${text}, ${keyword})`);
    return keyword.test(text.replace(/\s*/g,""));
}
export function escapeString(s: string): string {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
