//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as fs from "fs";
import * as winston from "winston";

const { combine, timestamp, metadata, json, printf } = winston.format;
const configFile = './config/config.json';
 
export const defaultFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});
export const jsonWithTimestamp = combine(
    timestamp(),
    json()
); 

function printChain(...msg: any[]): string {
    let text = "";
    msg.forEach((t,i) => {
        text += JSON.stringify(t);
    });
    return text;
}

class Logger {
    logger: winston.Logger;
    constructor() {
        let config = JSON.parse(fs.readFileSync(configFile).toString());
        let level = config.loglevel;
    
        this.init(level);
    }

    init(level: string) {
        var options = {
            level: level,
            // format: winston.format.json(),
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
                defaultFormat
            ),
            exitOnError: false,
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log` 
                // - Write all logs error (and below) to `error.log`.
                //
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        defaultFormat
                    )
                }),
                new winston.transports.File({ filename: './log/jimbot.err.log', level: 'error' }),
                new winston.transports.File({ filename: './log/jimbot.out.log' })
            ],
        }

        this.logger = winston.createLogger(options);
    }

    info(...data: any[]) {
        this.logger.info(printChain(data));
    }
    debug(...data: any[]) {
        this.logger.debug(printChain(data));
    }
    silly(...data: any[]) {
        this.logger.silly(printChain(data));
    }
    error(...data: any[]) {
        this.logger.error(printChain(data));
    }
    trace(...data: any[]) {
        this.silly(data);
    }
}

export const logger: Logger = new Logger();
