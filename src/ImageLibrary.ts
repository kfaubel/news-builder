import axios, { AxiosResponse } from "axios";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";
//import jpeg from "jpeg-js";
import * as pure from "pureimage";
import { PassThrough, Readable, Stream } from "stream";

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

    public async getImage(imageUrl: string): Promise<MyImageType | null> {
        let picture: MyImageType | null = null;
        try {
            //let picture: jpeg.BufferRet | null = null;            

            interface Base64ImageStr {
                dataStr: string;  // This is the base64 encoded PNG file contents
            }
            const base64ImageStr: Base64ImageStr = this.cache.get(imageUrl) as Base64ImageStr;

            if (base64ImageStr !== null) {                
                const dataStream = new Readable({
                    read() {
                        const imageData = Buffer.from(base64ImageStr.dataStr, "base64"); 
                        this.push(imageData);
                        this.push(null);
                    }
                });
              
                picture = await pure.decodePNGFromStream(dataStream) as MyImageType;
            } else {   

                await axios.get(imageUrl, {responseType: "stream"})
                    .then(async (res: AxiosResponse) => {
                        const streamCopy: Stream = new PassThrough();
                        res.data.pipe(streamCopy);
                        try {
                            picture = await pure.decodeJPEGFromStream(streamCopy) as MyImageType;
                            this.logger.verbose("got jpg");
                        } catch (e) {
                            picture = null;
                        }

                        if (picture === null) {
                            res.data.pipe(streamCopy);
                            try {
                                picture = await pure.decodePNGFromStream(streamCopy) as MyImageType;
                                this.logger.verbose("got png");
                                return(picture);
                            } catch (e) {
                                picture = null;
                            }
                        }

                        this.logger.error("ImageLibrary: Got data but could not decode image");
                    })
                    .catch((error) => {
                        this.logger.error(`ImageLibrary: Could not GET image data: Status: ${error?.response?.status}`);
                        picture = null;
                    });
            }
        } catch(e) {
            this.logger.error(`ImageLibrary: thing did not go well: ${e}`);
        }
        
        return picture;
    }
}