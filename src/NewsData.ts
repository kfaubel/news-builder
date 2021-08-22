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

        let newsItems: Array<NewsItem>;
        
        let newsJson: NewsJson;

        const cacheName: string = (key === "test") ? `${source}-test` : source;

        try {
            newsItems = this.cache.get(cacheName) as Array<NewsItem>;
            if (newsItems !== null) {
                this.logger.verbose(`NewsData: found newsItems in the cache: ${cacheName}`);
                return newsItems;
            }
            
            newsItems = [];
            if (key === "test") {
                this.logger.info("NewsData: We are going to use test data");
                const sampleNewsFile = path.join(".", "msnbc-top-headlines.json");
                const sampleBuffer = fs.readFileSync(sampleNewsFile);
                newsJson = JSON.parse(sampleBuffer.toString());
            } else {
                this.logger.verbose(`NewsData: No cache for ${source}.  Fetching new`);
                const response: AxiosResponse = await axios.get(url, {responseType: "json", timeout: 10000});
                this.logger.log(`NewsData: GET for ${source} returned: ${response.statusText}`);
                newsJson = response.data;
            }

            if (newsJson.articles === undefined) {
                this.logger.error(`No articles for source ${source}`);
                return null;
            }
             
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

            const nowMs: number = new Date().getTime() + 60 * 60 * 1000; // one hour from now
            this.logger.log(`NewsData: Saving newsItems for ${cacheName} to the cache`);
            this.cache.set(cacheName, newsItems, nowMs);
            
        } catch (e) {
            this.logger.error(`NewsData: Read article data for source: ${source} - ${e}`);
            return null;
        }

        //this.logger.verbose(`NewsData: newsItems for ${source}: ${JSON.stringify(newsItems, null, 4)}`);
        return newsItems;
    }
}
