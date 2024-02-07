/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
import crawlee from 'crawlee';
import axe from 'axe-core';
import { axeScript, guiInfoStatusTypes, saflyIconSelector } from '../constants/constants.js';
import { guiInfoLog } from '../logs.js';
import { takeScreenshotForHTMLElements } from '../screenshotFunc/htmlScreenshotFunc.js';

export const filterAxeResults = (results, pageTitle, customFlowDetails) => {
  const { violations, passes, incomplete, url } = results;

  let totalItems = 0;
  const mustFix = { totalItems: 0, rules: {} };
  const goodToFix = { totalItems: 0, rules: {} };
  const passed = { totalItems: 0, rules: {} };
  const needsReview = { totalItems: 0, rules: {} };

  const process = (item, displayNeedsReview) => {
    const { id: rule, help: description, helpUrl, tags, nodes } = item;

    if (rule === 'frame-tested') return;

    const conformance = tags.filter(tag => tag.startsWith('wcag') || tag === 'best-practice');
    // handle rare cases where conformance level is not the first element
    const levels = ['wcag2a', 'wcag2aa', 'wcag2aaa'];
    if (conformance[0] !== 'best-practice' && !levels.includes(conformance[0])) {
      conformance.sort((a, b) => {
        if (levels.includes(a)) {
          return -1;
        } else if (levels.includes(b)) {
          return 1;
        }

        return 0;
      });
    }

    const addTo = (category, node) => {
      const { html, failureSummary, screenshotPath, target } = node;
      const axeImpact = node.impact;
      if (!(rule in category.rules)) {
        category.rules[rule] = {description,axeImpact, helpUrl, conformance, totalItems: 0, items: [] };
      }
      const message = displayNeedsReview
        ? failureSummary.slice(failureSummary.indexOf('\n') + 1).trim()
        : failureSummary;

      let finalHtml = html;
      if (html.includes('</script>')) {
        finalHtml = html.replaceAll('</script>', '&lt;/script>');
      }

      const xpath = target.length === 1 && typeof target[0] === 'string' ? target[0] : null;

      // add in screenshot path
      category.rules[rule].items.push({
        html: finalHtml,
        message,
        screenshotPath,
        xpath: xpath || undefined,
        displayNeedsReview: displayNeedsReview || undefined,
      });
      category.rules[rule].totalItems += 1;
      category.totalItems += 1;
      totalItems += 1;
    };

    nodes.forEach(node => {
      const { impact } = node;
      if (displayNeedsReview) {
        addTo(needsReview, node);
      } else if (impact === 'critical' || impact === 'serious') {
        addTo(mustFix, node);
      } else {
        addTo(goodToFix, node);
      }
    });
  };

  violations.forEach(item => process(item, false));
  incomplete.forEach(item => process(item, true));


  passes.forEach(item => {
    const { id: rule, help: description, axeImpact, helpUrl, tags, nodes } = item;

    if (rule === 'frame-tested') return;

    const conformance = tags.filter(tag => tag.startsWith('wcag') || tag === 'best-practice');

    nodes.forEach(node => {
      const { html } = node;
      if (!(rule in passed.rules)) {
        passed.rules[rule] = { description,axeImpact, helpUrl, conformance, totalItems: 0, items: [] };
      }
      passed.rules[rule].items.push({ html });
      passed.totalItems += 1;
      passed.rules[rule].totalItems += 1;
      totalItems += 1;
    });
  });

  return {
    url,
    pageTitle: customFlowDetails ? `${customFlowDetails.pageIndex}: ${pageTitle}` : pageTitle,
    pageIndex: customFlowDetails ? customFlowDetails.pageIndex : undefined,
    metadata: customFlowDetails?.metadata ? `${customFlowDetails.pageIndex}: ${customFlowDetails.metadata}` : undefined,
    pageImagePath: customFlowDetails ? customFlowDetails.pageImagePath : undefined,
    totalItems,
    mustFix,
    goodToFix,
    needsReview,
    passed,
  };
};

