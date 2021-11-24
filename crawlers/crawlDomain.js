const Apify = require('apify');
const {
  createApifySubFolders,
  preNavigationHooks,
  runAxeScript,
  handleFailedRequestFunction,
} = require('./commonCrawlerFunc');
const {
  maxRequestsPerCrawl,
  maxConcurrency,
  pseudoUrls,
  urlsCrawledObj,
} = require('../constants/constants');

exports.crawlDomain = async (url, randomToken, host) => {
  const urlsCrawled = { ...urlsCrawledObj };

  const { dataset, requestQueue } = await createApifySubFolders(randomToken);

  await requestQueue.addRequest({ url });

  const crawler = new Apify.PuppeteerCrawler({
    requestQueue,
    preNavigationHooks,
    handlePageFunction: async ({ page, request }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
      if (location.host.includes(host)) {
        const results = await runAxeScript(page, host);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);

        await Apify.utils.enqueueLinks({
          page,
          selector: 'a',
          pseudoUrls: pseudoUrls(host),
          requestQueue,
        });
      } else {
        urlsCrawled.outOfDomain.push(currentUrl);
      }
    },
    handleFailedRequestFunction,
    maxRequestsPerCrawl,
    maxConcurrency,
  });

  await crawler.run();
  return urlsCrawled;
};
