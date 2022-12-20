/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* Common crawler functions used by both domain and sitemap crawling functions. */
const Apify = require('apify');
const axe = require('axe-core');
const { axeScript } = require('../constants/constants');

const filterAxeResults = (results, host) => {
  const { violations, url } = results;
  const page = url.split(host)[1];

  const errors = violations.map(violation => {
    const { id, nodes, help, impact, helpUrl } = violation;
    const fixes = nodes.map(node => ({
      htmlElement: node.html,
    }));
    return {
      id,
      description: help,
      impact,
      helpUrl,
      fixes,
    };
  });
  return {
    url,
    page,
    errors,
  };
};

/* This function takes a page object from Puppeteer and a host string as arguments 
and injects the axe-core library into the page. It then runs the library on the page 
and returns the results of the accessibility tests. */
exports.runAxeScript = async (page, host) => {
  await Apify.utils.puppeteer.injectFile(page, axeScript);
  const results = await page.evaluate(() => {
    axe.configure({
      branding: {
        application: 'purple-hats',
      },
      reporter: 'no-passes',
    });
    return axe.run({
      resultTypes: ['violations'],
    });
  });
  return filterAxeResults(results, host);
};

/* Using a random token as an argument and creates a dataset and request 
queue using the Apify library, using the provided token as the name for both. 
It returns an object with the dataset and request queue. */
exports.createApifySubFolders = async randomToken => {
  const dataset = await Apify.openDataset(randomToken);
  const requestQueue = await Apify.openRequestQueue(randomToken);
  return { dataset, requestQueue };
};

/* Array containing a single function that takes a crawling context and goto 
options as arguments. It modifies the goto options to include a 'waitUntil' value of 
'networkidle2' and a timeout value of 30000. */
exports.preNavigationHooks = [
  async (_crawlingContext, gotoOptions) => {
    gotoOptions = { waitUntil: 'networkidle2', timeout: 30000 };
  },
];

/* Logs error messages */
exports.handleFailedRequestFunction = async ({ request }) => {
  Apify.utils.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
};
