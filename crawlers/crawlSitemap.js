import crawlee from 'crawlee';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import constants, { guiInfoStatusTypes } from '../constants/constants.js';
import {
  getLinksFromSitemap,
  getPlaywrightLaunchOptions,
  messageOptions,
  isSkippedUrl,
} from '../constants/common.js';
import { areLinksEqual, isWhitelistedContentType } from '../utils.js';
import { guiInfoLog } from '../logs.js';

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
  blacklistedPatterns,
) => {
  const needsReview = needsReviewItems;
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
      launcher: constants.launcher,
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

      if (blacklistedPatterns && isSkippedUrl(actualUrl, blacklistedPatterns)) {
        urlsCrawled.userExcluded.push(request.url);
        return;
      }

      if (status === 403) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.forbidden.push(request.url);
        return;
      }

      if (status !== 200) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.invalid.push(request.url);
        return;
      }

      if (pagesCrawled === maxRequestsPerCrawl) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.exceededRequests.push(request.url);
        return;
      }

      pagesCrawled += 1;

      if (status === 200 && isWhitelistedContentType(contentType)) {
        const results = await runAxeScript(needsReview, page);
        guiInfoLog(guiInfoStatusTypes.SCANNED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });

        const isRedirected = !areLinksEqual(request.loadedUrl, request.url);
        if (isRedirected) {
          const isLoadedUrlInCrawledUrls = urlsCrawled.scanned.some(
            item => (item.actualUrl || item.url) === request.loadedUrl,
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
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });

        urlsCrawled.invalid.push(actualUrl);
      }
    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  });

  await crawler.run();
  await requestList.isFinished();
  guiInfoLog(guiInfoStatusTypes.COMPLETED);
  return urlsCrawled;
};

export default crawlSitemap;
