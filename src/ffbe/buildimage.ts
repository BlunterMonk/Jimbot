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

    var images : Promise<any>[] = [];

    // Add Equipment Icons
    slots.forEach(slot => {

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
        
        images.push(downloadImageIfNotExist(path, imagePath));
    });
    
    // Add Unit Icon
    var filename = `unit_icon_${unitId}.png`;
    var path = `${imgCacheDir}units/${filename}`;
    let source = `https://ffbeequip.com/img/units/${filename}`;
    
    images.push(downloadImageIfNotExist(path, source));

    return images;
}

export async function BuildImage(build: Build.Build, isCompact: boolean, destination?: string): Promise<string> {

    let c = (isCompact) ? "compact/" : "";
    let saveLocation = `./tempbuilds/${c}${build.buildID}.png`;
    if (destination && !destination.empty()) {
        saveLocation = destination;
    } else if (fs.existsSync(saveLocation)) {
        return Promise.resolve(saveLocation);
    }

    log("Building Image: ", saveLocation);
    // log("Build: ", build);

    var equipped = build.getEquipment();

    return new Promise<string>(async (resolve, reject) => {
        
        var downloads = await downloadImages(build.getSlots(), equipped, build.loadedUnit.id);
        Promise.all(downloads).then(() => {

            if (isCompact) {
                let compactCanvas = {
                    xStart: 0,
                    yStart: 0
                }
                
                buildSuperCompactImage(saveLocation, compactCanvas, build).then((p) => {
                    resolve(p);
                }).catch(reject);
            } else {

                buildImage(saveLocation, build).then((p) => {
                    resolve(p);
                }).catch(reject);
            }
        }).catch(e => {
            error("Failed to download an image: ", e);
            reject("Failed to download an image");
        });
    });
}
export async function BuildTeamImage(saveLocation: string, builds: Build.Build[]): Promise<string> {

    log("Building Team Image");

    let imageBuilds : Promise<string>[] = await builds.map((build, index) => {
        if (!build) {
            return Promise.reject("Build Null");
        }

        let id = build.buildID;
        let imgPath = `./tempbuilds/${id}/${id}_${index}.png`;
        if (fs.existsSync(imgPath)) {
            log("Returning Existing Image: ", imgPath);
            return Promise.resolve(imgPath);
        }

        log("Building Image: ", imgPath);
        return BuildImage(build, true, imgPath);
    });

    log("Finished Starting Builds List");

    return new Promise<string>(async (resolve, reject) => {

        Promise.all(imageBuilds).then(images => {
            log("Building Team Image: ", images);

            let cW = 1300;
            let cH = 350 * images.length;
            var imgOpts : mergeImages.imageOptions[] = [];

            images.forEach((img, ind) => {
                log("Adding Build To Team Image: ", img);
                imgOpts.push({
                    src: img,
                    x: 0,
                    y: 350 * ind,
                    w: 1300,
                    h: 350
                });
            });

            finalizeImage(saveLocation, imgOpts, null, cW, cH).then(p => {
                log("Successfully Built Team Image: ", p);
                resolve(p);
            }).catch(e => {
                error("Failed to build team image: ", e);
                reject(e);
            });
        })
    });
}

