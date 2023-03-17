import crawlee from 'crawlee';
import { devices } from 'playwright';

import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';
import constants from '../constants/constants.js';


const crawlDomain = async (url, randomToken, host, viewportSettings, maxRequestsPerCrawl) => {
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { maxConcurrency } = constants;
  const { deviceChosen, customDevice, viewportWidth } = viewportSettings;

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);

  await requestQueue.addRequest({ url });

  // customDevice check for website scan
  let device;
  if (customDevice === 'Samsung Galaxy S9+') {
    device = devices['Galaxy S9+'];
  } else if (customDevice === 'iPhone 11') {
    device = devices['iPhone 11'];
  } else if (customDevice) {
    device = devices[customDevice.replace('_', / /g)];
  }

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launchOptions: {
        args: constants.launchOptionsArgs,
      },
    },
    browserPoolOptions: {
      useFingerprints: false,
      preLaunchHooks: [async (pageId, launchContext) => {
        
        launchContext.launchOptions = {
          ...launchContext.launchOptions,
          bypassCSP: true,
          ignoreHTTPSErrors: true,
        };

        if (deviceChosen === 'Custom') {
          if (device) {
            launchContext.launchOptions.viewport = device.viewport;
            launchContext.launchOptions.userAgent = device.userAgent; 
            launchContext.launchOptions.isMobile = true;
          } else {
            launchContext.launchOptions.viewport= { width: Number(viewportWidth), height: 800 };
          }
        } else if (deviceChosen === 'Mobile') {
          launchContext.launchOptions.viewport = { width: 360, height: 720 };
          launchContext.launchOptions.isMobile = true;
        }

      }],
    },
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({ page, request, enqueueLinks, enqueueLinksByClickingElements }) => {

      const currentUrl = request.url;
      const location = await page.evaluate('location');

      if (location.host.includes(host)) {
        const results = await runAxeScript(page, host);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);

        await enqueueLinks({
          // set selector matches anchor elements with href but not contains # or starting with mailto:
          selector:'a:not(a[href*="#"],a[href^="mailto:"])',
          strategy: 'same-domain',
          requestQueue,
        });

        await enqueueLinksByClickingElements({
          // set selector matches
          // NOT <a>
          // IS role='link' or onclick
          // enqueue new page URL
          selector: ':not(a):is(*[role="link"], *[onclick])',
          requestQueue,
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
