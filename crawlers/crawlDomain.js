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
  urlWithoutAuth
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
  
  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth = false;
  let authHeader = "";

  // Test basic auth and add auth header if auth exist
  const parsedUrl = new URL(url);
  if (parsedUrl.username !=="" && parsedUrl.password !=="") {
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
    await requestQueue.addRequest({ url, skipNavigation: isUrlPdf(url) });
  }

  const enqueueProcess = async (page, enqueueLinks, browserController) => {
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
          console.log('ELBCE start');
          await customEnqueueLinksByClickingElements(page, browserController);
          console.log('ELBCE end');
        } catch (e) {
          console.log('ELBCE main error :',e);
          silentLogger.info(e);
        }
      }
    } catch (e) {
      // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
      // Handles browser page object been closed.
    }
  };
  
  const customEnqueueLinksByClickingElements = async (page, browserController) => {
    const initialPageUrl = page.url().toString();

    function isExcluded(newPageUrl) {
      const isAlreadyScanned = urlsCrawled.scanned.some(item => item.url === newPageUrl);
      const isBlacklistedUrl = isBlacklisted(newPageUrl);
      const isNotFollowStrategy = !isFollowStrategy(newPageUrl, initialPageUrl, strategy);
      return isAlreadyScanned || isBlacklistedUrl || isNotFollowStrategy;
    }

    const setPageListeners = page => {
      page.on('popup', async newPage => {
        try {
          console.log('ELBCE [POPUP 1/2] url:', newPage.url());
          if (newPage.url() == initialPageUrl || isExcluded(newPage.url())) {
            console.log('ELBCE [POPUP closed!] url:', newPage.url());
            newPage.close();
            return;
          }
          await requestQueue.addRequest({
            url: encodeURI(newPage.url()),
            skipNavigation: isUrlPdf(newPage.url()),
          });
          console.log('ELBCE [POPUP 2/2] url added to requestQueue:', newPage.url());
          return;
        } catch (e) {
          console.log('ELBCE [POPUP error]:', e);
        }
      });

      page.on('framenavigated', async frame => {
        try {
          console.log('ELBCE [FRAME 1/3] url:', frame.url());
          if (frame.url() == 'about:blank') {
            console.log('ELBCE [FRAME 2/2] url is about blank so its excluded:', frame.url());
          } else if (frame.url() !== initialPageUrl && !isExcluded(frame.url())) {
            await requestQueue.addRequest({
              url: frame.url(),
              skipNavigation: isUrlPdf(frame.url()),
            });
            console.log(
              'ELBCE [FRAME 2/2] url is new and not excluded, added to requestQueue:',
              frame.url(),
            );
          }
          return;
        } catch (e) {
          console.log('ELBCE [FRAME error]:', e);
        }
      });
    };

    setPageListeners(page);
    let currentElementIndex = 0;
    let isAllElementsHandled = false;

    while (true) {
      try {
        if (page.url() != initialPageUrl) {
          console.log(
            'page.url() != initialPageUrl. heading back to initialPageUrl',
            initialPageUrl,
          );
          await page.close();
          page = await browserController.browser.newPage();
          await page.goto(initialPageUrl, {
            waitUntil: 'domcontentloaded', // You can also specify other events like 'load', 'networkidle'
          });
          setPageListeners(page);
          console.log('finish page goto');
        }

        const selectedElements = await page.$$(':not(a):is([role="link"], button[onclick])');
        if (currentElementIndex + 1 > selectedElements.length || !selectedElements) {
          break;
        }

        if (currentElementIndex + 2 > selectedElements.length) {
          isAllElementsHandled = true;
        }
        let element = selectedElements[currentElementIndex];
        currentElementIndex += 1;
        const id = await element.getAttribute('id');

        let newUrl = null;
        if (await element.isVisible()) {
          console.log(
            `ELBCE [CLICK 1/3 START] url: ${page.url()} , selectedElements.length: ${selectedElements.length}, id: ${id}`,
          );
          // Find url in buttons without clicking them
          await page
            .evaluate(element => {
              let onClickLink = null;
              let onClickLinkAttr = element.getAttribute('onclick');

              if (onClickLinkAttr) {
                urlRegexDetected = onClickLinkAttr.match(/window\.location\.href\s?=\s?'([^']+)'/);
                onClickLink = urlRegexDetected ? urlRegexDetected[1] : undefined;
              }

              let hrefLink = element.getAttribute('href');
              let newUrlOnPage = undefined;
              newUrlOnPage = onClickLink || hrefLink || null;
              return newUrlOnPage;
            }, element)
            .then(result => {
              newUrl = result;
            });

          if (newUrl && !isExcluded(newUrl)) {
            console.log('ELBCE [CLICK 2/3] autofind PASS - newUrl found & not excluded:', newUrl);
            // (!isExcluded(newUrl)) ? await requestQueue.addRequest({ url: newUrl, skipNavigation: isUrlPdf(newUrl) }) : undefined;
            await requestQueue.addRequest({ url: newUrl, skipNavigation: isUrlPdf(newUrl) });
            console.log(
              'ELBCE [CLICK 3/3 END] autofind PASS - newUrl added to requestQueue:',
              newUrl,
            );
          } else if (!newUrl) {
            try {
              console.log('ELBCE [CLICK 2/3] manual click START - because autofind FAIL');
              // Find url in buttons by clicking them

              await element.click();
              console.log('ELBCE [CLICK 3/3 END] manual click end');

              await page.waitForTimeout(1000); // Add a delay of 1 second between each button click
            } catch (e) {
              console.log(`ELBCE [ClICK] manual click error:`, e);
            }
          }
        }

        if (isAllElementsHandled) {
          await page.close();
          break;
        }
      } catch (e) {
        console.log(`ELBCE [CLICK] main error:`, e);
      }
    }

    return;
  };

  function isBlacklisted(url) {
    // Check if any pattern matches the URL.
    const blacklistedPatterns = getBlackListedPatterns();
    if (!blacklistedPatterns) {
      // Check if there are blacklistedPatterns.
      return false;
    }
    try {
      const parsedUrl = new URL(url);
      return blacklistedPatterns.some(
        pattern => new RegExp(pattern).test(parsedUrl.hostname) || new RegExp(pattern).test(url),
      );
    } catch (error) {
      console.error(`Error parsing URL: ${url}`, error);
      return false;
    }
  }

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
    }) => {
      console.log('[REQUEST HANDLER] request.url :',request.url);

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

        if (isBlacklisted(actualUrl) || (isUrlPdf(actualUrl) && !isScanPdfs)) {
          guiInfoLog(guiInfoStatusTypes.SKIPPED, {
            numScanned: urlsCrawled.scanned.length,
            urlScanned: actualUrl,
          });
          return;
        }

        if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
          crawler.autoscaledPool.abort();
          return;
        }

        // if URL has already been scanned
        if (urlsCrawled.scanned.some(item => item.url === request.url)) {
          await enqueueProcess(page, enqueueLinks, browserController);
          return;
        }

        if (isDisallowedInRobotsTxt(request.url)) {
          await enqueueProcess(page, enqueueLinks, browserController);
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
          await enqueueProcess(page, enqueueLinks, browserController);
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
          const isLoadedUrlFollowStrategy = isFollowStrategy(request.loadedUrl, request.url, strategy);
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
        await enqueueProcess(page, enqueueLinks, browserController);
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
