import * as fs from "fs";
import path from "path";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import he from "he";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";

/**
 * This is the type of object we return
 */
export interface NewsItem {
    title?: string;
    description?: string;
    pictureUrl?: string;
    publishedAt?: string;
    source?: string;
}

/**
 * This is the type of the data returned from GET call
 */
interface Article {
    title: string;
    description: string;
    urlToImage: string;
    publishedAt: string;
}

/**
 * Collection of articles from the GET call
 */
interface NewsJson {
    articles: Array<Article>;
}

export class NewsData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    /**
     * Decodes HTML and replaces <b> and <em> tags
     * @param inStr Input string
     * @returns Clean string
     */
    private fixString(inStr: string): string {
        let outStr = he.decode(inStr);
        
        outStr = outStr.replace(/<b>/g, "");
        outStr = outStr.replace(/<\/b>/g, "");
        outStr = outStr.replace(/<em>/g, "");
        outStr = outStr.replace(/<\/em>/g, "");
        
        return outStr;
    }

    public async getData(source: string, key: string): Promise<Array<NewsItem> | null> {
        const url = `https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${key}`; 

        let newsItems: Array<NewsItem>;
        
        let newsJson: NewsJson | null = null;

        const cacheName: string = (key === "test") ? `${source}-test` : source;

        try {
            newsItems = this.cache.get(cacheName) as Array<NewsItem>;
            if (newsItems !== null) {
                return newsItems;
            }
            
            newsItems = [];
            if (key === "test") {
                this.logger.info("NewsData: We are going to use test data");
                const sampleNewsFile = path.join(".", "testdata.json");
                const sampleBuffer = fs.readFileSync(sampleNewsFile);
                newsJson = JSON.parse(sampleBuffer.toString());
            } else {
                this.logger.info(`NewsData: ${source} - Fetching: ${url}`);

                const options: AxiosRequestConfig = {
                    responseType: "json",
                    headers: {                        
                        "Content-Encoding": "gzip"
                    },
                    timeout: 2000
                };

                const startTime = new Date();
                await axios.get(url, options)
                    .then((res: AxiosResponse) => {
                        if (typeof process.env.TRACK_GET_TIMES !== "undefined" ) {
                            this.logger.info(`NewsData: GET TIME: ${new Date().getTime() - startTime.getTime()}ms`);
                        }
                        newsJson = res.data;
                    })
                    .catch((error) => {
                        this.logger.warn(`NewsData: No articles: ${error})`);
                        return null;
                    });
            }
            
            if (newsJson === null) {
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
            }

            const expirationTime: number = new Date().getTime() + 60 * 60 * 1000; // one hour from now
            this.cache.set(cacheName, newsItems, expirationTime);
            
        } catch(e) {
            this.logger.error(`NewsData: Read article data for source: ${source}: Exception: ${e}`);
            return null;
        }

        return newsItems;
    }
}
