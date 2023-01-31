import crawlee from 'crawlee';
import { KnownDevices } from 'puppeteer';
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

  let device;

  // customDevice check for website scan
  if (customDevice === 'Samsung Galaxy S9+') {
    device = KnownDevices['Galaxy S9+'];
  } else if (customDevice === 'iPhone 11') {
    device = KnownDevices['iPhone 11'];
  } else if (customDevice) {
    device = KnownDevices[customDevice.replace('_', / /g)];
  }

  const crawler = new crawlee.PuppeteerCrawler({
    launchContext: {
      launchOptions: {
          args: constants.launchOptionsArgs,
      }
    },
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({page, request, enqueueLinks }) => {
      if (deviceChosen === 'Custom') {
        if (device) {
          await page.emulate(device);
        } else {
          await page.setViewport({
            width: Number(viewportWidth),
            height: page.viewport().height,
            isMobile: true,
          });
        }
      } else if (deviceChosen === 'Mobile') {
        await page.setViewport({
          width: 360,
          height: page.viewport().height,
          isMobile: true,
        });
      }
      
      const currentUrl = request.url;
      const location = await page.evaluate('location');

      if (location.host.includes(host)) {
        const results = await runAxeScript(page, host);
        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);

        await enqueueLinks({
          selector: 'a',
          strategy: 'same-domain',
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
