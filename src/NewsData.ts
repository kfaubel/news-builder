//const axios = require('axios');
import axios from 'axios';
import { Logger } from './Logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sampleNewsJson = require(__dirname + "/../msnbc-top-headlines.json");

export interface NewsItem {
    title?: string;
    description?: string;
    pictureUrl?: string;
}

interface Article {
    title: string;
    description: string;
    urlToImage: string;
}

interface NewsJson {
    articles: Array<Article>;
}

interface AxiosResponse {
    data: NewsJson;
    status: number;
    statusText: string;
}

export class NewsData {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    private fixString(inStr: string): string {
        let outStr = inStr;
        outStr = outStr.replace(/&amp;/g, "&");
        outStr = outStr.replace(/<b>/g, "");
        outStr = outStr.replace("</b>", "");    // TODO fix - (/</b>/g, "")
        outStr = outStr.replace(/&#39;/g, "'");

        return outStr;
    }

    public async getData(source: string, key: string): Promise<Array<NewsItem>> {
        const url = `https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${key}`;       
        this.logger.verbose("URL: " + url);

        const newsItems: Array<NewsItem> = [];
        
        let newsJson: NewsJson;

        try {
            if (key === "test") {
                newsJson = sampleNewsJson;
            } else {
                const response: AxiosResponse = await axios.get(url, {responseType: "json"});
                newsJson = response.data;
            }

            this.logger.verbose(`NewsJson: ${JSON.stringify(newsJson, null, 4)}`);
             
            const articles: Array<Article> = newsJson.articles;

            for(let i = 0; i < articles.length; i++) {
                const newsItem: NewsItem = {};
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
