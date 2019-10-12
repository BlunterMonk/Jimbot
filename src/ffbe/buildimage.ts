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
const canvasWidth = 600;
const canvasHeight = 788;
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



export async function BuildImage(build: any): Promise<string> {
    
    var equipped = build.getEquipment();
    debug("Equipment: ", equipped);

    return new Promise<string>((resolve, reject) => {
        
        downloadImages(build.getSlots(), equipped, build.loadedUnit.id, (unit, list) => {

            let compactOptions = {
                xStart: 0,
                yStart: 0
            }
            buildImage(unit, list, build, (p) => {
                resolve(p);
            });
        });
    });
}

interface UnitBox {
    xStart: number;
    yStart: number;
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

interface statRow {
    xStart: number,
    yStart: number,
    dimensions: number,
    maxWide: number,
    maxTall: number,
    fontSize: number,
    spacing: number
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
            y: y + options.dimensions - 8,
            align: "left",
            strokeColor: killerssStroke
        };
        across += 2;
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
            t = "-"
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
            align: "center" 
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
            t = "-"
        }

        labels[labels.length] = { 
            text: t, 
            font: resistFontFamily, 
            size: options.fontSize, 
            x: x0 + (spacing * index), 
            y: y0,
            align: "center",
            color: c
        };
    }

    return labels;
}

const statValues = [
    "hp",  "mp",  "atk", "mag", "def", "spr",
];
interface mainStatsOptions {
    xCol1: number,
    xCol2: number,
    xCol3: number,
    yMainRow1: number,
    yMainRow2: number,
    yStatBonus: number,
    yEquipBonus: number
}

function getMainStats(options: mainStatsOptions, totalStats, totalBonuses, wieldingBonus) {
    var labels = [];

    let x0 = options.xCol1;
    let x1 = options.xCol2;
    let x2 = options.xCol3;
    let y0 = options.yMainRow1;
    let y1 = options.yMainRow2; 
    let y2 = options.yStatBonus;
    let y3 = options.yEquipBonus;
    
    labels[labels.length] = { text: totalStats.hp   , font: mainStatFontFamily, size: 18, x: x0, y: y0 , align: "right", strokeColor: statStroke }; // HP
    labels[labels.length] = { text: totalStats.mp   , font: mainStatFontFamily, size: 18, x: x0, y: y1 , align: "right", strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.atk  , font: mainStatFontFamily, size: 18, x: x1, y: y0 , align: "right", strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.mag  , font: mainStatFontFamily, size: 18, x: x1, y: y1 , align: "right", strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.def  , font: mainStatFontFamily, size: 18, x: x2, y: y0 , align: "right", strokeColor: statStroke };
    labels[labels.length] = { text: totalStats.spr  , font: mainStatFontFamily, size: 18, x: x2, y: y1 , align: "right", strokeColor: statStroke };

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
        
        let l = mergeImages.measureText(ctx, t, `10px ${fontFamily}`)

        if (wieldingBonus && wieldingBonus[stat]) {
            var tdh = wieldingBonus[stat];
            // log(tdh)

            bonuses[bonuses.length] = { 
                text: `+${tdh}%`,
                font: fontFamily, 
                size: 12,
                x: element.x - l.width - 6,
                y: (index % 2) ? y3 : y2,
                align: "right",
                color: `255,223,0,1`,
                strokeColor: `125,125,125,0.5`
            };
            // log(bonuses[bonuses.length-1]);
        }

        bonuses[bonuses.length] = { 
            text: t,
            font: fontFamily, 
            size: 12,
            x: element.x, 
            y: (index % 2) ? y3 : y2,
            align: "right",
            color: color
        };
    }

    return labels.concat(bonuses);
}

