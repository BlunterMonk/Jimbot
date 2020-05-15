//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import * as fs from 'fs';
import { log, error } from "../global.js";
import * as Canvas from 'canvas';

const canvas = Canvas.createCanvas(600, 600);
const ctx: Canvas.CanvasRenderingContext2D = canvas.getContext('2d');
const quality = 0.92;
const format = 'image/jpeg';

////////////////////////////////////////////////////////////

// Defaults
var defaultOptions = {
	format: 'image/jpeg',
	quality: 0.92,
	width: undefined,
	height: undefined,
	Canvas: undefined
};

export interface mergeImageOptions {
	width: number;
	height: number;
	Canvas: Canvas.Canvas;
	text: labelOptions[];
}
export interface labelOptions {
	x: number;
	y: number;
	text: string;
	font: string;
	size: number;
	align: string; // "left", "right", "center"
	anchorTop: boolean; // text should position based on the top of the text
	color: string; // RGBA format: 0,0,0,1 
	strokeColor: string; // RGBA format: 0,0,0,1 
	wrap: boolean; // Should text wrap when max width is hit
	maxWidth: number; // Max horizontal length a label will be before wrapping
	splitter?: string; // character used to split text when wrapping
}
export interface imageOptions {
	src: string; // image path
	x: number;
	y: number;
	w: number; // image width
	h: number; // image heigt
}
export interface canvasOptions {
	width?: number;
	height?: number;
}

type CanvasTextAlign = "start" | "end" | "left" | "right" | "center";
interface label {
	text: string;
	font: string; 
	x: number; 
	y: number;
	align: string; // "left", "right", "center"
	fill: string;
	stroke: string;
}
/*
Measurement: {"width":108.046875,
"actualBoundingBoxLeft":0,
"actualBoundingBoxRight":108.046875,
"actualBoundingBoxAscent":17.21484375,
"actualBoundingBoxDescent":3.5625, 
"emHeightAscent":18.48046875, 
"emHeightDescent":5.51953125, 
"alphabeticBaseline":0} 
*/
////////////////////////////////////////////////////////////

export function trim(ctx, c){//}: Promise<any> {
	var copy = ctx;
	var pixels = ctx.getImageData(0, 0, c.width, c.height),
      l = pixels.data.length,
      i,
      bound = {
        top: null,
        left: null,
        right: null,
        bottom: null
      },
      x, y;
  
    for (i = 0; i < l; i += 4) {
      if (pixels.data[i+3] !== 0) {
        x = (i / 4) % c.width;
        y = ~~((i / 4) / c.width);
    
        if (bound.top === null) {
          bound.top = y;
        }
        
        if (bound.left === null) {
          bound.left = x; 
        } else if (x < bound.left) {
          bound.left = x;
        }
        
        if (bound.right === null) {
          bound.right = x; 
        } else if (bound.right < x) {
          bound.right = x;
        }
        
        if (bound.bottom === null) {
          bound.bottom = y;
        } else if (bound.bottom < y) {
          bound.bottom = y;
        }
      }
    }
      
    var trimHeight = bound.bottom - bound.top,
        trimWidth = bound.right - bound.left,
        trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);
    
    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);
    
    // open new window with trimmed image:
    return copy.canvas;
}

interface textLine {
	text: string;
	width: number;
	height: number;
}
export function getLines(text, maxWidth, font, splitter: string = " "): textLine[] {
    var words = text.split(splitter);
    var lines : textLine[] = [];
	var currentLine = words[0];
	var cacheFont = ctx.font;

	if (font) {
		ctx.font = font;
	}

    for (var i = 1; i < words.length; i++) {
		var word = words[i];
		var measure = ctx.measureText(currentLine + splitter + word);
		var width = measure.width;
		
        if (width < maxWidth) {
            currentLine += splitter + word;
        } else {
            lines.push({
				text:currentLine,
				width: measure.width,
				height: measure.emHeightAscent
			});
            currentLine = word;
        }
	}
	
	var measure = ctx.measureText(currentLine + splitter + word);
	lines.push({
		text:currentLine,
		width: measure.width,
		height: measure.emHeightAscent
	});
	
	ctx.font = cacheFont;

    return lines;
}

export function measureText(text, font) {
	var cacheFont = ctx.font;

	if (font) {
		ctx.font = font;
	}

	var size = ctx.measureText(text);
	
	ctx.font = cacheFont;

    return size;
}


