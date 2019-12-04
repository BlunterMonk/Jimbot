//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as gs from "./config/guild.js";
import * as fs from "fs";
import { Config } from "./config/config.js";
import { getCommandString, getSearchString } from "./commands/commands.js";
import { log, debug, trace, error } from "./global.js";
import { Profiles } from "./config/profiles.js";
import * as Build from "./ffbe/build.js";

////////////////////////////////////////////////////////////

class client {
    discordClient: Discord.Client;
    botMessages: any[];
    guildSettings: any;
    onMessageCallback: any;
    onPrivateMessageCallback: any;
    credentials: any;
    embedColor: any;
    constructor() {
        this.guildSettings = {};
        this.botMessages = [];
    }

    setMessageCallback(callback: any) {
        this.onMessageCallback = callback;
    }
    setPrivateMessageCallback(callback: any) {
        this.onPrivateMessageCallback = callback;
    }

    getAuthorEmbed() {
        return {
            name: this.discordClient.user.username,
            icon_url: this.discordClient.user.avatarURL
        }
    }
    
    init(callback) {
        this.credentials = JSON.parse(String(fs.readFileSync("./discord-cred.json")));

        this.discordClient = new Discord.Client();
        this.discordClient.login(this.credentials.token);

        this.embedColor = 0xffd1dc;

        this.on("message", this.onMessage.bind(this));
        this.on("messageDelete", this.onMessageDelete.bind(this));
        this.on("guildCreate", this.loadGuild.bind(this));
        this.on("guildDelete", this.unloadGuild.bind(this));
        this.on("error", console.error);
        this.on("ready", () => {
            log(`Client Loaded, User: ${this.discordClient.user.username}`);
            this.discordClient.user.setActivity("use '?help' for bot info"); 
            
            this.LoadGuilds();

            callback();
        });
    }

    reload() {
        log("Reloading Guild Settings");
        this.LoadGuilds();
    }

    loadGuild(guild: any) {
        const name = guild.name;
        const guildId = guild.id;
        
        this.guildSettings[guildId] = new gs.GuildSettings(name, guildId);
        //log("Loaded Guild", this.guildSettings[guildId]);
    }
    unloadGuild(guild: any) {
        const guildId = guild.id;
        if (this.guildSettings[guildId]) {
            //log("Unloaded Guild", this.guilds[guildId]);
            delete this.guildSettings[guildId];
        }
    }

    // List servers the bot is connected to
    LoadGuilds() {
        this.discordClient.guilds.forEach(guild => {
            log("Loading Guild: " + guild.name);
            this.loadGuild(guild);
        });
    }

    // Cache any messages sent by the bot so they can be deleted by the user.
    cacheBotMessage(received, sent) {
        this.botMessages[this.botMessages.length] = {
            received: received,
            sent: sent,
            time: new Date()
        };
        //log("Cached Message", botMessages[botMessages.length - 1]);
    }

    // Send message to the destination based on the reqested location
    send(receivedMessage: Discord.Message, msg: any): Promise<Discord.Message> {
        return new Promise<Discord.Message>((resolve, reject) => {

            receivedMessage.channel
            .send(msg)
            .then((message: Discord.Message) => {
                this.cacheBotMessage(receivedMessage.id, message.id);
                resolve(message);
            })
            .catch(e => {
                error(e);
                reject(e);
            });
        });
    }
    sendImage(receivedMessage, filename): Promise<Discord.Message> {
        var Attachment = new Discord.Attachment(filename);
        if (Attachment) {
            return Client.send(receivedMessage, Attachment);
        }
    }
    sendMessage(receivedMessage, embed): Promise<Discord.Message> {
        embed.color = this.embedColor;
        return this.send(receivedMessage, {embed: embed});
    }
    sendMessageWithAuthor(receivedMessage, embed, authorId): Promise<Discord.Message> {
        return new Promise<Discord.Message>((resolve, reject) => {
            this.discordClient.fetchUser(authorId)
            .then(author => {

                embed.color = this.embedColor;
                embed.author = {
                    name: author.username,
                    icon_url: author.avatarURL
                };

                this.send(receivedMessage, {embed: embed}).then(resolve).catch(reject);
            })
            .catch(reason =>{
                error(reason);

                embed.author = {
                    name: `From: ${authorId}`,
                };

                this.send(receivedMessage, {embed: embed}).then(resolve).catch(reject);
            });
        });
    }
    sendPrivate(receivedMessage, msg): Promise<Discord.Message> {
        return new Promise<Discord.Message>((resolve, reject) => {

            receivedMessage.author
            .send(msg)
            .then(message => {
                trace("Message Sent To: ", receivedMessage.author.username, " ID: ", receivedMessage.author.id);
                resolve(message);
            })
            .catch(e => {
                error(e.message);
                reject(e.message);
            });
        });
    }
    sendPrivateMessage(receivedMessage, embed): Promise<Discord.Message> {
        return new Promise<Discord.Message>((resolve, reject) => {
            embed.color = this.embedColor;

            receivedMessage.author
            .send({embed: embed})
            .then(message => {
                this.cacheBotMessage(receivedMessage.id, message.id);
                resolve(message);
            })
            .catch(e => {
                error(e);
                reject(e);
            });
        });
    }
    fetchUser(authorId: string): Promise<Discord.User> {
        return this.discordClient.fetchUser(authorId);
    }

