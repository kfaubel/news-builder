"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsData = void 0;
// tslint:disable: no-var-requires
// tslint:disable: no-console
let axios = require('axios');
const sampleNewsJson = require(__dirname + "/../msnbc-top-headlines.json");
//const sampleNewsJson = require(`C:/Users/ken_faubel/projects/newsImage/msnbc-top-headlines.json`);
class NewsData {
    constructor(logger) {
        this.logger = logger;
    }
    fixString(inStr) {
        let outStr = inStr;
        outStr = outStr.replace(/&amp;/g, "&");
        outStr = outStr.replace(/<b>/g, "");
        outStr = outStr.replace("</b>", ""); // TODO fix - (/</b>/g, "")
        outStr = outStr.replace(/&#39;/g, "'");
        return outStr;
    }
    // tslint:disable-next-line: member-ordering
    async getData(source, key) {
        const url = `https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${key}`;
        this.logger.verbose("URL: " + url);
        const newsItems = [];
        let newsJson;
        try {
            if (key === "test") {
                newsJson = sampleNewsJson;
            }
            else {
                const response = await axios.get(url, { responseType: "json" });
                newsJson = response.data;
            }
            const articles = newsJson.articles;
            for (let i = 0; i < articles.length; i++) {
                const newsItem = {};
                newsItem.title = this.fixString(articles[i].title);
                newsItem.description = this.fixString(articles[i].description);
                newsItem.pictureUrl = articles[i].urlToImage;
                newsItems[i] = newsItem;
                // this.logger.info(`Article: ${0} ${newsItems[0].title}`);
                // this.logger.info(`Article: ${i} ${newsItems[i].title}`);
            }
        }
        catch (e) {
            this.logger.error("Read article data: " + e);
        }
        return newsItems;
    }
}
exports.NewsData = NewsData;
//# sourceMappingURL=NewsData.js.map