//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as mergeImages from '../merge-images/merge-images.js';
import * as fs from "fs";
import * as Canvas from 'canvas';
import * as Build from './build.js';
import * as Download from '../util/download.js';
import { log, debug, error, trace } from "../global.js";
const sizeOf = require('image-size');

////////////////////////////////////////////////////////////

const canvas = Canvas.createCanvas(600, 600);
const ctx = canvas.getContext('2d')

const imageEndpoint = `https://ffbeequip.com/img/`;
const imgCacheDir = "./icons/";
const canvasWidth = 1200;
const canvasHeight = 1576;
const mainStatFontFamily = "Arial Black";
const resistFontFamily = "Arial Black";
const fontFamily = "Meiryo";
const statStroke = "255,255,255,1";
const textFontFamily = "Meiryo";
const textStroke = "255,255,255,1";
const enhancementsFontFamily = "Arial";
const enhancementsColor = "255,0,255,1";
const enhancementsStroke = "255,255,255,0.5";
const killersFontFamily = "Arial Black";
const killerssStroke = "0,0,0,0";

/*
function sprite(n) { return `https://gamepedia.cursecdn.com/exvius_gamepedia_en/1/15/Unit-${n}-7.png`; }

// var buildURL = "https://ffbeequip.com/builder.html?server=GL#cd1db650-d52a-11e9-a314-1b650a2e0160"; 
// var buildURL = `https://ffbeEquip.com/builder.html?server=GL#797f9a00-d772-11e9-a314-1b650a2e0160`; // elena
// var buildURL = `https://ffbeEquip.com/builder.html?server=GL#97a018b0-d7cd-11e9-a314-1b650a2e0160`; // elena
//var buildURL = "http://ffbeEquip.com/builder.html?server=GL#beffeb70-4ba9-11e9-9e10-93b8df10f245"; // 2b
var buildURL = "https://ffbeequip.com/builder.html?server=GL#d0eeb330-cf92-11e9-8c4d-8d394a9d768d";
processBuild(buildURL);
function processBuild(search) {

    Build.requestBuild(search, (data) => {
        // log(data);
        var b = JSON.parse(data);

        var build = Build.CreateBuild(b);
        // var text = build.getText();
        // var desc = text.text.replaceAll("\\[", "**[");
        // desc = desc.replaceAll("\\]:", "]:**");
    });
}*/

function downloadImageIfNotExist(path: string, source: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {

        if (fs.existsSync(path)) {
            trace("File Exists: ", path);

            resolve(path);
        } else {
            trace("File Does Not Exists: ", path, " attempting to download");

            Download.downloadFile(path, source).then((p) =>{
                log(`Image Downloaded: ${source}`);
                resolve(p);
            }).catch((e) => {
                error(`Image Failed to Download: ${source}`);
                resolve(null);
            });
        }
    });
}
function downloadImages(slots, items, unitId): Promise<any>[] {

    var images = slots.map(slot => {
        new Promise<any>((resolve, reject) => {

            var item = null;
            for (let index = 0; index < items.length; index++) {
                const element = items[index];
                if (element.id === slot.id) {
                    item = element;
                    break;
                }
            }

            if (!item)
                return;
            
            var filename = `items/${item.icon}`;
            var imagePath = imageEndpoint + filename;
            var path = `${imgCacheDir}${filename}`;

            if (fs.existsSync(path)) {
                resolve(path);
                return;
            }
            
            trace("File Does Not Exists: ", path, " attempting to download");
            Download.downloadFile(path, imagePath).then((p) =>{
                log(`Image Donloaded: ${p}`);
                resolve(p);
            }).catch(e => {
                error(e);
                resolve(null);
            });
        });
    });

    images.push(new Promise<any>((resolve, reject) => {

        var filename = `unit_icon_${unitId}.png`;
        var path = `${imgCacheDir}units/${filename}`;
        let source = `https://ffbeequip.com/img/units/${filename}`;

        downloadImageIfNotExist(path, source).then(resolve).catch(reject);
    }));

    return images;
}

