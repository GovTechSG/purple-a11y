import crawlee from 'crawlee';
import { KnownDevices } from 'puppeteer';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import { validateUrl } from '../utils.js';
import constants from '../constants/constants.js';
import { getLinksFromSitemap, messageOptions } from '../constants/common.js';

const crawlSitemap = async (sitemapUrl, randomToken, host, viewportSettings) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { deviceChosen, customDevice, viewportWidth } = viewportSettings;
  const maxRequestsPerCrawl = constants.maxRequestsPerCrawl;
  const maxConcurrency = constants.maxConcurrency;
  
  printMessage(['Fetching URLs. This might take some time...'], { border: false });
  const requestList = new crawlee.RequestList({
    sources: await getLinksFromSitemap(sitemapUrl, maxRequestsPerCrawl)
  });
  await requestList.initialize();  
  printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);

  const { dataset } = await createCrawleeSubFolders(randomToken);
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
          args: constants.launchOptionsArgs,
      }
    },
    requestList,
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
      } 
      else {
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