    respondSuccess(receivedMessage, toUser = false) {

        if (toUser) {
            receivedMessage.react("✅");
            return;
        }
    
        const guildId = receivedMessage.guild.id;
        const emojis = receivedMessage.guild.emojis.array();
        const custom = this.getSuccess(guildId);
    
        var customEmoji = emojis.find(e => {
            return e.name === custom;
        });
    
        if (customEmoji) {
            receivedMessage.react(customEmoji);
        } else {
            // If none of the servers custom emojis matches the saved one, then the server is set to use a unicode emoji
            receivedMessage.react(custom);
        }
    }
    respondFailure(receivedMessage, toUser = false) {
    
        if (toUser) {
            receivedMessage.react("❌");
            return;
        }
    
        const guildId = receivedMessage.guild.id;
        const emojis = receivedMessage.guild.emojis.array();
        const custom = this.getFailure(guildId);
    
        var customEmoji = emojis.find(e => {
            return e.name === custom;
        });
    
        if (customEmoji) {
            receivedMessage.react(customEmoji);
        } else {
            // If none of the servers custom emojis matches the saved one, 
            // then the server is set to use a unicode emoji
            receivedMessage.react(custom);
        }
    }
    
    // Register events to the Discord Client
    on(event, callback) {
        this.discordClient.on(event, callback);
    }

    ///////////////////////////////////////////////////////////
    // ON MESSAGE
    // Filter out messages and route them to the apporpriate place.
    // Also validate commands based on server settings and configuration for aliases.
    onMessage(receivedMessage: Discord.Message) {

        // Prevent bot from responding to its own messages
        if (receivedMessage.author == this.discordClient.user) {
            return;
        }

        var contentPrefix : string = receivedMessage.content.charAt(0);
        var oriContent : string = receivedMessage.content.slice(1, receivedMessage.content.length);
        var content : string = receivedMessage.content.toLowerCase().slice(1, receivedMessage.content.length);

        // Send private message results to authorized users
        if (!receivedMessage.guild) {
            if (this.isAuthorized(receivedMessage.author)) {

                if (this.onPrivateMessageCallback)
                    this.onPrivateMessageCallback(receivedMessage, content, receivedMessage.author);
            }
            return;
        }

        // Check to see if the sender 
        const guildId = receivedMessage.guild.id;
        const prefix = this.guildSettings[guildId].getPrefix();
        if (contentPrefix != prefix) {
/*
            if (content.includes("ffbeequip.com") 
                && (this.validate(receivedMessage, "autobuild") || Profiles.getAutoBuild(receivedMessage.author.id))) {
                var URL = receivedMessage.content.match(/(https.*?(\s|$))/g)
                trace("Received URL for Autobuild: ", url);
                if (URL) {
                    var url = URL[0].trim();
                    Build.requestBuildData(url).then(response => {
                        log("Beginning Autobuild: ", URL);
                        this.onMessageCallback(receivedMessage, `buildc ${url}`, receivedMessage.author, receivedMessage.guild);
                    });
                }
                return;
            }*/
            
            return;
        }

        var command = getCommandString(content);

        // Replace shortcuts if requested
        const shortcut = this.getShortcut(guildId, command.toLowerCase());
        if (shortcut) {

            let param = "";
            if (shortcut.parameters) {
                shortcut.parameters.forEach(p => {
                    param += `"${p}"`;
                });
            }

            let s = getSearchString(content, true);
            if (shortcut.search && !shortcut.search.empty()) {
                s = shortcut.search;
            }

            oriContent = `${shortcut.command} ${s} ${param}`;
            log(`Replacing Shortcut with new command, shortcut: `, shortcut, " Content: ", content);
            command = shortcut.command;
        }

        // Validate the user 
        if (!this.validate(receivedMessage, command)) {
            log(`Permission Denied, User: ${receivedMessage.author.id}, Command: ${command}`);
            return;
        }

        // Send results
        log(`Message Received From: ${receivedMessage.guild.name}, ${receivedMessage.author.username}`)
        if (this.onMessageCallback) {
            this.onMessageCallback(receivedMessage, oriContent, receivedMessage.author, receivedMessage.guild);
        }
    }