// Return Promise
export var mergeImages = function (imgOpts : imageOptions[], labelOpts : labelOptions[], canvasOpts: canvasOptions) {
	if ( !imgOpts || imgOpts === void 0 ) imgOpts = [];
	if ( !labelOpts || labelOpts === void 0 ) labelOpts = [];
	if ( !canvasOpts || canvasOpts === void 0 ) canvasOpts = {};

	return new Promise(function (resolve) {
	canvasOpts = Object.assign({
		Canvas: canvas,
		quality: 100
	}, defaultOptions, canvasOpts);

	// Setup browser/Node.js specific variables
	var Image = Canvas.Image;

	// Load Images
	var images = imgOpts.map(function (source) { 
		return new Promise(function (resolve, reject) {

			// log("Loading Image:");
			// log(source);
			if (!fs.existsSync(source.src))
				resolve(Object.assign({}, source, { img: null }));

			// Resolve source and img when loaded
			var img = new Image();
			img.onerror = function () { return /*reject(new Error*/error('Could not load image: ', source.src); };
			img.onload = function () { return resolve(Object.assign({}, source, { img: img })); };

			img.src = source.src;
		}); 
	});

	// Get canvas context
	// var ctx: Canvas.CanvasRenderingContext2D = canvas.getContext('2d');

	// Add Labels to Image
	var labels : label[] = [];
	labelOpts.forEach(function (entry) { 
		// Convert labelOptions to lebels
		
		let font = `${entry.size}px ${entry.font}`;
		let align = (entry.align && !entry.align.empty()) ? entry.align : "left";
		let color = (entry.color && !entry.color.empty()) ? `rgba(${entry.color})` : 'rgba(255,255,255,1)';
		let stroke = (entry.strokeColor && !entry.strokeColor.empty()) ? `rgba(${entry.strokeColor})` : 'rgba(0,0,0,1)';
		
		let x = entry.x;
		let y = entry.y;
		if (entry.wrap && entry.maxWidth) {
						
			// log("Lines: ", lines.length, " Entry Height: ", lines.length * entry.size);

			var lines = getLines(entry.text, entry.maxWidth, `${entry.size}px ${entry.font}`, (entry.splitter || " "));
			if (entry.anchorTop) {
				y = entry.y + lines[0].height;
				// log("Total Line Height: ", lines[0].height, " New Y: ", y);
			} else {
				y -= ((lines.length - 1) * entry.size) * 0.5;
			}

			for (let ind = 0; ind < lines.length; ind++) {
				const line = lines[ind];
				const space = (ind * entry.size);

				let extra : label = {
					text: line.text,
					font: font, 
					x: x,
					y: y + space,
					align: align,
					fill: color,
					stroke: stroke
				}

				labels.push(extra);
			}
		} else {

			let line : label = {
				text: entry.text,
				font: font, 
				x: x,
				y: y,
				align: align,
				fill: color,
				stroke: stroke
			}

			labels.push(line);
		}
	});

	// When sources have loaded
	resolve(Promise.all(images)
		.then(function (images) {
			// Set canvas dimensions
			var getSize = function (dim) {
				return canvasOpts[dim] || Math.max.apply(Math, images.map(function (image: any) { 
					return image.img[dim]; 
				})); 
			};

			canvas.width = getSize('width');
			canvas.height = getSize('height');

			// Draw images to canvas
			images.forEach(function (image: any) {
				if (!image.img)
					return;

				ctx.globalAlpha = image.opacity ? image.opacity : 1;
				
				if (image.w && image.h)
					return ctx.drawImage(image.img, image.x || 0, image.y || 0, image.w || 0, image.h || 0);
				else 
					return ctx.drawImage(image.img, image.x || 0, image.y || 0);
			});

			// Add text here
			labels.forEach(label => {
				ctx.fillStyle = label.fill;
				ctx.strokeStyle = label.stroke;
				ctx.textAlign = label.align as CanvasTextAlign;
				ctx.font = label.font;

				ctx.strokeText(label.text, label.x, label.y);
				ctx.fillText(label.text, label.x, label.y);
			})

			// Resolve data URI for node-canvas jpeg async
			return new Promise(function (resolve) {
				canvas.toDataURL(format, {
					quality: quality,
					progressive: false
				}, function (err, jpeg) {
					if (err) {
						throw err;
					}
					resolve(jpeg);
				});
			});

			// Resolve all other data URIs sync
			// return canvas.toDataURL(format, quality);
		}));
	});
}
