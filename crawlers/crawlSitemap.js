/* Functions specific to crawling a sitemap. */
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
    
    /* Run on each page of the crawl. This function checks the 
    current URL using the validateUrl function and, if it is valid, 
    pushes the results of running the runAxeScript function on the page to the 
    dataset and adds it to an array of scanned URLs. If the URL is invalid, it 
    adds it to an array of invalid URLs. */
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
