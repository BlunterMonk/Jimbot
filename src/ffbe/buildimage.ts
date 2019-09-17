import * as mergeImages from '../merge-images/merge-images.js';
import * as fs from "fs";
import { log, logData } from "../global.js";
import * as https from "https";
import * as Canvas from 'canvas';
import * as Build from './build.js';
import * as Download from '../string/download.js';
import {FFBE} from './ffbewiki.js';
const sizeOf = require('image-size');

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

function logDataArray(data: any[]) {
    if (data.length == 0) {
        return log("[]");
    }
    log(`[`);
    data.forEach((v,i) => {
        log(`${i}: ${JSON.stringify(v)}`);
    });
    log(`]`);
}


export async function BuildImage(build: any): Promise<string> {
    
    var equipped = build.getEquipment();
    console.log("Equipment:");
    // console.log(equipped);
    logDataArray(equipped);

    return new Promise<string>((resolve, reject) => {
        
        downloadImages(build.getSlots(), equipped, build.loadedUnit.id, (unit, list) => {
            buildImage(unit, list, build, (p) => {
                resolve(p);
            });
        });
    });
}

// // Write "Awesome!"
// ctx.font = '30px Impact'
// ctx.fillStyle = 'rgba(255,255,255,1)'
// ctx.strokeStyle = 'rgba(255,255,255,0.5)'
// ctx.strokeText('3000', 50, 100)
// ctx.fillText('3000', 50, 100)


// Draw line under text
// var text = ctx.measureText('AWESOME!')
// ctx.beginPath()
// ctx.lineTo(50, 102)
// ctx.lineTo(50 + text.width, 102)
// ctx.stroke()

// Draw cat with lime helmet

/*
Canvas.loadImage('tempimg/Unit-Esther-7.png').then((image) => {
    var fs = require('fs');
    var string = canvas.toDataURL();
    var regex = /^data:.+\/(.+);base64,(.*)$/;
    
    var matches = string.match(regex);
    var ext = matches[1];
    var data = matches[2];
    var buffer = new Buffer(data, 'base64');
    fs.writeFileSync('textimage.' + ext, buffer);
}).catch(console.error);

mergeImages([
    { src: 'tempimg/Unit-Esther-7.png', x:  0, y:0 }, 
    { src: 'tempimg/Unit-Sylvie-7.png', x:100, y:0, w: 100, h: 100 }, 
    { src: 'tempimg/Unit-Aiden-5.png' , x:200, y:0 }, 
    { src: 'tempimg/Unit-Xon-6.png'   , x:300, y:0 } ], 
    {
        width: 717,
        height: 1000,
        Canvas: Canvas
    })
.then(b64 => {

    fs.writeFileSync("image.txt", b64);
}).catch(console.error);

frame url
https://exvius.gamepedia.com/skins/Exvius/resources/images/frame-equipment.png?c70d8

TODO:

create esper icons
fix text for % stats
shrink text if it exceeds 2 lines
add purple text for enhancements
mess with ultra compact build sheet, only item names and total stats/resistances
*/

/*

*/

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

function getKillers(killers) {

    console.log("Total Killers");
    console.log(killers);

    var images = [];
    var labels = [];

    var dimensions = 25;
    var xStart = 112;
    var yStart = 84;
    var maxWide = 14; // max amount of icons that can fit horizontally
    var maxTall = 2; // max amount of icons that can fit vertically

    var across = 0;
    var down = 0;
    var values = sortKillersByValue(killers);
    var keys = Object.keys(values);
    keys.forEach((k,i) =>{

        var x = xStart;
        var y = yStart;

        const value = values[k];
        value.forEach((v,j) =>{
            
            // var mod = (across % maxWide);// ((1+i)*(1+j));
            // console.log("Killer Image: " + (1+i) + ", " + (1+j));
            // console.log(`mod: ${mod}`);
            // console.log(`x: ${maxWide % mod}, y: ${maxWide % mod}`);
            x = xStart + (across * dimensions),
            y = yStart + (down * dimensions),
            
            // Item image
            images[images.length] = {
                src: `${imgCacheDir}killers/${v}.png`,
                x: x,
                y: y,
                w: dimensions,
                h: dimensions
            }

            // console.log(images[images.length-1]);

            across++;
            if (across >= maxWide) {
                across = 0;
                down++;
            }    
        });

        labels[labels.length] = { 
            text: `${k}%`,
            font: killersFontFamily, 
            size: 16, 
            x: x + dimensions, 
            y: y + dimensions - 8,
            align: "left",
            strokeColor: killerssStroke
        };
        across += 2;
        if (across >= maxWide) {
            across = 0;
            down++;
        } 
    });

    return {
        images: images,
        labels: labels
    }
}

