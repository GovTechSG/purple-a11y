import crawlee from 'crawlee';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';
import { 
  maxRequestsPerCrawl, 
  maxConcurrency, 
  urlsCrawledObj 
} from '../constants/constants.js';

export const crawlDomain = async (url, randomToken, host) => {
  const urlsCrawled = { ...urlsCrawledObj };

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);

  await requestQueue.addRequest({ url });

  const crawler = new crawlee.PuppeteerCrawler({
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({ page, request, enqueueLinks }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
      if (location.host.includes(host)) {
        const results = await runAxeScript(page, host);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);

        await enqueueLinks({
          selector: 'a',
          strategy: 'same-domain',
          requestQueue,
        });
      } else {
        urlsCrawled.outOfDomain.push(currentUrl);
      }
    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency,
  });

  await crawler.run();
  return urlsCrawled;
};
