const mergeImages = require('../bin/merge-images/merge-images.js');
const fs = require("fs");
const https = require("https");
const sizeOf = require('image-size');
const Canvas = require('canvas')
const canvas = Canvas.createCanvas(600, 600)
const ctx = canvas.getContext('2d')
const Build = require('../bin/ffbe/build.js');
const downloadFile = require('../bin/string/download.js');

const imageEndpoint = `https://ffbeequip.com/img/`;
const imgDir = "../ffbeequip/static/img/";
const imgCacheDir = "./ffbeequip-wip/icons/";

var buildURL = "https://ffbeequip.com/builder.html?server=GL#cd1db650-d52a-11e9-a314-1b650a2e0160";
processBuild(buildURL);
function processBuild(search) {

    Build.requestBuild(search, (data) => {
        // log(data);
        var b = JSON.parse(data);

        var build = Build.CreateBuild(b);
        var text = build.getText();
        var desc = text.text.replaceAll("\\[", "**[");
        desc = desc.replaceAll("\\]:", "]:**");

        var totalStats = build.getTotalStats();
        // console.log("Total Stats");
        // console.log(totalStats);
        
        var equipped = build.equipment;
        // console.log("Equipment");
        // console.log(equipped);

        downloadImages(build.getSlots(), equipped, build.unitID, (unit, list) => {
            buildImage(unit, list);
        });
    });
}

// Write "Awesome!"
ctx.font = '30px Impact'
ctx.fillStyle = 'rgba(255,255,255,1)'
ctx.strokeStyle = 'rgba(255,255,255,0.5)'
ctx.strokeText('3000', 50, 100)
ctx.fillText('3000', 50, 100)

// Draw line under text
var text = ctx.measureText('AWESOME!')
ctx.beginPath()
ctx.lineTo(50, 102)
ctx.lineTo(50 + text.width, 102)
ctx.stroke()

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
*/

function buildImage(unit, itemImages) {

    // console.log("Unit Image")
    // console.log(unit)
    var load = [{
        src: "./ffbeequip-wip/templatec.png",
        x: 0,
        y: 0
    }, 
    {
        src: unit.path,
        x: 1000 - unit.w,//150 - ((unit.w * 2.5) / 2),
        y: 0,//150 + ((unit.h * 2.5)),
        w: unit.w,
        h: unit.h
    }];

    var labels = [];
    var sx = 0;
    var tx = 100;
    var sy = 10;
    var ty = 265;
    var xspace = 110;
    var yspace = 120;
    var y = sy;
    var y2 = ty;
    for (let index = 0; index < 10; index++) {
        const image = itemImages[index];
        
        if (image) {
            console.log(image)
            labels[labels.length] = {
                text: image.name,
                font: "impact",
                size: 12,
                x: (tx + (xspace * (index % 2))),
                y: y2
            };

            load[load.length] = {
                src: image.path,
                x: (sx + (xspace * (index % 2))),// - (image.w * 0.5),
                y: y,// - (image.h * 0.5),
                w: image.w,
                h: image.h
            }
        }

        if (index % 2) {
            y = y + yspace;
            y2 = y2 + yspace;
        }
    };

    mergeImages.mergeImages(load, 
        {
            width: 1000,
            height: 620,
            Canvas: Canvas,
            text: labels
        })
    .then(b64 => {
        var fs = require('fs');
        var string = b64;
        var regex = /^data:.+\/(.+);base64,(.*)$/;
        
        var matches = string.match(regex);
        var ext = matches[1];
        var data = matches[2];
        var buffer = new Buffer(data, 'base64');
        fs.writeFileSync('./ffbeequip-wip/build.' + ext, buffer);
    }).catch(console.error);
}


function downloadImages(slots, items, unitId, callback) {

    var imageList = {};
    console.log(`initial images`);
    console.log(imageList);

    var unit = {};
    var count = items.length + 1;
    var queryEnd = function(slot, id, image) {
        count--;
        //if (image) {
            console.log(`Image Donloaded: ${id}`);
            imageList[slot] = image;
        //}

        if (count <= 0) {
            console.log(`Done downloading images`);
            console.log(imageList);
            buildImage(unit, imageList);
        }
    }

    var imagePath = imageEndpoint + `units/unit_icon_${unitId}.png`;
    console.log(`Image Path: ${imagePath}`);
    downloadFile.downloadFile(`${imgCacheDir}unit_icon_${unitId}.png`, imagePath, (p) => {
        sizeOf(p, function (err, dimensions) {

            unit = {
                path: imagePath,
                w: 2 * dimensions.width,
                h: 2 * dimensions.height
            };

            queryEnd();
        });
    });

    slots.forEach(slot => {

        console.log(slot)

        var item = null;
        for (let index = 0; index < items.length; index++) {
            const element = items[index];
            if (element.id === slot.id) {
                item = element;
                break;
            }
        }

        var imagePath = imageEndpoint + `items/${item.icon}`;
        console.log(`Image Path: ${imagePath}`);
        downloadFile.downloadFile(`${imgCacheDir}${item.icon}`, imagePath, (p) => {

            sizeOf(p, function (err, dimensions) {
                
                var image = {
                    name: item.name,
                    path: imagePath,
                    w: dimensions.width,
                    h: dimensions.height
                };
                
                queryEnd(slot.slot, item.id, image);
            });
        });
    
        // if (item.id) {
            // console.log(`Item Image: ${item.id}`);
            // console.log(`Item:`);
            // console.log(item);
            // imageNames.push(name);
            //queryEnd(imagePath);
            //getItemImage(item.id, queryEnd);
        // } else {
        //     console.log("Could not find item: " + item);
        // }
    });
}
