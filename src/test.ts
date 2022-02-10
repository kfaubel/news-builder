/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from "./Logger.js";
import { Kache } from "./Kache";
import { SimpleImageWriter } from "./SimpleImageWriter.js";
import { NewsBuilder } from "./NewsBuilder.js";
import dotenv from "dotenv";

// Use meow v9 for now.  V10 does not work without project level changes to handle "importMeta import.meta"
import meow = require("meow");

const cli: any = meow(`
Usage:
    $ newsImage --source source-name --count count-number --debug  target-dir

Options:
    --source, -s     - newsource (e.g.: google-news)
    --key, -k        - newsapi.com key (default uses env KEY value, test uses test data)
    --count, -c      - count (default 10)
    --debug, -d      - enables debug output

Examples:
  node app.js --debug C:/Users/user1/images/newsImage
`,  
{
    flags: {
        count: {
            type: "number",
            default: 10,       
            alias: "c"         
        },
        source: {
            type: "string",
            alias: "s",
            default: "google-news",
            isRequired: true
        },
        key: {
            type: "string",
            alias: "k",
            default: "default, uses KEY env variable",
            isRequired: true
        },
        debug: {
            type: "boolean",
            alias: "d",
            default: false
        },
    }
});

async function main() {
    const logger = new Logger("news-builder", cli.flags.debug ? "verbose" : "info");
    dotenv.config();  // Load var from .env into the environment

    logger.verbose("====================================");
    logger.verbose(`Source: ${cli.flags.source}`);
    logger.verbose(`Key: ${cli.flags.key}`);
    logger.verbose(`Count: ${cli.flags.count}`);
    logger.verbose(`Out dir: ${cli.input[0]}`);
    logger.verbose("====================================");
    
    const cache: Kache = new Kache(logger, "news-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, cli.input[0]);
    const newsBuilder: NewsBuilder = new NewsBuilder(logger, cache, simpleImageWriter);

    let key: string = cli.flags.key;

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
        newsSource: cli.flags.source,
        key: key,
        count: cli.flags.count
    };

    const result: boolean = await newsBuilder.CreateImages(params);
    
    process.exit(result ? 0 : 1);
}

main();