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

/**
 * NewsData pulls data from newsapi.org
 * 
 * The source list is availabl here: https://newsapi.org/v1/sources
 * 
 * Sample data url: https://newsapi.org/v1/articles?source=ars-technica&sortBy=top&apiKey=<key>
 */
export class NewsData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    /**
     * getData - get the JSON list of articles from the specified source
     * @param source - Source name (e.g.: cnn, msnbc, etc)
     * @param key - API key from newsapi.org or 'test' to use canned data
     * @returns an Array of NewsItem objects or null
     */
    public async getData(source: string, key: string): Promise<Array<NewsItem> | null> {
        const url = `https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${key}`; 

        let newsItems: Array<NewsItem>;       // This is what we will return        
        let newsJson: NewsJson | null = null; // This is the data we get from the API

        const cacheName: string = (key === "test") ? `${source}-test` : source;

        try {
            newsItems = this.cache.get(cacheName) as Array<NewsItem>;
            if (newsItems !== null) {
                return newsItems;
            }
            
            newsItems = [];
            if (key === "test") {
                this.logger.info("NewsData: We are going to use test data");
                newsJson = await this.readTestData();
            } else {
                this.logger.verbose(`NewsData: ${source} - Fetching: ${url}`);                
                newsJson = await this.fetchLiveData(url);
            }
            
            if (newsJson === null) {
                this.logger.error(`NewsData: No data found for source: ${source}`);
                return null;
            }

            if (newsJson.articles === null) {
                this.logger.error(`NewsData: No articles found for source: ${source}`);
                return null;
            }

            const articles: Array<Article> = newsJson.articles;

            for(let i = 0; i < articles.length; i++) {
                const newsItem: NewsItem = {};
                newsItem.title = (articles[i].title === null) ? "" : this.fixString(articles[i].title);
                newsItem.description = (articles[i].description === null) ? "" : this.fixString(articles[i].description);
                newsItem.pictureUrl = (articles[i].urlToImage === null) ? "" : articles[i].urlToImage;
                newsItem.publishedAt = (articles[i].publishedAt === null) ? "" : articles[i].publishedAt;
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

    /**
     * readTestData - return the canned data to prevent extra calls to the API
     * @returns Promise<newsJson>
     */
    private async readTestData(): Promise<NewsJson> {
        const sampleNewsFile = path.join(".", "testdata.json");
        const sampleBuffer = fs.readFileSync(sampleNewsFile);
        const newsJson: NewsJson = JSON.parse(sampleBuffer.toString());
        return newsJson;
    }

    /**
     * fetchLiveData - fetch the data from the API specified in the URL
     * @param url 
     * @returns Promise<newsJson>
     */
    private async fetchLiveData(url: string): Promise<NewsJson> {
        const options: AxiosRequestConfig = {
            responseType: "json",
            headers: {
                "Content-Encoding": "gzip"
            },
            timeout: 10000
        };

        const startTime = new Date();
        try {
            const response: AxiosResponse = await axios.get(url, options);
            if (typeof process.env.TRACK_GET_TIMES !== "undefined") {
                this.logger.info(`NewsData: GET TIME: ${new Date().getTime() - startTime.getTime()}ms`);
            }
            const newsJson: NewsJson = response.data;
            return newsJson;
        } catch (error) {
            this.logger.error(`NewsData: Failed to fetch data from API - ${error}`);
            throw error;
        }
    }

    /**
     * Decodes HTML and replaces 'b' and 'em' tags
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
}
