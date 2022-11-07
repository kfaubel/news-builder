# news-builder
Module for building images of current news

Creates an image based on news from newsapi.org sources

```
https://newsapi.org/v1/sources

https://newsapi.org/v1/articles?source=ars-technica&sortBy=top&apiKey=<key>
```

Good sources
* engadget
* google-news
* msnbc
* the-verge
* wired

# Building for commonjs vs ES2020 modules
### In tsconfig.json
``` json
    // "module": "ES2020",              // Target platforms that load ES2020
    // "module": "commonjs",            // Target platforms that load commonjs
```


### In test.ts at top, use the require syntax
``` javascript
    // import meow from ('meow');       // ES2020 only
    // const meow = require('meow');    // commonjs only
```

### In test.ts in meow definition, add importMeta is using ES2020
``` javascript
    {
    //    importMeta: import.meta,      // uncomment for ES2020
        flags: {
```

### In test.ts in main()
``` javascript
    // const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));  // ES2020 only
    // const dirname = __dirname;                                              // commonjs only
```

### app.js - Cannot use import statement outside a module
``` javascript
//import './build/test.js';
require("./build/test");
```