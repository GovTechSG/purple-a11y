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
  waitForPageLoaded,
} from '../constants/common.js';
import { areLinksEqual, isFollowStrategy } from '../utils.js';
import { handlePdfDownload, runPdfScan, mapPdfScanResults } from './pdfScanFunc.js';
import fs from 'fs';
import { silentLogger, guiInfoLog } from '../logs.js';
import type { BrowserContext, ElementHandle, Frame, Page } from 'playwright';

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
  safeMode = false, // optional
  fromCrawlIntelligentSitemap = false, //optional
  datasetFromIntelligent = null, //optional
  urlsCrawledFromIntelligent = null, //optional
) => {
  let dataset;
  let urlsCrawled;
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
  let authHeader = '';

  // Test basic auth and add auth header if auth exist
  const parsedUrl = new URL(url); 
  let username:string;
  let password:string;
  if (parsedUrl.username !== '' && parsedUrl.password !== '') {
    isBasicAuth = true;
    username= decodeURIComponent(parsedUrl.username);
    password = decodeURIComponent(parsedUrl.password);

    // Create auth header
    authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    // Remove username from parsedUrl
    parsedUrl.username = '';
    parsedUrl.password = '';
    // Send the finalUrl without credentials by setting auth header instead
    const finalUrl = parsedUrl.toString();

    await requestQueue.addRequest({
      url: encodeURI(finalUrl),
      skipNavigation: isUrlPdf(encodeURI(finalUrl)),
      headers: {
        Authorization: authHeader,
      },
    });
  } else {
    await requestQueue.addRequest({
      url: encodeURI(url),
      skipNavigation: isUrlPdf(encodeURI(url)),
    });
  }

  const enqueueProcess = async (page, enqueueLinks, browserContext) => {
    try {
      await enqueueLinks({
        // set selector matches anchor elements with href but not contains # or starting with mailto:
        selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
        strategy,
        requestQueue,
        transformRequestFunction(req) {
          try {
            req.url = encodeURI(req.url);
          } catch (e) {
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
          await requestQueue.addRequest({
            url: encodeURI(url),
            skipNavigation: isUrlPdf(encodeURI(url)),
          });
        }
      };
      await page.exposeFunction('handleOnWindowOpen', handleOnWindowOpen);

      await page.evaluate(() => {
        // Override window.open
        window.open = (url?: string | URL, target?: string, features?: string): Window => {
          // Call the exposed handleOnWindowOpen function
          handleOnWindowOpen(url as string);
      
          // Create a dummy window object to return (can be an actual opened window if needed)
          const newWindow = document.createElement('a');
          newWindow.href = typeof url === 'string' ? url : url.toString();
          return newWindow as unknown as Window;
        };
      });

      const handleOnClickEvent = async () => {
        // Intercepting click events to handle cases where request was issued before the frame is created
        // when a new tab/window is opened
        await page.context().route('**/*', async route => {
          if (route.request().resourceType() === 'document') {
            try {
              const isTopFrameNavigationRequest = () => {
                return (
                  route.request().isNavigationRequest() &&
                  route.request().frame() === page.mainFrame()
                );
              };

              if (isTopFrameNavigationRequest()) {
                const url = route.request().url();
                if (!isDisallowedInRobotsTxt(url)) {
                  await requestQueue.addRequest({
                    url: encodeURI(url),
                    skipNavigation: isUrlPdf(encodeURI(url)),
                  });
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
        });
      };
      await page.exposeFunction('handleOnClickEvent', handleOnClickEvent);

      await page.evaluate(() => {
        document.addEventListener('click', event => handleOnClickEvent());
      });

      page.on('request', async request => {
        try {
          // Intercepting requests to handle cases where request was issued before the frame is created
          await page.context().route(request.url(), async route => {
            const isTopFrameNavigationRequest = () => {
              return (
                route.request().isNavigationRequest() &&
                route.request().frame() === page.mainFrame()
              );
            };

            if (route.request().resourceType() === 'document') {
              if (isTopFrameNavigationRequest()) {
                const url = route.request().url();
                if (!isDisallowedInRobotsTxt(url)) {
                  await requestQueue.addRequest({
                    url: encodeURI(url),
                    skipNavigation: isUrlPdf(encodeURI(url)),
                  });
                }
              }
            }
          });
        } catch (e) {
          silentLogger.info(e);
        }
      });

      // If safeMode flag is enabled, skip enqueueLinksByClickingElements
      if (!safeMode) {
        // Try catch is necessary as clicking links is best effort, it may result in new pages that cause browser load or navigation errors that PlaywrightCrawler does not handle
        try {
          await customEnqueueLinksByClickingElements(page, browserContext);
        } catch (e) {
          silentLogger.info(e);
        }
      }
    } catch (e) {
      // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
      // Handles browser page object been closed.
    }
  };

  const customEnqueueLinksByClickingElements = async (page: Page, browserContext: BrowserContext): Promise<void> => {
    const initialPageUrl: string = page.url().toString();

    const isExcluded = (newPageUrl: string): boolean => {
      const isAlreadyScanned: boolean = urlsCrawled.scanned.some(item => item.url === newPageUrl);
      const isBlacklistedUrl: boolean = isBlacklisted(newPageUrl);
      const isNotFollowStrategy: boolean = !isFollowStrategy(newPageUrl, initialPageUrl, strategy);
      return isAlreadyScanned || isBlacklistedUrl || isNotFollowStrategy;
    };
    const setPageListeners = (page: Page) : void => {
      // event listener to handle new page popups upon button click
      page.on('popup', async (newPage: Page) => {
        try {
          if (newPage.url() != initialPageUrl && !isExcluded(newPage.url())) {
            await requestQueue.addRequest({
              url: encodeURI(newPage.url()),
              skipNavigation: isUrlPdf(encodeURI(newPage.url())),
            });
          }
          else {
            try {
              await newPage.close();
            }
            catch (e) {
              // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
              // Handles browser page object been closed.
            }
          }
          return;
        }
        catch (e) {
          // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
          // Handles browser page object been closed.
        }
      });
      // event listener to handle navigation to new url within same page upon element click
      page.on('framenavigated', async (newFrame: Frame) => {
        try {
          if (newFrame.url() !== initialPageUrl &&
            !isExcluded(newFrame.url()) &&
            !(newFrame.url() == 'about:blank')) {
            await requestQueue.addRequest({
              url: encodeURI(newFrame.url()),
              skipNavigation: isUrlPdf(encodeURI(newFrame.url())),
            });
          }
          return;
        }
        catch (e) {
          // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
          // Handles browser page object been closed.
        }
      });
    };
    setPageListeners(page);
    let currentElementIndex: number = 0;
    let isAllElementsHandled: boolean = false;
    while (!isAllElementsHandled) {
      try {
        //navigate back to initial page if clicking on a element previously caused it to navigate to a new url
        if (page.url() != initialPageUrl) {
          try {
            await page.close();
          }
          catch (e) {
            // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
            // Handles browser page object been closed.
          }
          page = await browserContext.newPage()
          await page.goto(initialPageUrl, {
            waitUntil: 'domcontentloaded',
          });
          setPageListeners(page);
        }
        const selectedElements: ElementHandle<SVGElement | HTMLElement>[] = await page.$$(':not(a):is([role="link"], button[onclick]), a:not([href])');
        // edge case where there might be elements on page that appears intermittently
        if (currentElementIndex + 1 > selectedElements.length || !selectedElements) {
          break;
        }
        // handle the last element in selectedElements
        if (currentElementIndex + 1 == selectedElements.length) {
          isAllElementsHandled = true;
        }
        let element: ElementHandle<SVGElement | HTMLElement> = selectedElements[currentElementIndex];
        currentElementIndex += 1;
        let newUrlFoundInElement: string = null;
        if (await element.isVisible()) {
          // Find url in html elements without clicking them
          await page
            .evaluate(element => {

              //find href attribute
              let hrefUrl: string = element.getAttribute('href');

              //find url in datapath
              let dataPathUrl: string = element.getAttribute('data-path');

              return hrefUrl || dataPathUrl;
            }, element)
            .then(result => {
              if (result) {
                newUrlFoundInElement = result;
                const pageUrl: URL = new URL(page.url());
                const baseUrl: string = `${pageUrl.protocol}//${pageUrl.host}`;
                let absoluteUrl: URL;
                // Construct absolute URL using base URL
                try {
                  // Check if newUrlFoundInElement is a valid absolute URL
                  absoluteUrl = new URL(newUrlFoundInElement);
                }
                catch (e) {
                  // If it's not a valid URL, treat it as a relative URL
                  absoluteUrl = new URL(newUrlFoundInElement, baseUrl);
                }
                newUrlFoundInElement = absoluteUrl.href;
              }
            });
          if (newUrlFoundInElement && !isExcluded(newUrlFoundInElement)) {
            await requestQueue.addRequest({
              url: encodeURI(newUrlFoundInElement),
              skipNavigation: isUrlPdf(encodeURI(newUrlFoundInElement)),
            });
          }
          else if (!newUrlFoundInElement) {
            try {
              // Find url in html elements by manually clicking them. New page navigation/popups will be handled by event listeners above
              await element.click();
              await page.waitForTimeout(1000); // Add a delay of 1 second between each Element click
            }
            catch (e) {
              // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
              // Handles browser page object been closed.
            }
          }
        }
      }
      catch (e) {
        // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
        // Handles browser page object been closed.
      }
    }
    return;
  };

  const isBlacklisted = url => {
    const blacklistedPatterns = getBlackListedPatterns(null);
    if (!blacklistedPatterns) {
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
  };

  let isAbortingScanNow = false;

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launcher: constants.launcher,
      launchOptions: getPlaywrightLaunchOptions(browser),
      // Bug in Chrome which causes brwoser pool crash when userDataDirectory is set in non-headless mode
      userDataDir: userDataDirectory
        ? process.env.CRAWLEE_HEADLESS !== '0'
          ? userDataDirectory
          : ''
        : '',
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
            preNavigationHooks(extraHTTPHeaders);
          },
        ],
    requestHandlerTimeoutSecs: 90, // Alow each page to be processed by up from default 60 seconds
    requestHandler: async ({
      page,
      request,
      response,
      crawler,
      sendRequest,
      enqueueLinks,
    }) => {
      const browserContext: BrowserContext = page.context();
      try {
        // Set basic auth header if needed
        if (isBasicAuth)
        {
          await page.setExtraHTTPHeaders({
            Authorization: authHeader,
          });
          const currentUrl = new URL(request.url);
          currentUrl.username = username;
          currentUrl.password = password;
          request.url = currentUrl.href;          
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
          isAbortingScanNow = true;
          crawler.autoscaledPool.abort();
          return;
        }

        // if URL has already been scanned
        if (urlsCrawled.scanned.some(item => item.url === request.url)) {
          await enqueueProcess(page, enqueueLinks, browserContext);
          return;
        }

        if (isDisallowedInRobotsTxt(request.url)) {
          await enqueueProcess(page, enqueueLinks, browserContext);
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
          const { pdfFileName, url } = handlePdfDownload(
            randomToken,
            pdfDownloads,
            request,
            sendRequest,
            urlsCrawled,
          );

          uuidToPdfMapping[pdfFileName] = url;
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
          await enqueueProcess(page, enqueueLinks, browserContext);
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
          const isLoadedUrlFollowStrategy = isFollowStrategy(
            request.loadedUrl,
            request.url,
            strategy,
          );
          if (isRedirected && !isLoadedUrlFollowStrategy) {
            urlsCrawled.notScannedRedirects.push({
              fromUrl: request.url,
              toUrl: request.loadedUrl, // i.e. actualUrl
            });
            return;
          }

          const results = await runAxeScript(includeScreenshots, page, randomToken,null);

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
              urlsCrawled.scanned.push({
                url: urlWithoutAuth(request.url),
                pageTitle: results.pageTitle,
              });
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
        await enqueueProcess(page, enqueueLinks, browserContext);
      } catch (e) {
        try {
          if (!e.message.includes('page.evaluate')) {
            silentLogger.info(e);
            guiInfoLog(guiInfoStatusTypes.ERROR, {
              numScanned: urlsCrawled.scanned.length,
              urlScanned: request.url,
            });

            page = await browserContext.newPage();
            await page.goto(request.url);

            await page.route('**/*', async route => {
              const interceptedRequest = route.request();
              if (interceptedRequest.resourceType() === 'document') {
                await requestQueue.addRequest({
                  url: interceptedRequest.url(),
                  skipNavigation: isUrlPdf(interceptedRequest.url()),
                });
                return;
              }
            });
          }
        } catch (e) {
          // Do nothing since the error will be pushed
        }

        // when max pages have been scanned, scan will abort and all relevant pages still opened will close instantly.
        // a browser close error will then be flagged. Since this is an intended behaviour, this error will be excluded.
        !isAbortingScanNow ? urlsCrawled.error.push({ url: request.url }) : undefined;
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
    /*
    if (includeScreenshots) {
      await Promise.all(
        pdfResults.map(async result => await doPdfScreenshots(randomToken, result)),
      );
    }
    */

    // push results for each pdf document to key value store
    await Promise.all(pdfResults.map(result => dataset.pushData(result)));
  }

  if (!fromCrawlIntelligentSitemap) {
    guiInfoLog(guiInfoStatusTypes.COMPLETED, {});
  }

  return urlsCrawled;
};
export default crawlDomain;
