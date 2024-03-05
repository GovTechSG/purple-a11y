import printMessage from 'print-message';
import crawlSitemap from './crawlers/crawlSitemap.js';
import crawlDomain from './crawlers/crawlDomain.js';
import crawlIntelligentSitemap from './crawlers/crawlIntelligentSitemap.js';
import { generateArtifacts } from './mergeAxeResults.js';
import { getHost, createAndUpdateResultsFolders, createDetailsAndLogs } from './utils.js';
import constants, { basicAuthRegex } from './constants/constants.js';
import { getBlackListedPatterns, submitForm } from './constants/common.js';
import { consoleLogger, silentLogger } from './logs.js';
import runCustom from './crawlers/runCustom.js';


const combineRun = async (details, deviceToScan) => {
  const envDetails = { ...details };

  const {
    type,
    url,
    entryUrl,
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
    fileTypes,
    blacklistedPatternsFilename,
    includeScreenshots,
    followRobots,
    metadata,
    customFlowLabel = 'Custom Flow',
    extraHTTPHeaders
  } = envDetails;

  process.env.CRAWLEE_LOG_LEVEL = 'ERROR';
  process.env.CRAWLEE_STORAGE_DIR = randomToken;

  const host = type === constants.scannerTypes.sitemap && isLocalSitemap ? '' : getHost(url);

  let blacklistedPatterns = null;
  try {
    blacklistedPatterns = getBlackListedPatterns(blacklistedPatternsFilename);
  } catch (error) {
    consoleLogger.error(error);
    silentLogger.error(error);
    process.exit(1);
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
    case constants.scannerTypes.custom:
      urlsCrawled = await runCustom(
        url,
        randomToken,
        viewportSettings,
        blacklistedPatterns,
        includeScreenshots,
      );
      break;

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
        fileTypes,
        blacklistedPatterns,
        includeScreenshots,
        extraHTTPHeaders
      );
      break;

    case constants.scannerTypes.intelligent:
        urlsCrawled = await crawlIntelligentSitemap(
        url,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl,
        browser,
        userDataDirectory,
        strategy,
        specifiedMaxConcurrency,
        fileTypes,
        blacklistedPatterns,
        includeScreenshots,
        followRobots,
        extraHTTPHeaders
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
      fileTypes,
      blacklistedPatterns,
      includeScreenshots,
      followRobots,
      extraHTTPHeaders
    );
    break;

    default:
      consoleLogger.error(`type: ${type} not defined`);
      silentLogger.error(`type: ${type} not defined`);
      process.exit(1);
  }

  scanDetails.endTime = new Date().getTime();
  scanDetails.urlsCrawled = urlsCrawled;
  await createDetailsAndLogs(scanDetails, randomToken);
  if (scanDetails.urlsCrawled.scanned.length > 0) {
    await createAndUpdateResultsFolders(randomToken);
    const pagesNotScanned = [
      ...urlsCrawled.error, 
      ...urlsCrawled.invalid, 
      ...urlsCrawled.forbidden
    ];
    const basicFormHTMLSnippet = await generateArtifacts(
      randomToken,
      url,
      type,
      deviceToScan,
      urlsCrawled.scanned,
      pagesNotScanned,
      customFlowLabel,
      undefined,
      scanDetails
    );
    const [name, email] = nameEmail.split(':');
    
    await submitForm(
      browser,
      userDataDirectory,
      url,
      entryUrl,
      type,
      email,
      name,
      JSON.stringify(basicFormHTMLSnippet),
      urlsCrawled.scanned.length,
      urlsCrawled.scannedRedirects.length, 
      pagesNotScanned.length,
      metadata,
    );
  } else {
    printMessage([`No pages were scanned.`], constants.alertMessageOptions);
  }
};

export default combineRun;
