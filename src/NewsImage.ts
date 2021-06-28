import { doesNotReject } from "assert";

// tslint:disable: no-var-requires
// tslint:disable: object-literal-sort-keys
const fs = require('fs');
const axios = require('axios'); 
const jpeg = require('jpeg-js');
const pure = require('pureimage');
// const pureTextPath = require('pureimage/src/text.js');
// const pureregisterFont = require('pureimage/src/text.js');


export class NewsImage {
    private logger: any;

    constructor(logger: any) {
        this.logger = logger;
    }

    public async getImage(dataItem) {
        const title: string = `${dataItem.title}`
        this.logger.info(`getImage: Title: ${title}`);

        const imageHeight: number = 1080; // 800;
        const imageWidth: number = 1920; // 1280;

        const backgroundColor: string = 'rgb(250, 250, 250)';
        const textColor: string = 'rgb(50, 5, 250)';

        const TitleOffsetX: number = 60;
        const TitleOffsetY: number = 100;

        const DetailOffsetX: number = 60;
        const DetailOffsetY: number = 260;

        const PictureX: number = 350;
        const PictureY: number = 350;
        const PictureWidth: number = 400;
        const PictureHeight: number = 650;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext('2d');

        const fntBold = pure.registerFont('fonts/OpenSans-Bold.ttf','OpenSans-Bold');
        const fntRegular = pure.registerFont('fonts/OpenSans-Regular.ttf','OpenSans-Regular');
        const fntRegular2 = pure.registerFont('fonts/alata-regular.ttf','alata-regular');

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        ctx.fillStyle = backgroundColor; 
        ctx.fillRect(0,0,imageWidth, imageHeight);

        try {
            this.logger.verbose(`PictureUrl: ${dataItem.pictureUrl}`);
            const response:any = await axios.get(dataItem.pictureUrl, {responseType: "stream"} );
            let picture: any;

            if (dataItem.pictureUrl.toUpperCase().endsWith("JPG")) {
                picture = await pure.decodeJPEGFromStream(response.data);
            } else if (dataItem.pictureUrl.toUpperCase().endsWith("PNG")) {
                picture = await pure.decodePNGFromStream(response.data);
            } else {
                this.logger.warn(`Picture returned with unknown type (not jpg or png)`);
                picture = null;
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

        let lineNumber: number = 0;
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

        this.logger.verbose(`Encoding jpeg: ${title}`);

        // Save the bitmap out to a jpeg image buffer
        const jpegImg = await jpeg.encode(img, 50);
        
        // How long is this image good for
        const goodForMins = 60;

        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + goodForMins);

        this.logger.verbose(`getImage: Returning jpeg: ${title}`);

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