export async function BuildImage(build: any, isCompact: boolean): Promise<string> {
    
    var equipped = build.getEquipment();
    debug("Equipment: ", equipped);

    return new Promise<string>((resolve, reject) => {
        
        var downloads = downloadImages(build.getSlots(), equipped, build.loadedUnit.id);
        Promise.all(downloads).then(() => {

            if (isCompact) {

                let compactCanvas = {
                    xStart: 0,
                    yStart: 0
                }
                
                buildCompactImage(compactCanvas, build).then((p) => {
                    resolve(p);
                }).catch(reject);
            } else {

                buildImage(build).then((p) => {
                    resolve(p);
                }).catch(reject);
            }
        });
    });
}

function buildImage(build: Build.Build): Promise<string> {

    let canvasWidth = 1200;
    let canvasHeight = 1576;

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;
    var wieldBonus = getWieldBonus(totalStats, build);

    // log("Total Stats");
    // log(totalStats);

    var labels : mergeImages.labelOptions[] = [];
    var images = [{
        src: `${imgCacheDir}build-template-x2.png`,
        x: 0,
        y: 0,
        w: canvasWidth,
        h: canvasHeight
    }];

    // Add Unit Icon
    images.push(addUnitIcon(build.unitID, 2.5, 50, 105));

    // Add Esper ICon
    var esper = build.getEsperId();
    var esperPath = `${imgCacheDir}espers/${esper}.png`;
    trace(`Esper Path: ${esperPath}`);
    if (esper) {
        let scale = 2;
        let dim = 112 * scale;
        images[images.length] = {
            src: esperPath,
            x: canvasWidth - dim,
            y: 40,
            w: dim,
            h: dim
        };
    }

    // Add Main Stats
    labels = labels.concat(addMainStats(totalStats, totalBonuses, wieldBonus));

    // Add Resistances
    labels = labels.concat(addResistances(totalStats));

    // Add equipment
    let equips = addEquipment(build);
    labels = labels.concat(equips.labels);
    images = images.concat(equips.images);

    // Add killers
    let killers = addKillers(totalStats);
    labels = labels.concat(killers.labels);
    images = images.concat(killers.images);

    var saveLocation = `./tempbuilds/${build.buildID}.png`;
    return finalizeImage(saveLocation, images, labels, canvasWidth, canvasHeight);
}
function buildCompactImage(canvasOptions: UnitBox, build: Build.Build): Promise<string> {

    let imageWidth = 1300;
    let imageHeight = 350;

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;
    log("Build Compact Image");
    debug("Total Stats: ", totalStats, " Total Bonuses: ", totalBonuses);

    var labels = [];
    var images = [{
        src: `${imgCacheDir}unit-overview-background.png`,
        x: canvasOptions.xStart,
        y: canvasOptions.yStart,
        w: imageWidth,
        h: imageHeight
    }];

    // Add Unit Icon
    images.push(addUnitIcon(build.unitID, 3, canvasOptions.xStart + 6, canvasOptions.yStart + 5));
    images.push({
        src: `${imgCacheDir}unit-icon-frame.png`,
        x: canvasOptions.xStart + 6,
        y: canvasOptions.yStart + 5,
        w: 56*3,
        h: 38*3
    });

    var wieldingBonus = null;
    if (totalStats.singleWielding && build.isDoublehanding())
        wieldingBonus = totalStats.singleWielding;
    else if (totalStats.dualWielding && build.isDualWielding())
        wieldingBonus = totalStats.dualWielding;

    // Add main stats
    let mainStats = {
        xStart: canvasOptions.xStart + 250,//400,
        xSpace: 275,
        yStart: canvasOptions.yStart + 55,
        ySpace: 50,
        statOrder: [ "hp",  "atk", "def", "mp",  "mag", "spr" ],
        rows: 3,
        fontSize: 40,
        bonusSize: 20,
        align: "left"
    };
    labels = labels.concat(getMainStats(mainStats, totalStats, totalBonuses, wieldingBonus));


    // Add equipment
    var equips = addCompactEquipment(build, canvasOptions);
    labels = labels.concat(equips.labels);
    images = images.concat(equips.images);

    // Add Esper
    var esper = build.getEsperId();
    if (esper) {
        labels[labels.length] = {
            text: esper,
            font: fontFamily,
            size: 22,
            x: canvasOptions.xStart + 1050,
            y: canvasOptions.yStart + 300,
            align: "left",
            maxWidth: 200,
            strokeColor: "255,255,255,1"
        };
    }

    let killerOptions = { // compact mode settings
        xStart: canvasOptions.xStart + 20,
        yStart: canvasOptions.yStart + 270,
        dimensions: 50,
        maxWide: 14, // max amount of icons that can fit horizontally
        maxTall: 1, // max amount of icons that can fit vertically
        fontSize: 22,
        distance: 1,
        spacing: 0,
        align: "left"
    }

    if (totalStats.killers) {
        var values = sortKillersByValue(totalStats.killers);
        var killers = getKillers(killerOptions, values);
        labels = labels.concat(killers.labels);
        images = images.concat(killers.images);
    }

    // Add Ailment Resistances
    let resistOptions = { // compact mode settings
        xStart: canvasOptions.xStart + 50,
        yStart: canvasOptions.yStart + 215,
        dimensions: 1,
        maxWide: 15, // max amount of icons that can fit horizontally
        maxTall: 1, // max amount of icons that can fit vertically
        fontSize: 20,
        distance: 1,
        spacing: 90,
        align: "left"
    };
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats));
    resistOptions.yStart = canvasOptions.yStart + 265;
    labels = labels.concat(getElementResistances(resistOptions, totalStats));


    // Add Evade
    if (totalStats.evade && totalStats.evade.physical) {
        debug("Has Evade: ", totalStats.evade);
        labels[labels.length] = {
            text: `${totalStats.evade.physical}%`,
            font: fontFamily,
            size: 20,
            x: canvasOptions.xStart + 55,
            y: canvasOptions.yStart + 165,
            align: "left",
            strokeColor: "255,255,255,1"
        };
    }

    // Finish frame
    images[images.length] = {
        src: `${imgCacheDir}unit-overview-top-frame-short.png`,
        x: canvasOptions.xStart,
        y: canvasOptions.yStart,
        w: imageWidth,
        h: imageHeight
    };

    var saveLocation = `./tempbuilds/compact/${build.buildID}.png`;
    
    return finalizeImage(saveLocation, images, labels, imageWidth, imageHeight);
}
function finalizeImage(saveLocation: string, images: mergeImages.imageOptions[], labels: mergeImages.labelOptions[], cWidth, cHeight): Promise<string> {


    return new Promise<string>((resolve, reject) => {

        mergeImages.mergeImages(images, labels,
            {
                width: cWidth,
                height: cHeight,
                Canvas: Canvas
            })
        .then(b64 => {
            var fs = require('fs');
            var str = `${b64}`;
            var regex = /^data:.+\/(.+);base64,(.*)$/;
            
            var matches = str.match(regex);
            var ext = matches[1];
            var data = matches[2];
            var buffer = Buffer.alloc(data.length, data, 'base64');

            fs.writeFileSync(saveLocation, buffer);

            log(`Build Saved: ${saveLocation}`);
            resolve(saveLocation);
        }).catch((e) =>{
            error("Failed to make image: ", e.message);
            reject(e.message);
        });
    });
}


