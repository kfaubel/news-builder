import * as fs from "fs";
import path from "path";
import axios from "axios";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";

export interface NewsItem {
    title?: string;
    description?: string;
    pictureUrl?: string;
    publishedAt?: string;
    source?: string;
}

interface Article {
    title: string;
    description: string;
    urlToImage: string;
    publishedAt: string;
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
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    private fixString(inStr: string): string {
        let outStr = inStr;
        outStr = outStr.replace(/&amp;/g, "&");
        outStr = outStr.replace(/<b>/g, "");
        outStr = outStr.replace("</b>", "");    // TODO fix - (/</b>/g, "")
        outStr = outStr.replace(/&#39;/g, "'");

        return outStr;
    }

    public async getData(source: string, key: string): Promise<Array<NewsItem> | null> {
        const url = `https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${key}`;       
        this.logger.verbose("NewsData: URL: " + url);

        const newsItems: Array<NewsItem> = [];
        
        let newsJson: NewsJson;

        try {
            if (key === "test") {
                const sampleNewsFile = path.join(".", "msnbc-top-headlines.json");
                const sampleBuffer = fs.readFileSync(sampleNewsFile);
                newsJson = JSON.parse(sampleBuffer.toString());
            } else {
                newsJson = this.cache.get(source) as NewsJson;
                if (newsJson === null) {
                    this.logger.log(`NewsData: No cache for ${source}.  Fetching new`);
                    const response: AxiosResponse = await axios.get(url, {responseType: "json"});
                    newsJson = response.data;

                    if (newsJson !== null) {
                        const nowMs: number = new Date().getTime() + 60 * 60 * 1000; // one our from now
                        this.logger.log(`NewsData: Saving newsJson for ${source} to the cache`);
                        this.cache.set(source, newsJson, nowMs);
                    }
                } else {
                    this.logger.log(`NewsData: Using cached newsJson for ${source}`);
                }
            }

            //this.logger.verbose(`NewsData: Json from ${source}: ${JSON.stringify(newsJson, null, 4)}`);
             
            const articles: Array<Article> = newsJson.articles;

            for(let i = 0; i < articles.length; i++) {
                const newsItem: NewsItem = {};
                newsItem.title = this.fixString(articles[i].title);
                newsItem.description = this.fixString(articles[i].description);
                newsItem.pictureUrl = articles[i].urlToImage;
                newsItem.publishedAt = articles[i].publishedAt;
                newsItem.source = source;

                newsItems[i] = newsItem;

                // this.logger.info(`Article: ${0} ${newsItems[0].title}`);
                // this.logger.info(`Article: ${i} ${newsItems[i].title}`);
            }
        } catch (e) {
            this.logger.error(`NewsData: Read article data for source: ${source} - ${e}`);
            return null;
        }

        this.logger.verbose(`NewsData: newsItems for ${source}: ${JSON.stringify(newsItems, null, 4)}`);
        return newsItems;
    }
}
