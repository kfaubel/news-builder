"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const meow = require("meow");
const Logger_1 = require("./Logger");
const logger = new Logger_1.Logger("news-builder test");
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
    flags: {
        count: {
            type: 'number',
            default: 10,
            alias: 'c' // TODO: figure out why -c does nto work
        },
        source: {
            type: 'string',
            alias: 's',
            isRequired: true
        },
        key: {
            type: 'string',
            alias: 'k',
            isRequired: true
        },
        debug: {
            alias: 'd',
            default: false
        },
    },
});
const NewsData_1 = require("./NewsData");
const NewsImage_1 = require("./NewsImage");
// Create a new express application instance
async function update(imageDir, source, key, count) {
    logger.info(`NewsImage:update source=${source} count=${count}`);
    try {
        logger.info(`Creating directory: ${imageDir}`);
        fs.mkdirSync(imageDir, { recursive: true });
    }
    catch (e) {
        logger.error(`Failure to create directory ${imageDir} - ${e}`);
        process.exit(1);
    }
    const newsData = new NewsData_1.NewsData(logger);
    const newsImage = new NewsImage_1.NewsImage(logger);
    const data = await newsData.getData(source, key);
    let exitStatus = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== null && data[i].imageData !== null) {
            const item = await newsImage.getImage(data[i]);
            let filename = `${imageDir}/${source}-${i + 1}.${item.imageType}`;
            logger.info(`Writing: ${filename}`);
            fs.writeFileSync(filename, item.imageData.data);
        }
        else {
            logger.error(`Unable to get image: ${i + 1}`);
            exitStatus++;
        }
    }
    return exitStatus;
}
async function main() {
    let imageDir = ".";
    if (cli.input[0] !== undefined) {
        imageDir = cli.input[0];
    }
    logger.verbose(`Working Directory: ${imageDir}`);
    logger.verbose('====================================');
    logger.verbose(`Source: ${cli.flags.source}`);
    logger.verbose(`Key: ${cli.flags.key}`);
    logger.verbose(`Count: ${cli.flags.count}`);
    logger.verbose(`Target: ${cli.input[0]}`);
    const exitStatus = await update(imageDir, cli.flags.source, cli.flags.key, cli.flags.count);
    if (exitStatus === 0) {
        logger.verbose("Done successfully.");
    }
    else {
        logger.error(`Exiting with errors: ${exitStatus}`);
    }
    process.exit(exitStatus);
}
main();
//# sourceMappingURL=test.js.map