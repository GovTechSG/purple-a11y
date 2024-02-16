// import crawlee, { Request } from 'crawlee';
// import printMessage from 'print-message';
// import {
//   createCrawleeSubFolders,
//   preNavigationHooks,
//   runAxeScript,
//   failedRequestHandler,
//   isUrlPdf,
// } from './commonCrawlerFunc.js';

// import constants, { guiInfoStatusTypes, basicAuthRegex, blackListedFileExtensions } from '../constants/constants.js';
// import {
//   // getLinksFromSitemap,
//   getLinksFromSitemapIntelligently,
//   getPlaywrightLaunchOptions,
//   messageOptions,
//   isSkippedUrl,
//   isBlacklistedFileExtensions,
//   isDisallowedInRobotsTxt,
//   getUrlsFromRobotsTxt
// } from '../constants/common.js';
// import { areLinksEqual, isWhitelistedContentType } from '../utils.js';
// import { handlePdfDownload, runPdfScan, mapPdfScanResults } from './pdfScanFunc.js';
// import fs from 'fs';
// import {silentLogger, guiInfoLog } from '../logs.js';
// import crawlDomain from './crawlDomain.js'



// const crawlIntelligentSitemap = async (
//   userUrlInput,
//   sitemapUrl,
//   randomToken,
//   host,
//   viewportSettings,
//   maxRequestsPerCrawl, 
//   browser,
//   userDataDirectory,
//   strategy,
//   specifiedMaxConcurrency,
//   fileTypes,
//   blacklistedPatterns,
//   includeScreenshots,
//   followRobots,
//   extraHTTPHeaders
  
// ) => {
  
//    // Boolean to omit axe scan for basic auth URL
//    let isBasicAuth;
//    let basicAuthPage = 0;
//    let finalLinks = []; 
 
//    /**
//     * Regex to match http://username:password@hostname.com
//     * utilised in scan strategy to ensure subsequent URLs within the same domain are scanned.
//     * First time scan with original `url` containing credentials is strictly to authenticate for browser session
//     * subsequent URLs are without credentials.
//     * basicAuthPage is set to -1 for basic auth URL to ensure it is not counted towards maxRequestsPerCrawl
//     */
//   let finalUrl
//    if (basicAuthRegex.test(sitemapUrl)) {
//       isBasicAuth = true;
//       // request to basic auth URL to authenticate for browser session
//       finalLinks.push(new Request({ url: sitemapUrl, uniqueKey: `auth:${sitemapUrl}` }));
//       finalUrl = `${sitemapUrl.split('://')[0]}://${sitemapUrl.split('@')[1]}`;
//       // obtain base URL without credentials so that subsequent URLs within the same domain can be scanned
//       finalLinks.push(new Request({ url: finalUrl }));
//       basicAuthPage = -2;
//    } 

//   const isScanHtml = ['all', 'html-only'].includes(fileTypes);
//   const isScanPdfs = ['all', 'pdf-only'].includes(fileTypes);
//   const urlsCrawled = { ...constants.urlsCrawledObj };
//   const { playwrightDeviceDetailsObject } = viewportSettings;
//   const { maxConcurrency } = constants;
//   const pdfDownloads = [];
//   const uuidToPdfMapping = {};

//   printMessage(['Fetching URLs. This might take some time...'], { border: false });
//   const linksFromSitemap = await getLinksFromSitemapIntelligently(sitemapUrl, maxRequestsPerCrawl, browser, userDataDirectory,userUrlInput)
//   finalLinks = [...finalLinks, ...linksFromSitemap];

//   const requestList = new crawlee.RequestList({
//     sources: finalLinks,
//   });
//   await requestList.initialize();
//   printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);
//   const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);
//   if (!fs.existsSync(randomToken)) {
//     fs.mkdirSync(randomToken);
//   }

