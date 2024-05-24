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
  isDisallowedInRobotsTxt,
  getUrlsFromRobotsTxt,
  getBlackListedPatterns,
} from '../constants/common.js';
import { areLinksEqual, isFollowStrategy } from '../utils.js';
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
  fileTypes,
  blacklistedPatterns,
  includeScreenshots,
  followRobots,
  extraHTTPHeaders,
  safeMode,
  fromCrawlIntelligentSitemap = false, //optional
  datasetFromIntelligent = null, //optional
  urlsCrawledFromIntelligent = null, //optional

) => {

  let dataset;
  let urlsCrawled
  let requestQueue;

  if (fromCrawlIntelligentSitemap) {
    dataset = datasetFromIntelligent;
    urlsCrawled = urlsCrawledFromIntelligent;
  } else {
    ({ dataset } = await createCrawleeSubFolders(randomToken));
    urlsCrawled = { ...constants.urlsCrawledObj };
  }

  ({ requestQueue } = await createCrawleeSubFolders(randomToken));

  if (!fs.existsSync(randomToken)) {
    fs.mkdirSync(randomToken);
  }

  let pdfDownloads = [];
  let uuidToPdfMapping = {};
  const isScanHtml = ['all', 'html-only'].includes(fileTypes);
  const isScanPdfs = ['all', 'pdf-only'].includes(fileTypes);
  const { maxConcurrency } = constants;
  const { playwrightDeviceDetailsObject } = viewportSettings;
  let actualUrl;
  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth = false;

  /**
   * Regex to match http://username:password@hostname.com
   * utilised in scan strategy to ensure subsequent URLs within the same domain are scanned.
   * First time scan with original `url` containing credentials is strictly to authenticate for browser session
   * subsequent URLs are without credentials.
   */
  const username = basicAuthRegex.test(url) ? url.split('://')[1].split(':')[0] : null;
  const password = basicAuthRegex.test(url) ? url.split(':')[2].split('@')[0] : null;
  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  try {
    url = encodeURI(url);
  }
  catch (e) {
    silentLogger.info(e);
  }

  if (basicAuthRegex.test(url)) {
    isBasicAuth = true;
    actualUrl = `${url.split('://')[0]}://${url.split('@')[1]}`;
    await requestQueue.addRequest({
      url: actualUrl, skipNavigation: isUrlPdf(actualUrl), headers: {
        'Authorization': authHeader
      }
    });
  } else {

    await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });

  }


  const enqueueProcess = async (page, enqueueLinks, enqueueLinksByClickingElements) => {
    try {

      await enqueueLinks({
        // set selector matches anchor elements with href but not contains # or starting with mailto:
        selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
        strategy,
        requestQueue,
        transformRequestFunction(req) {
          try {
            req.url = encodeURI(req.url)
          }
          catch (e) {
            silentLogger.info(e);
          }
          if (urlsCrawled.scanned.some(item => item.url === req.url)) {
            req.skipNavigation = true;
          }
          if (isDisallowedInRobotsTxt(req.url)) return null;
          if (isUrlPdf(req.url)) {
            // playwright headless mode does not support navigation to pdf document
            req.skipNavigation = true;
          }

          return req;
        },
      });

      const handleOnWindowOpen = async url => {
        if (!isDisallowedInRobotsTxt(url)) {
          await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
        }
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
        // when a new tab/window is opened 
        await page.context().route('**/*', async route => {
          if (route.request().resourceType() === 'document') {
            try {
              const isTopFrameNavigationRequest = () => {
                return route.request().isNavigationRequest()
                  && route.request().frame() === page.mainFrame();
              }

              if (isTopFrameNavigationRequest()) {
                const url = route.request().url();
                if (!isDisallowedInRobotsTxt(url)) {
                  await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
                }
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
        try {
          // Intercepting requests to handle cases where request was issued before the frame is created
          await page.context().route(request.url(), async route => {
            const isTopFrameNavigationRequest = () => {
              return route.request().isNavigationRequest()
                && route.request().frame() === page.mainFrame();
            }

            if (route.request().resourceType() === 'document') {
              if (isTopFrameNavigationRequest()) {
                const url = route.request().url();
                if (!isDisallowedInRobotsTxt(url)) {
                  await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
                }
              }
            }
          })
        } catch (e) {
          silentLogger.info(e);
        }
      })
    
      // If safeMode flag is enabled, skip enqueueLinksByClickingElements
      if (!safeMode) {
        // Try catch is necessary as clicking links is best effort, it may result in new pages that cause browser load or navigation errors that PlaywrightCrawler does not handle
        try {
          await enqueueLinksByClickingElements({
            // set selector matches
            // NOT <a>
            // IS role='link' or button onclick
            // enqueue new page URL
            // handle onclick
            selector: ':not(a):is([role="link"], button[onclick])',
            transformRequestFunction(req) {
              try {
                req.url = encodeURI(req.url)
              }
              catch (e) {
                silentLogger.info(e);
              }
              if (urlsCrawled.scanned.some(item => item.url === req.url)) {
                req.skipNavigation = true;
              }
              if (isDisallowedInRobotsTxt(req.url)) return null;
              req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
              if (isUrlPdf(req.url) || urlsCrawled.scanned.some(item => item.url === req.url)) {
                // playwright headless mode does not support navigation to pdf document
                req.skipNavigation = true;
              }

              return req;
            },
          })
        } catch (e) {
          silentLogger.info(e);
        }
      }
    } catch (e) {
      // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
      // Handles browser page object been closed.
    }
  };

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launcher: constants.launcher,
      launchOptions: getPlaywrightLaunchOptions(browser),
      // Bug in Chrome which causes brwoser pool crash when userDataDirectory is set in non-headless mode
      userDataDir: userDataDirectory ? (process.env.CRAWLEE_HEADLESS !== '0' ? userDataDirectory : '') : '',
    },
    retryOnBlocked: true,
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
    preNavigationHooks: basicAuthRegex.test(url)
      ? [
        async ({ page, request }) => {

          request.url = encodeURI(request.url);
          await page.setExtraHTTPHeaders({
            Authorization: authHeader,
            ...extraHTTPHeaders,
          });
        },
      ]
      : [
        async ({ page, request }) => {
        request.url = encodeURI(request.url);
        preNavigationHooks(extraHTTPHeaders)
        //insert other code here
        },
      ]
      ,
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

      function isExcluded(url) {
        // Check if duplicate scan URL
        if (urlsCrawled.scanned.some(item => item.url === url)) {
          guiInfoLog(guiInfoStatusTypes.DUPLICATE, {
            numScanned: urlsCrawled.scanned.length,
            urlScanned: url,
          });

          return false;
        }

        // Check if any pattern matches the URL.
        const blacklistedPatterns = getBlackListedPatterns();
        if (!blacklistedPatterns) { // Check if there are blacklistedPatterns.
          return false;
        }
        try {
          const parsedUrl = new URL(url);
          return blacklistedPatterns.some(pattern =>
            new RegExp(pattern).test(parsedUrl.hostname) || new RegExp(pattern).test(url)
          );
        } catch (error) {
          console.error(`Error parsing URL: ${url}`, error);
          return false;
        }
      }

      try {

        // Set basic auth header if needed
        if (isBasicAuth) await page.setExtraHTTPHeaders({
          'Authorization': authHeader
        });
        
        const waitForPageLoaded = async (page, timeout = 30000) => {
          return Promise.race([
              page.waitForLoadState('load'),
              page.waitForLoadState('networkidle'),
              new Promise((resolve) => setTimeout(resolve, timeout))
          ]);
        }

        await waitForPageLoaded(page, 15000);
        const actualUrl = page.url(); // Initialize with the actual URL

        if (!isScanPdfs) {
          if (isExcluded(actualUrl) || isUrlPdf(actualUrl)) {
            guiInfoLog(guiInfoStatusTypes.SKIPPED, {
              numScanned: urlsCrawled.scanned.length,
              urlScanned: actualUrl,
            });
            return;
          }

          if (isExcluded(actualUrl) || isUrlPdf(actualUrl)) {
            guiInfoLog(guiInfoStatusTypes.SKIPPED, {
              numScanned: urlsCrawled.scanned.length,
              urlScanned: actualUrl,
            });
            return; // Skip processing this URL
          }
        }

        if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
          crawler.autoscaledPool.abort();
          return;
        }

        // if URL has already been scanned
        if (urlsCrawled.scanned.some(item => item.url === request.url)) {
          await enqueueProcess(page, enqueueLinks, enqueueLinksByClickingElements);
          return;
        }

        if (isDisallowedInRobotsTxt(request.url)) {
          await enqueueProcess(page, enqueueLinks, enqueueLinksByClickingElements);
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

        const resHeaders = response ? response.headers() : {}; // Safely access response headers
        const contentType = resHeaders['content-type'] || ''; // Ensure contentType is defined

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
          urlsCrawled.forbidden.push({ url: request.url });
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

        if (isScanHtml) {
          // For deduplication, if the URL is redirected, we want to store the original URL and the redirected URL (actualUrl)
          const isRedirected = !areLinksEqual(request.loadedUrl, request.url);

          // check if redirected link is following strategy (same-domain/same-hostname)
          const isLoadedUrlFollowStrategy = isFollowStrategy(request.loadedUrl, url, strategy);
          if (isRedirected && !isLoadedUrlFollowStrategy) {
            urlsCrawled.notScannedRedirects.push({
              fromUrl: request.url,
              toUrl: request.loadedUrl, // i.e. actualUrl
            });
            return;
          }

          const results = await runAxeScript(includeScreenshots, page, randomToken);

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

            // One more check if scanned pages have reached limit due to multi-instances of handler running
            if (urlsCrawled.scanned.length < maxRequestsPerCrawl) {
              guiInfoLog(guiInfoStatusTypes.SCANNED, {
                numScanned: urlsCrawled.scanned.length,
                urlScanned: request.url,
              });

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
              await dataset.pushData(results);
            }
          } else {

            // One more check if scanned pages have reached limit due to multi-instances of handler running
            if (urlsCrawled.scanned.length < maxRequestsPerCrawl) {
              guiInfoLog(guiInfoStatusTypes.SCANNED, {
                numScanned: urlsCrawled.scanned.length,
                urlScanned: request.url,
              });
              urlsCrawled.scanned.push({ url: request.url, pageTitle: results.pageTitle });
              await dataset.pushData(results);
            }
          }

        } else {
          guiInfoLog(guiInfoStatusTypes.SKIPPED, {
            numScanned: urlsCrawled.scanned.length,
            urlScanned: request.url,
          });
          urlsCrawled.blacklisted.push(request.url);
        }

        if (followRobots) await getUrlsFromRobotsTxt(request.url, browser);
        await enqueueProcess(page, enqueueLinks, enqueueLinksByClickingElements);
      } catch (e) {
        try {
          
          if (!e.message.includes("page.evaluate")) {
            silentLogger.info(e);
            guiInfoLog(guiInfoStatusTypes.ERROR, {
              numScanned: urlsCrawled.scanned.length,
              urlScanned: request.url,
            });
            
            const browser = browserController.browser;
            page = await browser.newPage();
            await page.goto(request.url);
  
            await page.route('**/*', async route => {
              const interceptedRequest = route.request();
              if (interceptedRequest.resourceType() === 'document') {
                await requestQueue.addRequest({ url: interceptedRequest.url(), skipNavigation: isUrlPdf(interceptedRequest.url()) });
                return;
              }
            });
          }

        } catch (e) {
          // Do nothing since the error will be pushed
        }
        urlsCrawled.error.push({ url: request.url });
      }
    },
    failedRequestHandler: async ({ request }) => {
      guiInfoLog(guiInfoStatusTypes.ERROR, {
        numScanned: urlsCrawled.scanned.length,
        urlScanned: request.url,
      });
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
    if (includeScreenshots) {
      await Promise.all(pdfResults.map(
        async result => await doPdfScreenshots(randomToken, result)
      ));
    }

    // push results for each pdf document to key value store
    await Promise.all(pdfResults.map(result => dataset.pushData(result)));
  }

  if (!fromCrawlIntelligentSitemap) {
    guiInfoLog(guiInfoStatusTypes.COMPLETED);
  }

  return urlsCrawled;


};
export default crawlDomain;
