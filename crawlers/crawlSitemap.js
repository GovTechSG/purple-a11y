import crawlee, { Request } from 'crawlee';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  preNavigationHooks,
  runAxeScript,
  failedRequestHandler,
  isUrlPdf,
} from './commonCrawlerFunc.js';

import constants, { guiInfoStatusTypes, basicAuthRegex } from '../constants/constants.js';
import {
  getLinksFromSitemap,
  getPlaywrightLaunchOptions,
  messageOptions,
  isSkippedUrl,
} from '../constants/common.js';
import { areLinksEqual, isWhitelistedContentType } from '../utils.js';
import { handlePdfDownload, runPdfScan, mapPdfScanResults } from './pdfScanFunc.js';
import fs from 'fs';
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
  fileTypes,
  blacklistedPatterns,
  includeScreenshots,
  extraHTTPHeaders,
  fromCrawlIntelligentSitemap = false, //optional
  userUrlInputFromIntelligent = null, //optional
  datasetFromIntelligent = null, //optional
  urlsCrawledFromIntelligent = null, //optional
  
) => {
  let dataset;
  let urlsCrawled;
  let linksFromSitemap

  
  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth;
  let basicAuthPage = 0;
  let finalLinks = []; 
  
  
  if (fromCrawlIntelligentSitemap){
    dataset=datasetFromIntelligent;
    urlsCrawled = urlsCrawledFromIntelligent;
    
  } else {
    ({ dataset } = await createCrawleeSubFolders(randomToken));
    urlsCrawled = { ...constants.urlsCrawledObj };
    
    if (!fs.existsSync(randomToken)) {
      fs.mkdirSync(randomToken);
    }
  }

  linksFromSitemap = await getLinksFromSitemap(sitemapUrl, maxRequestsPerCrawl, browser, userDataDirectory, userUrlInputFromIntelligent, fromCrawlIntelligentSitemap)
  
  /**
   * Regex to match http://username:password@hostname.com
   * utilised in scan strategy to ensure subsequent URLs within the same domain are scanned.
   * First time scan with original `url` containing credentials is strictly to authenticate for browser session
   * subsequent URLs are without credentials.
   * basicAuthPage is set to -1 for basic auth URL to ensure it is not counted towards maxRequestsPerCrawl
  */
 
 if (basicAuthRegex.test(sitemapUrl)) {
   isBasicAuth = true;
   // request to basic auth URL to authenticate for browser session
   finalLinks.push(new Request({ url: sitemapUrl, uniqueKey: `auth:${sitemapUrl}` }));
   const finalUrl = `${sitemapUrl.split('://')[0]}://${sitemapUrl.split('@')[1]}`;
   
   // obtain base URL without credentials so that subsequent URLs within the same domain can be scanned
   finalLinks.push(new Request({ url: finalUrl }));
   basicAuthPage = -2;
  } 
  
  
  let pdfDownloads = [];
  let uuidToPdfMapping = {};
  const isScanHtml = ['all', 'html-only'].includes(fileTypes);
  const isScanPdfs = ['all', 'pdf-only'].includes(fileTypes);
  const { playwrightDeviceDetailsObject } = viewportSettings;
  const { maxConcurrency } = constants;



  printMessage(['Fetching URLs. This might take some time...'], { border: false });


  finalLinks = [...finalLinks, ...linksFromSitemap];

  const requestList = new crawlee.RequestList({
    sources: finalLinks,
  });
  await requestList.initialize();
  printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);


  const crawler = new crawlee.PlaywrightCrawler({
    launchContext: {
      launcher: constants.launcher,
      launchOptions: getPlaywrightLaunchOptions(browser),
      userDataDir: userDataDirectory || '',
    },
    retryOnBlocked: true,
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
    preNavigationHooks: preNavigationHooks(extraHTTPHeaders),
    requestHandler: async ({ page, request, response, sendRequest }) => {
      const actualUrl = request.loadedUrl || request.url;

      if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
        crawler.autoscaledPool.abort();
        return;
      }

      if (isUrlPdf(actualUrl)) {
        if (!isScanPdfs) {
          guiInfoLog(guiInfoStatusTypes.SKIPPED, {
            numScanned: urlsCrawled.scanned.length,
            urlScanned: request.url,
          });
          urlsCrawled.blacklisted.push(request.url);
          return;
        }
        // pushes download promise into pdfDownloads
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
        urlsCrawled.forbidden.push({ url: request.url });
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

      if (basicAuthPage < 0) {
        basicAuthPage++;
      } else {
        if (isScanHtml && status === 200 && isWhitelistedContentType(contentType)) {
          const results = await runAxeScript(includeScreenshots, page, randomToken);
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
  
          isScanHtml && urlsCrawled.invalid.push(actualUrl);
        }
      }
    },
    failedRequestHandler: async ({ request }) => {

      // check if scanned pages have reached limit due to multi-instances of handler running
      if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
        return;
      }
      
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

  await requestList.isFinished();


  

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

  
  if (!fromCrawlIntelligentSitemap){
    guiInfoLog(guiInfoStatusTypes.COMPLETED);
  }

  return urlsCrawled;
  
};

export default crawlSitemap;
