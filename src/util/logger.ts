//////////////////////////////////////////
// Author: Dahmitri Stephenson
// Discord: Jimoori#2006
// Jimbot: Discord Bot
//////////////////////////////////////////

import * as winston from "winston";

const { combine, timestamp, metadata, json, printf } = winston.format;
 
export const defaultFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});
export const jsonWithTimestamp = combine(
    timestamp(),
    json()
); 

var options = {
    level: "debug",
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

export const logger = winston.createLogger(options);