const { crawlSitemap } = require('./crawlers/crawlSitemap');
const { crawlDomain } = require('./crawlers/crawlDomain');

const { generateArtifacts } = require('./mergeAxeResults');
const { getHostnameFromRegex, createAndUpdateFolders } = require('./utils');
const { a11yStorage, scannerTypes } = require('./constants/constants');

process.env.APIFY_LOCAL_STORAGE_DIR = a11yStorage;

exports.combineRun = async details => {
  const envDetails = { ...details };

  // eslint-disable-next-line prettier/prettier
  const { type, url, randomToken } = envDetails;

  const host = getHostnameFromRegex(url);

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: type,
    requestUrl: url,
  };

  let urlsCrawled;
  switch (type) {
    case scannerTypes.sitemap:
      urlsCrawled = await crawlSitemap(url, randomToken, host);
      break;

    case scannerTypes.website:
      urlsCrawled = await crawlDomain(url, randomToken, host);
      break;

    default:
      break;
  }
  scanDetails.endTime = new Date().getTime();
  scanDetails.urlsCrawled = urlsCrawled;
  await createAndUpdateFolders(scanDetails, randomToken);
  await generateArtifacts(randomToken);
};
