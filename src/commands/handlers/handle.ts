//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as handlers from "./index.js";
import { log, error, debug } from "../../global.js";

export function handleEval(ev: string) {
    try {
        let h = handlers;
        // handlers.handleProfile(null, null, null);
        eval("h." + ev);
    } catch (e) {
        error("Command doesn't exist: ", ev, " error: ", e);
    }
}