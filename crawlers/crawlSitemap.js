import crawlee from 'crawlee';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import { validateUrl, checkIsXml } from '../utils.js';
import constants from '../constants/constants.js';
import { isSitemapContent, getLinksFromSitemap } from '../constants/common.js';

export const crawlSitemap = async (sitemapUrl, randomToken, host) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const maxRequestsPerCrawl = constants.maxRequestsPerCrawl;
  const maxConcurrency = constants.maxConcurrency;
  
  const requestList = new crawlee.RequestList({
    sources: await getLinksFromSitemap(sitemapUrl)
  });
  requestList.initialize();  

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);

  const crawler = new crawlee.PuppeteerCrawler({
    requestList,
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({ page, request, enqueueLinks }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
      if (validateUrl(currentUrl)) {
        const results = await runAxeScript(page, host);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);
      } else if (checkIsXml(currentUrl) && isSitemapContent(await page.content())) {
        await enqueueLinks({
          urls: await getLinksFromSitemap(currentUrl),
          requestQueue
        })
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
