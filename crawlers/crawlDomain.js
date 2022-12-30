/* Functions specific to the domain crawls */
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
    
    /* Run on each page of the crawl. This function evaluates the page's 
    location and, if it includes the given host, pushes the results of running 
    the runAxeScript function on the page to the dataset and adds any links on the 
    page to the request queue. If the location does not include the host, it adds 
    the current URL to an array of out-of-domain URLs. */
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
