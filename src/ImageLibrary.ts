import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
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
            this.logger.verbose(`ImageLibrary: getImage:  ${imageUrl}`);
            const base64ImageStr: string = this.cache.get(imageUrl) as string;

            if (base64ImageStr !== null) {   
                this.logger.verbose("ImageLibrary: Using cached image");
                const imageData = Buffer.from(base64ImageStr, "base64"); 
                const cacheImage = JPG.decode(imageData);
                const cacheBitmap = pure.make(cacheImage.width, cacheImage.height);
                cacheBitmap.data = cacheImage.data;
                return cacheBitmap;
            } 

            this.logger.verbose("ImageLibrary: Fetching new image");

            const options: AxiosRequestConfig = {
                responseType: "arraybuffer",
                timeout: 10000
            };

            const startTime = new Date();
            await axios.get(imageUrl,  options)
                .then(async (response: AxiosResponse) => {
                    if (typeof process.env.TRACK_GET_TIMES !== "undefined" ) {
                        this.logger.info(`ImageLibrary: GET TIME: ${new Date().getTime() - startTime.getTime()}ms`);
                    }
                    contentType = response.headers["content-type"];
                    imageBuffer = Buffer.from(response.data, "binary");
                })
                .catch((error) => {
                    this.logger.warn(`ImageLibrary: GET failed. Error: ${error}`);
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
            } else {
                this.logger.warn(`Response: ${contentType}, Image reports: ??? - Unsupported`);
                this.logger.warn(`UNKNOWN: ${imageUrl}`);
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
        const scaledWidth = Math.round((scaledHeight * bitmap.width) / bitmap.height);
        this.logger.verbose(`ImageLibrary: Scaling image to ${scaledWidth}x${scaledHeight}`);
        const scaledImage = pure.make(scaledWidth, scaledHeight);
        const ctx = scaledImage.getContext("2d");
        ctx.drawImage(bitmap,
            0, 0, bitmap.width, bitmap.height,  // source dimensions
            0, 0, scaledWidth, scaledHeight     // destination dimensions
        );

        // Encode the bitmap as a jpeg to save in the cache
        const jpegImage: JPG.BufferRet = JPG.encode(scaledImage, 50);
        const jpegImageBase64 = Buffer.from(jpegImage.data).toString("base64");
        
        const expirationTime: number = new Date().getTime() + 3 * 24 * 60 * 60 * 1000; // three days from now
        this.cache.set(imageUrl, jpegImageBase64, expirationTime);
        this.logger.verbose("ImageLibrary: Caching image and returning scaled image");
        return scaledImage;
    }
}