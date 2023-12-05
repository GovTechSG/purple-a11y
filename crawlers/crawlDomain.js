/* eslint-disable no-shadow */
/* eslint-disable no-undef */
import crawlee from 'crawlee';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  isUrlPdf,
} from './commonCrawlerFunc.js';
import constants, {
  basicAuthRegex,
  blackListedFileExtensions,
  guiInfoStatusTypes,
} from '../constants/constants.js';
import {
  getPlaywrightLaunchOptions,
  isBlacklistedFileExtensions,
  isSkippedUrl,
} from '../constants/common.js';
import { areLinksEqual } from '../utils.js';
import { handlePdfDownload, runPdfScan, mapPdfScanResults } from './pdfScanFunc.js';
import fs from 'fs';
import { silentLogger, guiInfoLog } from '../logs.js';

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
  fileTypes,
  blacklistedPatterns,
  includeScreenshots,
) => {
  let needsReview = needsReviewItems;
  const isScanHtml = ['all', 'html-only'].includes(fileTypes);
  const isScanPdfs = ['all', 'pdf-only'].includes(fileTypes);
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { maxConcurrency } = constants;
  const { playwrightDeviceDetailsObject } = viewportSettings;

  const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);
  const pdfDownloads = [];
  const uuidToPdfMapping = {};

  if (!fs.existsSync(randomToken)) {
    fs.mkdirSync(randomToken);
  }

  let finalUrl;
  let pagesCrawled;
  let requestLimit = maxRequestsPerCrawl;
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
    await requestQueue.addRequest({ url: finalUrl, skipNavigation: isUrlPdf(finalUrl) });
    pagesCrawled = -1;
  } else {
    await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
    pagesCrawled = 0;
  }

  const enqueueProcess = async (page, enqueueLinks, enqueueLinksByClickingElements) => {
    await enqueueLinks({
      // set selector matches anchor elements with href but not contains # or starting with mailto:
      selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
      strategy,
      requestQueue,
      transformRequestFunction(req) {
        if (isUrlPdf(req.url)) {
          // playwright headless mode does not support navigation to pdf document
          req.skipNavigation = true;
        }
        return req;
      },
    });

    const handleOnWindowOpen = async url => {
      await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
    };
    await page.exposeFunction('handleOnWindowOpen', handleOnWindowOpen);

    await page.evaluate(() => {
      // Override window.open
      window.open = url => {
        window.handleOnWindowOpen(url);
      };
    });

    const handleOnClickEvent = async () => {
      // Intercepting click events to handle cases where request was issued before the frame is created 
      // when a new tab is opened 
      await page.context().route('**', async route => {
        if (route.request().resourceType() === 'document') {
          try {
            const isTopFrameNavigationRequest = () => {
              return route.request().isNavigationRequest() 
                  && route.request().frame() === page.mainFrame();
            }

            if (isTopFrameNavigationRequest()) {
              await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
              await route.abort('aborted');
            } else {
              route.continue();
            }
          } catch (e) {
            silentLogger.info(e);
            route.continue();
          }
        }
      })
    }
    await page.exposeFunction('handleOnClickEvent', handleOnClickEvent)

    await page.evaluate(() => {
      document.addEventListener('click', (event) => handleOnClickEvent(event));
    })

    page.on('request', async request => {
      // Intercepting requests to handle cases where request was issued before the frame is created
      await page.context().route(request.url(), async route => {
          try {
            const isTopFrameNavigationRequest = () => {
            return route.request().isNavigationRequest() 
                && route.request().frame() === page.mainFrame();
            }

            if (route.request().resourceType() === 'document') {
              if (isTopFrameNavigationRequest()) {
                await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
              }
            }
          } catch (e) {
            silentLogger.info(e);
          }
        })
      })

    // Try catch is necessary clicking links is best effort, it may result in new pages that cause browser load or navigation errors that PlaywrightCrawler does not handle
    try {
      await enqueueLinksByClickingElements({
        // set selector matches
        // NOT <a>
        // IS role='link' or button onclick
        // enqueue new page URL
        // handle onclick
        selector: ':not(a):is([role="link"], button[onclick])',
        transformRequestFunction(req) {
          req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
          if (isUrlPdf(req.url)) {
            // playwright headless mode does not support navigation to pdf document
            req.skipNavigation = true;
          }
          return req;
        },
        waitForPageIdleSecs: 10000
      })
    } catch (e) {
      silentLogger.info(e);
    }
  };

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launcher: constants.launcher,
      launchOptions: getPlaywrightLaunchOptions(browser),
      userDataDir: userDataDirectory || '',
    },
    browserPoolOptions: {
      useFingerprints: false,
      preLaunchHooks: [
        async (_pageId, launchContext) => {
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
      browserController,
      page,
      request,
      response,
      crawler,
      sendRequest,
      enqueueLinks,
      enqueueLinksByClickingElements,
    }) => {
      urlsCrawled.everything.push(request.url);
      console.log('TOTAL URLS: ', urlsCrawled.everything.length, ' URLS SCANNED: ', urlsCrawled.scanned.length);
      
      // loadedUrl is the URL after redirects
      const actualUrl = request.loadedUrl || request.url;

      if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
        console.log('TERMINATE');
        crawler.autoscaledPool.abort();
        return;
      }

      // handle pdfs
      if (request.skipNavigation && isUrlPdf(actualUrl)) {
        if (!isScanPdfs) {
          guiInfoLog(guiInfoStatusTypes.SKIPPED, {
            numScanned: urlsCrawled.scanned.length,
            urlScanned: request.url,
          });
          urlsCrawled.blacklisted.push(request.url);
          return;
        }
        const { pdfFileName, trimmedUrl } = handlePdfDownload(
          randomToken,
          pdfDownloads,
          request,
          sendRequest,
          urlsCrawled,
        );

        uuidToPdfMapping[pdfFileName] = trimmedUrl;
        return;
      }

      const resHeaders = response.headers();
      const contentType = resHeaders['content-type'];

      // whitelist html and pdf document types
      if (!contentType.includes('text/html') && !contentType.includes('application/pdf')) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.blacklisted.push(request.url);
        return;
      }

      if (isBlacklistedFileExtensions(actualUrl, blackListedFileExtensions)) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.blacklisted.push(request.url);
        return;
      }

      if (blacklistedPatterns && isSkippedUrl(actualUrl, blacklistedPatterns)) {
        urlsCrawled.userExcluded.push(request.url);
        await enqueueProcess(page, enqueueLinks, enqueueLinksByClickingElements);
        return;
      }

      if (response.status() === 403) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.forbidden.push(request.url);
        return;
      }

      if (response.status() !== 200) {
        guiInfoLog(guiInfoStatusTypes.SKIPPED, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });
        urlsCrawled.invalid.push({ url: request.url });
        return;
      }

      try {
        if (isBasicAuth) {
          isBasicAuth = false;
        } else {
          if (isScanHtml) {
            const results = await runAxeScript(needsReview, includeScreenshots, page, randomToken);
            guiInfoLog(guiInfoStatusTypes.SCANNED, {
              numScanned: urlsCrawled.scanned.length,
              urlScanned: request.url,
            });
            // pagesCrawled ++;
  
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
          } else {
            guiInfoLog(guiInfoStatusTypes.SKIPPED, {
              numScanned: urlsCrawled.scanned.length,
              urlScanned: request.url,
            });
            urlsCrawled.blacklisted.push(request.url);
          }

          await enqueueProcess(page, enqueueLinks, enqueueLinksByClickingElements);
        }
      } catch (e) {
        silentLogger.info(e);
        guiInfoLog(guiInfoStatusTypes.ERROR, {
          numScanned: urlsCrawled.scanned.length,
          urlScanned: request.url,
        });

        console.log('ERROR: ', request.url);
        const browser = browserController.browser;
        page = await browser.newPage();
        await page.goto(request.url);

        await page.route('**', async route => {
          const interceptedRequest = route.request();
          console.log('METHOD: ', interceptedRequest.method());
          if (interceptedRequest.method() === 'POST' && interceptedRequest.resourceType() === 'document') {
            console.log('REDIRECTED URL: ', interceptedRequest.url(), ' FROM: ', request.url);
            await requestQueue.addRequest({ url: interceptedRequest.url(), skipNavigation: isUrlPdf(interceptedRequest.url()) });
            return;
          }
        })
        console.log('ADD URL TO ERRORS: ', request.url);
        urlsCrawled.error.push({ url: request.url });
      }
    },
    failedRequestHandler: async ({ request }) => {
      guiInfoLog(guiInfoStatusTypes.ERROR, {
        numScanned: urlsCrawled.scanned.length,
        urlScanned: request.url,
      });
      crawler.maxRequestsPerCrawl++;
      urlsCrawled.error.push({ url: request.url });
      crawlee.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
    },
    maxRequestsPerCrawl: Infinity,
    maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  });

  await crawler.run();

  if (pdfDownloads.length > 0) {
    // wait for pdf downloads to complete
    await Promise.all(pdfDownloads);

    // scan and process pdf documents
    await runPdfScan(randomToken);

    // transform result format
    const pdfResults = await mapPdfScanResults(randomToken, uuidToPdfMapping);

    // get screenshots from pdf docs
    // if (includeScreenshots) {
    //   await Promise.all(pdfResults.map(
    //     async result => await doPdfScreenshots(randomToken, result)
    //   ));
    // }

    // push results for each pdf document to key value store
    await Promise.all(pdfResults.map(result => dataset.pushData(result)));
  }

  guiInfoLog(guiInfoStatusTypes.COMPLETED);
  return urlsCrawled;
};

export default crawlDomain;
