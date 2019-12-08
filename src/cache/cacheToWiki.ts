//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import { log, error } from "../global.js";
import * as fs from "fs";
const wiki = require("nodemw");
const wikiClient = new wiki(`./credentials/wiki.json`);
const conf = JSON.parse(fs.readFileSync(`./credentials/wiki.json`).toString());
const info = `
{{User Content
|creator = Bluntermonk
}}

== Damage Calculation Assumptions ==

'''DISCLAIMER''': This spreadsheet assumes 75% external imperil starting on turn 2. Rotation may differ if you lack the external support.				
				
===== The following assumptions are made for damage calculations: =====		
* No STMRs				
* One materia is left empty except for summoners since they do not benefit from killers				
* 150% base buffs				
* Single element 75% external imperil available starting on turn 2				
* External imbue and chaining available starting on turn 2 (see unit's page for details)				
* Weapon variance introduced in JP will be included				
* 1 DEF/SPR raceless enemy assumed				
* Chaining with a dupe when applicable				
* Builds will be outputted using FFBEequip, with Titan, Shiva and Fenir selected for physical, magic and hybrid DPS.				
* Weapon are enhanced with boosted rares (aka. 20% ATK or MAG for majority of weapon, 40% for guns and bows)				
* Non spark elemental chaining, unless indicated due to special cases (eg. chain breaking)				
* No limited TMRs/equipment except for the unit's own				
* Units are enhanced if available				
* Doorpots included								
				
===== The following assumptions are made for burst comparison: =====			
* If the burst damage is within reason of the highest burst, but there is a significant difference by turn count. The lower burst is used instead for burst comparison.					
* The burst comparison numbers are taken from the damage calculations from a sustained rotation. Therefore, may not completely reflect situation where you are setting up for a pure burst				

===== The following assumptions are made for BIS damage calculations: =====
* All weapons are enhanced in IW with Rare+, ATK/MAG + 15%, and if not capped, another 12%
* Finishers use 100% imperils
* Burst damage comes from the absolute highest output in rotation
`;

////////////////////////////////////////////////////////////

// writeToPage("testing");
function writeToPage(text): Promise<any> {

    return new Promise<any>((resolve, reject) => {

        log("Attempting to Login to Wiki");
        wikiClient.logIn(conf.username, conf.password, (e, r) => {
            if (e != null) {
                reject(e);
                return;
            }

            log("Login Success: ", r);
    
            log("Attempting to edit wiki page");
            wikiClient.edit("Damage Calculations by Furcula", text, "", true, (e, r) => {
                if (e != null) {
                    reject(e);
                    return;
                }
    
                resolve(r);
            });
        });
    });
}

export function UpdateWikiPage(): Promise<any> {
    const calculations = JSON.parse(fs.readFileSync("./data/furculacalculations.json").toString());
    const whaleCalcs = JSON.parse(fs.readFileSync("./data/whalecalculations.json").toString());
    const unitKeys = JSON.parse(fs.readFileSync("./data/unitkeys.json").toString());

    var title = "== Damage Calculations GL ==\n\n";
    var table = "{| class=\"wikitable sortable\"\n|-\n";
    var header = `! Icon !! Unit Name !! Type !! Damage Per Turn !! Burst Damage !! BIS DPT !! BIS Burst !! Build`

    var units = "";
    var jpunits = "";
    var keys = Object.keys(calculations);
    keys.forEach(k => {
        let unit = calculations[k];
        let whaleUnit = whaleCalcs[k];
        let key = k.toLowerCase().replace(/\(.*\)/g, "").trim().replace(/\s/g,"_");

        let img = "N/A";
        let id = unitKeys[key];
        if (id != null) {
            img = `[[File:unit_icon_${id}.png|thumb]]`;
        } else {
            console.log("NO ID: " + key);
        }

        let url = unit.name;
        if (unit.wiki && unit.wiki != "") {
            url = `[${unit.wiki} ${unit.name}]`;
        }

        let burst = "N/A";
        let turn = "N/A";
        if (unit.burst) {
            burst = `${unit.burst}`;
            turn = unit.burstTurn;
        }

        let wdpt = "N/A";
        let wburst = "N/A";
        let wbuild = "N/A";
        let build = `[${unit.url} Normal]`;
        if (whaleUnit && whaleUnit.damage != "" && whaleUnit.url) {
            wdpt = whaleUnit.damage;
            if (whaleUnit.burst) {
                wburst = `${whaleUnit.burst}`;
                wbuild = `[${whaleUnit.url} BIS]`;
            }
        } else {
            // console.log("No Whale Build: " + key);
        }

        /*
        units += "\n|-\n";
        units += `| ${img} || ${url} || ${unit.type} || `;
        units += `\n{| class="wikitable"\n| N: ${unit.damage}\n|-\n| W: ${wdpt}\n|}\n|| `;
        units += `\n{| class="wikitable"\n| N: ${unit.burst}\n|-\n| W: ${wburst}\n|}\n|| `;
        units += `\n{| class="wikitable"\n| N: ${build}\n|-\n| W: ${wbuild}\n|}`;
        */

       if (unit.name.includes("JP")) {
            jpunits += "\n|-\n";
            jpunits += `| ${img} || ${url} || ${unit.type} || ${unit.damage} || ${burst} || ${wdpt} || ${wburst} || `;
            jpunits += `\n{| class="wikitable"\n| ${build}\n|-\n| ${wbuild}\n|}`;
        } else {
            units += "\n|-\n";
            units += `| ${img} || ${url} || ${unit.type} || ${unit.damage} || ${burst} || ${wdpt} || ${wburst} || `;
            units += `\n{| class="wikitable"\n| ${build}\n|-\n| ${wbuild}\n|}`;
        }

    });
    units += "\n|}";
    jpunits += "\n|}";

    var title2 = "== Damage Calculations JP ==\n\n";
    var gl = title + table + header + units + "\n";
    var jp = title2 + table + header + jpunits + "\n";

    var total = info + "\n" + gl + jp;

    fs.writeFileSync(`./data/damagetable.txt`, total);

    return writeToPage(total);
}
