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
import playwright from 'playwright';
import path from 'path';

const crawlLocalFile = async (
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
  let linksFromSitemap;

  // Boolean to omit axe scan for basic auth URL
  let isBasicAuth;
  let basicAuthPage = 0;
  let finalLinks = [];

  if (fromCrawlIntelligentSitemap) {
    dataset = datasetFromIntelligent;
    urlsCrawled = urlsCrawledFromIntelligent;
  } else {
    ({ dataset } = await createCrawleeSubFolders(randomToken));
    urlsCrawled = { ...constants.urlsCrawledObj };

    if (!fs.existsSync(randomToken)) {
      fs.mkdirSync(randomToken);
    }
  }

  if (fs.existsSync(sitemapUrl)) {
    linksFromSitemap = [new Request({ url: sitemapUrl })];
  } else {
    // File not found
    throw new Error(`File not found: ${sitemapUrl}`);
  }

  try {
    sitemapUrl = encodeURI(sitemapUrl);
  } catch (e) {
    console.log(e);
  }

  if (basicAuthRegex.test(sitemapUrl)) {
    isBasicAuth = true;
    // request to basic auth URL to authenticate for browser session
    finalLinks.push(new Request({ url: sitemapUrl, uniqueKey: `auth:${sitemapUrl}` }));
    const finalUrl = `${sitemapUrl.split('://')[0]}://${sitemapUrl.split('@')[1]}`;
    // obtain base URL without credentials so that subsequent URLs within the same domain can be scanned
    finalLinks.push(new Request({ url: finalUrl }));
    basicAuthPage = -2;
  }

  let uuidToPdfMapping = {};
  const isScanHtml = ['all', 'html-only'].includes(fileTypes);

  printMessage(['Fetching URLs. This might take some time...'], { border: false });

  finalLinks = [...finalLinks, ...linksFromSitemap];
  const requestList = new crawlee.RequestList({
    sources: finalLinks,
  });
  await requestList.initialize();
  printMessage(['Fetch URLs completed. Beginning scan'], messageOptions);

  const request = linksFromSitemap[0];
  const pdfFileName = path.basename(request.url);
  const trimmedUrl = request.url;
  const destinationFilePath = `${randomToken}/${pdfFileName}`;
  const data = fs.readFileSync(trimmedUrl);
  fs.writeFileSync(destinationFilePath, data);
  uuidToPdfMapping[pdfFileName] = trimmedUrl;

  if (!request.url.endsWith('.pdf')) {
    let browserUsed;
    // Playwright only supports chromium,firefox and webkit thus hardcoded to chromium
    if (browser === 'chromium') {
      browserUsed = await playwright.chromium.launch();
    } else if (browser === 'firefox') {
      browserUsed = await playwright.firefox.launch();
    } else if (browser === 'webkit') {
      browserUsed = await playwright.webkit.launch();
    } else {
      console.log('Browser not supported, please use chromium, firefox, webkit');
      console.log(' ');
      return;
    }
    const context = await browserUsed.newContext();
    const page = await context.newPage();
    request.url = 'file://' + request.url;
    await page.goto(request.url);
    const results = await runAxeScript(includeScreenshots, page, randomToken);
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
  } else {
    urlsCrawled.scanned.push({ url: trimmedUrl, pageTitle: pdfFileName });

    await runPdfScan(randomToken);
    // transform result format
    const pdfResults = await mapPdfScanResults(randomToken, uuidToPdfMapping);

    // push results for each pdf document to key value store
    await Promise.all(pdfResults.map(result => dataset.pushData(result)));
  }
  return urlsCrawled;
};
export default crawlLocalFile;
