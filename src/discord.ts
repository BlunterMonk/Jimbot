//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as Discord from "discord.js";
import * as gs from "./config/guild.js";
import { log, logData,
    checkString, compareStrings,
    escapeString } from "./global.js";
import {getCommandString} from "./commands/commands.js";

/**
 *  Events
    "guildCreate"
    "guildDelete"
    "ready"
    "message"
 */
const bot_secret_token = "NTY0NTc5NDgwMzk2NjI3OTg4.XK5wQQ.4UDNKfpdLOYg141a9KDJ3B9dTMg";
const bot_secret_token_test = "NTY1NjkxMzc2NTA3OTQ0OTcy.XK6HUg.GdFWKdG4EwdbQWf7N_r2eAtuxtk";

class client {
    discordClient: Discord.Client;
    botMessages: any[];
    guildSettings: any;
    onMessageCallback: any;
    onPrivateMessageCallback: any;
    authorizedUsers: string[];
    constructor() {
        this.guildSettings = {};
        this.botMessages = [];
        this.authorizedUsers = [
            "159846139124908032", // renaulteUserID
            "131139508421918721", // jimooriUserID
            "344500120827723777"  // furculaUserID
        ];
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
        this.discordClient = new Discord.Client();
        this.discordClient.login(bot_secret_token);

        this.on("message", this.onMessage.bind(this));
        this.on("messageDelete", this.onMessageDelete.bind(this));
        this.on("guildCreate", this.loadGuild.bind(this));
        this.on("guildDelete", this.unloadGuild.bind(this));

        this.on("ready", () => {
            log(`Client Loaded, User: ${this.discordClient.user.username}`);
            
            this.LoadGuilds();

            callback();
        });
    }

    loadGuild(guild: any) {
        const name = guild.name;
        const guildId = guild.id;
        
        this.guildSettings[guildId] = new gs.GuildSettings(name, guildId);
        //console.log("Loaded Guild");
        //console.log(this.guildSettings[guildId]);
    }
    unloadGuild(guild: any) {
        const guildId = guild.id;
        if (this.guildSettings[guildId]) {
            //console.log("Unloaded Guild");
            //console.log(this.guilds[guildId]);
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
        //log("Cached Message");
        //log(botMessages[botMessages.length - 1]);
    }

    // Send message to the destination based on the reqested location
    send(receivedMessage, msg, callback = null) {
        receivedMessage.channel
        .send(msg)
        .then(message => {
            this.cacheBotMessage(receivedMessage.id, message.id);
            if (callback) callback(message);
        })
        .catch(console.error);
    }
    sendImage(receivedMessage, filename, callback = null) {
        var Attachment = new Discord.Attachment(filename);
        if (Attachment) {
            Client.send(receivedMessage, Attachment);
        }
    }
    sendMessage(receivedMessage, embed, callback = null) {
        this.send(receivedMessage, {embed: embed}, callback);
    }
    sendMessageWithAuthor(receivedMessage, embed, authorId, callback = null) {
        this.discordClient.fetchUser(authorId)
        .then(author => {

            embed.author = {
                name: author.username,
                icon_url: author.avatarURL
            };

            receivedMessage.channel
            .send({embed: embed})
            .then(message => {
                this.cacheBotMessage(receivedMessage.id, message.id);
                if (callback) callback(message);
            })
            .catch(console.error);
        });
    }
    sendPrivateMessage(receivedMessage, embed, callback = null) {
        receivedMessage.author
        .send({embed: embed})
        .then(message => {
            this.cacheBotMessage(receivedMessage.id, message.id);
            if (callback) callback(message);
        })
        .catch(console.error);
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

    onMessage(receivedMessage) {

        // Prevent bot from responding to its own messages
        if (receivedMessage.author == this.discordClient.user) {
            return;
        }

        const content = receivedMessage.content;

        // Send private message results to authorized users
        if (!receivedMessage.guild && this.isAuthorized(receivedMessage.author)) {

            if (this.onPrivateMessageCallback)
                this.onPrivateMessageCallback(receivedMessage, content.slice(1, content.length));
            
            return;
        }

        // Check to see if the sender 
        const guildId = receivedMessage.guild.id;
        const prefix = this.guildSettings[guildId].getPrefix();
        if (!content.startsWith(prefix)) {
            //handleReactions(receivedMessage);
            return;
        }

        // Validate the user 
        const command = getCommandString(content.slice(1, content.length));
        if (!this.validate(receivedMessage, command)) {
            log(`Permission Denied, User: ${receivedMessage.author.id}, Command: ${command}`);
            return;
        }

        // Send results
        if (this.onMessageCallback)
            this.onMessageCallback(receivedMessage, content.slice(1, content.length));
    }

    // Delete bot generated messages if the user deleted their request
    onMessageDelete(deletedMessage) {
        log("Message Deleted");
        log(deletedMessage.id);
    
        for (var i = 0; i < this.botMessages.length; i++) {
            var msg = this.botMessages[i];
    
            if (msg.received === deletedMessage.id) {
                var sent = deletedMessage.channel
                    .fetchMessage(msg.sent)
                    .then(sent => {
                        if (sent) {
                            log("Deleted Message");
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
        return this.authorizedUsers.includes(author.id);
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
    getShortcut(guildId: string, command: string) {
        return this.guildSettings[guildId].getShortcut(command);
    }
    setShortcut(guildId: string, name: string, command: string) {
        return this.guildSettings[guildId].setShortcut(name, command);
    }
    getSettings(guildId: string, name: string) {
        return this.guildSettings[guildId].getSettings(name);
    }
    validateCommand(guildId: string, userRole: string, command: string) {
        //console.log(`Config Validate Command (${guildId})` + this.guilds[guildId]);
        if (!this.guildSettings[guildId]) {
            console.log("Unknown guild, allow");
            return true;
        }
        //console.log("Validate Command Guild: " + guildId);
        //console.log(this.guilds[guildId]);
        return this.guildSettings[guildId].validateCommand(userRole, command);
    }
    validateEditor(guildId: string, userId: string) {
        return this.guildSettings[guildId].validateEditor(userId);
    }
    validate(receivedMessage, command) {
        var roles = receivedMessage.member.roles.array();
        var guildId = receivedMessage.channel.guild.id;
    
        log("Attempt to validate: " + command);
        for (var i = 0; i < roles.length; i++) {
            if (this.validateCommand(guildId, roles[i].name, command)) {
                log("Role Validated");
                return true;
            }
        }
    
        return false;
    }

}

export var Client = new client();
