"use strict";
//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
require("../string/string-extension.js");
var fs_1 = require("fs");
// TODO: move editor functions from jimbot.js to editor.js
var Editor = /** @class */ (function () {
    function Editor(guildId, userId, fileHandle) {
        this.isAdding = false;
        this.userId = userId;
        this.guildId = guildId;
        this.isEditing = false;
        this.previousState = null;
        if (fileHandle) {
            console.log("Loading: " + fileHandle);
            var info = fs_1.readFileSync(fileHandle);
            this.currentState = JSON.parse(String(info));
            console.log(this.currentState);
            this.file = fileHandle;
        }
        else {
            this.currentState = null;
            this.file = null;
        }
        this.data = {};
        this.tree = [];
    }
    Editor.prototype.setState = function (settings) {
        this.previousState = this.currentState;
        this.currentState = settings;
    };
    Editor.prototype.getState = function () {
        return this.currentState;
    };
    Editor.prototype.getStateKey = function (ind) {
        return Object.keys(this.currentState)[ind];
    };
    Editor.prototype.getStateKeys = function () {
        return Object.keys(this.currentState);
    };
    Editor.prototype.getStateType = function () {
        return typeof this.currentState;
    };
    Editor.prototype.getCurrentKey = function () {
        return this.tree[this.tree.length - 1];
    };
    Editor.prototype.checkState = function (key) {
        return this.currentState[key];
    };
    Editor.prototype.isStateEditable = function () {
        return this.getStateType() == "string";
    };
    Editor.prototype.next = function (key) {
        if (this.currentState[key]) {
            this.tree[this.tree.length] = key;
            this.setState(this.currentState[key]);
            if (typeof this.currentState != "string") {
                this.objectKey = key;
            }
            return this.currentState;
        }
        return null;
    };
    Editor.prototype.prev = function (key) {
        if (this.currentState[key]) {
            delete this.tree[this.tree.length - 1];
            console.log("New Tree");
            console.log(this.tree);
        }
        if (this.previousState) {
            this.currentState = this.previousState;
            this.previousState = null;
            return this.currentState;
        }
        return this.previousState;
    };
    Editor.prototype.setIsEditing = function (value) {
        this.isEditing = value;
        this.isAdding = !value;
    };
    Editor.prototype.getIsEditing = function () {
        return this.isEditing;
    };
    Editor.prototype.setIsAdding = function (value) {
        this.isAdding = value;
        this.isEditing = !value;
    };
    Editor.prototype.getIsAdding = function () {
        return this.isAdding;
    };
    Editor.prototype.setEditKey = function (key) {
        this.editKey = key;
    };
    Editor.prototype.getEditKey = function () {
        return this.editKey;
    };
    Editor.prototype.setData = function (data, key) {
        if (!key) {
            this.data = JSON.stringify(data).slice(1, -1);
            return;
        }
        this.data[key] = JSON.stringify(data).slice(1, -1);
    };
    Editor.prototype.getData = function (key) {
        if (!key)
            return this.data;
        return this.data[key];
    };
    Editor.prototype.getEditedObjectKey = function () {
        return this.objectKey;
    };
    Editor.prototype.load = function (file) {
        this.isEditing = false;
        this.previousState = null;
        var info = fs_1.readFileSync(file);
        this.currentState = JSON.parse(String(info));
        this.file = file;
    };
    Editor.prototype.save = function () {
        var _this = this;
        console.log("Saving Information");
        var info = fs_1.readFileSync(this.file);
        var information = JSON.parse(String(info));
        console.log("Info Loaded");
        var returnEval = null;
        try {
            var evaluation = "information";
            this.tree.forEach(function (t) {
                /*
                if (!information[t]) {
                    console.log(`Error Traversing Tree: ${t}`);
                    return;
                }*/
                console.log("Tree: " + t);
                evaluation += "[\"" + t + "\"]";
                if (t == _this.getEditedObjectKey()) {
                    console.log("Found Object Key");
                    returnEval = evaluation;
                    console.log(returnEval);
                }
            });
            evaluation += "= this.data";
            console.log("Evaluation: " + evaluation);
            eval(evaluation);
        }
        catch (e) {
            console.log(e);
            console.log("Editor - Could not save new information");
            return false;
        }
        console.log("Edited Information");
        console.log(information);
        var newData = JSON.stringify(information, null, "\t");
        fs_1.writeFileSync(this.file, newData);
        if (returnEval)
            eval(returnEval);
        return true;
    };
    return Editor;
}());
module.exports = Editor;