export const runAxeScript = async (
  includeScreenshots,
  page,
  randomToken,
  customFlowDetails,
  selectors = [],
) => {
  await crawlee.playwrightUtils.injectFile(page, axeScript);

  const results = await page.evaluate(
    async ({ selectors, saflyIconSelector}) => {
      // remove so that axe does not scan
      document.querySelector(saflyIconSelector)?.remove();

      axe.configure({
        branding: {
          application: 'purple-a11y',
        },
      });

      //removed needsReview condition
      defaultResultTypes = ['violations', 'passes', 'incomplete']
        

      return axe.run(selectors, {
        resultTypes: defaultResultTypes,
      });
    },
    { selectors, saflyIconSelector},
  );

  if (includeScreenshots) {
    results.violations = await takeScreenshotForHTMLElements(results.violations, page, randomToken);
    results.incomplete = await takeScreenshotForHTMLElements(results.incomplete, page, randomToken);
  }

  const pageTitle = await page.evaluate(() => document.title);
  return filterAxeResults(results, pageTitle, customFlowDetails);
};

export const createCrawleeSubFolders = async randomToken => {
  const dataset = await crawlee.Dataset.open(randomToken);
  const requestQueue = await crawlee.RequestQueue.open(randomToken);
  return { dataset, requestQueue };
};

export const preNavigationHooks = (extraHTTPHeaders) => {
//   let user_agents_list = [
//     'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.83 Safari/537.36',
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
//     'Mozilla/5.0 (Linux; Android 11; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.77 Mobile Safari/537.36',
//     'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/99.0.4844.88 Mobile/15E148 Safari/604.1',
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Safari/15.1',
//     'Mozilla/5.0 (Linux; Android 10; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Mobile Safari/537.36',
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/99.0.1150.3 Safari/537.36',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/100.0'
// ];


// // Counter to keep track of the current index
// let currentIndex = 0;

// // Function to get the next user-agent in rotation
// function getNextUserAgent() {
//     const nextUserAgent = user_agents_list[currentIndex];
//     currentIndex = (currentIndex + 1) % user_agents_list.length; // Rotate to the next index
//     return nextUserAgent;
// }

// // Example usage in your Playwright script
// extraHTTPHeaders = {
//   'authority': 'www.google.com',
//     'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
//     'accept-language': 'en-US,en;q=0.9',
//     'cache-control': 'max-age=0',
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
// };



  return [
  async (crawlingContext, gotoOptions) => {

    if (extraHTTPHeaders) {
    //   extraHTTPHeaders = {
    //     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0",
    //     "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    //     "Accept-Language": "en-US,en;q=0.5",
    //     "Accept-Encoding": "gzip, deflate",
    //     "Connection": "keep-alive",
    //     "Upgrade-Insecure-Requests": "1",
    //     "Sec-Fetch-Dest": "document",
    //     "Sec-Fetch-Mode": "navigate",
    //     "Sec-Fetch-Site": "none",
    //     "Sec-Fetch-User": "?1",
    //     "Cache-Control": "max-age=0",
    // }

    

    


      crawlingContext.request.headers = extraHTTPHeaders;

    }
    gotoOptions = { waitUntil: 'networkidle', timeout: 30000 };

  },
]};


// export const preNavigationHooks = (extraHTTPHeaders) => {
 
  
//     return [
//     async (crawlingContext, gotoOptions) => {
//       if (extraHTTPHeaders) {
      
  
//       //put in the proxies here
//         crawlingContext.request.headers = extraHTTPHeaders;
  
//       }
//       gotoOptions = { waitUntil: 'networkidle', timeout: 30000 };
//     },
//   ]};

export const postNavigationHooks = [
  async _crawlingContext => {
    guiInfoLog(guiInfoStatusTypes.COMPLETED);
  },
];

export const failedRequestHandler = async ({ request }) => {
  guiInfoLog(guiInfoStatusTypes.ERROR, { numScanned: 0, urlScanned: request.url });
  crawlee.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
};

export const isUrlPdf = url => {
  return url.split('.').pop() === 'pdf';
};
