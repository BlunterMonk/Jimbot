//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import "../util/string-extension.js";
import { readFileSync, writeFileSync } from "fs";
import { log } from "../global.js";

////////////////////////////////////////////////////////////

// TODO: move editor functions from jimbot.js to editor.js

export class Editor {
    guildId: any;
    userId: any;
    isEditing: boolean;
    isAdding: boolean = false;
    previousState: any;
    currentState: any;
    file: any;
    data: any;
    tree: any[];
    objectKey: any;
    editKey: any;

    constructor(guildId: any, userId: any, fileHandle: any) {
        this.userId = userId;
        this.guildId = guildId;

        this.isEditing = false;
        this.previousState = null;
        
        if (fileHandle) {
            log("Loading: " + fileHandle);
            var info = readFileSync(fileHandle);
            this.currentState = JSON.parse(String(info));
            log(this.currentState);
            this.file = fileHandle;
        } else {
            this.currentState = null;
            this.file = null;
        }
        
        this.data = {};
        this.tree = [];
    }


    setState(settings: any) {
        this.previousState = this.currentState;
        this.currentState = settings;
    }
    getState() {
        return this.currentState;
    }
    getStateKey(ind: number) {
        return Object.keys(this.currentState)[ind];
    }
    getStateKeys() {
        return Object.keys(this.currentState);
    }
    getStateType() {
        return typeof this.currentState;
    }
    getCurrentKey() {
        return this.tree[this.tree.length - 1];
    }
    checkState(key: string) {
        return this.currentState[key];
    }
    isStateEditable() {
        return this.getStateType() == "string";
    }

    next(key: string) {
        if (this.currentState[key]) {
            this.tree[this.tree.length] = key;
            this.setState(this.currentState[key]);
            
            if (typeof this.currentState != "string") {
                this.objectKey = key;
            }

            return this.currentState;
        }
        return null;
    }
    prev(key: string) {
        if (this.currentState[key]) {
            delete this.tree[this.tree.length - 1];
            log("New Tree");
            log(this.tree);
        }
        if (this.previousState) {
            this.currentState = this.previousState;
            this.previousState = null;
            return this.currentState;
        }
        return this.previousState;
    }

    setIsEditing(value: boolean) {
        this.isEditing = value;
        this.isAdding = !value;
    }
    getIsEditing() {
        return this.isEditing;
    }
    
    setIsAdding(value: boolean) {
        this.isAdding = value;
        this.isEditing = !value;
    }
    getIsAdding() {
        return this.isAdding;
    }
    
    setEditKey(key: string) {
        this.editKey = key;
    }
    getEditKey() {
        return this.editKey;
    }

    setData(data: any, key: any) {
        //log(`Editor Set Data Raw: `);
        //log(data);
        //log(`Editor Set Data Stringified: `);
        //log(JSON.stringify(data).slice(1, -1));
        if (!key) {
            this.data = data;//JSON.stringify(data).slice(1, -1);
            return;
        }
        this.data[key] = data;//JSON.stringify(data).slice(1, -1);
        //log(`Editor Set Data Final: `);
        //log(this.data);
    }
    getData(key: any) {
        if (!key) return this.data;
        return this.data[key];
    }

    getEditedObjectKey() {
        return this.objectKey;
    }

    load(file: any) {
        this.isEditing = false;
        this.previousState = null;
        
        var info = readFileSync(file);
        this.currentState = JSON.parse(String(info));
        this.file = file;
    }
    save() {
        log("Saving Information");

        var info = readFileSync(this.file);
        var information = JSON.parse(String(info));
        //log("Info Loaded");

        var returnEval = null;
        try {
            var evaluation = "information";
            this.tree.forEach((t) => {
                /*
                if (!information[t]) {
                    log(`Error Traversing Tree: ${t}`);
                    return;
                }*/

                log(`Tree: ${t}`);
                evaluation += `["${t}"]`;
                if (t == this.getEditedObjectKey()) {
                    //log("Found Object Key");
                    returnEval = evaluation;
                    //log(returnEval);
                }
            });
            evaluation += "= this.data";
            //log(`Evaluation: ${evaluation}`);
            eval(evaluation);
        } catch(e) {
            log(e);
            log("Editor - Could not save new information");
            return false;
        }

        //log("Edited Information");
        //log(information);

        var newData = JSON.stringify(information, null, "\t");
        writeFileSync(this.file, newData);
        if (returnEval) eval(returnEval);
        return true;
    }

}