class ImageBuild {
    build: Build.Build;
    labels: mergeImages.labelOptions[];
    images: mergeImages.imageOptions[];
    constructor(build: Build.Build) {
        this.build = build;

        var unit = build.loadedUnit.id;
        var slots = build.getSlots();
        var equipped = build.getEquipment();
        debug("Equipment: ", equipped);
    
        var downloads = downloadImages(slots, equipped, unit);
        Promise.all(downloads).then();
    }

    addUnitIcon(scale: number, x: number, y: number): ImageBuild {

        this.images.push(addUnitIcon(this.build.unitID, scale, x, y));

        return this;
    }
    addEquipment(): ImageBuild {

        let equips = addEquipment(this.build);
        this.labels = this.labels.concat(equips.labels);
        this.images = this.images.concat(equips.images);
    
        return this;
    }
}
function addUnitIcon(unitId: string, scale: number, x: number, y: number): mergeImages.imageOptions {

    const path = `${imgCacheDir}units/unit_icon_${unitId}.png`;
    const iconW = 56;
    const iconH = 38;
    let ui = {
        src: path,
        x: x,
        y: y,
        w: iconW * scale,
        h: iconH * scale
    };

    trace("Unit Image: ", ui);
    return ui;
}
function addMainStats(totalStats, totalBonuses, wieldBonus) {

    let mainStats = {
        xStart: 300,//400,
        xSpace: 250,
        yStart: 70,
        ySpace: 70,
        rows: 2,
        statOrder: [ "hp",  "mp",  "atk", "mag", "def", "spr" ],
        fontSize: 36,
        bonusSize: 18,
        align: "left"
    };
        
    return getMainStats(mainStats, totalStats, totalBonuses, wieldBonus);
}
function addResistances(totalStats) {

    let labels : mergeImages.labelOptions[] = [];
    let resistOptions = {
        xStart: 130,//62,
        yStart: 1420,//712,
        dimensions: 0,
        maxWide: 9,
        maxTall: 1,
        fontSize: 24,
        distance: 2,
        spacing: 122,
        align: "center"
    };
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats));
    
    resistOptions.yStart = 1545;//772,
    labels = labels.concat(getElementResistances(resistOptions, totalStats));

    return labels;
}
function addKillers(totalStats) {

    let labels : mergeImages.labelOptions[] = [];
    let images : mergeImages.imageOptions[] = [];

    if (!totalStats.killers) {
        return { labels: labels, images: images };
    }

    let killerOptions = { // Normal sheet settings
        xStart: 225,//112,
        yStart: 165,//84,
        dimensions: 50,
        maxWide: 15, // max amount of icons that can fit horizontally
        maxTall: 2, // max amount of icons that can fit vertically
        fontSize: 22,
        distance: 1,
        spacing: 0,
        align: "left"
    };

    var values = sortKillersByValue(totalStats.killers);
    return getKillers(killerOptions, values);
}
function addEquipment(build: Build.Build) {

    let scale = 2;
    let dim = 112 * scale;
    var equipOptions : equipmentOptions = {
        xCol1: 0,
        xCol2: canvasWidth - dim,
        yTop: 264,
        ySpacing: 200,
        dimension: dim,
        maxWidth: 355,
        fontSize: 32,
        shrunkFontSize: 24,
        yText: 0, // unused
        align: "left" // unused
    }
    var firstSlotLeft : equipOptions = {
        icon: {x: -12, y: 264},
        name: {x: 250, y: 340},
        desc: {x: 210, y: 360},
        desMaxWidth: 250,
        iconDim: dim,
        fontSize: 24,
        shrunkFontSize: 18,
        align: "left",
    }
    var firstSlotRight : equipOptions = {
        icon: {x: canvasWidth - dim, y: 264},
        name: {x: canvasWidth - 250, y: 340},
        desc: {x: canvasWidth - 210, y: 360},
        desMaxWidth: 350,
        iconDim: dim,
        fontSize: 24,
        shrunkFontSize: 18,
        align: "right",
    }
   
    return getEquipment(equipOptions, firstSlotLeft, firstSlotRight, build);
}
function addCompactEquipment(build: Build.Build, canvasOptions: UnitBox) {
    
    let equipOptions = {
        xCol1: canvasOptions.xStart + 800,
        xCol2: canvasOptions.xStart + 1050,
        yTop: canvasOptions.yStart + 20,
        yText: canvasOptions.yStart + 55,
        ySpacing: 50,
        dimension: 50,
        maxWidth: 200,
        fontSize: 22,
        shrunkFontSize: 18,
        align: "left"
    };

    return getCompactEquipment(equipOptions, build);
}



