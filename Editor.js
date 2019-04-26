
const config = require("./config/config.ts");
const String = require("./string/string-extension.ts");
const infoJson = 'data/information.json';

class Editor {
    constructor(guildId, userId) {
        this.userId = userId;
        this.guildId = guildId;
        this.settings;
        this.isEditing;
        this.previousState;
        this.currentState;
        this.data;
        this.tree = [];
    }

    set(name, value) {
        this.settings[name] = value;
    }
    get(name) {
        return this.settings[name];
    }

    setState(settings) {
        this.previousState = this.currentState;
        this.currentState = settings;
    }
    getState() {
        return this.currentState;
    }
    getStateKey(ind) {
        return Object.keys(this.currentState)[ind];
    }
    getCurrentKey() {
        return this.tree[this.tree.length - 1];
    }
    checkState(key) {
        return this.currentState[key];
    }

    next(key) {
        if (this.currentState[key]) {
            this.tree[this.tree.length] = key;
        }
        return this.currentState[key];
    }
    prev() {
        if (this.currentState[key]) {
            delete this.tree[this.tree.length - 1];
        }
        return this.previousState;
    }

    setIsEditing(value) {
        this.isEditing = value;
    }
    getIsEditing() {
        return this.isEditing;
    }
    
    setData(data) {
        this.data = JSON.stringify(data).slice(1, -1);
    }
    getData() {
        return this.data;
    }

    setInfo(name, title, data) {
        var info = fs.readFileSync(infoJson);
        var information = JSON.parse(info);

        var evaluation = "information[";
        this.tree.forEach((t) => {
            if (!information[t]) {
                console.log(`Error Traversing Tree: ${t}`);
                return;
            }

            evaluation += `${t}]`;
        });

        console.log(`Evaluation: ${evaluation}`);

        /*if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }

        this.information[name] = {
            title: title,
            description: data
        } 
        this.saveInformation();
        return true;
        return config.setInformation(name, title, data);
       */
    }
    getInfo(name) {
        /*if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }

        if (this.information[name]) {
            return this.information[name];
        }
        return null;*/
        return config.getInformation(name);
    }

}

module.exports = Editor;