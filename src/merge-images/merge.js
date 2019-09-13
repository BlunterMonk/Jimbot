(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.mergeImages = factory());
}(this, (function () { 'use strict';

// Defaults
var defaultOptions = {
	format: 'image/png',
	quality: 0.92,
	width: undefined,
	height: undefined,
	Canvas: undefined
};

// Return Promise
var mergeImages = function (sources, options) {
	if ( sources === void 0 ) sources = [];
	if ( options === void 0 ) options = {};

	return new Promise(function (resolve) {
	options = Object.assign({}, defaultOptions, options);

	// Setup browser/Node.js specific variables
	var canvas = options.Canvas ? new options.Canvas.Canvas() : window.document.createElement('canvas');
	var Image = options.Canvas ? options.Canvas.Image : window.Image;
	if (options.Canvas) {
		options.quality *= 100;
	}

	// Load sources
	var images = sources.map(function (source) { return new Promise(function (resolve, reject) {
		// Convert sources to objects
		if (source.constructor.name !== 'Object') {
			source = { src: source };
		}

		// Resolve source and img when loaded
		var img = new Image();
		img.onerror = function () { return reject(new Error('Couldn\'t load image')); };
		img.onload = function () { return resolve(Object.assign({}, source, { img: img })); };
		img.src = source.src;
	}); });

	// Get canvas context
	var ctx = canvas.getContext('2d');

	// When sources have loaded
	resolve(Promise.all(images)
		.then(function (images) {
			// Set canvas dimensions
			var getSize = function (dim) { return options[dim] || Math.max.apply(Math, images.map(function (image) { return image.img[dim]; })); };
			canvas.width = getSize('width');
			canvas.height = getSize('height');

			// Draw images to canvas
			images.forEach(function (image) {
				ctx.globalAlpha = image.opacity ? image.opacity : 1;
				
				if (image.w && image.h)
					return ctx.drawImage(image.img, image.x || 0, image.y || 0, image.w || 0, image.h || 0);
				else 
					return ctx.drawImage(image.img, image.x || 0, image.y || 0);
			});

			// Add text here
			if (options.text) {
				ctx.fillStyle = 'rgba(255,255,255,1)'
				ctx.strokeStyle = 'rgba(255,255,255,0.5)'
				
				options.text.forEach((entry, index) => {
					ctx.font = `${entry.size}px ${entry.font}`;
					ctx.strokeText(entry.text, entry.x, entry.y);
					ctx.fillText(entry.text, entry.x, entry.y);
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
};

return mergeImages;

})));
//# sourceMappingURL=index.umd.js.map