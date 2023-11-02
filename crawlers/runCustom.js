/* eslint-env browser */

import { chromium } from 'playwright';
import { createCrawleeSubFolders } from './commonCrawlerFunc.js';
import { cleanUp } from '../utils.js';
import constants, {
  getIntermediateScreenshotsPath,
  guiInfoStatusTypes,
} from '../constants/constants.js';
import { DEBUG, initNewPage, log } from './custom/utils.js';
import { guiInfoLog } from '../logs.js';

const runCustom = async (
  url,
  randomToken,
  viewportSettings,
  needsReviewItems,
  blacklistedPatterns,
  includeScreenshots,
) => {
  // checks and delete datasets path if it already exists
  await cleanUp(randomToken);
  process.env.CRAWLEE_STORAGE_DIR = randomToken;

  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { dataset } = await createCrawleeSubFolders(randomToken);
  const intermediateScreenshotsPath = getIntermediateScreenshotsPath(randomToken);
  const processPageParams = {
    scannedIdx: 0,
    needsReviewItems,
    blacklistedPatterns,
    includeScreenshots,
    dataset,
    intermediateScreenshotsPath,
    urlsCrawled,
    randomToken,
  };

  const pagesDict = {};
  const pageClosePromises = [];

  try {
    const browser = await chromium.launch({
      args: ['--window-size=1920,1040'],
      headless: false,
      channel: 'chrome',
      // bypassCSP: true,
      devtools: DEBUG,
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      serviceWorkers: 'block',
      viewport: null,
      ...viewportSettings.playwrightDeviceDetailsObject,
    });

    // Detection of new page
    context.on('page', async newPage => {
      await initNewPage(newPage, pageClosePromises, processPageParams, pagesDict);
    });

    const page = await context.newPage();
    await page.goto(url);

    await Promise.all(pageClosePromises);
  } catch (error) {
    log('PLAYWRIGHT EXECUTION ERROR', error);
    process.exit(1);
  }

  guiInfoLog(guiInfoStatusTypes.COMPLETED);
  return urlsCrawled;
};

export default runCustom;
