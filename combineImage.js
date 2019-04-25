const mergeImages = require('./merge-images');
const fs = require("fs");
const https = require("https");
const sizeOf = require('image-size');
const builder = require('./builder/builder.js');
const Canvas = require('canvas')
const canvas = Canvas.createCanvas(600, 600)
const ctx = canvas.getContext('2d')

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

/*
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
*/

var imgDir = "tempimg/";
function buildImage(images, unit) {

    console.log("Unit Image")
    console.log(unit)
    var load = [{
        src: "template3.png",
        x: 0,
        y: 9
    }, 
    {
        src: imgDir + unit.name,
        x: 0,//150 - ((unit.w * 2.5) / 2),
        y: 0,//150 + ((unit.h * 2.5)),
        w: unit.w * 2.5,
        h: unit.h * 2.5
    }];
    var sx = 85;
    var sy = 505;
    var xspace = 390;
    var yspace = 140;
    var y = sy;
    images.forEach((image, index) => {
        console.log(imgDir + image)
        
        load[load.length] = {
            src: imgDir + image,
            x: (sx + (xspace * (index % 2))) - 56,
            y: y - 56,
            w: 112,
            h: 112
        }

        if (index % 2) {
            y = y + yspace;
        }
    });

    mergeImages(load, 
        {
            width: 810,
            height: 1450,
            Canvas: Canvas
        })
    .then(b64 => {
        var fs = require('fs');
        var string = b64;
        var regex = /^data:.+\/(.+);base64,(.*)$/;
        
        var matches = string.match(regex);
        var ext = matches[1];
        var data = matches[2];
        var buffer = new Buffer(data, 'base64');
        fs.writeFileSync('build.' + ext, buffer);
    }).catch(console.error);

}


var dump = fs.readFileSync("testequip.json");
var build = JSON.parse(dump);
/*
dump = fs.readFileSync("../ffbe/units.json");
var unitslist = JSON.parse(dump);
*/

var b = builder.loadStateHashAndBuild(build);
console.log("Unit Build");
console.log(builder.getBuildStatsAsText(b));

dump = fs.readFileSync("../ffbe/equipment.json");
var equipment = JSON.parse(dump);

dump = fs.readFileSync("../ffbe/materia.json");
var materia = JSON.parse(dump);

downloadImages(build.units[0].items, build.units[0].id);

function downloadImages(items, unitId) {

    var imageNames = [];
    var count = items.length + 1;
    var unit = {};
    var queryEnd = function(name) {
        count--;
        if (name) {
            console.log(`Image Donloaded: ${name}`);
            imageNames.push(name);
        }

        if (count <= 0) {
            console.log(`Done downloading images`);
            console.log(imageNames);
            buildImage(imageNames, unit);
        }
    }

    getUnitImage(unitId, (name) => {
        unit.name = name;
        //console.log(`Unit: ${unit}`);

        sizeOf(imgDir + name, function (err, dimensions) {
            unit.w = dimensions.width;
            unit.h = dimensions.height;
            queryEnd();
        });
    });

    items.forEach(item => {
        var id = null;
        if (equipment[item.id]) {
            id = equipment[item.id].icon;
        } else if (materia[item.id]) {
            id = materia[item.id].icon;
        }

        if (id) {
            console.log(`Donloading Image: ${item.id}`);
            console.log(`Item:`);
            console.log(item);
            getItemImage(id, queryEnd);
        } else {
            console.log("Could not find item: " + item);
        }
    });

    equipment = null;
    materia = null;
}

function getUnitImage(id, callback) {
    const url = `https://exvius.gg/static/img/assets/unit/unit_ills_${id}.png`;
    const name = `${id}.png`;

    downloadFile(imgDir + name, url, result => {
        //console.log(result);
        callback(name);
    });
}

function getItemImage(name, callback) {
    const url = `https://exvius.gg/static/img/assets/item/${name}`;

    downloadFile(imgDir + name, url, result => {
        //console.log(result);
        callback(name);
    });
}

function downloadFile(name, link, callback) {

    if (fs.existsSync(name)) {
        callback("success");
        return;
    }
    const file = fs.createWriteStream(name);
    const request = https.get(link, function (response) {
        response.pipe(file);
        callback("success");
    });
}
