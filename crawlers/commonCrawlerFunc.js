/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
import crawlee from 'crawlee';
import axe from 'axe-core';
import { axeScript } from '../constants/constants.js';

export const filterAxeResults = (results, pageTitle) => {
  const { violations, incomplete, passes, url } = results;

  let totalItems = 0;
  const mustFix = { totalItems: 0, rules: {} };
  const goodToFix = { totalItems: 0, rules: {} };
  const passed = { totalItems: 0, rules: {} };

  const process = (item, needsReview = false) => {
    const { id: rule, help: description, helpUrl, tags, nodes } = item;

    if (rule === 'frame-tested') return;

    const conformance = tags.filter(tag => tag.startsWith('wcag') || tag === 'best-practice');

    const addTo = (category, node) => {
      const { html, failureSummary } = node;
      if (!(rule in category.rules)) {
        category.rules[rule] = { description, helpUrl, conformance, totalItems: 0, items: [] };
      }
      const message = needsReview
        ? failureSummary.slice(failureSummary.indexOf('\n') + 1).trim()
        : failureSummary;
      category.rules[rule].items.push(
        needsReview ? { html, message, needsReview } : { html, message },
      );
      category.rules[rule].totalItems += 1;
      category.totalItems += 1;
      totalItems += 1;
    };

    nodes.forEach(node => {
      const { impact } = node;
      if (impact === 'critical' || impact === 'serious') {
        addTo(mustFix, node);
      } else {
        addTo(goodToFix, node);
      }
    });
  };

  violations.forEach(item => process(item));
  incomplete.forEach(item => process(item, true));

  passes.forEach(item => {
    const { id: rule, help: description, helpUrl, tags, nodes } = item;

    if (rule === 'frame-tested') return;

    const conformance = tags.filter(tag => tag.startsWith('wcag') || tag === 'best-practice');

    nodes.forEach(node => {
      const { html } = node;
      if (!(rule in passed.rules)) {
        passed.rules[rule] = { description, helpUrl, conformance, totalItems: 0, items: [] };
      }
      passed.rules[rule].items.push({ html });
      passed.totalItems += 1;
      passed.rules[rule].totalItems += 1;
      totalItems += 1;
    });
  });

  return {
    url,
    pageTitle,
    totalItems,
    mustFix,
    goodToFix,
    passed,
  };
};

export const runAxeScript = async (page, selectors = []) => {
  await crawlee.playwrightUtils.injectFile(page, axeScript);

  const results = await page.evaluate(selectors => {
    axe.configure({
      branding: {
        application: 'purple-hats',
      },
    });
    return axe.run(selectors, {
      resultTypes: ['violations', 'passes', 'incomplete'],
    });
  }, selectors);
  const pageTitle = await page.evaluate(() => {
    return document.title;
  });
  return filterAxeResults(results, pageTitle);
};

export const createCrawleeSubFolders = async randomToken => {
  const dataset = await crawlee.Dataset.open(randomToken);
  const requestQueue = await crawlee.RequestQueue.open(randomToken);
  return { dataset, requestQueue };
};

export const preNavigationHooks = [
  async (_crawlingContext, gotoOptions) => {
    gotoOptions = { waitUntil: 'domcontentloaded', timeout: 30000 };
  },
];

export const failedRequestHandler = async ({ request }) => {
  crawlee.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
};