interface UnitBox {
    xStart: number;
    yStart: number;
}
interface statRow {
    xStart: number;
    yStart: number;
    dimensions: number; // dimension of the images
    maxWide: number; // how many columns
    maxTall: number; // how many rows
    fontSize: number;
    distance: number; // number columns to use when adding text
    spacing: number; // distance between each image
    align: string; // text alignment
}
interface mainStatsOptions {
    xStart: number;
    xSpace: number;
    yStart: number;
    ySpace: number;
    rows: number;
    fontSize: number;
    bonusSize: number;
    statOrder: string[];
    align: string;
}
interface equipmentOptions {
    xCol1: number;
    xCol2: number;
    yTop: number;
    yText: number;
    ySpacing: number;
    dimension: number;
    maxWidth: number;
    fontSize: number;
    shrunkFontSize: number;
    align: string;
}
interface position {
    x: number;
    y: number;
}
interface equipOptions {
    icon: position; // item icon position
    name: position; // item label position
    desc: position; // description text position
    desMaxWidth: number; // max length of description text
    iconDim: number;
    fontSize: number;
    shrunkFontSize: number;
    align: string;
}

function sortKillersByValue(killers) {

    var values = {};

    var keys = Object.keys(killers);
    keys.forEach((k, i) => {
        const kill = killers[k];

        var kp = kill.physical;
        var km = kill.magical;

        if (kp) {
            if (!values[kp])
                values[kp] = [];
    
            values[kp].push(`physical-${k}`);
        } 
        if (km) {
            if (!values[km])
                values[km] = [];

            values[km].push(`magical-${k}`);
        }
    });

    return values;
}
function getResistsByValue(totalStats, list): any {

    var resist = {};
                              
    if (!totalStats.resist) {
        return resist;
    }
        
    list.forEach((k, i) => {
        const r = totalStats.resist[k];

        if (r) {
            const i = list.indexOf(k)
            if (i < 0)
                return;

            var v = r.percent;
            if (!resist[`${v}`]) 
                resist[`${v}`] = [];

            resist[`${v}`].push(`${k}`);
        } else {
            if (!resist[`0`]) 
                resist[`0`] = [];

            resist[`0`].push(`${k}`);
        }
    });

    trace("Resists: ", resist);
    return resist;
}

