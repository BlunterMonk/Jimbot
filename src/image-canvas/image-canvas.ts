//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import * as fs from 'fs';
import { log, error } from "../global.js";
// import * as Canvas from 'canvas';

// const canvas = Canvas.createCanvas(600, 600);
// const ctx: Canvas.CanvasRenderingContext2D = canvas.getContext('2d');
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
interface textLine {
	text: string;
	width: number;
	height: number;
}

////////////////////////////////////////////////////////////

export function trim(ctx, c) {//}: Promise<any> {
}

export function getLines(text, maxWidth, font, splitter: string = " "): textLine[] {
	return null
}

export function measureText(text, font): any {
	return {};
}

// Return Promise
export var mergeImages = function (imgOpts : imageOptions[], labelOpts : labelOptions[], canvasOpts: canvasOptions): Promise<any> {
	return new Promise<any>((resolve, reject) => {
	});	
}
