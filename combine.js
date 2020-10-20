const { crawlSitemap } = require('./crawlers/crawlSitemap');
const { crawlDomain } = require('./crawlers/crawlDomain');

const { mergeFiles } = require('./mergeAxeResults');
const { getHostnameFromRegex, createAndUpdateFolders } = require('./utils');
const { a11yStorage } = require('./constants/constants');

process.env.APIFY_LOCAL_STORAGE_DIR = a11yStorage;
process.env.APIFY_HEADLESS = 1;

exports.combineRun = async details => {
  let envDetails = { ...details };

  if (typeof details === 'undefined') {
    envDetails = {
      type: process.env.TYPE,
      url: process.env.URL,

      randomToken: process.env.RANDOMTOKEN,
    };
  }

  const { type, url, randomToken } = envDetails;

  const host = getHostnameFromRegex(url);

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: type,
    requestUrl: url,
  };

  let urlsCrawled;

  switch (type) {
    case 'crawlSitemap':
      urlsCrawled = await crawlSitemap(url, randomToken, host);
      break;

    case 'crawlDomain':
      urlsCrawled = await crawlDomain(url, randomToken, host);
      break;

    default:
      break;
  }
  scanDetails.endTime = new Date().getTime();
  scanDetails.urlsCrawled = urlsCrawled;
  await createAndUpdateFolders(scanDetails, randomToken);
  await mergeFiles(randomToken);
};