function getWieldBonus(totalStats, build: Build.Build) {

    var wieldingBonus = null;
    if (totalStats.singleWielding && build.isDoublehanding())
        wieldingBonus = totalStats.singleWielding;
    else if (totalStats.dualWielding && build.isDualWielding())
        wieldingBonus = totalStats.dualWielding;

    return wieldingBonus;
}

function getKillers(options: statRow, values: any) {

    trace("Total Values: ", values);

    var images = [];
    var labels = [];

    var across = 0;
    var down = 0;
    var keys = Object.keys(values);
    keys.forEach((k,i) =>{

        var x = options.xStart;
        var y = options.yStart;

        const value = values[k];
        value.forEach((v,j) =>{
                
            x = options.xStart + (across * options.dimensions),
            y = options.yStart + (down   * options.dimensions),
            
            // Item image
            images[images.length] = {
                src: `${imgCacheDir}stats/${v}.png`,
                x: x,
                y: y,
                w: options.dimensions,
                h: options.dimensions
            }

            // log(images[images.length-1]);

            across++;
            if (across >= options.maxWide) {
                across = 0;
                down++;
            }    
        });

        const v0 = parseInt(k);

        var f = resistFontFamily;
        var t = `${v0}%`;
        var c = "255,255,255,1";
        /*if (v0 >= 100) {
            t = "Null"
            f = fontFamily;
        } else */if (v0 > 0) {
            c = "0,255,0,1";
        } else if (v0 < 0) {
            c = "255,0,0,1";
        }  

        labels[labels.length] = { 
            text: `${k}%`,
            font: killersFontFamily, 
            size: options.fontSize, 
            x: x + options.dimensions, 
            y: (y + options.dimensions * 0.5) + (options.fontSize * 0.5),
            align: "left",
            strokeColor: killerssStroke
        };
        across += options.distance;
        if (across >= options.maxWide) {
            across = 0;
            down++;
        } 
    });

    return {
        images: images,
        labels: labels
    }
}

