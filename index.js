// This is used when embedding this in a larger solution
// Use app.ts for local testing and to build a stand alone solution

const NewsData  = require('./build/NewsData');
const NewsImage = require('./build/NewsImage');

module.exports = { NewsData, NewsImage };