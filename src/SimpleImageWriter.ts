import * as fs from "fs";
import path from "path";
import { LoggerInterface } from "./Logger";

export interface ImageWriterInterface {
    saveFile(fileName: string, buf: Buffer): void;
    deleteFile(fileName: string): void;
}

export class SimpleImageWriter implements ImageWriterInterface {
    private logger: LoggerInterface;
    private directory: string;

    constructor(logger: LoggerInterface, directory: string) {
        this.logger = logger;
        this.directory = directory;

        try {
            fs.mkdirSync(this.directory, { recursive: true });
        } catch (e) {
            this.logger.error(`SimpleImageWriter: Failed to create output directory ${this.directory} - ${e}`);
        }
    }

    saveFile(fileName: string, buf: Buffer): void {
        try {
            const fullName: string = path.join(this.directory, fileName);
            fs.writeFileSync(fullName, buf);
        } catch (e) {
            this.logger.error(`Failed to write file: ${fileName} - ${e}`);
        }  
    }

    deleteFile(fileName: string): void {
        try {
            const fullName: string = path.join(this.directory, fileName);
            fs.unlinkSync(fullName);
        } catch (e) {
            // do nothing
        }
    }
}