import * as fs from 'fs'; //= require('fs');
//import fs = require('fs');
import path from 'path';
import { fileURLToPath, URL } from 'url';
import { Logger } from "./Logger.js";
import { NewsData, NewsItem } from './NewsData.js';
import { NewsImage, ImageResult } from './NewsImage.js';

// Use meow v9 for now.  V10 does not work without project level changes to handle "importMeta import.meta"
import meow = require('meow');

const logger = new Logger("news-builder", "info");

//const __dirname = path.dirname(new URL(import.meta.url).pathname);

const cli = meow(`
Usage:
    $ newsImage --source source-name --count count-number --debug  target-dir

Options:
    --source, -s     - newsource (e.g.: msnbc)
    --key, -k        - newsapi.com key
    --count, -c      - count (default 10)
    --debug, -d      - enables debug output

Examples:
  node app.js --debug C:/Users/user1/images/newsImage
`, {
//    importMeta: import.meta, // needed for meow v10, expect to battle dragons
    flags: {
        count: {
            type: 'number',
            default: 10,       
            alias: 'c'         
        },
        source: {
            type: 'string',
            alias: 's',
            default: "msnbc",
            isRequired: true
        },
        key: {
            type: 'string',
            alias: 'k',
            default: "test",
            isRequired: true
        },
        debug: {
            alias: 'd',
            default: false
        },
    },
});

async function main() {
    if (cli.flags.debug) {
        logger.setLevel("verbose");    
    }

    logger.verbose(JSON.stringify(cli, null, 4));

    // Get the current directory (old __dirname)
    //const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
    const dirname = __dirname;

    if(!fs.existsSync(dirname)) {
        logger.info(`Could not determine __dirname ${dirname}`);
        logger.error(`Exiting with errors: 98`)
        return (98);
    }

    const imageDir = path.join(dirname, "..", cli.input[0]);
    // ?? imageDir = path.join(dirname, "..", cli.input[0]).replace(/\\/g, '/').replace("/C:", "");
    
    logger.verbose('====================================');
    logger.verbose(`Source: ${cli.flags.source}`);
    logger.verbose(`Key: ${cli.flags.key}`);
    logger.verbose(`Count: ${cli.flags.count}`);
    logger.verbose(`Target: ${cli.input[0]}`);
    logger.verbose(`Out dir: ${imageDir}`);
    logger.verbose('====================================');

    // const exitStatus = await update(imageDir, cli.flags.source, cli.flags.key, cli.flags.count, __dirname);
    try {
        fs.mkdirSync(imageDir, { recursive: true });
    } catch (e) {
        logger.error(`Failure to create output directory ${imageDir} - ${e}`);
        return (99);
    }

    const newsData  = new NewsData(logger, dirname);
    const newsImage = new NewsImage(logger, dirname);

    const data: Array<NewsItem> = await newsData.getData(cli.flags.source, cli.flags.key);

    let exitStatus = 0;

    for(let i = 0; i < data.length; i++) {
        if (data[i] !== null && data[i].title !== null) {
            const item: ImageResult = await newsImage.getImage(data[i]);

            const filename = `${imageDir}/${cli.flags.source}-${i+1}.${item.imageType}`;
            logger.info(`Writing: ${filename}`);
            fs.writeFileSync(filename, item.imageData.data); 
        } else {
            logger.error(`Unable to get image: ${i+1}`);
            exitStatus++;
        }
    }

    if (exitStatus === 0) {
        logger.verbose("Done successfully.");
    } else {
        logger.error(`Exiting with errors: ${exitStatus}`)
    }
    process.exit(exitStatus);
}

main();