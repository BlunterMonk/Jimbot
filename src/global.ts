//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////


export function log(data: any) {
    console.log(data);
}
export function debug(data: any) {
    console.log(data);
}
export function trace(data: any) {
    console.log(data);
}
export function logData(data: any) {
    console.log(JSON.stringify(data));
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