    // Delete bot generated messages if the user deleted their request
    onMessageDelete(deletedMessage) {
        log(`Message Deleted, Author: ${deletedMessage.author.username}, Server: (${deletedMessage.guild.name}), Content: ${deletedMessage.content}`);
    
        for (var i = 0; i < this.botMessages.length; i++) {
            var msg = this.botMessages[i];
    
            if (msg.received === deletedMessage.id) {
                var sent = deletedMessage.channel
                    .fetchMessage(msg.sent)
                    .then(sent => {
                        if (sent) {
                            log("Deleted Cached Message");
                            sent.delete();
    
                            this.botMessages.splice(i, 1);
                        }
                    })
                    .catch(console.error);
                break;
            }
        }
    }

    // HELPER

    isAuthorized(author): boolean {
        return Config.isIDAuthorized(author.id);
    }


    // GUILD SETTINGS

    setPrefix(guildId: string, prefix: string) {
        if (!this.guildSettings[guildId]) {
            return;
        }
        this.guildSettings[guildId].setPrefix(prefix);
    }
    getPrefix(guildId: string) {
        return this.guildSettings[guildId].getPrefix();
    }
    getSuccess(guildId: string) {
        return this.guildSettings[guildId].getSuccessEmote();
    }
    getFailure(guildId: string) {
        return this.guildSettings[guildId].getFailureEmote();
    }
    getResponse(guildId: string, name: string) {
        return this.guildSettings[guildId].getResponse(name);
    }
    setResponse(guildId: string, name: string, value: string) {
        return this.guildSettings[guildId].setResponse(name, value);
    }
    getShortcut(guildId: string, command: string) {
        var s = this.guildSettings[guildId].getShortcut(command);
        if (s) {
            return s;
        }
        
        return Config.getShortcut(command);
    }
    setShortcut(guildId: string, name: string, command: string) {
        return this.guildSettings[guildId].setShortcut(name, command);
    }
    getSettings(guildId: string, name: string) {
        return this.guildSettings[guildId].getSettings(name);
    }
    validateCommand(guildId: string, userRole: string, command: string) {
        //log(`Config Validate Command (${guildId})` + this.guilds[guildId]);
        if (!this.guildSettings[guildId]) {
            log("Unknown guild, allow");
            return true;
        }
        //log("Validate Command Guild: " + guildId);
        //log(this.guilds[guildId]);
        return this.guildSettings[guildId].validateCommand(userRole, command);
    }
    validateEditor(guildId: string, userId: string) {
        return this.guildSettings[guildId].validateEditor(userId);
    }
    validate(receivedMessage: Discord.Message, command) {
        var roles = receivedMessage.member.roles.array();
        var guildId = receivedMessage.guild.id;
    
        trace("Attempt to validate: " + command);
        for (var i = 0; i < roles.length; i++) {
            if (this.validateCommand(guildId, roles[i].name, command)) {
                trace("Role Validated");
                return true;
            }
        }
    
        return false;
    }

}

export var Client = new client();
