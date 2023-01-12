import crawlee from 'crawlee';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import { validateUrl } from '../utils.js';
import { maxRequestsPerCrawl, maxConcurrency, urlsCrawledObj } from '../constants/constants.js';

export const crawlSitemap = async (sitemapUrl, randomToken, host) => {
  const urlsCrawled = { ...urlsCrawledObj };

  const requestList = new crawlee.RequestList({
    sources: [{ requestsFromUrl: sitemapUrl }],
  });
  await requestList.initialize();

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);

  const crawler = new crawlee.PuppeteerCrawler({
    requestList,
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({ page, request }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
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
