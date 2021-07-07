"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
// var timeStamp = new Date().toISOString();
class Logger {
    constructor(module) {
        this.module = module;
    }
    error(text) {
        console.error(`[${this.module}] ${text}`);
    }
    warn(text) {
        console.warn(`[${this.module}] ${text}`);
    }
    log(text) {
        console.log(`[${this.module}] ${text}`);
    }
    info(text) {
        console.log(`[${this.module}] ${text}`);
    }
    verbose(text) {
        console.debug(`[${this.module}] ${text}`);
    }
    dump(text, obj) {
        console.log(`[${this.module}] ${text} ${JSON.stringify(obj, undefined, 2)}`);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map