// tslint:disable: no-var-requires
// tslint:disable: no-console
let axios = require('axios');

const sampleNewsJson = require(`../msnbc-top-headlines.json`);
//const sampleNewsJson = require(`C:/Users/ken_faubel/projects/newsImage/msnbc-top-headlines.json`);

export class NewsData {
    private logger: any;

    constructor(logger: any) {
        this.logger = logger;
    }

    private fixString(inStr) {
        let outStr = inStr;
        outStr = outStr.replace(/&amp;/g, "&");
        outStr = outStr.replace(/<b>/g, "");
        outStr = outStr.replace("</b>", "");    // TODO fix - (/</b>/g, "")
        outStr = outStr.replace(/&#39;/g, "'");

        return outStr;
    }

    // tslint:disable-next-line: member-ordering
    public async getData(source: string, key: string) {
        const url = `https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${key}`;       
        this.logger.info("URL: " + url);

        const newsItems:object[] = [];
        
        let newsJson: any;

        try {
            if (key === "test") {
                newsJson = sampleNewsJson;
            } else {
                const response: any = await axios.get(url, {responseType: "json"} );
                newsJson = response.data;
            }
             
            const articles = newsJson.articles;

            for(let i = 0; i < articles.length; i++) {
                const newsItem: any = {};
                newsItem.title = this.fixString(articles[i].title);
                newsItem.description = this.fixString(articles[i].description);
                newsItem.pictureUrl = articles[i].urlToImage;

                newsItems[i] = newsItem;

                // this.logger.info(`Article: ${0} ${newsItems[0].title}`);
                // this.logger.info(`Article: ${i} ${newsItems[i].title}`);
            }
        } catch (e) {
            this.logger.error("Read article data: " + e);
        }

        return newsItems;
    }
}
