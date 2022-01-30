/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import path from "path";
import dateformat from "dateformat";
import * as pure from "pureimage";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";
import { NewsItem } from "./NewsData.js";
import { ImageLibrary, MyImageType } from "./ImageLibrary.js";

export class NewsImage {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private imageLibrary: ImageLibrary;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
        this.imageLibrary = new ImageLibrary(logger, cache);
    }

    /**
     * Optimized fill routine for pureimage
     * - See https://github.com/joshmarinacci/node-pureimage/tree/master/src
     * - To fill a 1920x1080 image on a core i5, this saves about 1.5 seconds
     * @param img it has 3 properties height, width and data
     * @param x X position of the rect
     * @param y Y position of the rect
     * @param w Width of rect
     * @param h Height of rect
     * @param rgb Fill color in "#112233" format
     */
    private myFillRect(img: any, x: number, y: number, w: number, h: number, rgb: string) {
        const colorValue = parseInt(rgb.substring(1), 16);

        // The shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
        const r = (colorValue >>> 16) & 0xFF;
        const g = (colorValue >>> 8)  & 0xFF;  
        const b = (colorValue)        & 0xFF;
        const a = 0xFF;

        for(let i = y; i < y + h; i++) {                
            for(let j = x; j < x + w; j++) {   
                const index = (i * img.width + j) * 4;   
                
                img.data[index + 0] = r;
                img.data[index + 1] = g;     
                img.data[index + 2] = b;     
                img.data[index + 3] = a; 
            }
        }
    }

    /**
     * Builds an image from the details in dataItem
     * @param dataItem object of type NewsItem defined in NewsData.ts
     * @returns A buffer with a coded JPG image or null
     */
    public async getImage(dataItem: NewsItem): Promise<Buffer | null> {
        const title = `${dataItem.title}`;
        this.logger.verbose(`NewsImage:getImage: Title: ${title}`);

        const imageHeight     = 1080; 
        const imageWidth      = 1920; 

        const backgroundColor = "#F0F0F0";
        const textColor       = "rgb(50, 5, 250)";

        const TitleOffsetX    = 60;
        const TitleOffsetY    = 100;
        const TitleSpacingY   = 80; // Offset to additiona lines
        const TitleWidth      = imageWidth - (TitleOffsetX + 100);

        const CreditOffsetX   = 60;
        const CreditOffsetY   = 20; // up from the bottom

        const PictureX        = 350;
        const PictureY        = 350;
        const PictureHeight   = 650;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        const titleFont  = "72pt 'OpenSans-Bold'";
        const mesgFont   = "48pt 'OpenSans-Bold'";
        const creditFont = "32pt 'OpenSans-Bold'";

        // When used as an npm package, fonts need to be installed in the top level of the main project
        const fntBold     = pure.registerFont(path.join(".", "fonts", "OpenSans-Bold.ttf"),"OpenSans-Bold");
        const fntRegular  = pure.registerFont(path.join(".", "fonts", "OpenSans-Regular.ttf"),"OpenSans-Regular");
        const fntRegular2 = pure.registerFont(path.join(".", "fonts", "alata-regular.ttf"),"alata-regular");

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        ctx.fillStyle = backgroundColor; 
        this.myFillRect(img, 0, 0, imageWidth, imageHeight, backgroundColor);

        try {
            let picture: MyImageType | null = null; 

            if (typeof dataItem.pictureUrl === "string" && dataItem.pictureUrl !== "") {
                picture = await this.imageLibrary.getImage(dataItem.pictureUrl, PictureHeight);
            } else {
                this.logger.warn(`getImage: Invalid image URL for ${dataItem.title}`);
                picture = null;
            }

            if (picture !== null) {
                const scaledWidth = (PictureHeight * picture.width) / picture.height;
                ctx.drawImage(picture as jpeg.BufferRet,
                    0, 0, picture.width, picture.height,            // source dimensions
                    PictureX, PictureY, scaledWidth, PictureHeight  // destination dimensions
                );
            } else {
                return null;
            }
        } catch (e: any) {
            this.logger.warn(`NewsImage: Exception: ${e}, Picture: ${dataItem.pictureUrl as string}`); 
            this.logger.error(`Stack: ${e.stack}`);
        }

        // Draw the title
        ctx.fillStyle = textColor; 
        ctx.font = titleFont;

        const titleLines: string[] = this.splitLine(title, ctx, TitleWidth, 3);       

        for (let titleLine = 0; titleLine < titleLines.length; titleLine++) {            
            ctx.fillText(titleLines[titleLine], TitleOffsetX, TitleOffsetY + (titleLine * TitleSpacingY));
        } 
        
        // Draw credits at the bottom
        const published: Date = new Date((dataItem.publishedAt || "").toString());
        const credits = `Source: ${dataItem.source} from newsapi.org, ${dateformat(published, "mmmm dS, yyyy, h:MM TT")}`;
        ctx.fillStyle = textColor; 
        ctx.font = creditFont;
        ctx.fillText(credits, CreditOffsetX, imageHeight - CreditOffsetY);

        // Save the bitmap out to a jpeg image buffer
        const jpegImg: jpeg.BufferRet = jpeg.encode(img, 50);

        return jpegImg.data;
    }

    /**
     * Split a long string into chunks to display on multiple lines
     * @param inStr Input string
     * @param ctx Canvas context used to measure line lenght in pixels
     * @param maxPixelLength Max length of a line in pixels
     * @param maxLines Max lines to return, remainder is discarded
     * @returns A list of strings
     */
    private splitLine(inStr: string, ctx: any, maxPixelLength: number, maxLines: number): Array<string> {
        const list: string[] = [];

        if (maxLines < 1 || maxLines > 10) {
            this.logger.error(`splitLine: maxLines too large (${maxLines})`);
            return list;
        }
        
        while (inStr.length > 0) {
            let breakIndex: number;
            if (ctx.measureText(inStr).width <= maxPixelLength) {
                list.push(inStr);
                return list;
            }

            breakIndex = inStr.length - 1;
            let activeLine = "";
            while (breakIndex > 0) {
                if (inStr.charAt(breakIndex) === " ") {
                    activeLine = inStr.substring(0, breakIndex);
                    if (ctx.measureText(activeLine).width <= maxPixelLength) {
                        break;
                    } 
                }
                breakIndex--;
            } 
            
            list.push(inStr.substring(0, breakIndex));
            inStr = inStr.substring(breakIndex + 1);

            if (list.length >= maxLines)
                break;
        }
        return list;
    }
}