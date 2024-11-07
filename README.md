# news-builder
Module for building images of current news

Creates an image based on news from newsapi.org sources

```
https://newsapi.org/v1/sources

https://newsapi.org/v1/articles?source=ars-technica&sortBy=top&apiKey=<key>
```

A key is required to use the newsapi.org service.  The key is passed in as a parameter to the module.

sample sources
* cnn
* the-verge
* wired

Not all sources have images or are as up to date as others.  

test.ts shows how to use the module

The normal use of this module is to build an npm module that can be used as part of a bigger progress.

index.d.ts describes the interface for the module

The LoggerInterface, KacheInterface and ImageWriterInterface interfaces are dependency injected into the module.  Simple versions are provided and used by the test wrapper.

Once instanciated, the CreateImages() method can be called to create a series of images.

To use the test wrapper to build a screen, run the following command.  
```
$ npm start

or

$ node app.js 
```
```
Usage: app [options]

Options:
  -l, --loglevel <level>  set the log level (error, warn, info, debug, verbose (default: "info")
  -o, --outdir <outdir>   Output directory (default: "outdir")
  -s, --source <source>   News source ('google-news')
  -k, --key <key>         default, uses KEY env variable (default: "default")
  -c, --count <count>     number or screens (default: "10")
  -h, --help              display help for command
  ```
  # To Deploy
  First check in changes and make sure the version number is updated in package.json
  ```
  $ npm publish
  ```