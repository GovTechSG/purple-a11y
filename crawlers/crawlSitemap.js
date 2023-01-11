const crawlee = require('crawlee');
const {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} = require('./commonCrawlerFunc');
const { validateUrl } = require('../utils');
const { maxRequestsPerCrawl, maxConcurrency, urlsCrawledObj } = require('../constants/constants');

exports.crawlSitemap = async (sitemapUrl, randomToken, host) => {
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