function buildImage(saveLocation: string, build: Build.Build): Promise<string> {

    let canvasWidth = 1200;
    let canvasHeight = 1576;

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;
    var wieldBonus = getWieldBonus(totalStats, build);

    debug("Build Compact Image: ", build.buildID);
    trace("Total Stats: ", totalStats, " Total Bonuses: ", totalBonuses);

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

    return finalizeImage(saveLocation, images, labels, canvasWidth, canvasHeight);
}
function buildCompactImage(saveLocation: string, canvasOptions: CanvasOptions, build: Build.Build): Promise<string> {

    let imageWidth = 1300;
    let imageHeight = 350;

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;
    var wieldingBonus = getWieldBonus(totalBonuses, build);

    debug("Build Compact Image: ", build.buildID);
    trace("Total Stats: ", totalStats, " Total Bonuses: ", totalBonuses);

    var labels : mergeImages.labelOptions[] = [];
    var images : mergeImages.imageOptions[] = [{
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

    // Add main stats
    labels = labels.concat(addCompactMainStats(totalStats, totalBonuses, wieldingBonus, canvasOptions));

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
            strokeColor: "255,255,255,1",
            maxWidth: 200,
            color: null,
            anchorTop: false,
            wrap: false
        };
    }

    // Add killers
    var killers = addCompactKillers(totalStats, canvasOptions);
    labels = labels.concat(killers.labels);
    images = images.concat(killers.images);

    // Add Resistances
    labels = labels.concat(addCompactResistances(totalStats, canvasOptions));

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
            strokeColor: "255,255,255,1",
            maxWidth: null,
            color: null,
            anchorTop: false,
            wrap: false
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

    return finalizeImage(saveLocation, images, labels, imageWidth, imageHeight);
}
function buildSuperCompactImage(saveLocation: string, canvasOptions: CanvasOptions, build: Build.Build): Promise<string> {

    let imageWidth = 850;
    let imageHeight = 350;

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;
    var wieldingBonus = getWieldBonus(totalBonuses, build);

    debug("Build Compact Image: ", build.buildID);
    trace("Total Stats: ", totalStats, " Total Bonuses: ", totalBonuses);

    var labels : mergeImages.labelOptions[] = [];
    var images : mergeImages.imageOptions[] = [{
        src: `${imgCacheDir}template/unit-build-stats.png`,
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

    // Add main stats
    labels = labels.concat(addCompactMainStats(totalStats, totalBonuses, wieldingBonus, canvasOptions));

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
            strokeColor: "255,255,255,1",
            maxWidth: 200,
            color: null,
            anchorTop: false,
            wrap: false
        };
    }

    // Add killers
    var killers = addCompactKillers(totalStats, canvasOptions);
    labels = labels.concat(killers.labels);
    images = images.concat(killers.images);

    // Add Resistances
    labels = labels.concat(addCompactResistances(totalStats, canvasOptions));

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
            strokeColor: "255,255,255,1",
            maxWidth: null,
            color: null,
            anchorTop: false,
            wrap: false
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

            var path = saveLocation.slice(0, saveLocation.lastIndexOf("/"));
            if (!fs.existsSync(path))
                fs.mkdirSync(path, { recursive: true });

            fs.writeFileSync(saveLocation, buffer);

            log(`Build Saved: ${saveLocation}`);
            resolve(saveLocation);
        }).catch((e) =>{
            error("Failed to make image: ", e.message);
            reject("Failed to make image: " + e.message);
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
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats, false));
    
    resistOptions.yStart = 1545;//772,
    labels = labels.concat(getElementResistances(resistOptions, totalStats));

    return labels;
}
function addKillers(totalStats) {

    if (!totalStats.killers) {
        return { labels: [], images: [] };
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
        fontSize: 24,
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

function addCompactMainStats(totalStats, totalBonuses, wieldBonus, canvasOptions: CanvasOptions) {

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

    return getMainStats(mainStats, totalStats, totalBonuses, wieldBonus);
}
function addCompactKillers(totalStats, canvasOptions: CanvasOptions) {

    if (!totalStats.killers) {
        return { labels: [], images: [] };
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

    var values = sortKillersByValue(totalStats.killers);
    return getKillers(killerOptions, values);
}
function addCompactResistances(totalStats, canOpts: CanvasOptions): mergeImages.labelOptions[] {

    let labels : mergeImages.labelOptions[] = [];
    let resistOptions = { // compact mode settings
        xStart: canOpts.xStart + 50,
        yStart: canOpts.yStart + 215,
        dimensions: 1,
        maxWide: 15, // max amount of icons that can fit horizontally
        maxTall: 1, // max amount of icons that can fit vertically
        fontSize: 20,
        distance: 1,
        spacing: 90,
        align: "left"
    };
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats, true));

    if (totalStats.resist && totalStats.resist.death) {
        const v = parseInt(totalStats.resist.death);

        var f = (v >= 100) ? resistFontFamily : fontFamily;
        var t = (v >= 100) ? "Null" : "-";

        labels[labels.length] = { 
            text: t,
            font: f, 
            size: 20, 
            x: 145, 
            y: 215,
            align: "left",
            color: null,
            maxWidth: null,
            strokeColor: null,
            anchorTop: false,
            wrap: false
        };
    }

    resistOptions.yStart = canOpts.yStart + 265;
    labels = labels.concat(getElementResistances(resistOptions, totalStats));

    return labels;
}
function addCompactEquipment(build: Build.Build, canOpts: CanvasOptions): Batch {
    
    let equipOptions = {
        xCol1: canOpts.xStart + 800,
        xCol2: canOpts.xStart + 1050,
        yTop: canOpts.yStart + 20,
        yText: canOpts.yStart + 55,
        ySpacing: 50,
        dimension: 50,
        maxWidth: 200,
        fontSize: 22,
        shrunkFontSize: 18,
        align: "left"
    };

    return getCompactEquipment(equipOptions, build);
}


interface Batch {
    labels: mergeImages.labelOptions[];
    images: mergeImages.imageOptions[];
}
interface CanvasOptions {
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


//////////////////////////////////////////////


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
function getAilmentResistances(options: statRow, totalStats, excludeDeath) {
    
    var labels = [];

    var x0 = options.xStart;
    var y0 = options.yStart;
    var spacing = options.spacing;

    var ailments = getResists(totalStats, Build.ailmentList);
    var len = (excludeDeath) ? 8 : ailments.length;
    for (let index = 0; index < len; index++) {
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

function getCompactEquipment(equipOptions: equipmentOptions, build): Batch {
    
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
                
        var xName = equipOptions.xCol1;
        if (odd) {
            xName = equipOptions.xCol2;
        }

        if (!equip) {
            images[images.length] = {
                src: `${imgCacheDir}equipment/emptyIcon.png`,
                x: xName - dimensions,
                y: yType,
                w: dimensions,
                h: dimensions
            }

            if (odd) {
                yType = yType + spacing;
                yName = yName + spacing;
            }
            continue;    
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

        if (!equip) {
            if (odd) {
                yIcon = yIcon + yspace;
                yType = yType + yspace;
                yName = yName + yspace;
                yInfo = yInfo + yspace;
            }
            continue;
        }

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

    var fontSize = 20;
    var font =  `${fontSize}px ${fontFamily}`;
    var itemText = Build.itemToString(equip).toUpperCase();
    var enhText = Build.itemEnhancementsToString(equip);
    // var lines = mergeImages.getLines(ctx, itemText, maxWidth, font);
    var infoY = yInfo;
    if (enhText != "") { // weapons
        var y2 = 430;
        
        var lines = mergeImages.getLines(ctx, itemText + enhText, maxWidth, font);
        if (lines.length > 3)
            fontSize = 18;

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
