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
  urlWithoutAuth,
  messageOptions,
} from '../constants/common.js';
import { areLinksEqual, isFollowStrategy } from '../utils.js';
import { handlePdfDownload, runPdfScan, mapPdfScanResults } from './pdfScanFunc.js';
import fs from 'fs';
import { silentLogger, guiInfoLog } from '../logs.js';
import printMessage from 'print-message';
import playwright from 'playwright';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth = false;
  let authHeader = "";

  // Test basic auth and add auth header if auth exist
  const parsedUrl = new URL(url);
  if (parsedUrl.username !== "" && parsedUrl.password !== "") {
    isBasicAuth = true;
    const username = decodeURIComponent(parsedUrl.username);
    const password = decodeURIComponent(parsedUrl.password);

    // Create auth header
    authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    // Remove username from parsedUrl
    parsedUrl.username = "";
    parsedUrl.password = "";
    // Send the finalUrl without credentials by setting auth header instead
    const finalUrl = parsedUrl.toString();

    await requestQueue.addRequest({
      url: finalUrl, skipNavigation: isUrlPdf(finalUrl), headers: {
        'Authorization': authHeader
      }
    });
  } else {
    try {
      const browser = await playwright.chromium.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-http2' // Disable HTTP/2
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: null,
        timeout: 60000 // Set timeout to 60 seconds
      });

      const page = await browser.newPage();
      console.log(url)

      page.on('response', response => {
        console.log('Response URL:', response.url());  // Logs out each URL that loads
      });
      let redirectUrl = url;
      try {
        // Navigate to the URL
        await page.goto(url, { waitUntil: 'networkidle' });
        await delay(2000);
      } catch (e) {
        console.log('Error:', e);
        await browser.close();
      } finally {
        redirectUrl = page.url()
        await browser.close();
      }

      console.log('Final URL:', typeof (page.url()), page.url(), 'hi');
      if (typeof page.url() !== 'string' || page.url().trim() === '') {
        console.error('Invalid URL:', url);
      } else {
        if (redirectUrl == "chrome-error://chromewebdata/") {
          console.log('hi')
          printMessage([`No pages were scanned.`]);
          return;
        }
        console.log("help")
        await requestQueue.addRequest({ url: redirectUrl, skipNavigation: isUrlPdf(redirectUrl) });
      }
    } catch (e) {
      console.log(e)
    }
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
          await page.context().route(encodeURI(request.url()), async route => {
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
    preNavigationHooks: isBasicAuth
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
      ],
    requestHandlerTimeoutSecs: 90, // Alow each page to be processed by up from default 60 seconds
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
      console.log("url", url)
      url = request.url;

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

        const waitForPageLoaded = async (page, timeout = 10000) => {
          return Promise.race([
            page.waitForLoadState('load'),
            page.waitForLoadState('networkidle'),
            new Promise((resolve) => setTimeout(resolve, timeout))
          ]);
        }

        await waitForPageLoaded(page, 10000);
        let actualUrl = request.url;

        if (page.url() !== 'about:blank') {
          actualUrl = page.url();
        }

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
                url: urlWithoutAuth(request.url),
                pageTitle: results.pageTitle,
                actualUrl: request.loadedUrl, // i.e. actualUrl
              });

              urlsCrawled.scannedRedirects.push({
                fromUrl: urlWithoutAuth(request.url),
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
                urlScanned: urlWithoutAuth(request.url),
              });
              urlsCrawled.scanned.push({ url: urlWithoutAuth(request.url), pageTitle: results.pageTitle });
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
