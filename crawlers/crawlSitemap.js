import crawlee from 'crawlee';
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

export const crawlSitemap = async (sitemapUrl, randomToken, host) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const maxRequestsPerCrawl = constants.maxRequestsPerCrawl;
  const maxConcurrency = constants.maxConcurrency;
  
  printMessage(['Fetching URLs. This might take some time...'], { border: false });
  const requestList = new crawlee.RequestList({
    sources: await getLinksFromSitemap(sitemapUrl, maxRequestsPerCrawl)
  });
  await requestList.initialize();  
  printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);

  const { dataset } = await createCrawleeSubFolders(randomToken);

  const crawler = new crawlee.PuppeteerCrawler({
    requestList,
    preNavigationHooks,
    requestHandler: async ({ page, request }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
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