function getResists(totalStats, list): string[] {

    var keys = Object.keys(list);

    var resist : string[] = [];
    for (let index = 0; index < keys.length; index++) {
        resist.push("0");
    }
                              
    if (!totalStats.resist) {
        return resist;
    }
        
    var values = {};
    var totalKeys = Object.keys(totalStats.resist)
    totalKeys.forEach((k, i) => {
        const r = totalStats.resist[k];

        if (r) {
            const i = list.indexOf(k)
            if (i < 0)
                return;

            var v = parseInt(resist[i]);

            if (Number.isNaN(v)) {
                resist[i] = "";
                v = 0;
            }

            resist[i] = `${v + r.percent}`;
        }
    });
    
    return resist;
}
function getAilmentResistances(options: statRow, totalStats) {
    
    var labels = [];

    var x0 = options.xStart;
    var y0 = options.yStart;
    var spacing = options.spacing;

    var ailments = getResists(totalStats, Build.ailmentList);

    for (let index = 0; index < ailments.length; index++) {
        const e = ailments[index];
        const v = parseInt(e);

        var f = resistFontFamily;
        var t = `${v}%`;
        var c = "255,255,255,1";
        if (v >= 100) {
            t = "Null"
            f = fontFamily;
        } else if (v == 0) {
            t = (options.dimensions) ? "0%" : "-";
        } else if (v > 0) {
            c = "0,255,0,1";
        } else if (v < 0) {
            c = "255,0,0,1";
        }  

        labels[labels.length] = { 
            text: t,
            font: f, 
            size: options.fontSize, 
            x: x0 + (spacing * index), 
            y: y0,
            align: options.align
        };
    }

    return labels;
}
function getElementResistances(options: statRow, totalStats) {
    
    var labels = [];
    var elements = getResists(totalStats, Build.elementList);

    var x0 = options.xStart;
    var y0 = options.yStart;
    var spacing = options.spacing;

    for (let index = 0; index < elements.length; index++) {
        const e = elements[index];
        const v = parseInt(e);

        var t = `${v}%`;
        var c = "255,255,255,1";
        if (v > 0) {
            c = "0,255,0,1";
        } else if (v < 0) {
            c = "255,0,0,1";
        } else {
            t = "0%"
        }

        labels[labels.length] = { 
            text: t, 
            font: resistFontFamily, 
            size: options.fontSize, 
            x: x0 + (spacing * index), 
            y: y0,
            align: options.align,
            color: c
        };
    }

    return labels;
}


/*
interface mainStatsOptions {
    xCol1: number,
    xCol2: number,
    xCol3: number,
    yMainRow1: number,
    yMainRow2: number,
    yStatBonus: number,
    yEquipBonus: number,
    fontSize: number,
    bonusSize: number
    align: string
}
function getMainStats(options: mainStatsOptions, totalStats, totalBonuses, wieldingBonus) {
    var labels = [];

    let x0 = options.xCol1;
    let x1 = options.xCol2;
    let x2 = options.xCol3;
    let y0 = options.yMainRow1;
    let y1 = options.yMainRow2; 
    let fs = options.fontSize;
    
    labels[labels.length] = { text: totalStats.hp   , font: mainStatFontFamily, size: fs, x: x0, y: y0 , align: options.align, strokeColor: statStroke }; // HP
    labels[labels.length] = { text: totalStats.mp   , font: mainStatFontFamily, size: fs, x: x0, y: y1 , align: options.align, strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.atk  , font: mainStatFontFamily, size: fs, x: x1, y: y0 , align: options.align, strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.mag  , font: mainStatFontFamily, size: fs, x: x1, y: y1 , align: options.align, strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.def  , font: mainStatFontFamily, size: fs, x: x2, y: y0 , align: options.align, strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.spr  , font: mainStatFontFamily, size: fs, x: x2, y: y1 , align: options.align, strokeColor: statStroke };

    var bonuses = [];
    for (let index = 0; index < labels.length; index++) {
        const element = labels[index];
        const stat = statValues[index];
        const key = `${stat}%`;
        var v = totalBonuses[key];
        var t = "0";

        var color = `255,255,255,1`;
        if (v) {
            color = `0,255,0,1`;
            if (parseInt(v) > 400)
                color = `255,0,0,1`;

            t = `+${v}`;
        }

        t = `${t}%`;
        
        let l = mergeImages.measureText(ctx, element.text, `${fs}px ${mainStatFontFamily}`)
        let x : number = (options.align == "right") ? element.x : element.x + l.width;
        log("X: ", x, " L: ", l.width, " Element: ", element.x);

        if (wieldingBonus && wieldingBonus[stat]) {
            var tdh = wieldingBonus[stat];
            // log(tdh)

            bonuses[bonuses.length] = { 
                text: `+${tdh}%`,
                font: fontFamily, 
                size: options.bonusSize,
                x: x,
                y: ((index % 2) ? y1 : y0) - options.bonusSize,
                align: "left",
                color: `255,223,0,1`,
                strokeColor: `125,125,125,0.5`
            };
            // log(bonuses[bonuses.length-1]);
        }

        bonuses[bonuses.length] = { 
            text: t,
            font: fontFamily, 
            size: options.bonusSize,
            x: x,
            y: (index % 2) ? y1 : y0,
            align: "left",
            color: color
        };
    }

    return labels.concat(bonuses);
}
*/

