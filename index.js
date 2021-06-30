// This is used when embedding this in a larger solution
// Use app.ts for local testing and to build a stand alone solution

// This did not work
// const NewsData  = require('./build/NewsData');
// const NewsImage = require('./build/NewsImage');
// module.exports = { NewsData, NewsImage };

// This does
module.exports = Object.assign({}, require('./build/NewsData'), require('./build/NewsImage'));