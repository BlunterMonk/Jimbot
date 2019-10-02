//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import {logger, jsonWithTimestamp } from "./util/logger.js";

////////////////////////////////////////////////////////////

export function log(...data: any[]) {
    let text = "";
    data.forEach((t,i) => {
        if (i > 0) text += `, `
        text += JSON.stringify(t);
    });
    logger.info(text);
}
export function logData(msg: string, data: any) {
    logger.info(`${msg}, ${JSON.stringify(data)}`);
}
export function debug(data: any) {
    logger.debug(data);
}
export function trace(data: any) {
    logger.silly(data);
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