//   const crawler = new crawlee.PlaywrightCrawler({
//     launchContext: {
//       launcher: constants.launcher,
//       launchOptions: getPlaywrightLaunchOptions(browser),
//       userDataDir: userDataDirectory || '',
//     },
//     retryOnBlocked:true,
//     browserPoolOptions: {
//       useFingerprints: false,
//       preLaunchHooks: [
//         async (pageId, launchContext) => {
//           launchContext.launchOptions = {
//             ...launchContext.launchOptions,
//             bypassCSP: true,
//             ignoreHTTPSErrors: true,
//             ...playwrightDeviceDetailsObject,
//           };
//         },
//       ],
//     },
//     requestList,
//     preNavigationHooks: preNavigationHooks(extraHTTPHeaders),
//     requestHandler: async ({ page, request, response, sendRequest }) => {
//       const actualUrl = request.loadedUrl || request.url;

//       if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
//         crawler.autoscaledPool.abort();
//         return;
//       }

//       if (isUrlPdf(actualUrl)) {
//         if (!isScanPdfs) {
//           guiInfoLog(guiInfoStatusTypes.SKIPPED, {
//             numScanned: urlsCrawled.scanned.length,
//             urlScanned: request.url,
//           });
//           urlsCrawled.blacklisted.push(request.url);
//           return;
//         }
//         // pushes download promise into pdfDownloads
//         const { pdfFileName, trimmedUrl } = handlePdfDownload(
//           randomToken,
//           pdfDownloads,
//           request,
//           sendRequest,
//           urlsCrawled,
//         );

//         uuidToPdfMapping[pdfFileName] = trimmedUrl;
//         return;
//       }
      
//       const contentType = response.headers()['content-type'];
//       const status = response.status();

//       if (blacklistedPatterns && isSkippedUrl(actualUrl, blacklistedPatterns)) {
//         urlsCrawled.userExcluded.push(request.url);
//         return;
//       }

//       if (status === 403) {
//         guiInfoLog(guiInfoStatusTypes.SKIPPED, {
//           numScanned: urlsCrawled.scanned.length,
//           urlScanned: request.url,
//         });
//         urlsCrawled.forbidden.push({ url: request.url });
//         return;
//       }

//       if (status !== 200) {
//         guiInfoLog(guiInfoStatusTypes.SKIPPED, {
//           numScanned: urlsCrawled.scanned.length,
//           urlScanned: request.url,
//         });
//         urlsCrawled.invalid.push(request.url);
//         return;
//       }

//       if (basicAuthPage < 0) {
//         basicAuthPage++;
//       } else {
//         if (isScanHtml && status === 200 && isWhitelistedContentType(contentType)) {
//           const results = await runAxeScript(includeScreenshots, page, randomToken);
//           guiInfoLog(guiInfoStatusTypes.SCANNED, {
//             numScanned: urlsCrawled.scanned.length,
//             urlScanned: request.url,
//           });
  
//           const isRedirected = !areLinksEqual(request.loadedUrl, request.url);
//           if (isRedirected) {
//             const isLoadedUrlInCrawledUrls = urlsCrawled.scanned.some(
//               item => (item.actualUrl || item.url) === request.loadedUrl,
//             );
  
//             if (isLoadedUrlInCrawledUrls) {
//               urlsCrawled.notScannedRedirects.push({
//                 fromUrl: request.url,
//                 toUrl: request.loadedUrl, // i.e. actualUrl
//               });
//               return;
//             }
  
//             urlsCrawled.scanned.push({
//               url: request.url,
//               pageTitle: results.pageTitle,
//               actualUrl: request.loadedUrl, // i.e. actualUrl
//             });
  
//             urlsCrawled.scannedRedirects.push({
//               fromUrl: request.url,
//               toUrl: request.loadedUrl, // i.e. actualUrl
//             });
  
//             results.url = request.url;
//             results.actualUrl = request.loadedUrl;
//           } else {
//             urlsCrawled.scanned.push({ url: request.url, pageTitle: results.pageTitle });
//           }
          
