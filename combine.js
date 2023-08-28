import printMessage from 'print-message';
import fs from 'fs-extra';
import safe from 'safe-regex';
import crawlSitemap from './crawlers/crawlSitemap.js';
import crawlDomain from './crawlers/crawlDomain.js';
import { generateArtifacts } from './mergeAxeResults.js';
import { getHost, createAndUpdateResultsFolders, createDetailsAndLogs } from './utils.js';
import constants, { basicAuthRegex } from './constants/constants.js';
import { submitForm } from './constants/common.js';

const combineRun = async (details, deviceToScan) => {
  const envDetails = { ...details };

  // eslint-disable-next-line prettier/prettier
  const {
    type,
    url,
    nameEmail,
    randomToken,
    deviceChosen,
    customDevice,
    viewportWidth,
    playwrightDeviceDetailsObject,
    maxRequestsPerCrawl,
    isLocalSitemap,
    browser,
    userDataDirectory,
    strategy,
    specifiedMaxConcurrency,
    needsReviewItems,
    blacklistedPatternsFilename,
  } = envDetails;

  process.env.CRAWLEE_LOG_LEVEL = 'ERROR';
  process.env.CRAWLEE_STORAGE_DIR = randomToken;

  const host = type === constants.scannerTypes.sitemap && isLocalSitemap ? '' : getHost(url);

  let blacklistedPatterns = null;
  if (blacklistedPatternsFilename) {
    const rawPatterns = fs.readFileSync(blacklistedPatternsFilename).toString();
    blacklistedPatterns = rawPatterns.split('\n').filter(pattern => pattern.trim() !== '');

    let unsafe = blacklistedPatterns.filter(function (pattern) {
      return !safe(pattern);
    });

    if (unsafe.length > 0) {
      let unsafeExpressionsError =
        'Unsafe expressions detected: ' + unsafe + ' Please revise ' + blacklistedPatternsFilename;
      consoleLogger.error(unsafeExpressionsError);
      silentLogger.error(unsafeExpressionsError);
      process.exit(1);
    }
  }

  // remove basic-auth credentials from URL
  let finalUrl = url;
  if (basicAuthRegex.test(url)) {
    finalUrl = `${url.split('://')[0]}://${url.split('@')[1]}`;
  }

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: type,
    requestUrl: finalUrl,
  };

  const viewportSettings = {
    deviceChosen,
    customDevice,
    viewportWidth,
    playwrightDeviceDetailsObject,
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
        browser,
        userDataDirectory,
        specifiedMaxConcurrency,
        needsReviewItems,
        blacklistedPatterns,
      );
      break;

    case constants.scannerTypes.website:
      urlsCrawled = await crawlDomain(
        url,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl,
        browser,
        userDataDirectory,
        strategy,
        specifiedMaxConcurrency,
        needsReviewItems,
        blacklistedPatterns,
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
    const basicFormHTMLSnippet = await generateArtifacts(
      randomToken,
      url,
      type,
      deviceToScan,
      urlsCrawled.scanned,
    );
    const [name, email] = nameEmail.split(':');
    await submitForm(
      browser,
      userDataDirectory,
      url,
      type,
      email,
      name,
      JSON.stringify(basicFormHTMLSnippet),
      urlsCrawled.scanned.length,
    );
  } else {
    printMessage([`No pages were scanned.`], constants.alertMessageOptions);
  }
};

export default combineRun;
