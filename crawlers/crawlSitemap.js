import crawlee from 'crawlee';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';

import constants, { blackListedFileExtensions } from '../constants/constants.js';
import {
  getLinksFromSitemap,
  getPlaywrightLaunchOptions,
  isBlacklistedFileExtensions,
  messageOptions,
} from '../constants/common.js';
import { isWhitelistedContentType } from '../utils.js';

const crawlSitemap = async (
  sitemapUrl,
  randomToken,
  host,
  viewportSettings,
  maxRequestsPerCrawl,
  browser,
  userDataDirectory,
  specifiedMaxConcurrency,
) => {
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
    requestHandler: async ({ page, request, response}) => {
      const actualUrl = request.loadedUrl || request.url;
      const contentType = response.headers()['content-type'];
      const status = response.status();

      if (status === 403){
        urlsCrawled.forbidden.push(request.url);
        return;
      }

      if (status !== 200) {
        urlsCrawled.invalid.push(request.url);
        return;
      }

      if (pagesCrawled === maxRequestsPerCrawl) {
        urlsCrawled.exceededRequests.push(request.url);
        return;
      }

      pagesCrawled++;

      if (status === 200 && isWhitelistedContentType(contentType)) {
        const results = await runAxeScript(page);
        if (request.loadedUrl !== request.url) {
          const isLoadedUrlInCrawledUrls = urlsCrawled.scanned.some(
            (item) => {
              if (item.hasOwnProperty(actualUrl)){
                return item.actualUrl === request.loadedUrl
              } else {
                return item.url === request.loadedUrl
              }
            }
          );

          if (isLoadedUrlInCrawledUrls){
            urlsCrawled.notScannedRedirects.push({
              fromUrl: request.url,
              toUrl: request.loadedUrl, // i.e. actualUrl              
            })
            return;
          }  else {
            urlsCrawled.scanned.push({
              url: request.url,
              pageTitle: results.pageTitle,
              actualUrl: request.loadedUrl, // i.e. actualUrl
            });
  
            urlsCrawled.scannedRedirects.push({
              fromUrl: request.url,
              toUrl: request.loadedUrl, // i.e. actualUrl
            });
          }

          results.url = request.url;
          results.actualUrl = request.loadedUrl;
        } else {
          urlsCrawled.scanned.push({ url: request.url, pageTitle: results.pageTitle });
        }
        await dataset.pushData(results);
      } else {
        urlsCrawled.invalid.push(actualUrl);
      }

    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  });

  await crawler.run();
  await requestList.isFinished();
  return urlsCrawled;
};

export default crawlSitemap;
