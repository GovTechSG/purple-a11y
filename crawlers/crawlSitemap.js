import crawlee from 'crawlee';
import { KnownDevices } from 'puppeteer';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import { validateUrl } from '../utils.js';
import constants from '../constants/constants.js';

const crawlSitemap = async (sitemapUrl, randomToken, host, viewportSettings) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { deviceChosen, customDevice, viewportWidth } = viewportSettings;
  const maxRequestsPerCrawl = constants.maxRequestsPerCrawl;
  const maxConcurrency = constants.maxConcurrency;

  const requestList = new crawlee.RequestList({
    sources: [{ requestsFromUrl: sitemapUrl }],
  });

  await requestList.initialize();

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);
  let device;

  if (deviceChosen === 'Custom' && customDevice !== 'Specify viewport') {
    if (customDevice === 'Samsung Galaxy S9+') {
      device = KnownDevices['Galaxy S9+'];
    } else if (customDevice === 'iPhone 11') {
      device = KnownDevices['iPhone 11'];
    }
  }
  const crawler = new crawlee.PuppeteerCrawler({
    launchContext: {
      launchOptions: {
          args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
      }
    },
    requestList,
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({ page, request }) => {
      if (deviceChosen === 'Custom') {
        if (device) {
          await page.emulate(device);
        } else {
          await page.setViewport({ width: Number(viewportWidth), height: 640, isMobile: true });
        }
      } else if (deviceChosen === 'Mobile') {
        await page.setViewport({ width: 360, height: 640, isMobile: true });
      }

      const currentUrl = request.url;
      if (validateUrl(currentUrl)) {
        const results = await runAxeScript(page, host);
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
