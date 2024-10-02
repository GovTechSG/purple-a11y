import crawlee, { EnqueueStrategy } from 'crawlee';
import fs from 'fs';
import type { BrowserContext, ElementHandle, Frame, Page } from 'playwright';
import type { EnqueueLinksOptions, RequestOptions } from 'crawlee';
import type { BatchAddRequestsResult } from '@crawlee/types';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  isUrlPdf,
} from './commonCrawlerFunc.js';
import constants, {
  UrlsCrawled,
  blackListedFileExtensions,
  guiInfoStatusTypes,
  cssQuerySelectors,
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
import {
  handlePdfDownload,
  runPdfScan,
  mapPdfScanResults,
  doPdfScreenshots,
} from './pdfScanFunc.js';
import { silentLogger, guiInfoLog } from '../logs.js';
import { ViewportSettingsClass } from '../combine.js';

const isBlacklisted = (url: string) => {
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

const crawlDomain = async (
  url: string,
  randomToken: string,
  _host: string,
  viewportSettings: ViewportSettingsClass,
  maxRequestsPerCrawl: number,
  browser: string,
  userDataDirectory: string,
  strategy: EnqueueStrategy,
  specifiedMaxConcurrency: number,
  fileTypes: string,
  blacklistedPatterns: string[],
  includeScreenshots: boolean,
  followRobots: boolean,
  extraHTTPHeaders: Record<string, string>,
  safeMode: boolean = false, // optional
  fromCrawlIntelligentSitemap: boolean = false, // optional
  datasetFromIntelligent: crawlee.Dataset = null, // optional
  urlsCrawledFromIntelligent: UrlsCrawled = null, // optional
) => {
  let dataset: crawlee.Dataset;
  let urlsCrawled: UrlsCrawled;
  let requestQueue: crawlee.RequestQueue;

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

  const pdfDownloads = [];
  const uuidToPdfMapping = {};
  const isScanHtml = ['all', 'html-only'].includes(fileTypes);
  const isScanPdfs = ['all', 'pdf-only'].includes(fileTypes);
  const { maxConcurrency } = constants;
  const { playwrightDeviceDetailsObject } = viewportSettings;
  const isBlacklistedUrl = isBlacklisted(url);

  if (isBlacklistedUrl) {
    guiInfoLog(guiInfoStatusTypes.SKIPPED, {
      numScanned: urlsCrawled.scanned.length,
      urlScanned: url,
    });
    return;
  }

  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth = false;
  let authHeader = '';

  // Test basic auth and add auth header if auth exist
  const parsedUrl = new URL(url);
  let username: string;
  let password: string;
  if (parsedUrl.username !== '' && parsedUrl.password !== '') {
    isBasicAuth = true;
    username = decodeURIComponent(parsedUrl.username);
    password = decodeURIComponent(parsedUrl.password);

    // Create auth header
    authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    // Remove username from parsedUrl
    parsedUrl.username = '';
    parsedUrl.password = '';
    // Send the finalUrl without credentials by setting auth header instead
    const finalUrl = parsedUrl.toString();

    await requestQueue.addRequest({
      url: finalUrl,
      skipNavigation: isUrlPdf(finalUrl),
      headers: {
        Authorization: authHeader,
      },
      label: finalUrl,
    });
  } else {
    await requestQueue.addRequest({
      url,
      skipNavigation: isUrlPdf(url),
      label: url,
    });
  }

  // const httpHeadCache = new Map<string, boolean>();
  // const isProcessibleUrl = async (url: string): Promise<boolean> => {
  //   if (httpHeadCache.has(url)) {
  //     silentLogger.info('cache hit', url, httpHeadCache.get(url));
  //     return false; // return false to avoid processing the url again
  //   }

  //   try {
  //     const response = await axios.head(url, { headers: { Authorization: authHeader } });
  //     const contentType = response.headers['content-type'] || '';

  //     if (!contentType.includes('text/html') && !contentType.includes('application/pdf')) {
  //       silentLogger.info(`Skipping MIME type ${contentType} at URL ${url}`);
  //       httpHeadCache.set(url, false);
  //       return false;
  //     }

  //     // further check for zip files where the url ends with .zip
  //     if (url.endsWith('.zip')) {
  //       silentLogger.info(`Checking for zip file magic number at URL ${url}`);
  //       // download first 4 bytes of file to check the magic number
  //       const response = await axios.get(url, {
  //         headers: { Range: 'bytes=0-3', Authorization: authHeader },
  //       });
  //       // check using startsWith because some server does not handle Range header and returns the whole file
  //       if (response.data.startsWith('PK\x03\x04')) {
  //         // PK\x03\x04 is the magic number for zip files
  //         silentLogger.info(`Skipping zip file at URL ${url}`);
  //         httpHeadCache.set(url, false);
  //         return false;
  //       }
  //       // print out the hex value of the first 4 bytes
  //       silentLogger.info(
  //         `Not skipping ${url} as it has magic number: ${response.data.slice(0, 4).toString('hex')}`,
  //       );
  //     }
  //   } catch (e) {
  //     silentLogger.error(`Error checking the MIME type of ${url}: ${e.message}`);
  //     // when failing to check the MIME type (e.g. need to go through proxy), let crawlee handle the request
  //     httpHeadCache.set(url, true);
  //     return true;
  //   }
  //   httpHeadCache.set(url, true);
  //   return true;
  // };

  const enqueueProcess = async (
    page: Page,
    enqueueLinks: (options: EnqueueLinksOptions) => Promise<BatchAddRequestsResult>,
    browserContext: BrowserContext,
  ) => {
    try {
      await enqueueLinks({
        // set selector matches anchor elements with href but not contains # or starting with mailto:
        selector: 'a:not(a[href*="#"],a[href^="mailto:"])',
        strategy,
        requestQueue,
        transformRequestFunction: (req: RequestOptions): RequestOptions | null => {
          try {
            req.url = req.url.replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
          } catch (e) {
            silentLogger.error(e);
          }
          if (urlsCrawled.scanned.some(item => item.url === req.url)) {
            req.skipNavigation = true;
          }
          if (isDisallowedInRobotsTxt(req.url)) return null;
          if (isUrlPdf(req.url)) {
            // playwright headless mode does not support navigation to pdf document
            req.skipNavigation = true;
          }
          req.label = req.url;

          return req;
        },
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
    } catch {
      // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
      // Handles browser page object been closed.
    }
  };

  const customEnqueueLinksByClickingElements = async (
    page: Page,
    browserContext: BrowserContext,
  ): Promise<void> => {
    const initialPageUrl: string = page.url().toString();

    const isExcluded = (newPageUrl: string): boolean => {
      const isAlreadyScanned: boolean = urlsCrawled.scanned.some(item => item.url === newPageUrl);
      const isBlacklistedUrl: boolean = isBlacklisted(newPageUrl);
      const isNotFollowStrategy: boolean = !isFollowStrategy(newPageUrl, initialPageUrl, strategy);
      return isAlreadyScanned || isBlacklistedUrl || isNotFollowStrategy;
    };
    const setPageListeners = (page: Page): void => {
      // event listener to handle new page popups upon button click
      page.on('popup', async (newPage: Page) => {
        try {
          if (newPage.url() != initialPageUrl && !isExcluded(newPage.url())) {
            const newPageUrl: string = newPage.url().replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            await requestQueue.addRequest({
              url: newPageUrl,
              skipNavigation: isUrlPdf(newPage.url()),
              label: newPageUrl,
            });
          } else {
            try {
              await newPage.close();
            } catch {
              // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
              // Handles browser page object been closed.
            }
          }
        } catch {
          // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
          // Handles browser page object been closed.
        }
      });

      // event listener to handle navigation to new url within same page upon element click
      page.on('framenavigated', async (newFrame: Frame) => {
        try {
          if (
            newFrame.url() !== initialPageUrl &&
            !isExcluded(newFrame.url()) &&
            !(newFrame.url() == 'about:blank')
          ) {
            const newFrameUrl: string = newFrame.url().replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
            await requestQueue.addRequest({
              url: newFrameUrl,
              skipNavigation: isUrlPdf(newFrame.url()),
              label: newFrameUrl,
            });
          }
        } catch {
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
        // navigate back to initial page if clicking on a element previously caused it to navigate to a new url
        if (page.url() != initialPageUrl) {
          try {
            await page.close();
          } catch {
            // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
            // Handles browser page object been closed.
          }
          page = await browserContext.newPage();
          await page.goto(initialPageUrl, {
            waitUntil: 'domcontentloaded',
          });
          setPageListeners(page);
        }
        const selectedElementsString = cssQuerySelectors.join(', ');
        const selectedElements: ElementHandle<SVGElement | HTMLElement>[] =
          await page.$$(selectedElementsString);
        // edge case where there might be elements on page that appears intermittently
        if (currentElementIndex + 1 > selectedElements.length || !selectedElements) {
          break;
        }
        // handle the last element in selectedElements
        if (currentElementIndex + 1 == selectedElements.length) {
          isAllElementsHandled = true;
        }
        const element: ElementHandle<SVGElement | HTMLElement> =
          selectedElements[currentElementIndex];
        currentElementIndex += 1;
        let newUrlFoundInElement: string = null;
        if (await element.isVisible()) {
          // Find url in html elements without clicking them
          await page
            .evaluate(element => {
              // find href attribute
              const hrefUrl: string = element.getAttribute('href');

              // find url in datapath
              const dataPathUrl: string = element.getAttribute('data-path');

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
                } catch (e) {
                  // If it's not a valid URL, treat it as a relative URL
                  absoluteUrl = new URL(newUrlFoundInElement, baseUrl);
                }
                newUrlFoundInElement = absoluteUrl.href;
              }
            });
          if (newUrlFoundInElement && !isExcluded(newUrlFoundInElement)) {
            const newUrlFoundInElementUrl: string = newUrlFoundInElement.replace(
              /(?<=&|\?)utm_.*?(&|$)/gim,
              '',
            );

            await requestQueue.addRequest({
              url: newUrlFoundInElementUrl,
              skipNavigation: isUrlPdf(newUrlFoundInElement),
              label: newUrlFoundInElementUrl,
            });
          } else if (!newUrlFoundInElement) {
            try {
              // Find url in html elements by manually clicking them. New page navigation/popups will be handled by event listeners above
              await element.click({ force: true });
              await page.waitForTimeout(1000); // Add a delay of 1 second between each Element click
            } catch {
              // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
              // Handles browser page object been closed.
            }
          }
        }
      } catch {
        // No logging for this case as it is best effort to handle dynamic client-side JavaScript redirects and clicks.
        // Handles browser page object been closed.
      }
    }
  };

  let isAbortingScanNow = false;

  let userDataDir = '';
  if (userDataDirectory) {
    userDataDir = process.env.CRAWLEE_HEADLESS !== '0' ? userDataDirectory : '';
  }

  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launcher: constants.launcher,
      launchOptions: getPlaywrightLaunchOptions(browser),
      // Bug in Chrome which causes browser pool crash when userDataDirectory is set in non-headless mode
      userDataDir,
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
    postNavigationHooks: [
      async crawlingContext => {
        const { page, request } = crawlingContext;

        request.skipNavigation = true;

        await page.evaluate(() => {
          return new Promise(resolve => {
            let timeout;
            let mutationCount = 0;
            const MAX_MUTATIONS = 100;
            const MAX_SAME_MUTATION_LIMIT = 10;
            const mutationHash = {};

            const observer = new MutationObserver(mutationsList => {
              clearTimeout(timeout);

              mutationCount += 1;

              if (mutationCount > MAX_MUTATIONS) {
                observer.disconnect();
                resolve('Too many mutations detected');
              }

              // To handle scenario where DOM elements are constantly changing and unable to exit
              mutationsList.forEach(mutation => {
                let mutationKey;

                if (mutation.target instanceof Element) {
                  Array.from(mutation.target.attributes).forEach(attr => {
                    mutationKey = `${mutation.target.nodeName}-${attr.name}`;

                    if (mutationKey) {
                      if (!mutationHash[mutationKey]) {
                        mutationHash[mutationKey] = 1;
                      } else {
                        mutationHash[mutationKey]++;
                      }

                      if (mutationHash[mutationKey] >= MAX_SAME_MUTATION_LIMIT) {
                        observer.disconnect();
                        resolve(`Repeated mutation detected for ${mutationKey}`);
                      }
                    }
                  });
                }
              });

              timeout = setTimeout(() => {
                observer.disconnect();
                resolve('DOM stabilized after mutations.');
              }, 1000);
            });

            timeout = setTimeout(() => {
              observer.disconnect();
              resolve('No mutations detected, exit from idle state');
            }, 1000);

            observer.observe(document, { childList: true, subtree: true, attributes: true });
          });
        });

        let finalUrl = page.url();
        const requestLabelUrl = request.label;

        // to handle scenario where the redirected link is not within the scanning website
        const isLoadedUrlFollowStrategy = isFollowStrategy(finalUrl, requestLabelUrl, strategy);
        if (!isLoadedUrlFollowStrategy) {
          finalUrl = requestLabelUrl;
        }

        const isRedirected = !areLinksEqual(finalUrl, requestLabelUrl);
        if (isRedirected) {
          await requestQueue.addRequest({ url: finalUrl, label: finalUrl });
        } else {
          request.skipNavigation = false;
        }
      },
    ],
    preNavigationHooks: isBasicAuth
      ? [
          async ({ page }) => {
            await page.setExtraHTTPHeaders({
              Authorization: authHeader,
              ...extraHTTPHeaders,
            });
          },
        ]
      : [
          async () => {
            preNavigationHooks(extraHTTPHeaders);
          },
        ],
    requestHandlerTimeoutSecs: 90, // Allow each page to be processed by up from default 60 seconds
    requestHandler: async ({ page, request, response, crawler, sendRequest, enqueueLinks }) => {
      const browserContext: BrowserContext = page.context();
      try {
        // Set basic auth header if needed
        if (isBasicAuth) {
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
          // await enqueueProcess(page, enqueueLinks, browserContext);
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

        // Skip non-HTML and non-PDF URLs
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
          urlsCrawled.forbidden.push(request.url);
          return;
        }

        if (response.status() !== 200) {
          guiInfoLog(guiInfoStatusTypes.SKIPPED, {
            numScanned: urlsCrawled.scanned.length,
            urlScanned: request.url,
          });
          urlsCrawled.invalid.push(request.url);
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

          const results = await runAxeScript(includeScreenshots, page, randomToken, null);

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
                actualUrl: request.url,
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
                const interceptedRequestUrl = interceptedRequest
                  .url()
                  .replace(/(?<=&|\?)utm_.*?(&|$)/gim, '');
                await requestQueue.addRequest({
                  url: interceptedRequestUrl,
                  skipNavigation: isUrlPdf(interceptedRequest.url()),
                  label: interceptedRequestUrl,
                });
              }
            });
          }
        } catch {
          // Do nothing since the error will be pushed
        }

        // when max pages have been scanned, scan will abort and all relevant pages still opened will close instantly.
        // a browser close error will then be flagged. Since this is an intended behaviour, this error will be excluded.
        if (!isAbortingScanNow) {
          urlsCrawled.error.push({ url: request.url });
        }
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
      await Promise.all(
        pdfResults.map(async result => await doPdfScreenshots(randomToken, result)),
      );
    }

    // push results for each pdf document to key value store
    await Promise.all(pdfResults.map(result => dataset.pushData(result)));
  }

  if (!fromCrawlIntelligentSitemap) {
    guiInfoLog(guiInfoStatusTypes.COMPLETED, {});
  }

  return urlsCrawled;
};

export default crawlDomain;
