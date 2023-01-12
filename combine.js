import { crawlSitemap } from './crawlers/crawlSitemap.js';
import { crawlDomain } from './crawlers/crawlDomain.js';

import { generateArtifacts } from './mergeAxeResults.js';
import { getHostnameFromRegex, createAndUpdateFolders } from './utils.js';
import { a11yStorage, scannerTypes } from './constants/constants.js';

process.env.CRAWLEE_STORAGE_DIR = a11yStorage;

export let combineRun = async details => {
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
