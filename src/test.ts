/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from "./Logger.js";
import { Kache } from "./Kache";
import { SimpleImageWriter } from "./SimpleImageWriter.js";
import { NewsBuilder } from "./NewsBuilder.js";

// Use meow v9 for now.  V10 does not work without project level changes to handle "importMeta import.meta"
import meow = require("meow");

const cli: any = meow(`
Usage:
    $ newsImage --source source-name --count count-number --debug  target-dir

Options:
    --source, -s     - newsource (e.g.: msnbc)
    --key, -k        - newsapi.com key
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
            default: "msnbc",
            isRequired: true
        },
        key: {
            type: "string",
            alias: "k",
            default: "test",
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

    logger.verbose("====================================");
    logger.verbose(`Source: ${cli.flags.source}`);
    logger.verbose(`Key: ${cli.flags.key}`);
    logger.verbose(`Count: ${cli.flags.count}`);
    logger.verbose(`Out dir: ${cli.input[0]}`);
    logger.verbose("====================================");
    
    const cache: Kache = new Kache(logger, "news-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, cli.input[0]);
    const newsBuilder: NewsBuilder = new NewsBuilder(logger, cache, simpleImageWriter);

    const params: any = {
        newsSource: cli.flags.source,
        key: cli.flags.key,
        count: cli.flags.count
    };

    const result: boolean = await newsBuilder.CreateImages(params);
    
    process.exit(result ? 0 : 1);
}

main();