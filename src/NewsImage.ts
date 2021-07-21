/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'; 
import jpeg from 'jpeg-js';
import { Stream } from 'stream';
import { Logger } from './Logger';
import { NewsItem } from './NewsData';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pure = require('pureimage');

const fontDir = __dirname + "/../fonts";

export interface ImageResult {
    expires: string;
    imageType: string;
    imageData: jpeg.BufferRet;
    stream: null
}

interface AxiosResponse {
    data: Stream;
    status: number;
    statusText: string;
}

export class NewsImage {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    public async getImage(dataItem: NewsItem): Promise<ImageResult> {
        const title = `${dataItem.title}`
        this.logger.verbose(`getImage: Title: ${title}`);

        const imageHeight = 1080; // 800;
        const imageWidth = 1920; // 1280;

        const backgroundColor = 'rgb(250, 250, 250)';
        const textColor = 'rgb(50, 5, 250)';

        const TitleOffsetX = 60;
        const TitleOffsetY = 100;

        const DetailOffsetX = 60;
        const DetailOffsetY = 260;

        const PictureX = 350;
        const PictureY = 350;
        const PictureWidth = 400;
        const PictureHeight = 650;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext('2d');

        const fntBold = pure.registerFont(fontDir + '/OpenSans-Bold.ttf','OpenSans-Bold');
        const fntRegular = pure.registerFont(fontDir + '/OpenSans-Regular.ttf','OpenSans-Regular');
        const fntRegular2 = pure.registerFont(fontDir + '/alata-regular.ttf','alata-regular');
        
        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        ctx.fillStyle = backgroundColor; 
        ctx.fillRect(0,0,imageWidth, imageHeight);

        try {
            const pictureUrl = (dataItem.pictureUrl as string);
            this.logger.verbose(`PictureUrl: ${pictureUrl}`);
            const response: AxiosResponse = await axios.get(pictureUrl, {responseType: "stream"} );
            let picture: ImageData | null = null;
            // Get the last filename part of the url (e.g.: "content-00123.jpg")
            
            const leaf: string = pictureUrl.substring(pictureUrl.lastIndexOf('/')+1, pictureUrl.length) || "";
            let expectedPictureFormat = "???";

            if (pictureUrl.toUpperCase().endsWith("JPG")) {
                expectedPictureFormat = "jpg";
            } else if (pictureUrl.toUpperCase().endsWith("PNG")) {
                expectedPictureFormat = "png";
            } else {
                expectedPictureFormat = leaf.substring(leaf.lastIndexOf('.')+1, leaf.length) || "???";
            }

            try {
                picture = await pure.decodeJPEGFromStream(response.data);
                if (expectedPictureFormat !== "jpg") {
                    //this.logger.warn(`NewsImage: ${dataItem.pictureUrl} was a jpg, expected: ${expectedPictureFormat}`);
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
                    // guess not
                    if (expectedPictureFormat === "png") {
                        this.logger.warn(`NewsImage: ${dataItem.pictureUrl} was not a png as expectd`);
                    } 
                }
            }

            if (picture === null) {
                this.logger.warn(`Picture" ${leaf} was not a jpg or png, likely a "webp"`);
            }

            if (picture !== null) {
                const scaledWidth = (PictureHeight * picture.width) / picture.height;
                ctx.drawImage(picture,
                    0, 0, picture.width, picture.height,             // source dimensions
                    PictureX, PictureY, scaledWidth, PictureHeight  // destination dimensions
                );
            }
        } catch (e) {
            this.logger.warn("Failed to read picture: " + e);
            this.logger.warn("Stack: " + e.stack);
        }

        // Draw the title
        const titleLines: string[] = this.splitLine(title, 48, 2);       

        let lineNumber = 0;
        for (const titleLine of Object.keys(titleLines)) {
            ctx.fillStyle = textColor; 
            ctx.font = "72pt 'OpenSans-Bold'";
            ctx.fillText(titleLines[titleLine], TitleOffsetX, TitleOffsetY + (lineNumber++ * 80));
        }

        // lineNumber = 0;
        // const descriptionLines: string[] = this.splitLine(dataItem.description, 75, 3);

        // for (const descriptionLine of Object.keys(descriptionLines)) {
        //     ctx.fillStyle = textColor; 
        //     ctx.font = "48pt 'alata-regular'";
        //     ctx.fillText(descriptionLines[descriptionLine], DetailOffsetX, DetailOffsetY + (lineNumber++ * 80));            
        // }

        // Save the bitmap out to a jpeg image buffer
        const jpegImg: jpeg.BufferRet = jpeg.encode(img, 50);
        
        // How long is this image good for
        const goodForMins = 60;

        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + goodForMins);

        return {
            expires: expires.toUTCString(),
            imageType: "jpg",
            imageData: jpegImg,
            stream: null
        }
    }

    private splitLine(inStr: string, maxLineLength: number, maxLines: number) {
        const list: string[] = [];

        if (maxLines < 1 || maxLines > 10) {
            this.logger.error(`splitLine: maxLines too large (${maxLines})`)
            return list;
        }

        while (inStr.length > 0) {
            let breakIndex: number;
            if (inStr.length <= maxLineLength) {
                list.push(inStr);
                return list;
            }

            breakIndex = maxLineLength - 1;
            while (breakIndex > 0 && (inStr.charAt(breakIndex) !== ' ')) {
                breakIndex--;
            }

            list.push(inStr.substring(0, breakIndex));
            inStr = inStr.substring(breakIndex + 1);
        }
        return list;
    }
}
