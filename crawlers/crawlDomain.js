import crawlee from 'crawlee';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
} from './commonCrawlerFunc.js';
import constants, { basicAuthRegex, blackListedFileExtensions } from '../constants/constants.js';
import { getPlaywrightLaunchOptions, isBlacklistedFileExtensions } from '../constants/common.js';
import { areLinksEqual } from '../utils.js';
import { runPdfScan } from './pdfScanFunc.js';

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

  const { dataset, requestQueue, pdfStore } = await createCrawleeSubFolders(randomToken);
  const pdfDownloads = [];

  let finalUrl;
  let scanCompleted = false;
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
    requestQueue,
    preNavigationHooks,
    requestHandler: async ({
      page,
      request,
      response,
      sendRequest,
      enqueueLinks,
      enqueueLinksByClickingElements,
    }) => {
      // loadedUrl is the URL after redirects
      const actualUrl = request.loadedUrl || request.url;

      if (isBlacklistedFileExtensions(actualUrl, blackListedFileExtensions)) {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::skipped::${request.url}`);
        }
        urlsCrawled.blacklisted.push(request.url);
        return;
      }

      // handle pdfs
      if (request.skipNavigation && actualUrl.split('.').pop() === 'pdf') {
        pdfDownloads.push(new Promise(async (resolve, rej) => {
          const pdfResponse = await sendRequest({ responseType: 'buffer' });
          // Save the pdf in the key-value store
          const urlObj = new URL(request.url);
          const pdfFileName = `${urlObj.hostname}${urlObj.pathname.replace('/', '_').replace('.pdf', '')}`; 
          await pdfStore.setValue(pdfFileName, pdfResponse.body, { contentType: 'application/pdf'});
          resolve(); 
        }));
        return;
      }

      if (response.status() === 403) {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${request.url}`)
        }
        urlsCrawled.forbidden.push(request.url);
        return;
      }

      if (response.status() !== 200) {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${request.url}`);
        }
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
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${urlsCrawled.scanned.length}::scanned::${request.url}`);
        }

        // For deduplication, if the URL is redirected, we want to store the original URL and the redirected URL (actualUrl)
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

        await enqueueLinks({
          // set selector matches anchor elements with href but not contains # or starting with mailto:
          selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
          strategy,
          requestQueue,
          transformRequestFunction(req) {
            if (isBlacklistedFileExtensions(req.url, blackListedFileExtensions)) {
              if (process.env.RUNNING_FROM_PH_GUI) {
                console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${req.url}`);
              }
              urlsCrawled.blacklisted.push(req.url);
            }

            req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            if (req.url.split('.').pop() === 'pdf') {
              // playwright headless mode does not support navigation to pdf document
              req.skipNavigation = true;
            }
            
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
            if (isBlacklistedFileExtensions(req.url, blackListedFileExtensions)) {
              if (process.env.RUNNING_FROM_PH_GUI) {
                console.log(`Electron crawling::${urlsCrawled.scanned.length}::skipped::${req.url}`);
              }
              urlsCrawled.blacklisted.push(req.url);
            }

            req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            
            if (req.url.split('.').pop() === 'pdf') {
              // playwright headless mode does not support navigation to pdf document
              req.skipNavigation = true;
            }
            return req;
          },
        });
      } else {
        if (process.env.RUNNING_FROM_PH_GUI) {
          console.log(`Electron crawling::${pagesCrawled}::${urlsCrawled.scanned.length}::skipped::${currentUrl}`);
        }
        urlsCrawled.outOfDomain.push(request.url);
      }
    },
    failedRequestHandler,
    maxRequestsPerCrawl,
    maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  });

  await crawler.run();
  await Promise.all(pdfDownloads);
  await runPdfScan(randomToken);
  if (process.env.RUNNING_FROM_PH_GUI) {
    console.log('Electron scan completed');
  }
  return urlsCrawled;
};

export default crawlDomain;
