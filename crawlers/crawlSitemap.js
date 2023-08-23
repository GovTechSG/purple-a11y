import crawlee from 'crawlee';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import constants from '../constants/constants.js';
import {
  getLinksFromSitemap,
  getPlaywrightLaunchOptions,
  messageOptions,
} from '../constants/common.js';
import { areLinksEqual, isWhitelistedContentType } from '../utils.js';

const crawlSitemap = async (
  sitemapUrl,
  randomToken,
  host,
  viewportSettings,
  maxRequestsPerCrawl,
  browser,
  userDataDirectory,
  specifiedMaxConcurrency,
  needsReviewItems,
) => {
  let needsReview = needsReviewItems;

  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { playwrightDeviceDetailsObject } = viewportSettings;
  const { maxConcurrency } = constants;

  printMessage(['Fetching URLs. This might take some time...'], { border: false });
  const requestList = new crawlee.RequestList({
    sources: await getLinksFromSitemap(sitemapUrl, maxRequestsPerCrawl, browser, userDataDirectory),
  });
  await requestList.initialize();
  printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);

  const { dataset } = await createCrawleeSubFolders(randomToken);
  let pagesCrawled;

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launchOptions: getPlaywrightLaunchOptions(browser),
      userDataDir: userDataDirectory || '',
    },
    browserPoolOptions: {
      useFingerprints: false,
      preLaunchHooks: [
        async (pageId, launchContext) => {
          launchContext.launchOptions = {
            ...launchContext.launchOptions,
            bypassCSP: true,
            ignoreHTTPSErrors: true,
            ...playwrightDeviceDetailsObject,
          };
        },
      ],
    },
    requestList,
    preNavigationHooks,
    requestHandler: async ({ page, request, response }) => {
      const actualUrl = request.loadedUrl || request.url;
      const contentType = response.headers()['content-type'];
      const status = response.status();

      if (status === 403) {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${request.url}`)
        }
        urlsCrawled.forbidden.push(request.url);
        return;
      }

      if (status !== 200) {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::${request.url}`)
        }
        urlsCrawled.invalid.push(request.url);
        return;
      }

      if (pagesCrawled === maxRequestsPerCrawl) {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${request.url}`)
        }
        urlsCrawled.exceededRequests.push(request.url);
        return;
      }

      pagesCrawled++;

      if (status === 200 && isWhitelistedContentType(contentType)) {
        const results = await runAxeScript(needsReview, page);
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::scanned::${request.url}`);
        }  

        const isRedirected = !areLinksEqual(request.loadedUrl, request.url);
        if (isRedirected) {
          const isLoadedUrlInCrawledUrls = urlsCrawled.scanned.some(
            item =>  (item.actualUrl || item.url) === request.loadedUrl,
          );

          if (isLoadedUrlInCrawledUrls) {
            urlsCrawled.notScannedRedirects.push({
              fromUrl: request.url,
              toUrl: request.loadedUrl, // i.e. actualUrl
            });
            return;
          }

          urlsCrawled.scanned.push({
            url: request.url,
            pageTitle: results.pageTitle,
            actualUrl: request.loadedUrl, // i.e. actualUrl
          });

          urlsCrawled.scannedRedirects.push({
            fromUrl: request.url,
            toUrl: request.loadedUrl, // i.e. actualUrl
          });

          results.url = request.url;
          results.actualUrl = request.loadedUrl;
        } else {
          urlsCrawled.scanned.push({ url: request.url, pageTitle: results.pageTitle });
        }
        await dataset.pushData(results);
      } else {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${actualUrl}`);
        }
  
        urlsCrawled.invalid.push(actualUrl);
      }
    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  });

  await crawler.run();
  await requestList.isFinished();
  if (process.env.RUNNING_FROM_PH_GUI) {
    console.log('Electron scan completed');
  }
  return urlsCrawled;
};

export default crawlSitemap;