function getResists(totalStats, list) {
    var keys = Object.keys(list);

    var resist = [];
    for (let index = 0; index < keys.length; index++) {
        resist.push("0");
    }
                              
    if (!totalStats.resist) {
        return resist;
    }
  
    var totalKeys = Object.keys(totalStats.resist)
    totalKeys.forEach((k, i) => {
        const r = totalStats.resist[k];

        if (r) {
            const i = list.indexOf(k)
            if (i < 0)
                return;

            var v = parseInt(resist[i]);

            if (Number.isNaN(v))
                resist[i] = v = 0;

            resist[i] = `${v + r.percent}`;
        }
    });

    // console.log("Resist Values");
    // console.log(resist);
    
    return resist;
}

function getResistances(totalStats) {

    var ailments = getResists(totalStats, Build.ailmentList);
    var elements = getResists(totalStats, Build.elementList);

    // console.log("Ailment Resist Values:");
    // console.log(ailments);
    // console.log("Element Resist Values:");
    // console.log(elements);
    
    var x0 = 62;
    var y0 = 712;
    var y1 = 772;
    var spacing = 61;

    var labels = [];

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
            size: 16, 
            x: x0 + (spacing * index), 
            y: y0,
            align: "center" 
        };
    }

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
            size: 16, 
            x: x0 + (spacing * index), 
            y: y1,
            align: "center",
            color: c
        };
    }

    return labels;
}

