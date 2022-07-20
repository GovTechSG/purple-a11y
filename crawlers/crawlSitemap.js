const Apify = require('apify');
const {
  createApifySubFolders,
  preNavigationHooks,
  runAxeScript,
  handleFailedRequestFunction,
} = require('./commonCrawlerFunc');
const { validateUrl } = require('../utils');
const { maxRequestsPerCrawl, maxConcurrency, urlsCrawledObj } = require('../constants/constants');

exports.crawlSitemap = async (sitemapUrl, randomToken, host) => {
  const urlsCrawled = { ...urlsCrawledObj };

  const requestList = new Apify.RequestList({
    sources: [{ requestsFromUrl: sitemapUrl }],
  });
  await requestList.initialize();

  const { dataset, requestQueue } = await createApifySubFolders(randomToken);

  const crawler = new Apify.PuppeteerCrawler({
    requestList,
    requestQueue,
    preNavigationHooks,
    handlePageFunction: async ({ page, request }) => {
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
    handleFailedRequestFunction,
    maxRequestsPerCrawl,
    maxConcurrency,
  });

  await crawler.run();
  await requestList.isFinished();
  return urlsCrawled;
};