//           await dataset.pushData(results);
//         } else {
//           guiInfoLog(guiInfoStatusTypes.SKIPPED, {
//             numScanned: urlsCrawled.scanned.length,
//             urlScanned: request.url,
//           });
  
//           isScanHtml && urlsCrawled.invalid.push(actualUrl);
//         }
//       }
//     },
//     failedRequestHandler: async ({ request }) => {

//       // check if scanned pages have reached limit due to multi-instances of handler running
//       if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
//         return;
//       }
      
//       guiInfoLog(guiInfoStatusTypes.ERROR, {
//         numScanned: urlsCrawled.scanned.length,
//         urlScanned: request.url,
//       });
//       urlsCrawled.error.push({ url: request.url });
//       crawlee.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
//     },
//     maxRequestsPerCrawl: Infinity,
//     maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
//   });


//   await crawler.run();

//   await requestList.isFinished();


//   //run crawl domain starting from root website, only on pages not scanned before
//   if (urlsCrawled.scanned.length < maxRequestsPerCrawl){ 
    
//     // if (true){
//     //   maxRequestsPerCrawl+= 5;

//       let fromCrawlIntelligentSitemap = true;

//       await crawlDomain(
//       userUrlInput,
//       randomToken,
//       host,
//       viewportSettings,
//       maxRequestsPerCrawl,
//       browser,
//       userDataDirectory,
//       strategy,
//       specifiedMaxConcurrency,
//       fileTypes,
//       blacklistedPatterns,
//       includeScreenshots,
//       followRobots,
//       extraHTTPHeaders,
//       fromCrawlIntelligentSitemap,
//       urlsCrawled, //urls for crawlDomain to exclude
//       dataset, // for crawlDomain to add on to
//       requestQueue, // for crawlDomain to add on to
//       pdfDownloads,// for crawlDomain to add on to
//       uuidToPdfMapping// for crawlDomain to add on to
//     )

//   }


//   if (pdfDownloads.length > 0) {
//     // wait for pdf downloads to complete
//     await Promise.all(pdfDownloads);

//     // scan and process pdf documents
//     await runPdfScan(randomToken);

//     // transform result format
//     const pdfResults = await mapPdfScanResults(randomToken, uuidToPdfMapping);

//     // get screenshots from pdf docs
//     // if (includeScreenshots) {
//     //   await Promise.all(pdfResults.map(
//     //     async result => await doPdfScreenshots(randomToken, result)
//     //   ));
//     // }

//     // push results for each pdf document to key value store
//     await Promise.all(pdfResults.map(result => dataset.pushData(result)));
//   }

//   guiInfoLog(guiInfoStatusTypes.COMPLETED);
//   // console.log("urlsCrawled: ",urlsCrawled)
//   return urlsCrawled;
// };

// export default crawlIntelligentSitemap;