const statValues = [
    "hp",  "mp",  "atk", "mag", "def", "spr",
];
function getMainStats(totalStats, totalBonuses, wieldingBonus) {
    var labels = [];

    log("wield")
    log(wieldingBonus);
    // var x0 = 185;
    // var x1 = 270;
    // var x2 = 355;
    // var y0 = 60;
    // var y1 = 126;
    
    let x0 = 230;
    let x1 = 357;
    let x2 = 488;
    let y0 = 38;
    let y1 = 76;
    let y2 = 22;
    let y3 = 58;
    
    var yb1 = 42;
    var yb2 = 104;
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
        // console.log(`Enhance Text: start(${start}), end(${end})`);
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

        // console.log(`Equipment in slot: ${index}`);
        // console.log(equip);
        
        if (equip && image) {
            // console.log(image)
      
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

function buildImage(unit, itemImages, build, callback) {

    var buildTotal = build.getTotalStats();
    var totalStats = buildTotal.stats;
    var totalBonuses = buildTotal.bonuses;

    // console.log("Total Stats");
    // console.log(totalStats);

    // console.log("Unit Image")
    // console.log(unit)
    var labels = [];
    var images = [{
        src: `${imgCacheDir}build-template.png`,
        x: 0,
        y: 0,
        w: canvasWidth,
        h: canvasHeight
    }];
    if (unit && unit.path && unit.path != "") {
        console.log("Unit Image");
        let ui = {
            src: unit.path,
            x: 72 - ((unit.w)),//56 - (unit.w * 0.5),//6,//150 - ((unit.w * 2.5) / 2),
            y: 104 - (unit.h*1.5),//42,//150 + ((unit.h * 2.5)),
            w: unit.w*1.5,
            h: unit.h*1.5
        };
        console.log(ui);
        images[images.length] = ui;
    }

    var esper = build.getEsperId();
    var esperPath = `${imgCacheDir}espers/${esper}.png`;
    console.log(`Esper Path: ${esperPath}`);
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
    labels = labels.concat(getMainStats(totalStats, totalBonuses, wieldingBonus));

    // Add Resistances
    labels = labels.concat(getResistances(totalStats));

    // Add equipment
    var equips = getEquipment(itemImages, build);
    labels = labels.concat(equips.labels);
    images = images.concat(equips.images);

    // Add killers
    if (totalStats.killers) {
        var killers = getKillers(totalStats.killers);
        labels = labels.concat(killers.labels);
        images = images.concat(killers.images);
    }

    mergeImages.mergeImages(images, 
        {
            width: canvasWidth,
            height: canvasHeight,
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

        var saveLocation = `./tempbuilds/${build.buildID}.png`;
        fs.writeFileSync(saveLocation, buffer);

        console.log(`Build Saved: ${saveLocation}`);
        callback(saveLocation);
    }).catch((e) =>{
        console.error(e);
        console.log("Failed to make image");
    });
}

function downloadImages(slots, items, unitId, callback) {

    var imageList = {};
    // console.log(`initial images`);
    // console.log(imageList);

    var unit = null;
    var count = items.length + 1;
    var queryEnd = function(slot, id, image) {
        count--;
        
        imageList[slot] = image;

        if (count <= 0) {
            // console.log(`Done downloading images`);
            // console.log(imageList);

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
    console.log(`Image Path: ${path}`);
    /*if (!fs.existsSync(path)) {//
        var resizeIcon = function(p2) {
            Canvas.loadImage(p2).then((image) => {

                // canvas.width = canvasWidth;
                // canvas.height = canvasHeight;
                ctx.drawImage(image, 0, 0);
    
                var trimmed =  mergeImages.trim(ctx, image);
    
                var fs = require('fs');
                var string = trimmed.toDataURL();
                // console.log(string);
                var regex = /^data:.+\/(.+);base64,(.*)$/;
                
                var matches = string.match(regex);
                var ext = matches[1];
                var data = matches[2];
                var buffer = Buffer.alloc(data.length, data, 'base64');
        
                fs.writeFileSync(path, buffer);
            
                foundUnit(path);
            }).catch((e) => {
                console.error(e);
                console.log(`Failed to load image: ${p2}`);
            });
        }

        let p2 = `${imgCacheDir}units-uncropped/${filename}`;
        if (!fs.existsSync(p2)) {
            FFBE.queryWikiForUnitIcon(unitId, (o) => {
                if (o) {
                    Download.downloadFile(p2, o, (r) => {
                        resizeIcon(r);
                    });
                } else {
                    queryEnd(null, null, null);
                }
            });
        } else {
            resizeIcon(p2);
        }
    } else {*/
        foundUnit(path);
    //}


    slots.forEach(slot => {

        // console.log(slot)

        var item = null;
        for (let index = 0; index < items.length; index++) {
            const element = items[index];
            if (element.id === slot.id) {
                item = element;
                break;
            }
        }
        
        var filename = `items/${item.icon}`;
        var imagePath = imageEndpoint + filename;
        var path = `${imgCacheDir}${filename}`;
        var image = {
            name: item.name,
            path: path,
            w: 112,
            h: 112
        };

        // console.log(`Image Path: ${imagePath}`);
        if (fs.existsSync(path)) {
            queryEnd(slot.slot, item.id, image);
        } else {
            Download.downloadFile(path, imagePath, (p) =>{
            // console.log(`Image Donloaded: ${id}`);
                queryEnd(slot.slot, item.id, image);
            });
        };
    });
}

/* long names
diamond enlightenment key
aldore special ops sword
Black Fox Shapeshifter Mask
The Lord of the Underworld
Shield of the Chosen King
Two-Headed Dragon's Harp
Castle Exdeath - Illusion Perception
tactician magician's wand
ayaka's crimson umbrella
The Divine Art of War
Explosive Spear - Blast Off
*/