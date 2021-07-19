import { doesNotReject } from "assert";

// tslint:disable: no-var-requires
// tslint:disable: object-literal-sort-keys
const fs = require('fs');
const axios = require('axios'); 
const jpeg = require('jpeg-js');
const pure = require('pureimage');

const fontDir = __dirname + "/../fonts";

export class NewsImage {
    private logger: any;

    constructor(logger: any) {
        this.logger = logger;
    }

    public async getImage(dataItem) {
        const title: string = `${dataItem.title}`
        this.logger.verbose(`getImage: Title: ${title}`);

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

        const fntBold = pure.registerFont(fontDir + '/OpenSans-Bold.ttf','OpenSans-Bold');
        const fntRegular = pure.registerFont(fontDir + '/OpenSans-Regular.ttf','OpenSans-Regular');
        const fntRegular2 = pure.registerFont(fontDir + '/alata-regular.ttf','alata-regular');
        
        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        ctx.fillStyle = backgroundColor; 
        ctx.fillRect(0,0,imageWidth, imageHeight);

        try {
            this.logger.verbose(`PictureUrl: ${dataItem.pictureUrl}`);
            const response:any = await axios.get(dataItem.pictureUrl, {responseType: "stream"} );
            let picture: any = null;
            // Get the last filename part of the url (e.g.: "content-00123.jpg")
            const leaf: string = dataItem.pictureUrl.substring(dataItem.pictureUrl.lastIndexOf('/')+1, dataItem.pictureUrl.length) || "";
            let expectedPictureFormat: string = "???";

            if (dataItem.pictureUrl.toUpperCase().endsWith("JPG")) {
                expectedPictureFormat = "jpg";
            } else if (dataItem.pictureUrl.toUpperCase().endsWith("PNG")) {
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

        // Save the bitmap out to a jpeg image buffer
        const jpegImg = await jpeg.encode(img, 50);
        
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
