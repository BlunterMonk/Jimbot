//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import {logger, jsonWithTimestamp } from "./util/logger.js";

////////////////////////////////////////////////////////////

function printf(...msg: any[]): string {
    let text = "";
    msg.forEach((t,i) => {
        if (i > 0) text += `, `
        text += JSON.stringify(t);
    });
    return text;
}
export function log(...data: any[]) {
    logger.info(printf(data));
}
export function logData(msg: string, data: any) {
    logger.info(`${msg}, ${JSON.stringify(data)}`);
}
export function debug(...data: any[]) {
    logger.debug(printf(data));
}
export function trace(...data: any[]) {
    logger.silly(printf(data));
}
export function error(...data: any[]) {
    logger.error(printf(data));
}
export function logDataArray(data: any[]) {
    if (data.length == 0) {
        return log("[]");
    }
    log(`[`);
    data.forEach((v,i) => {
        log(`${i}: ${JSON.stringify(v)}`);
    });
    log(`]`);
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
