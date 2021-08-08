/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from "axios"; 
import jpeg from "jpeg-js";
import path from "path";
import dateformat from "dateformat";
import * as pure from "pureimage";
import { Stream } from "stream";
import { LoggerInterface } from "./Logger.js";
import { NewsItem } from "./NewsData.js";

export interface ImageResult {
    expires: string;
    imageType: string;
    imageData: jpeg.BufferRet;
}

interface AxiosResponse {
    data: Stream;
    status: number;
    statusText: string;
}

export class NewsImage {
    private logger: LoggerInterface;

    constructor(logger: LoggerInterface) {
        this.logger = logger;
    }

    public async getImage(dataItem: NewsItem): Promise<ImageResult> {
        const title = `${dataItem.title}`;
        this.logger.verbose(`getImage: Title: ${title}`);

        const imageHeight = 1080; 
        const imageWidth = 1920; 

        const backgroundColor = "rgb(250, 250, 250)";
        const textColor = "rgb(50, 5, 250)";

        const TitleOffsetX = 60;
        const TitleOffsetY = 100;
        const TitleSpacingY = 80; // Offset to additiona lines

        const CreditOffsetX = 60;
        const CreditOffsetY = 20; // up from the bottom

        const DetailOffsetX = 60;
        const DetailOffsetY = 260;

        const PictureX = 350;
        const PictureY = 350;
        const PictureWidth = 400;
        const PictureHeight = 650;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        const titleFont =  "72pt 'OpenSans-Bold'";
        const creditFont = "24pt 'OpenSans-Bold'";

        // When used as an npm package, fonts need to be installed in the top level of the main project
        const fntBold     = pure.registerFont(path.join(".", "fonts", "OpenSans-Bold.ttf"),"OpenSans-Bold");
        const fntRegular  = pure.registerFont(path.join(".", "fonts", "OpenSans-Regular.ttf"),"OpenSans-Regular");
        const fntRegular2 = pure.registerFont(path.join(".", "fonts", "alata-regular.ttf"),"alata-regular");

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        ctx.fillStyle = backgroundColor; 
        ctx.fillRect(0,0,imageWidth, imageHeight);

        try {
            const pictureUrl = (dataItem.pictureUrl as string);
            //this.logger.verbose(`NewsImage: PictureUrl: ${pictureUrl}`);
            const response: AxiosResponse = await axios.get(pictureUrl, {responseType: "stream"} );
            let picture: jpeg.BufferRet | null = null;
            // Get the last filename part of the url (e.g.: "content-00123.jpg")
            
            const leaf: string = pictureUrl.substring(pictureUrl.lastIndexOf("/")+1, pictureUrl.length) || "";
            let expectedPictureFormat = "???";

            if (pictureUrl.toUpperCase().endsWith("JPG")) {
                expectedPictureFormat = "jpg";
            } else if (pictureUrl.toUpperCase().endsWith("PNG")) {
                expectedPictureFormat = "png";
            } else {
                expectedPictureFormat = leaf.substring(leaf.lastIndexOf(".")+1, leaf.length) || "???";
            }

            try {
                picture = await pure.decodeJPEGFromStream(response.data);
                if (expectedPictureFormat !== "jpg") {
                    this.logger.verbose(`NewsImage: ${dataItem.pictureUrl} was a jpg, expected: ${expectedPictureFormat}`);
                }
            } catch (e) {
                // guess not
                if (expectedPictureFormat === "jpg") {
                    this.logger.warn(`NewsImage: ${dataItem.pictureUrl} was not a jpg as expectd`);
                } 
            }

            if (picture === null) {
                try {
                    picture = await pure.decodePNGFromStream(response.data);
                    if (expectedPictureFormat !== "png") {
                        //this.logger.warn(`NewsImage: ${dataItem.pictureUrl} was a png, expected: ${expectedPictureFormat}`);
                    }
                } catch (e) {
                    // guess not.  This is more common that I expected
                    if (expectedPictureFormat === "png") {
                        this.logger.verbose(`NewsImage: ${dataItem.pictureUrl} was not a png as expectd`);
                    } 
                }
            }

            if (picture === null) {
                this.logger.warn(`NewsImage: Picture" ${leaf} was not a jpg or png, likely a "webp"`);
            }

            if (picture !== null) {
                const scaledWidth = (PictureHeight * picture.width) / picture.height;
                ctx.drawImage(picture,
                    0, 0, picture.width, picture.height,             // source dimensions
                    PictureX, PictureY, scaledWidth, PictureHeight  // destination dimensions
                );
            }
        } catch (e) {
            this.logger.warn("NewsImage: Failed to read picture: " + e);
            this.logger.warn("Stack: " + e.stack);
        }

        // Draw the title
        ctx.fillStyle = textColor; 
        ctx.font = titleFont;

        const titleLines: string[] = this.splitLine(title, 48, 2);       

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
        
        // How long is this image good for
        const goodForMins = 60;

        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + goodForMins);

        return {
            expires: expires.toUTCString(),
            imageType: "jpg",
            imageData: jpegImg
        };
    }

    private splitLine(inStr: string, maxLineLength: number, maxLines: number) {
        const list: string[] = [];

        if (maxLines < 1 || maxLines > 10) {
            this.logger.error(`NewsImage: splitLine: maxLines too large (${maxLines})`);
            return list;
        }

        while (inStr.length > 0) {
            let breakIndex: number;
            if (inStr.length <= maxLineLength) {
                list.push(inStr);
                return list;
            }

            breakIndex = maxLineLength - 1;
            while (breakIndex > 0 && (inStr.charAt(breakIndex) !== " ")) {
                breakIndex--;
            }

            list.push(inStr.substring(0, breakIndex));
            inStr = inStr.substring(breakIndex + 1);
        }
        return list;
    }
}
