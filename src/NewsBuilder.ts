/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { NewsImage } from "./NewsImage";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { NewsData, NewsItem } from "./NewsData";

export interface Params {
    newsSource: string;
    key: string;
    count: number;
}

export class NewsBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
    }

    // I would prefer to use the interface commented out above but it does not work direclty.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async CreateImages(params: Params): Promise<boolean>{
        try {

            if (params.newsSource === undefined) {
                this.logger.error("CreateImages: param.newsSource is undefined (e.g.: newsSource: \"msnbc\"");
                return false;
            }
            
            if (params.key === undefined) {
                this.logger.error("CreateImages: param.key is undefined (e.g. key: <newsapi key>");
                return false;
            }
            
            if (params.count === undefined) {
                this.logger.log("CreateImages: param: count is undefined (using: 10)");
            }

            let count = 10;
            if (params.count < 1 || params.count > 20) {
                this.logger.log(`CreateImage: params.count must be 1-20.  Changing ${params.count} to 10`);
            } else {
                count = params.count;
            }

            const newsData: NewsData = new NewsData(this.logger, this.cache);
            const newsImage: NewsImage = new NewsImage(this.logger, this.cache);

            const data: Array<NewsItem> | null = await newsData.getData(params.newsSource, params.key);

            if (data === null ) {
                this.logger.warn(`CreateImages: No data for source ${params.newsSource}`);
                return false;
            }

            if (data.length < count) {
                this.logger.log(`CreateImage: Source: ${params.newsSource} Received ${data.length} articles, expected ${count}`);
                count = data.length;
            }

            for(let i = 0; i < count; i++) {
                let imageNumberStr = `00${i+1}`; // 01 .. 10
                imageNumberStr = imageNumberStr.substring(imageNumberStr.length - 2); // take the last 2 digits
                const filename = `${params.newsSource}-${imageNumberStr}.jpg`;
                this.logger.verbose(`NewsBuilder::CreateImages: Requesting: ${filename}`);

                if (data[i] !== null && data[i].title !== null) {                  
                    const item: Buffer | null = await newsImage.getImage(data[i]);
                    if (item !== null) {                        
                        this.logger.info(`NewsBuilder: Writing: ${filename}`);
                        this.writer.saveFile(filename, item);
                    } else {
                        this.logger.warn(`NewsBuilder: No image available for: ${filename}`);
                    }
                } else {
                    this.logger.warn(`NewsBuilder: Image definition not available for: ${filename}`);
                }
                this.logger.verbose("====================================");
            }
        } catch(e) {
            if (e instanceof Error) {
                this.logger.error(`NewsBuilder: Exception: ${e.message}`);
                this.logger.error(`${e.stack}`);
            } else {
                this.logger.error(`NewsBuilder Exception: ${e}`);
            }
            return false;
        }
            
        return true;
    }
}
