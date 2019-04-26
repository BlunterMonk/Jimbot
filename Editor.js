
const config = require("./config/config.ts");
const String = require("./string/string-extension.ts");

class Editor {
    constructor(guildId, userId) {
        this.userId = userId;
        this.guildId = guildId;
        this.settings;
        this.previousState;
        this.currentState;
        this.data;
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

    next(key) {
        return this.currentState[key];
    }
    prev() {
        return this.previousState;
    }

    addData(data) {
        this.data = JSON.stringify(data).slice(1, -1);
    }

    setInfo(name, title, data) {
        /*if (this.information.aliases[name]) {
            name = this.information.aliases[name];
        }

        this.information[name] = {
            title: title,
            description: data
        } 
        this.saveInformation();
        return true;*/
        return config.setInformation(name, title, data);
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