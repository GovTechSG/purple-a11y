/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
const crawlee = require('crawlee');
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

exports.runAxeScript = async (page, host) => {
  await crawlee.puppeteerUtils.injectFile(page, axeScript);
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

exports.createCrawleeSubFolders = async randomToken => {
  const dataset = await crawlee.Dataset.open(randomToken);
  const requestQueue = await crawlee.RequestQueue.open(randomToken);
  return { dataset, requestQueue };
};

exports.preNavigationHooks = [
  async (_crawlingContext, gotoOptions) => {
    gotoOptions = { waitUntil: 'networkidle2', timeout: 30000 };
  },
];

exports.failedRequestHandler = async ({ request }) => {
  crawlee.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
};