function getEquipmentInfoText(equip, xInfo, yInfo, maxWidth, align) {

    var labels = [];

    var fontSize = 12;
    var font =  `${fontSize}px ${fontFamily}`;
    var itemText = Build.itemToString(equip).toUpperCase();
    var enhText = Build.itemEnhancementsToString(equip);
    var lines = mergeImages.getLines(ctx, itemText, maxWidth, font);
    var infoY = yInfo;
    if (enhText != "") { // weapons
        // var end = mergeImages.measureText(ctx, lines[lines.length-1], font).width;
        // var start = xInfo + end + 2;
        // log(`Enhance Text: start(${start}), end(${end})`);
        var y2 = 212;
        let fs2 = 10;

        infoY = yInfo - 10;
        if (lines.length > 2) {
            fontSize = 10;
            fs2 = 9;
            y2 = 214;
        }
        var enl = mergeImages.getLines(ctx, enhText, maxWidth, font);
        if (enl.length > 1) {
            fs2 = 9;
            y2 = 207;
        }

        labels[labels.length] = {
            text: enhText,
            font: enhancementsFontFamily,
            size: 10,
            x: xInfo, //start,
            y: y2,
            align: align,
            color: enhancementsColor,
            strokeColor: enhancementsStroke,
            maxWidth: maxWidth,
            wrap: true
        };
    }

    if (lines.length > 3) {
        fontSize = 10;
        infoY = yInfo - 10;
    }

    labels[labels.length] = {
        text: itemText,
        font: textFontFamily,
        size: fontSize,
        x: xInfo,
        y: infoY,
        strokeColor: textStroke,
        align: align,
        maxWidth: maxWidth,
        wrap: true
    };

    return labels;
}

