/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { NewsImage, ImageResult } from "./NewsImage";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { NewsData, NewsItem } from "./NewsData";

// export interface BaseBallBuilderParams {
//     teamList: Array<string>;
// }

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
    public async CreateImages(params: any): Promise<boolean>{
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
                this.logger.error("CreateImages: param: count is undefined (using: 10)");
            }

            let count = 10;
            if (params.count < 1 || params.count > 20) {
                this.logger.log(`CreateImage: params.count must be 1-20.  Changing ${params.count} to 10`);
            } else {
                count = params.count;
            }

            const newsData: NewsData = new NewsData(this.logger, this.cache);
            const newsImage: NewsImage = new NewsImage(this.logger);

            const data: Array<NewsItem> | null = await newsData.getData(params.newsSource, params.key);

            if (data === null ) {
                this.logger.error(`CreateImages: could not get data for source ${params.newsSource}`);
                return false;
            }

            if (data.length < count) {
                this.logger.log(`CreateImage: Received ${data.length} articles, expected ${count}`);
                count = data.length;
            }

            for(let i = 0; i < count; i++) {
                if (data[i] !== null && data[i].title !== null) {
                    const item: ImageResult = await newsImage.getImage(data[i]);
                    if (item !== undefined) {
        
                        const filename = `${params.newsSource}-${i+1}.${item.imageType}`;
                        this.logger.info(`Writing: ${filename}`);
                        this.writer.saveFile(filename, item.imageData.data);
                    } else {
                        this.logger.warn(`CreateImages: Unable to render image for: ${params.source}[${i}]`);
                    }
                } else {
                    this.logger.warn(`CreateImages: Unable to get data for ${params.source}: ${i+1}`);
                }
            }
        } catch (e) {
            this.logger.error(`CreateImages: Exception: ${e}`);
            this.logger.error(`CreateImages: Exception: ${e.stack}`);
            return false;
        }
            
        return true;
    }
}
