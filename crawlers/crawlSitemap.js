import crawlee from 'crawlee';
import { devices } from 'playwright';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import constants from '../constants/constants.js';
import {
  getLinksFromSitemap,
  getPlaywrightLaunchOptions,
  messageOptions,
} from '../constants/common.js';
import { isWhitelistedContentType } from '../utils.js';

const crawlSitemap = async (
  sitemapUrl,
  randomToken,
  host,
  viewportSettings,
  maxRequestsPerCrawl,
  browser,
  userDataDirectory,
) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { deviceChosen, customDevice, viewportWidth } = viewportSettings;
  const { maxConcurrency } = constants;

  printMessage(['Fetching URLs. This might take some time...'], { border: false });
  const requestList = new crawlee.RequestList({
    sources: await getLinksFromSitemap(sitemapUrl, maxRequestsPerCrawl, browser, userDataDirectory),
  });
  await requestList.initialize();
  printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);

  const { dataset } = await createCrawleeSubFolders(randomToken);

  let device;
  if (deviceChosen === 'Mobile' || customDevice === 'iPhone 11') {
    device = devices['iPhone 11'];
  } else if (customDevice === 'Samsung Galaxy S9+') {
    device = devices['Galaxy S9+'];
  } else if (viewportWidth) {
    device = { viewport: { width: Number(viewportWidth), height: 720 } };
  } else if (customDevice) {
    device = devices[customDevice.replace('_', / /g)];
  } else {
    device = {};
  }

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launchOptions: getPlaywrightLaunchOptions(browser),
      userDataDir: userDataDirectory || '',
    },
    browserPoolOptions: {
      useFingerprints: false,
      preLaunchHooks: [
        async (pageId, launchContext) => {
          launchContext.launchOptions = {
            ...launchContext.launchOptions,
            bypassCSP: true,
            ignoreHTTPSErrors: true,
            ...device,
          };
        },
      ],
    },
    requestList,
    preNavigationHooks,
    requestHandler: async ({ page, request, response }) => {
      const currentUrl = request.url;
      const contentType = response.headers()['content-type'];
      const status = response.status();

      if (status === 200 && isWhitelistedContentType(contentType)) {
        const results = await runAxeScript(page);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);
      } else {
        urlsCrawled.invalid.push(currentUrl);
      }
    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency,
  });

  await crawler.run();
  await requestList.isFinished();
  return urlsCrawled;
};

export default crawlSitemap;
