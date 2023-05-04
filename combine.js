import printMessage from 'print-message';

import crawlSitemap from './crawlers/crawlSitemap.js';
import crawlDomain from './crawlers/crawlDomain.js';

import { generateArtifacts } from './mergeAxeResults.js';
import {
  getHostnameFromRegex,
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
} from './utils.js';
import constants from './constants/constants.js';

process.env.CRAWLEE_STORAGE_DIR = constants.a11yStorage;

const combineRun = async (details, deviceToScan) => {
  const envDetails = { ...details };

  // eslint-disable-next-line prettier/prettier
  const {
    type,
    url,
    randomToken,
    deviceChosen,
    customDevice,
    viewportWidth,
    maxRequestsPerCrawl,
    isLocalSitemap,
  } = envDetails;

  const host =
    type === constants.scannerTypes.sitemap && isLocalSitemap ? '' : getHostnameFromRegex(url);

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: type,
    requestUrl: url,
  };

  const viewportSettings = {
    deviceChosen,
    customDevice,
    viewportWidth,
  };

  let urlsCrawled;
  switch (type) {
    case constants.scannerTypes.sitemap:
      urlsCrawled = await crawlSitemap(
        url,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl,
      );
      break;

    case constants.scannerTypes.website:
      urlsCrawled = await crawlDomain(
        url,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl,
      );
      break;

    default:
      break;
  }

  scanDetails.endTime = new Date().getTime();
  scanDetails.urlsCrawled = urlsCrawled;
  await createDetailsAndLogs(scanDetails, randomToken);

  if (scanDetails.urlsCrawled.scanned.length > 0) {
    await createAndUpdateResultsFolders(randomToken);
    await generateArtifacts(randomToken, url, type, url, deviceToScan);
  } else {
    printMessage([`No pages were scanned.`], constants.alertMessageOoptions);
  }
};

export default combineRun;
