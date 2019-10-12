//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as fs from 'fs';
import { log, error } from "../global.js";

////////////////////////////////////////////////////////////

// Defaults
var defaultOptions = {
	format: 'image/png',
	quality: 0.92,
	width: undefined,
	height: undefined,
	Canvas: undefined
};

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

export function getLines(ctx, text, maxWidth, font = null) {
    var words = text.split(" ");
    var lines = [];
	var currentLine = words[0];
	var cacheFont = ctx.font;

	if (font) {
		ctx.font = font;
	}

    for (var i = 1; i < words.length; i++) {
        var word = words[i];
        var width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
	}
	
	lines.push(currentLine);
	
	ctx.font = cacheFont;

    return lines;
}

export function measureText(ctx, text, font) {
	var cacheFont = ctx.font;

	if (font) {
		ctx.font = font;
	}

	var size = ctx.measureText(text);
	
	ctx.font = cacheFont;

    return size;
}

// Return Promise
export var mergeImages = function (sources, options) {
	if ( sources === void 0 ) sources = [];
	if ( options === void 0 ) options = {};

	return new Promise(function (resolve) {
	options = Object.assign({}, defaultOptions, options);

	// Setup browser/Node.js specific variables
	var canvas = options.Canvas ? new options.Canvas.Canvas() : window.document.createElement('canvas');
	var Image = options.Canvas ? options.Canvas.Image : window["Image"];
	if (options.Canvas) {
		options.quality *= 100;
	}

	// Load sources
	var images = sources.map(function (source) { 
		return new Promise(function (resolve, reject) {
			// Convert sources to objects
			// log("Loading Image:");
			// log(source);
			if (source.constructor.name !== 'Object') {
				source = { src: source };
			}
			if (!fs.existsSync(source.src))
				resolve(Object.assign({}, source, { img: null }));

			// Resolve source and img when loaded
			var img = new Image();
			img.onerror = function () { return /*reject(new Error*/error('Couldn\'t load image: ', source.src); };
			img.onload = function () { return resolve(Object.assign({}, source, { img: img })); };

			img.src = source.src;
		}); 
	});

	// Get canvas context
	var ctx = canvas.getContext('2d');

	// When sources have loaded
	resolve(Promise.all(images)
		.then(function (images) {
			// Set canvas dimensions
			var getSize = function (dim) {
				return options[dim] || Math.max.apply(Math, images.map(function (image: any) { 
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
			if (options.text) {
				ctx.fillStyle = 'rgba(255,255,255,1)'
				ctx.strokeStyle = 'rgba(0,0,0,0.5)'//'rgba(125,125,125,1)'
				
				options.text.forEach((entry, index) => {
					ctx.font = `${entry.size}px ${entry.font}`;
					                    
                    var align = "left";
                    if (entry.align)
                        align = entry.align;
                    
					ctx.textAlign = align;

					if (entry.color) {
						ctx.fillStyle = `rgba(${entry.color})`;
					} else {
						ctx.fillStyle = 'rgba(255,255,255,1)'
					} 

					if (entry.strokeColor) {
						ctx.strokeStyle = `rgba(${entry.color})`;
					} else {
						ctx.strokeStyle = 'rgba(0,0,0,1)'
					} 
					
					if (entry.wrap && entry.maxWidth) {
						            
						var lines = getLines(ctx, entry.text, entry.maxWidth, `${entry.size}px ${entry.font}`);
						for (let ind = 0; ind < lines.length; ind++) {
							const line = lines[ind];
							const space = (ind * entry.size);

							ctx.strokeText(line, entry.x, entry.y + space, entry.maxWidth);
							ctx.fillText(line, entry.x, entry.y + space, entry.maxWidth);
						}
					} else {
						ctx.strokeText(entry.text, entry.x, entry.y);
						ctx.fillText(entry.text, entry.x, entry.y);
					}
				});
			}

			if (options.Canvas && options.format === 'image/jpeg') {
				// Resolve data URI for node-canvas jpeg async
				return new Promise(function (resolve) {
					canvas.toDataURL(options.format, {
						quality: options.quality,
						progressive: false
					}, function (err, jpeg) {
						if (err) {
							throw err;
						}
						resolve(jpeg);
					});
				});
			}

			// Resolve all other data URIs sync
			return canvas.toDataURL(options.format, options.quality);
		}));
	});
}
