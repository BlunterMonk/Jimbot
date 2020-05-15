//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as mergeImages from '../image-canvas/image-canvas.js';
import * as fs from "fs";
import * as Canvas from 'canvas';
import * as Build from './build.js';
import * as Download from '../util/download.js';
import { log, debug, error, trace } from "../global.js";

////////////////////////////////////////////////////////////

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

const statOrder = [ "hp",  "atk", "def", "mp",  "mag", "spr" ];

////////////////////////////////////////////////////////////

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
    desMaxWidth: number; // max length of description text
    iconDim: number;
    fontSize: number;
    shrunkFontSize: number;
}
interface equipSlotOptions {
    icon: position; // item icon position
    type: position; // item type icon position
    name: position; // item label position
    desc: position; // description text position
    desMaxWidth: number; // max length of description text
    align: string;
}

////////////////////////////////////////////////////////////



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

export async function BuildImage(build: Build.Build, style: string, destination?: string): Promise<string> {

    if (style.empty())
       style = "full";

    let c = `${style}/`;
    let saveLocation = `./tempbuilds/${c}${build.buildID}.png`;
    if (destination && !destination.empty()) {
        saveLocation = destination;
    } else if (fs.existsSync(saveLocation)) {
        return Promise.resolve(saveLocation);
    }

    log("Building Image: ", saveLocation);

    let compactCanvas = {
        xStart: 0,
        yStart: 0
    }
            
    return buildImage(saveLocation, style, compactCanvas, build);
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
        return BuildImage(build, "compact", imgPath);
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


function buildImage(saveLocation: string, style: string, canvasOptions: CanvasOptions, build: Build.Build): Promise<string> {

    var builder = new ImageBuild(`./config/config-buildimage-${style}.json`, style, canvasOptions, build);
    builder.buildImage();

    return builder.finalize(saveLocation);
}
function finalizeImage(saveLocation: string, images: mergeImages.imageOptions[], labels: mergeImages.labelOptions[], cWidth, cHeight): Promise<string> {

    return new Promise<string>((resolve, reject) => {

        mergeImages.mergeImages(images, labels,
            {
                width: cWidth,
                height: cHeight
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
    config: any; // loaded config file
    style: string; // style of build image
    canvasOptions: CanvasOptions;
    build: Build.Build;
    totalStats: any; // total main stats from build
    totalBonuses: any; // total stat bonuses from build
    wieldingBonus: any; // wielding bonus from build
    labels: mergeImages.labelOptions[];
    images: mergeImages.imageOptions[];
    constructor(configFile: string, style: string, canvasOptions: CanvasOptions, build: Build.Build) {
        this.config = JSON.parse(fs.readFileSync(configFile).toString());
        this.build = build;
        this.style = style;
        this.canvasOptions = canvasOptions;
        this.labels = [];
        this.images = [];

        var total = build.getTotalStats();
        this.totalStats = total.stats;
        this.totalBonuses = total.bonuses;
        this.wieldingBonus = getWieldBonus(total.bonuses, build);
    }
    buildImage() {
        let src = "";
        let frame = "unit-build-frame.png";
        let frameH = 350;
        switch (this.style) {
            case "compact":
                src = "unit-build-compact-long.png";
                frame = "unit-build-compact-long-frame.png";
                break;
            case "box":
                src = "unit-build-compact.png";
                frame = "unit-build-compact-frame.png";
                frameH = 600;
                break;
            case "stats":
                src = "unit-build-stats.png";
                break;
            case "full":
            default:
            if (this.totalStats.singleWielding && this.build.isDoublehanding()) {
                src = "unit-build-full-tdh.png";
            } else {
                src = "unit-build-full.png";
            }
            break;
        }

        this.images.push({
            src: `${imgCacheDir}template/${src}`,
            x: this.canvasOptions.xStart,
            y: this.canvasOptions.yStart,
            w: this.config.canvasWidth,
            h: this.config.canvasHeight
        });

        this.addMainStats(this.config.mainStatOptions);
        // var res = addCompactResistances(this.totalStats, this.canvasOptions);
        // this.labels = this.labels.concat(res);
 
        this.addAilResist(this.config.ailmentOptions);
        this.addEleResist(this.config.elementOptions);
        this.addKillers(this.config.killerOptions);
        this.addEquipment(this.config.equipmentOptions);
        this.addUnitIcon();
        this.addEsper(this.build.getEsperId());

        this.images.push({
            src: `${imgCacheDir}template/${frame}`,
            x: this.canvasOptions.xStart,
            y: this.canvasOptions.yStart,
            w: this.config.canvasWidth,
            h: frameH
        });
    }
    finalize(saveLocation: string): Promise<string> {
    
        var unit = this.build.loadedUnit.id;
        var slots = this.build.getSlots();
        var equipped = this.build.getEquipment();
        var downloads = downloadImages(slots, equipped, unit);
        
        debug("Equipment: ", equipped);

        Promise.all(downloads);

        return finalizeImage(saveLocation, this.images, this.labels, this.config.canvasWidth, this.config.canvasHeight);
    }

    isCompact(): boolean {
        return (this.style == "compact" || this.style == "box");
    }

    addMainStats(mainStatOptions: mainStatsOptions) {
        if (!mainStatOptions)
            return;

        let stats = this.build.getTotal();
        if (stats) {
            this.labels = this.labels.concat(getMainStats(mainStatOptions, stats));
        } else {
            this.labels = this.labels.concat(getMainStatsOldMethod(mainStatOptions, this.totalStats, this.totalBonuses, this.wieldingBonus));
        }
    }
    addKillers(killerOptions: statRow) {
        if (!this.totalStats.killers) {
            return;
        }

        let values = sortKillersByValue(this.totalStats.killers);
        let kills = getKillers(killerOptions, values);
        this.labels = this.labels.concat(kills.labels);
        this.images = this.images.concat(kills.images);     
    }
    addEleResist(elementOptions: statRow) {
        if (!this.totalStats.resist) {
            return;
        }
    
        // let eleVal = getResistsByValue(this.totalStats.resist, Build.elementList);
        let ele = getElementResistances(elementOptions, this.totalStats.elementResists);
        // let ele = getKillers(elementOptions, eleVal);
        this.labels = this.labels.concat(ele);
        // this.images = this.images.concat(ele.images);
    }
    addAilResist(ailmentOptions: statRow) {
        if (!this.totalStats.resist) {
            return;
        }

        // let ailVal = getResistsByValue(this.totalStats.resist, Build.ailmentList);
        let ail = getAilmentResistances(ailmentOptions, this.totalStats.ailmentResists);
        // let ail = getKillers(ailmentOptions, ailVal);
        this.labels = this.labels.concat(ail);
        // this.images = this.images.concat(ail.images); 
    }
    addUnitIcon(): ImageBuild {

        this.images.push(addUnitIcon(this.build.unitID, 3, this.canvasOptions.xStart + 6, this.canvasOptions.yStart + 5));

        return this;
    }
    addEquipment(options: any): ImageBuild {
        if (!options)
            return this;

        let equips = null;
        if (this.isCompact()) {
            equips = getCompactEquipment(options.equipOptions, this.build);
        } else {
            equips = getEquipment(options.equipOptions, options.firstSlotLeft, options.firstSlotRight, this.build);
        }
        this.labels = this.labels.concat(equips.labels);
        this.images = this.images.concat(equips.images);
    
        return this;
    }
    addEsper(esper: any) {
        if (!esper) {
            return;
        }
        
        this.labels.push({
            text: esper,
            font: fontFamily,
            size: 22,
            x: 70,
            y: 151,
            align: "left",
            strokeColor: "255,255,255,1",
            maxWidth: 130,
            color: null,
            anchorTop: false,
            wrap: false
        });
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
        
    return getMainStatsOldMethod(mainStats, totalStats, totalBonuses, wieldBonus);
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
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats.ailmentResists));
    
    resistOptions.yStart = 1545;//772,
    labels = labels.concat(getElementResistances(resistOptions, totalStats.elementResists));

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
    var firstSlotLeft : equipSlotOptions = {
        icon: {x: -12, y: 264},
        type: {x: 112, y: 264},
        name: {x: 250, y: 340},
        desc: {x: 210, y: 360},
        desMaxWidth: 250,
        align: "left",
    }
    var firstSlotRight : equipSlotOptions = {
        icon: {x: canvasWidth - dim, y: 264},
        type: {x: canvasWidth - 112 - dim, y: 264},
        name: {x: canvasWidth - 250, y: 340},
        desc: {x: canvasWidth - 210, y: 360},
        desMaxWidth: 350,
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

    return getMainStatsOldMethod(mainStats, totalStats, totalBonuses, wieldBonus);
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
        spacing: 100,
        align: "left"
    };
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats.ailmentResists));

    /*
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
    */

    resistOptions.yStart = canOpts.yStart + 265;
    labels = labels.concat(getElementResistances(resistOptions, totalStats.elementResists));

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
function getResistsByValue(totalResists: any, list: string[]): any {

    var resist = {};
                              
    if (!totalResists) {
        return resist;
    }
        
    list.forEach((k, i) => {
        const r = totalResists[k];

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
// HELPERS

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
function getAilmentResistances(options: statRow, ailments: any) {
    
    var labels = [];

    var x0 = options.xStart;
    var y0 = options.yStart;
    var spacing = options.spacing;

    var keys = Object.keys(ailments);
    keys.forEach((k, i) => {
        const e = ailments[k];
        const index = Build.ailmentList.indexOf(k);
        const v = e;
        if (v == 0) {
            return;
        }

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
    });

    return labels;
}
function getElementResistances(options: statRow, elements) {
    
    var labels = [];

    var x0 = options.xStart;
    var y0 = options.yStart;
    var spacing = options.spacing;

    var keys = Object.keys(elements);
    keys.forEach((k, i) => {
        const e = elements[k];
        const index = Build.elementList.indexOf(k);
        const v = e;
        if (v == 0) {
            return;
        }

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
    });

    return labels;
}
function getMainStatsOldMethod(options: mainStatsOptions, totalStats, totalBonuses, wieldingBonus) {
    var labels = [];

    let x0 = options.xStart;
    let y0 = options.yStart;

    let fs = options.fontSize;
    
    for (let index = 0; index < statOrder.length; index++) {
        const key = statOrder[index];
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

        let l = mergeImages.measureText(statValue, `${fs}px ${mainStatFontFamily}`)
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
function getMainStats(options: mainStatsOptions, stats) {
    var labels = [];

    let x0 = options.xStart;
    let y0 = options.yStart;
    let fs = options.fontSize;
    
    for (let index = 0; index < statOrder.length; index++) {
        const key = statOrder[index];

        var posX = Math.floor(index / options.rows);
        var posY = index % options.rows;
                            
        let x = x0 + (options.xSpace * posX);
        let y = y0 + (options.ySpace * posY);

        let statValue = stats[key];
        labels[labels.length] = { 
            text: statValue.value,
            font: mainStatFontFamily, 
            size: fs, 
            x: x, 
            y: y, 
            align: options.align,
            strokeColor: statStroke
        };

        let l = mergeImages.measureText(statValue.value, `${fs}px ${mainStatFontFamily}`)
        x = (options.align == "right") ? x : x + l.width;

        var v = statValue.bonus;
        var t = "0";

        var color = `255,255,255,1`;
        if (v) {
            color = `0,255,0,1`;
            if (parseInt(v) > 400)
                color = `255,0,0,1`;

            t = `+${v}`;
        }

        t = `${t}%`;
        if (statValue.flatStatBonus > 0) {
            var tdh = statValue.flatStatBonus;

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
function getEquipment(options: any, firstSlotLeft: equipSlotOptions, firstSlotRight: equipSlotOptions, build: Build.Build) {

    var labels: mergeImages.labelOptions[] = [];
    var images = [];

    var yspace = options.ySpacing;
    var maxWidth = options.maxWidth;
    var dimensions = options.dimension;
    var fontSize = options.fontSize;
    
    var yIcon = firstSlotLeft.icon.y;
    var yType = firstSlotLeft.type.y;
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
        var xType = firstSlotLeft.type.x;
        var xName = firstSlotLeft.name.x;
        var xInfo = firstSlotLeft.desc.x;
        var align = "left";
        if (odd) {
            xIcon = firstSlotRight.icon.x;
            xType = firstSlotRight.type.x;
            xName = firstSlotRight.name.x;
            xInfo = firstSlotRight.desc.x;
            align = "right";
        }

        // 2 handed
        if (build.isDoublehanding() && equip.special && equip.special.includes("twoHanded")) {
            images.push({
                src: `${imgCacheDir}equipment/twoHanded.png`,
                x: firstSlotLeft.type.x + 150,
                y: firstSlotLeft.type.y,
                w: 50,
                h: 50
            });
            
            // add 2 handed weapon and force to left
            xIcon = firstSlotLeft.icon.x;
            xType = firstSlotLeft.type.x + 200;
            xName = 325;
            xInfo = firstSlotLeft.desc.x;
            align = "left";
            
            // Item text
            labels = labels.concat(getEquipmentInfoText(equip, xInfo, yInfo, maxWidth + 200, fontSize, align));
        } else {
            // Item text
            labels = labels.concat(getEquipmentInfoText(equip, xInfo, yInfo, maxWidth, fontSize, align));
        }

        // Item name
        labels.push({
            text: equip.name,
            font: fontFamily,
            size: fontSize,
            x: xName,
            y: yName,
            align: "center",
            maxWidth: 225,
            strokeColor: "255,255,255,1",
            anchorTop: false,
            color: null,
            wrap: true
        });

        // type 
        if (equip.type) {
            images.push({
                src: `${imgCacheDir}equipment/${equip.type}.png`,
                x: xType,
                y: yType,
                w: 45,
                h: 45
            });
        }    

        // Item image
        var path = `${imgCacheDir}items/${equip.icon}`;
        images.push({
            src: path,
            x: xIcon,
            y: yIcon,
            w: dimensions,
            h: dimensions
        });

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
function getEquipmentInfoText(equip, xInfo, yInfo, maxWidth, fontSize, align) {

    var labels: mergeImages.labelOptions[] = [];

    var font =  `${fontSize}px ${fontFamily}`;
    var itemText = Build.itemToString(equip).toUpperCase();
    var enhText = Build.itemEnhancementsToString(equip);
    var lines = mergeImages.getLines(itemText, maxWidth, font);
    var remainingText = "";
    if (lines.length > 2) {
        var remaining = lines.slice(2, lines.length);
        remaining.forEach(r => { 
            itemText = itemText.replace(r.text,""); 
            remainingText += r.text;
        });
    }
    
    var yThirdRow = yInfo + 60;
    var odd = (xInfo > 425);

    if (enhText != "") { // weapons
        
        // var enhLines = mergeImages.getLines(ctx, itemText + enhText, maxWidth, font);
        // if (enhLines.length > 3) {
            // remaining = remaining.concat(enhLines);
        // }

        labels[labels.length] = {
            text: enhText,
            font: enhancementsFontFamily,
            size: fontSize,
            x: odd ? 830 : 20,
            y: 510,
            align: align,
            color: enhancementsColor,
            strokeColor: enhancementsStroke,
            maxWidth: maxWidth+100,
            wrap: true,
            anchorTop: false
        };
    }

    labels[labels.length] = {
        text: itemText,
        font: textFontFamily,
        size: fontSize,
        x: xInfo,
        y: yInfo,
        color: null,
        strokeColor: textStroke,
        align: align,
        maxWidth: maxWidth,
        wrap: true,
        anchorTop: true,
        splitter: ", "
    };

    if (!remainingText.empty()) {

        labels[labels.length] = {
            text: remainingText,
            font: textFontFamily,
            size: fontSize,
            x: odd ? 830 : 20,
            y: yThirdRow,
            color: null,
            strokeColor: textStroke,
            align: align,
            maxWidth: maxWidth + 100,
            wrap: true,
            anchorTop: true
        };
    }

    return labels;
}