function getMainStats(options: mainStatsOptions, totalStats, totalBonuses, wieldingBonus) {
    var labels = [];

    let x0 = options.xStart;
    let y0 = options.yStart;

    let fs = options.fontSize;

    
    for (let index = 0; index < options.statOrder.length; index++) {
        const key = options.statOrder[index];
        const bonusKey = `${key}%`;

        var posX = Math.floor(index / options.rows);
        var posY = index % options.rows;
                            
        // log("pos[" + posX + "][" + posY + "]");
                    
        let x = x0 + (options.xSpace * posX);
        let y = y0 + (options.ySpace * posY);
        // log("Stat: ", key, " X: ", x, " Mod: ", posX);
        // log("Stat: ", key, " Y: ", y, " Mod: ", posY);

        let statValue = totalStats[key];
        labels[labels.length] = { 
            text: statValue,
            font: mainStatFontFamily, 
            size: fs, 
            x: x, 
            y: y, 
            align: options.align,
            strokeColor: statStroke
        };

        let l = mergeImages.measureText(ctx, statValue, `${fs}px ${mainStatFontFamily}`)
        x = (options.align == "right") ? x : x + l.width;
        // log("X: ", x, " L: ", l.width);
        // log("Y: ", y, " Mod: ", index % 3);

        var v = totalBonuses[bonusKey];
        var t = "0";

        var color = `255,255,255,1`;
        if (v) {
            color = `0,255,0,1`;
            if (parseInt(v) > 400)
                color = `255,0,0,1`;

            t = `+${v}`;
        }

        t = `${t}%`;
        if (wieldingBonus && wieldingBonus[key]) {
            var tdh = wieldingBonus[key];
            // log(tdh)

            labels[labels.length] = { 
                text: `+${tdh}%`,
                font: fontFamily, 
                size: options.bonusSize,
                x: x,
                y: y,
                align: "left",
                color: `255,223,0,1`,
                strokeColor: `125,125,125,0.5`
            };

            // log(bonuses[bonuses.length-1]);
        }

        labels[labels.length] = { 
            text: t,
            font: fontFamily, 
            size: options.bonusSize,
            x: x,
            y: y - options.bonusSize,
            align: "left",
            color: color
        };
    }

    return labels;
}







function getCompactEquipment(equipOptions: equipmentOptions, build) {
    
    var labels = [];
    var images = [];

    var yName = equipOptions.yText;
    var yType = equipOptions.yTop;
    
    var spacing = equipOptions.ySpacing;
    var dimensions = equipOptions.dimension;

    var maxWidth = equipOptions.maxWidth;

    var align = equipOptions.align;

    for (let index = 0; index < 10; index++) {
        const odd = index % 2;
        const equip = build.getEquipmentInSlot(index);

        // log(`Equipment in slot: ${index}`);
        // log(equip);
        
        if (!equip) {
            if (odd) {
                yType = yType + spacing;
                yName = yName + spacing;
            }
            continue;    
        }
        
        var xName = equipOptions.xCol1;
        if (odd) {
            xName = equipOptions.xCol2;
        }
    
        // Item name
        labels[labels.length] = {
            text: equip.name.limitTo(25),
            font: fontFamily,
            size: equipOptions.fontSize,
            x: xName,
            y: yName,
            align: align,
            maxWidth: maxWidth,
            wrap: true,
            strokeColor: "255,255,255,1"
        };

        // type 
        if (equip.type) {
            images[images.length] = {
                src: `${imgCacheDir}equipment/${equip.type}.png`,
                x: xName - dimensions,
                y: yType,
                w: dimensions,
                h: dimensions
            }
        }    

        if (odd) {
            yType = yType + spacing;
            yName = yName + spacing;
        }
    }

    return {
        labels: labels,
        images: images
    };
}


