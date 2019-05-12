//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as request from "request";
import * as fs from "fs";
import * as cheerio from "cheerio";
import * as https from "https";
import * as http from "http";

import { log, logData, checkString, compareStrings, escapeString } from "../global.js";
import "./string/string-extension.js";
import { Client } from "../discord.js";
import {unitSearch, unitSearchWithParameters} from "../ffbe/unit.js";
import {config} from "../config/config.js";
import * as Editor from "../editor/Edit.js";
import * as FFBE from "../ffbe/ffbewiki.js";
import * as Cache from "../cache/cache.js";
import * as constants from "../constants.js";
import * as Commands from "../commands/commands.js";

var mainChannelID;
const pinkHexCode = 0xffd1dc;
const linkFilter = [
    /\|Trial/,
    /\|Event/,
    /\|Quest/,
    /\]\]/,
    /\[\[/,
    /\[\[.*\]\]/,
    /\(/,
    /\)/
];
const okEmoji = "🆗";
const cancelEmoji = "❌";

const wikiEndpoint = "https://exvius.gamepedia.com/";
const ffbegifEndpoint = "http://www.ffbegif.com/";
const exviusdbEndpoint = "https://exvius.gg/gl/units/205000805/animations/";

const renaulteUserID    = "159846139124908032";
const jimooriUserID     = "131139508421918721";
const furculaUserID     = "344500120827723777";
const muspelUserID      = "114545824989446149";

const sprite = (n) => `https://exvius.gg/static/img/assets/unit/unit_ills_${n}.png`;
const aniGL = (n) => `https://exvius.gg/gl/units/${n}/animations/`;
const aniJP = (n) => `https://exvius.gg/jp/units/${n}/animations/`;
const guildId = (msg) => msg.guild.id;
const userId = (msg) => msg.author.id;

var unitDefaultSearch = "tmr|stmr";
// Lookup Tables

const gifAliases = {
    "lb": "limit",
    "limit burst": "limit",
    "victory": "before",
    "win_before": "before",
    "win before": "before"
}
const searchAliases = [
    { reg: /imbue/g, value: "add element" },
    { reg: /break/g, value: "break|reduce def|reduce atk|reduce mag|reduce spr"},
    { reg: /buff/g, value: "increase|increase atk|increase def|increase mag|increase spr"},
    { reg: /debuff/g, value: "debuff|decrease|reduce"},
    { reg: /imperil/g, value: "reduce resistance"},
    { reg: /mit/g, value: "mitigate|reduce damage"},
    { reg: /evoke/g, value: "evoke|evocation"}
]