function getEquipment(itemImages, build) {

    var labels = [];
    var images = [];

    var dimensions = 112;
    var yspace = 100;
    var yIcon = 135;
    var yType = 154;
    var yName = 170;
    var yInfo = 195;
    var maxWidth = 160;
    for (let index = 0; index < 10; index++) {
        const image = itemImages[index];
        const odd = index % 2;
        const equip = build.getEquipmentInSlot(index);

        // log(`Equipment in slot: ${index}`);
        // log(equip);
        
        if (equip && image) {
            // log(image)
      
            var xIcon = -6;
            var xType = 106;
            var xInfo = 105;
            var xName = 125;
            var align = "left";
            if (odd) {
                xIcon = 606 - image.w;
                xName = 475;
                xType = 475;
                xInfo = 488;
                align = "right";
            }
      
            // Item name
            labels[labels.length] = {
                text: image.name.limitTo(25),
                font: fontFamily,
                size: 14,
                x: xName,
                y: yName,
                align: align,
                maxWidth: 155,
                strokeColor: "255,255,255,1"
            };

            // type 
            if (equip.type) {
                images[images.length] = {
                    src: `${imgCacheDir}equipment/${equip.type}.png`,
                    x: xType,
                    y: yType,
                    w: 20,
                    h: 20
                }
            }    
            
            // Item text
            labels = labels.concat(getEquipmentInfoText(equip, xInfo, yInfo, maxWidth, align));

            // Item image
            images[images.length] = {
                src: image.path,
                x: xIcon,// + (xspace * (index % 2))),// - (image.w * 0.5),
                y:  yIcon,// - (image.h * 0.5),
                w: dimensions,
                h: dimensions
            }

            // 2 handed
            if (equip.special && equip.special.includes("twoHanded")) {
                let hx = 72;
                let hy = 150;
                if (odd) hx = 600 - hx;
                images[images.length] = {
                    src: `${imgCacheDir}equipment/twoHanded.png`,
                    x: hx,
                    y: hy,
                    w: 20,
                    h: 20
                }
            }
        
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

function buildCompactImage(unit, imageOptions: UnitBox, build, callback) {

    let imageWidth = 1300;
    let imageHeight = 336;

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;

    var labels = [];
    var images = [{
        src: `${imgCacheDir}unit-overview-background.png`,
        x: imageOptions.xStart,
        y: imageOptions.yStart,
        w: imageWidth,
        h: imageHeight
    }];
    if (unit && unit.path && unit.path != "") {
        let ui = {
            src: unit.path,
            x: imageOptions.xStart + 6,
            y: imageOptions.yStart + 5,
            w: unit.w*3,
            h: unit.h*3
        };
        trace("Unit Image: ", ui);
        images[images.length] = ui;
        images[images.length] = {
            src: `${imgCacheDir}unit-icon-frame.png`,
            x: imageOptions.xStart + 6,
            y: imageOptions.yStart + 5,
            w: unit.w*3,
            h: unit.h*3
        };
    }


    let killerOptions = { // compact mode settings
        xStart: imageOptions.xStart + 40,
        yStart: imageOptions.yStart + 270,
        dimensions: 50,
        maxWide: 14, // max amount of icons that can fit horizontally
        maxTall: 2, // max amount of icons that can fit vertically
        fontSize: 32,
        spacing: 0
    }

    if (totalStats.killers) {
        var values = sortKillersByValue(totalStats.killers);
        var killers = getKillers(killerOptions, values);
        labels = labels.concat(killers.labels);
        images = images.concat(killers.images);
    }

    // Add Ailment Resistances
    let resistOptions = { // compact mode settings
        xStart: imageOptions.xStart + 40,
        yStart: imageOptions.yStart + 120,
        dimensions: 50,
        maxWide: 15, // max amount of icons that can fit horizontally
        maxTall: 1, // max amount of icons that can fit vertically
        fontSize: 32,
        spacing: 100
    };
    var ailments = getResistsByValue(totalStats, Build.ailmentList);
    var ailmentDisplay = getKillers(resistOptions, ailments);
    labels = labels.concat(ailmentDisplay.labels);
    images = images.concat(ailmentDisplay.images);

    // Add Elemental Resistances
    resistOptions.xStart = imageOptions.xStart + 65;
    resistOptions.yStart = imageOptions.yStart + 200;
    resistOptions.spacing = 50;
    var elements = getResistsByValue(totalStats, Build.elementList);
    var elementDisplay = getElementResistances(resistOptions, elements);
    labels = labels.concat(elementDisplay);

    // Add Esper
    var esper = build.getEsperId();
    var esperPath = `${imgCacheDir}espers/${esper}.png`;
    trace(`Esper Path: ${esperPath}`);
    if (esper && fs.existsSync(esperPath)) {
        images[images.length] = {
            src: esperPath,
            x: imageWidth - 224,
            y: 0,
            w: 224,
            h: 224
        };
    }

    // Finish frame
    images[images.length] = {
        src: `${imgCacheDir}unit-overview-top-frame-short.png`,
        x: 0,
        y: 0,
        w: imageWidth,
        h: imageHeight
    };

    var saveLocation = `./tempbuilds/compact/${build.buildID}.png`;
    finalizeImage(saveLocation, images, labels, imageWidth, imageHeight, callback);
}

function buildImage(unit, itemImages, build, callback) {

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;

    // log("Total Stats");
    // log(totalStats);

    // log("Unit Image")
    // log(unit)
    var labels = [];
    var images = [{
        src: `${imgCacheDir}build-template.png`,
        x: 0,
        y: 0,
        w: canvasWidth,
        h: canvasHeight
    }];
    if (unit && unit.path && unit.path != "") {
        let ui = {
            src: unit.path,
            x: 72 - ((unit.w)),//56 - (unit.w * 0.5),//6,//150 - ((unit.w * 2.5) / 2),
            y: 104 - (unit.h*1.5),//42,//150 + ((unit.h * 2.5)),
            w: unit.w*1.5,
            h: unit.h*1.5
        };
        trace("Unit Image: ", ui);
        images[images.length] = ui;
    }

    var esper = build.getEsperId();
    var esperPath = `${imgCacheDir}espers/${esper}.png`;
    trace(`Esper Path: ${esperPath}`);
    if (esper && fs.existsSync(esperPath)) {
        images[images.length] = {
            src: esperPath,
            x: 488,
            y: 15,
            w: 112,
            h: 112
        };
    }

    var wieldingBonus = null;
    if (totalStats.singleWielding && build.isDoublehanding())
        wieldingBonus = totalStats.singleWielding;
    else if (totalStats.dualWielding && build.isDualWielding())
        wieldingBonus = totalStats.dualWielding;

    // Add main stats
    let mainStats = {
        xCol1: 230,
        xCol2: 357,
        xCol3: 488,
        yMainRow1: 38,
        yMainRow2: 76,
        yStatBonus: 22,
        yEquipBonus: 58,
    };
    labels = labels.concat(getMainStats(mainStats, totalStats, totalBonuses, wieldingBonus));

    // Add Resistances
    let resistOptions = {
        xStart: 62,
        yStart: 712,
        dimensions: 772,
        maxWide: 9,
        maxTall: 1,
        fontSize: 16,
        spacing: 61
    };
    labels = labels.concat(getAilmentResistances(resistOptions, totalStats));
    resistOptions.yStart = 772,
    labels = labels.concat(getElementResistances(resistOptions, totalStats));

    // Add equipment
    var equips = getEquipment(itemImages, build);
    labels = labels.concat(equips.labels);
    images = images.concat(equips.images);

    // Add killers
    let killerOptions = { // Normal sheet settings
        xStart: 112,
        yStart: 84,
        dimensions: 25,
        maxWide: 15, // max amount of icons that can fit horizontally
        maxTall: 2, // max amount of icons that can fit vertically
        fontSize: 16,
        spacing: 0
    };
    if (totalStats.killers) {
        var values = sortKillersByValue(totalStats.killers);
        var killers = getKillers(killerOptions, values);
        labels = labels.concat(killers.labels);
        images = images.concat(killers.images);
    }

    var saveLocation = `./tempbuilds/${build.buildID}.png`;
    finalizeImage(saveLocation, images, labels, canvasWidth, canvasHeight, callback);
}

function finalizeImage(saveLocation: string, images: any[], labels: any[], cWidth, cHeight, callback) {

    mergeImages.mergeImages(images, 
        {
            width: cWidth,
            height: cHeight,
            Canvas: Canvas,
            text: labels
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
        callback(saveLocation);
    }).catch((e) =>{
        console.error(e);
        error("Failed to make image: ", e.message);
    });
}

function downloadImages(slots, items, unitId, callback) {

    var imageList = {};
    // log(`initial images`);
    // log(imageList);

    var unit = null;
    var count = items.length + 1;
    var queryEnd = function(slot, id, image) {
        count--;
        
        imageList[slot] = image;

        if (count <= 0) {
            // log(`Done downloading images`);
            // log(imageList);

            callback(unit, imageList);
        }
    }

    var foundUnit = function(p) {
        sizeOf(p, function (err, dimensions) {

            unit = {
                path: p,
                w: dimensions.width,
                h: dimensions.height
            };

            queryEnd(null, null, null);
        });
    }

    unitId = unitId.replaceAll(" ", "_");
    var filename = `unit_icon_${unitId}.png`;
    var path = `${imgCacheDir}units/${filename}`;
    if (fs.existsSync(path))
        foundUnit(path);
    else {
        let source = `https://ffbeequip.com/img/units/${filename}`;
        Download.downloadFile(path, source).then((p) =>{
            log(`Image Donloaded: ${source}`);
            foundUnit(p);
        }).catch((e) => {
            error(`Image Failed to Donload: ${source}`);
            queryEnd(null, null, null);
        });
    }

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
        var image = {
            name: item.name,
            path: path,
            w: 112,
            h: 112
        };

        if (fs.existsSync(path)) {
            queryEnd(slot.slot, item.id, image);
        } else {
            Download.downloadFile(path, imagePath).then((p) =>{
                log(`Image Donloaded: ${p}`);
                queryEnd(slot.slot, item.id, image);
            }).catch(e => {
                error(e);
                queryEnd(slot.slot, item.id, image);
            });
        };
    });
}