import {createCrawleeSubFolders,} from './commonCrawlerFunc.js';
import constants, { guiInfoStatusTypes } from '../constants/constants.js';
import fs from 'fs';
import {silentLogger, guiInfoLog } from '../logs.js';
import crawlDomain from './crawlDomain.js'
import crawlSitemap from './crawlSitemap.js'
import {chromium} from 'playwright';

  const crawlIntelligentSitemap = async (
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
  ) => {
    console.log('entered crawlIntelligentSitemap');
    let urlsCrawledFinal //to return
    let urlsCrawled
    let dataset;
    let sitemapExist =false
    const fromCrawlIntelligentSitemap = true
    
    urlsCrawled = { ...constants.urlsCrawledObj };
    ({ dataset } = await createCrawleeSubFolders(randomToken));

    if (!fs.existsSync(randomToken)) {
      fs.mkdirSync(randomToken);
    }
    
    async function findSitemap(link) {
      const homeUrl = getHomeUrl(link);
      const sitemapPaths = [
        '/sitemap.xml',
        '/sitemap-index.xml',
        '/sitemap.php',
        '/sitemap.txt',
        '/sitemap.xml.gz',
        '/sitemap/',
        '/sitemap/sitemap.xml',
        '/sitemapindex.xml',
        '/sitemap/index.xml',
        '/sitemap1.xml',
      ];
      let sitemapURLFound = false;
      let sitemapURL = '';
      const browser = await chromium.launch({headless: true});
      const page = await browser.newPage();
      for (let path of sitemapPaths) {
        sitemapURL = homeUrl + path;
        sitemapURLFound = await checkUrlExists(page,sitemapURL);
        if (sitemapURLFound) {
          sitemapExist = true;
          break;
        }
      }
      await browser.close();
      return sitemapExist ? sitemapURL : '';
    }
    
  
    function getHomeUrl(url) {
      const urlObject = new URL(url);
      return `${urlObject.protocol}//${urlObject.hostname}`;
    }
    
    const checkUrlExists = async (page, url) => {
      try {
          let response = await page.goto(url);
          if (response.ok()) {
              return true
          } else {
              return false
          }
      } catch (e) {
        silentLogger.info(e);
      };
    }

    
    
    const sitemapUrl = await findSitemap(url)

    if (!sitemapExist){
      //run crawlDomain as per normal
      urlsCrawledFinal = await crawlDomain(
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
      )
    return urlsCrawledFinal
      
    } else {
      //run crawlSitemap then crawDomain subsequently if urlsCrawled.scanned.length < maxRequestsPerCrawl  
      urlsCrawledFinal = await crawlSitemap(
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
        fromCrawlIntelligentSitemap,
        url, 
        dataset,  //for crawlSitemap to add on to
        urlsCrawled,  //for crawlSitemap to add on to
      )

    if (urlsCrawled.scanned.length < maxRequestsPerCrawl){ 
    // run crawl domain starting from root website, only on pages not scanned before
    // if (true){
    //   maxRequestsPerCrawl+= 3;
      
      urlsCrawledFinal = await crawlDomain(
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
        fromCrawlIntelligentSitemap,
        dataset, //for crawlDomain to add on to
        urlsCrawled, //urls for crawlDomain to exclude
      )
    }

    guiInfoLog(guiInfoStatusTypes.COMPLETED);
    return urlsCrawledFinal;

  };
}
export default crawlIntelligentSitemap;


      
    
    
  
  //////////////////  //////////////////  //////////////////  //////////////////



  
  //  // Boolean to omit axe scan for basic auth URL
  //  let isBasicAuth;
  //  let basicAuthPage = 0;
  //  let finalLinks = []; 
 
  //  /**
  //   * Regex to match http://username:password@hostname.com
  //   * utilised in scan strategy to ensure subsequent URLs within the same domain are scanned.
  //   * First time scan with original `url` containing credentials is strictly to authenticate for browser session
  //   * subsequent URLs are without credentials.
  //   * basicAuthPage is set to -1 for basic auth URL to ensure it is not counted towards maxRequestsPerCrawl
  //   */
  // let finalUrl
  //  if (basicAuthRegex.test(sitemapUrl)) {
  //     isBasicAuth = true;
  //     // request to basic auth URL to authenticate for browser session
  //     finalLinks.push(new Request({ url: sitemapUrl, uniqueKey: `auth:${sitemapUrl}` }));
  //     finalUrl = `${sitemapUrl.split('://')[0]}://${sitemapUrl.split('@')[1]}`;
  //     // obtain base URL without credentials so that subsequent URLs within the same domain can be scanned
  //     finalLinks.push(new Request({ url: finalUrl }));
  //     basicAuthPage = -2;
  //  } 

  // const isScanHtml = ['all', 'html-only'].includes(fileTypes);
  // const isScanPdfs = ['all', 'pdf-only'].includes(fileTypes);
  // const urlsCrawled = { ...constants.urlsCrawledObj };
  // const { playwrightDeviceDetailsObject } = viewportSettings;
  // const { maxConcurrency } = constants;
  // const pdfDownloads = [];
  // const uuidToPdfMapping = {};

  // printMessage(['Fetching URLs. This might take some time...'], { border: false });
  // const linksFromSitemap = await getLinksFromSitemapIntelligently(sitemapUrl, maxRequestsPerCrawl, browser, userDataDirectory,url)
  // finalLinks = [...finalLinks, ...linksFromSitemap];

  // const requestList = new crawlee.RequestList({
  //   sources: finalLinks,
  // });
  // await requestList.initialize();
  // printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);
  // const { dataset, requestQueue } = await createCrawleeSubFolders(randomToken);
  // if (!fs.existsSync(randomToken)) {
  //   fs.mkdirSync(randomToken);
  // }

  // const crawler = new crawlee.PlaywrightCrawler({
  //   launchContext: {
  //     launcher: constants.launcher,
  //     launchOptions: getPlaywrightLaunchOptions(browser),
  //     userDataDir: userDataDirectory || '',
  //   },
  //   retryOnBlocked:true,
  //   browserPoolOptions: {
  //     useFingerprints: false,
  //     preLaunchHooks: [
  //       async (pageId, launchContext) => {
  //         launchContext.launchOptions = {
  //           ...launchContext.launchOptions,
  //           bypassCSP: true,
  //           ignoreHTTPSErrors: true,
  //           ...playwrightDeviceDetailsObject,
  //         };
  //       },
  //     ],
  //   },
  //   requestList,
  //   preNavigationHooks: preNavigationHooks(extraHTTPHeaders),
  //   requestHandler: async ({ page, request, response, sendRequest }) => {
  //     const actualUrl = request.loadedUrl || request.url;

  //     if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
  //       crawler.autoscaledPool.abort();
  //       return;
  //     }

  //     if (isUrlPdf(actualUrl)) {
  //       if (!isScanPdfs) {
  //         guiInfoLog(guiInfoStatusTypes.SKIPPED, {
  //           numScanned: urlsCrawled.scanned.length,
  //           urlScanned: request.url,
  //         });
  //         urlsCrawled.blacklisted.push(request.url);
  //         return;
  //       }
  //       // pushes download promise into pdfDownloads
  //       const { pdfFileName, trimmedUrl } = handlePdfDownload(
  //         randomToken,
  //         pdfDownloads,
  //         request,
  //         sendRequest,
  //         urlsCrawled,
  //       );

  //       uuidToPdfMapping[pdfFileName] = trimmedUrl;
  //       return;
  //     }
      
  //     const contentType = response.headers()['content-type'];
  //     const status = response.status();

  //     if (blacklistedPatterns && isSkippedUrl(actualUrl, blacklistedPatterns)) {
  //       urlsCrawled.userExcluded.push(request.url);
  //       return;
  //     }

  //     if (status === 403) {
  //       guiInfoLog(guiInfoStatusTypes.SKIPPED, {
  //         numScanned: urlsCrawled.scanned.length,
  //         urlScanned: request.url,
  //       });
  //       urlsCrawled.forbidden.push({ url: request.url });
  //       return;
  //     }

  //     if (status !== 200) {
  //       guiInfoLog(guiInfoStatusTypes.SKIPPED, {
  //         numScanned: urlsCrawled.scanned.length,
  //         urlScanned: request.url,
  //       });
  //       urlsCrawled.invalid.push(request.url);
  //       return;
  //     }

  //     if (basicAuthPage < 0) {
  //       basicAuthPage++;
  //     } else {
  //       if (isScanHtml && status === 200 && isWhitelistedContentType(contentType)) {
  //         const results = await runAxeScript(includeScreenshots, page, randomToken);
  //         guiInfoLog(guiInfoStatusTypes.SCANNED, {
  //           numScanned: urlsCrawled.scanned.length,
  //           urlScanned: request.url,
  //         });
  
  //         const isRedirected = !areLinksEqual(request.loadedUrl, request.url);
  //         if (isRedirected) {
  //           const isLoadedUrlInCrawledUrls = urlsCrawled.scanned.some(
  //             item => (item.actualUrl || item.url) === request.loadedUrl,
  //           );
  
  //           if (isLoadedUrlInCrawledUrls) {
  //             urlsCrawled.notScannedRedirects.push({
  //               fromUrl: request.url,
  //               toUrl: request.loadedUrl, // i.e. actualUrl
  //             });
  //             return;
  //           }
  
  //           urlsCrawled.scanned.push({
  //             url: request.url,
  //             pageTitle: results.pageTitle,
  //             actualUrl: request.loadedUrl, // i.e. actualUrl
  //           });
  
  //           urlsCrawled.scannedRedirects.push({
  //             fromUrl: request.url,
  //             toUrl: request.loadedUrl, // i.e. actualUrl
  //           });
  
  //           results.url = request.url;
  //           results.actualUrl = request.loadedUrl;
  //         } else {
  //           urlsCrawled.scanned.push({ url: request.url, pageTitle: results.pageTitle });
  //         }
          
  //         await dataset.pushData(results);
  //       } else {
  //         guiInfoLog(guiInfoStatusTypes.SKIPPED, {
  //           numScanned: urlsCrawled.scanned.length,
  //           urlScanned: request.url,
  //         });
  
  //         isScanHtml && urlsCrawled.invalid.push(actualUrl);
  //       }
  //     }
  //   },
  //   failedRequestHandler: async ({ request }) => {

  //     // check if scanned pages have reached limit due to multi-instances of handler running
  //     if (urlsCrawled.scanned.length >= maxRequestsPerCrawl) {
  //       return;
  //     }
      
  //     guiInfoLog(guiInfoStatusTypes.ERROR, {
  //       numScanned: urlsCrawled.scanned.length,
  //       urlScanned: request.url,
  //     });
  //     urlsCrawled.error.push({ url: request.url });
  //     crawlee.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
  //   },
  //   maxRequestsPerCrawl: Infinity,
  //   maxConcurrency: specifiedMaxConcurrency || maxConcurrency,
  // });


  // await crawler.run();

  // await requestList.isFinished();