function getEquipment(options: equipmentOptions, firstSlotLeft: equipOptions, firstSlotRight: equipOptions, build) {

    var labels = [];
    var images = [];

    var yspace = options.ySpacing;
    var maxWidth = options.maxWidth;

    var dimensions = firstSlotLeft.iconDim;
    
    var yIcon = firstSlotLeft.icon.y;
    var yType = firstSlotLeft.name.y - 30;
    var yName = firstSlotLeft.name.y;
    var yInfo = firstSlotLeft.desc.y;

    for (let index = 0; index < 10; index++) {
        const odd = index % 2;
        const equip = build.getEquipmentInSlot(index);
        debug("Slot: ", index, "Equip: ", equip);

        if (!equip)
            continue;

        var xIcon = firstSlotLeft.icon.x;
        var xType = firstSlotLeft.name.x - 40;
        var xInfo = firstSlotLeft.desc.x;
        var xName = firstSlotLeft.name.x;
        var align = "left";
        if (odd) {
            xIcon = firstSlotRight.icon.x;
            xName = firstSlotRight.name.x;
            xType = firstSlotRight.name.x;
            xInfo = firstSlotRight.desc.x;
            align = "right";
        }
    
        // Item name
        labels.push({
            text: equip.name.limitTo(25),
            font: fontFamily,
            size: options.fontSize,
            x: xName,
            y: yName,
            align: align,
            maxWidth: 155,
            strokeColor: "255,255,255,1"
        });

        // type 
        if (equip.type) {
            images.push({
                src: `${imgCacheDir}equipment/${equip.type}.png`,
                x: xType,
                y: yType,
                w: 40,
                h: 40
            });
        }    
        
        // Item text
        labels = labels.concat(getEquipmentInfoText(equip, xInfo, yInfo, maxWidth, align));

        // Item image
        var path = `${imgCacheDir}items/${equip.icon}`;
        images.push({
            src: path,
            x: xIcon,// + (xspace * (index % 2))),// - (image.w * 0.5),
            y: yIcon,// - (image.h * 0.5),
            w: dimensions,
            h: dimensions
        });

        // 2 handed
        if (equip.special && equip.special.includes("twoHanded")) {
            let hx = ((odd) ? firstSlotLeft.icon.x : firstSlotRight.icon.x) + dimensions - 50;
            let hy = ((odd) ? firstSlotLeft.icon.y : firstSlotRight.icon.y) - 50;
            images.push({
                src: `${imgCacheDir}equipment/twoHanded.png`,
                x: hx,
                y: hy,
                w: 40,
                h: 40
            });
        }

        if (odd) {
            yIcon = yIcon + yspace;
            yType = yType + yspace;
            yName = yName + yspace;
            yInfo = yInfo + yspace;
        }
    }

    return {
        labels: labels,
        images: images
    };
}
function getEquipmentInfoText(equip, xInfo, yInfo, maxWidth, align) {

    var labels: mergeImages.labelOptions[] = [];

    var fontSize = 24;
    var font =  `${fontSize}px ${fontFamily}`;
    var itemText = Build.itemToString(equip).toUpperCase();
    var enhText = Build.itemEnhancementsToString(equip);
    // var lines = mergeImages.getLines(ctx, itemText, maxWidth, font);
    var infoY = yInfo;
    if (enhText != "") { // weapons
        var y2 = 430;
        
        var lines = mergeImages.getLines(ctx, itemText + enhText, maxWidth, font);
        if (lines.length > 3)
            fontSize = 22;

        labels[labels.length] = {
            text: enhText,
            font: enhancementsFontFamily,
            size: fontSize,
            x: xInfo,
            y: y2,
            align: align,
            color: enhancementsColor,
            strokeColor: enhancementsStroke,
            maxWidth: maxWidth,
            wrap: true,
            anchorTop: false
        };
    }

    labels[labels.length] = {
        text: itemText,
        font: textFontFamily,
        size: fontSize,
        x: xInfo,
        y: infoY,
        color: null,
        strokeColor: textStroke,
        align: align,
        maxWidth: maxWidth,
        wrap: true,
        anchorTop: true
    };

    return labels;
}
