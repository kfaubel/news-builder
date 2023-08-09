/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from "./Logger.js";
import { Kache } from "./Kache";
import { SimpleImageWriter } from "./SimpleImageWriter.js";
import { NewsBuilder } from "./NewsBuilder.js";
import dotenv from "dotenv";
import { Command } from "commander"; // https://www.npmjs.com/package/commander

async function main() {
    
    dotenv.config();  // Load var from .env into the environment
    
    const program = new Command();

    program 
        .option("-l, --loglevel <level>", "set the log level (error, warn, info, debug, verbose)", "info")
        .option("-o, --outdir <outdir>", "Output directory", "outdir")
        .option("-s, --source <source>", "News source ('google-news')")
        .option("-k, --key <key>", "default, uses KEY env variable", "default")
        .option("-c, --count <count>", "number or screens", "10");
    
    program.parse();
    const options = program.opts();

    const logLevel = options.loglevel.toLowerCase();
    const source = options.source;
    let key = options.key;
    const count = options.count;
    const outdir = options.outdir;

    const logLevels = ["error", "warn", "info", "debug", "verbose"];
    if (!logLevels.includes(logLevel)) {
        console.log(`Unknown log level: ${options.loglevel}`);
        return false;
    } 

    const logger = new Logger("news-builder", logLevel);
    
    // "command": "node app.js --debug --source google-news --count 10 --key default --outdir outdir1",

    logger.verbose("====================================");
    logger.verbose(`Source: ${source}`);
    logger.verbose(`Key: ${key}`);
    logger.verbose(`Count: ${count}`);
    logger.verbose(`Out dir: ${outdir}`);
    logger.verbose("====================================");
    
    const cache: Kache = new Kache(logger, "news-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, outdir);
    const newsBuilder: NewsBuilder = new NewsBuilder(logger, cache, simpleImageWriter);

    if (key === "default") {
        if (typeof process.env.KEY !== "undefined") {
            key = process.env.KEY;
        } else {
            logger.error("news-builder: KEY environment variable is not defined");
        }
    }

    if (typeof key !== "string" || key === "") {
        logger.error("news-builder: key is not defined");
        return 1;        
    }

    const params: any = {
        newsSource: source,
        key: key,
        count: count
    };

    const result: boolean = await newsBuilder.CreateImages(params);
    
    process.exit(result ? 0 : 1);
}

main();