import crawlee, { playwrightUtils } from 'crawlee';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';
import constants, { basicAuthRegex, blackListedFileExtensions } from '../constants/constants.js';
import { getPlaywrightLaunchOptions, isBlacklistedFileExtensions } from '../constants/common.js';

const crawlDomain = async (
  url,
  randomToken,
  host,
  viewportSettings,
  maxRequestsPerCrawl,
  browser,
  userDataDirectory,
  strategy,
  specifiedMaxConcurrency,
  needsReviewItems,
) => {
  let needsReview = needsReviewItems;
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { maxConcurrency } = constants;
  const { playwrightDeviceDetailsObject } = viewportSettings;

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);

  let finalUrl;
  let pagesCrawled;
  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth = false;
  /**
   * Regex to match http://username:password@hostname.com
   * utilised in scan strategy to ensure subsequent URLs within the same domain are scanned.
   * First time scan with original `url` containing credentials is strictly to authenticate for browser session
   * subsequent URLs are without credentials.
   * pagesCrawled is set to -1 for basic auth URL to ensure it is not counted towards maxRequestsPerCrawl
   */

  if (basicAuthRegex.test(url)) {
    isBasicAuth = true;
    // request to basic auth URL to authenticate for browser session
    await requestQueue.addRequest({ url, uniqueKey: `auth:${url}` });

    // obtain base URL without credentials so that subsequent URLs within the same domain can be scanned
    finalUrl = `${url.split('://')[0]}://${url.split('@')[1]}`;
    await requestQueue.addRequest({ url: finalUrl });
    pagesCrawled = -1;
  } else {
    await requestQueue.addRequest({ url });
    pagesCrawled = 0;
  }

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
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({
      page,
      request,
      response,
      enqueueLinks,
      enqueueLinksByClickingElements,
    }) => {
      // loadedUrl is the URL after redirects
      const actualUrl = request.loadedUrl || request.url;

      if (isBlacklistedFileExtensions(actualUrl, blackListedFileExtensions)) {
        urlsCrawled.blacklisted.push(request.url);
        return;
      }

      if (response.status() === 403) {
        urlsCrawled.forbidden.push(request.url);
        return;
      }

      if (response.status() !== 200) {
        urlsCrawled.invalid.push(request.url);
        return;
      }

      if (pagesCrawled === maxRequestsPerCrawl) {
        urlsCrawled.exceededRequests.push(request.url);
        return;
      }
      pagesCrawled++;

      const location = await page.evaluate('location');

      if (isBasicAuth) {
        isBasicAuth = false;
      } else if (location.host.includes(host)) {
        const results = await runAxeScript(needsReview, page);

        // For deduplication, if the URL is redirected, we want to store the original URL and the redirected URL (actualUrl)
        if (request.loadedUrl !== request.url) {
          const isLoadedUrlInCrawledUrls = urlsCrawled.scanned.some(item => {
            (item.actualUrl || item.url) === request.loadedUrl;
          });

          if (isLoadedUrlInCrawledUrls) {
            urlsCrawled.notScannedRedirects.push({
              fromUrl: request.url,
              toUrl: request.loadedUrl, // i.e. actualUrl
            });
            return;
          } else {
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

        await enqueueLinks({
          // set selector matches anchor elements with href but not contains # or starting with mailto:
          selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
          strategy,
          requestQueue,
          transformRequestFunction(req) {
            if (isBlacklistedFileExtensions(req.url, blackListedFileExtensions)) {
              urlsCrawled.blacklisted.push(req.url);
            }

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
            if (isBlacklistedFileExtensions(req.url, blackListedFileExtensions)) {
              urlsCrawled.blacklisted.push(req.url);
            }

            req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            return req;
          },
        });
      } else {
        urlsCrawled.outOfDomain.push(request.url);
      }
    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  });

  await crawler.run();
  return urlsCrawled;
};

export default crawlDomain;
