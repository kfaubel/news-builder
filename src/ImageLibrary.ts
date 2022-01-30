import axios, { AxiosResponse } from "axios";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";
import * as pure from "pureimage";
import { PNG } from "pngjs";
import JPG from "jpeg-js";

/**
 * @interface - Type with a width, height and data buffer
 */
export interface MyImageType {
    width: number;
    height: number;
    data: Buffer;
}

export class ImageLibrary {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    /**
     * Method to load a image from cache or fetch the URL when needed.  
     * - The image header is used to determine type
     * - HTTP ContentType header is ignored
     * - JPG and PNG are supported, GIF and WEBP are not
     * - Image is scaled proportionally to specified height
     * @param imageUrl 
     * @param scaledHeight Height to scale the iamge
     * @returns Image of type MyImageType (width, height & data) or null
     */
    public async getImage(imageUrl: string, scaledHeight: number): Promise<MyImageType | null> {
        let image: MyImageType | null = null;
        let imageBuffer: Buffer | null = null;
        let contentType = "";

        try {
            const base64ImageStr: string = this.cache.get(imageUrl) as string;

            if (base64ImageStr !== null) {   
                const imageData = Buffer.from(base64ImageStr, "base64"); 
                const image = JPG.decode(imageData);
                const bitmap = pure.make(image.width, image.height);
                bitmap.data = image.data;
                return bitmap;
            } 
                
            this.logger.verbose("No cached image, fetching new");  

            await axios.get(imageUrl,  {responseType: "arraybuffer"})
                .then(async (response: AxiosResponse) => {
                    contentType = response.headers["content-type"];
                    imageBuffer = Buffer.from(response.data, "binary");
                })
                .catch((error) => {
                    if (typeof error?.response?.status !== "undefined") {
                        this.logger.error(`ImageLibrary: GET failed. Status: ${error.response.status}`);
                    } else {
                        this.logger.error(`ImageLibrary: GET failed. Error: ${error}`);
                    }
                    imageBuffer = null;
                });

            if (imageBuffer === null) {
                return null;
            }

            if (imageBuffer[0] == 0x89 && imageBuffer[1] == 0x50) {
                this.logger.verbose(`Response: ${contentType}, Image reports: PNG`);
                image = PNG.sync.read(imageBuffer);
            } else if (imageBuffer[0] == 0xFF && imageBuffer[1] == 0xD8) {
                this.logger.verbose(`Response: ${contentType}, Image reports: JPG`);
                image = JPG.decode(imageBuffer, {maxMemoryUsageInMB: 800});
            } else if (imageBuffer[8] == 0x57 && imageBuffer[9] == 0x45) {
                this.logger.warn(`Response: ${contentType}, Image reports: WEBP - Unsupported`);
                this.logger.warn(`WEBP: ${imageUrl}`);
                image = null;
            } else {
                this.logger.warn(`Response: ${contentType}, Image reports: ??? - Unsupported`);
                this.logger.warn(`UNKNOWN: ${imageUrl}`);
                image = null;
            }
            
        } catch (err) {
            this.logger.error(`ImageLibrary: getImage raised exception: ${err}`);
        }   
        
        if (image === null) {
            return null;
        }

        const bitmap = pure.make(image.width, image.height);
        bitmap.data = image.data;

        // Scale the image to the height parameter
        const scaledWidth = (scaledHeight * bitmap.width) / bitmap.height;
        const scaledImage = pure.make(scaledWidth, scaledHeight);
        const ctx = scaledImage.getContext("2d");
        ctx.drawImage(bitmap,
            0, 0, bitmap.width, bitmap.height,  // source dimensions
            0, 0, scaledWidth, scaledHeight     // destination dimensions
        );

        // Encode the bitmap as a jpeg to save in the cache
        const jpegImage: JPG.BufferRet = JPG.encode(scaledImage, 50);
        const jpegImageBase64 = Buffer.from(jpegImage.data).toString("base64");
        
        const expirationTime: number = new Date().getTime() + 3 * 24 * 60 * 60 * 1000; // thre days from now
        this.cache.set(imageUrl, jpegImageBase64, expirationTime);
        return scaledImage;
    }
}