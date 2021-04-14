const { crawlSitemap } = require('./crawlers/crawlSitemap');
const { crawlDomain } = require('./crawlers/crawlDomain');

const { mergeFiles } = require('./mergeAxeResults');
const { getHostnameFromRegex, createAndUpdateFolders, roothPath } = require('./utils');
const { a11yStorage } = require('./constants/constants');

process.env.APIFY_LOCAL_STORAGE_DIR = a11yStorage;

exports.combineRun = async details => {

  const envDetails = { ...details };

  const { type, url, randomToken } = envDetails;

  const host = getHostnameFromRegex(url);

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: type,
    requestUrl: url,
  };

  let urlsCrawled;
  switch (type) {
    case 'sitemap':
      urlsCrawled = await crawlSitemap(url, randomToken, host);
      break;

    case 'website':
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
