import crawlee from 'crawlee';
import { devices } from 'playwright';

import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';
import constants from '../constants/constants.js';

const crawlDomain = async (url, randomToken, host, viewportSettings, maxRequestsPerCrawl, strategy) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { maxConcurrency } = constants;
  const { deviceChosen, customDevice, viewportWidth } = viewportSettings;

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);

  await requestQueue.addRequest({ url });

  // customDevice check for website scan
  let device;
  if (deviceChosen === 'Mobile' || customDevice === 'iPhone 11') {
    device = devices['iPhone 11'];
  } else if (customDevice === 'Samsung Galaxy S9+') {
    device = devices['Galaxy S9+'];
  } else if (viewportWidth) {
    device = { viewport: { width: Number(viewportWidth), height: 720 } };
  } else if (customDevice) {
    device = devices[customDevice.replace('_', / /g)];
  } else {
    device = {};
  }

  let pagesCrawled = 0;

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launchOptions: {
        args: constants.launchOptionsArgs,
      },
    },
    browserPoolOptions: {
      useFingerprints: false,
      preLaunchHooks: [
        async (pageId, launchContext) => {
          launchContext.launchOptions = {
            ...launchContext.launchOptions,
            bypassCSP: true,
            ignoreHTTPSErrors: true,
            ...device,
          };
        },
      ],
    },
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({ page, request, enqueueLinks, enqueueLinksByClickingElements }) => {
      if (pagesCrawled === maxRequestsPerCrawl) {
        return;
      }
      pagesCrawled++;
      
      const currentUrl = request.url;
      const location = await page.evaluate('location');

      if (location.host.includes(host)) {
        const results = await runAxeScript(page);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);

        await enqueueLinks({
          // set selector matches anchor elements with href but not contains # or starting with mailto:
          selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
          strategy,
          requestQueue,
          transformRequestFunction(req) {
            // ignore all links ending with `.pdf`
            req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            return req;
          },
        });

        await enqueueLinksByClickingElements({
          // set selector matches
          // NOT <a>
          // IS role='link' or button onclick
          // enqueue new page URL
          selector: ':not(a):is(*[role="link"], button[onclick])',
          transformRequestFunction(req) {
            // ignore all links ending with `.pdf`
            req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            return req;
          },
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

export default crawlDomain;