//   //run crawl domain starting from root website, only on pages not scanned before
//   if (urlsCrawled.scanned.length < maxRequestsPerCrawl){ 
    
//     // if (true){
//     //   maxRequestsPerCrawl+= 5;

//       let fromCrawlIntelligentSitemap = true;

//       await crawlDomain(
//       url,
//       randomToken,
//       host,
//       viewportSettings,
//       maxRequestsPerCrawl,
//       browser,
//       userDataDirectory,
//       strategy,
//       specifiedMaxConcurrency,
//       fileTypes,
//       blacklistedPatterns,
//       includeScreenshots,
//       followRobots,
//       extraHTTPHeaders,
//       fromCrawlIntelligentSitemap,
//       urlsCrawled, //urls for crawlDomain to exclude
//       dataset, // for crawlDomain to add on to
//       requestQueue, // for crawlDomain to add on to
//       pdfDownloads,// for crawlDomain to add on to
//       uuidToPdfMapping// for crawlDomain to add on to
//     )

//   }


//   if (pdfDownloads.length > 0) {
//     // wait for pdf downloads to complete
//     await Promise.all(pdfDownloads);

//     // scan and process pdf documents
//     await runPdfScan(randomToken);

//     // transform result format
//     const pdfResults = await mapPdfScanResults(randomToken, uuidToPdfMapping);

//     // get screenshots from pdf docs
//     // if (includeScreenshots) {
//     //   await Promise.all(pdfResults.map(
//     //     async result => await doPdfScreenshots(randomToken, result)
//     //   ));
//     // }

//     // push results for each pdf document to key value store
//     await Promise.all(pdfResults.map(result => dataset.pushData(result)));
//   }

//   guiInfoLog(guiInfoStatusTypes.COMPLETED);
//   // console.log("urlsCrawled: ",urlsCrawled)
//   return urlsCrawled;
// };

// export default crawlIntelligentSitemap;
