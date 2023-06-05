/* eslint-disable camelcase */
/* eslint-disable no-use-before-define */
import validator from 'validator';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import crawlee from 'crawlee';
import { parseString } from 'xml2js';
import fs from 'fs';
import constants from './constants.js';
import { silentLogger } from '../logs.js';
import * as https from 'https';
import { chromium, devices } from 'playwright';

const document = new JSDOM('').window;

const httpsAgent = new https.Agent({
  // Run in environments with custom certificates
  rejectUnauthorized: false,
});

export const messageOptions = {
  border: false,
  marginTop: 2,
  marginBottom: 2,
};

const urlOptions = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
};

const queryCheck = s => document.createDocumentFragment().querySelector(s);
export const isSelectorValid = selector => {
  try {
    queryCheck(selector);
  } catch (e) {
    return false;
  }
  return true;
};

// Refer to NPM validator's special characters under sanitizers for escape()
const blackListCharacters = '\\<>&\'"';

export const isValidXML = async content => {
  let status;
  let parsedContent = '';
  parseString(content, (err, result) => {
    if (result) {
      status = true;
      parsedContent = result;
    }
    if (err) {
      status = false;
    }
  });
  return { status, parsedContent };
};

export const isSkippedUrl = (page, whitelistedDomains) => {
  const isWhitelisted = whitelistedDomains.filter(pattern => {
    if (pattern) {
      return new RegExp(pattern).test(page.url());
    }
    return false;
  });

  const noMatch = Object.keys(isWhitelisted).every(key => {
    return isWhitelisted[key].length === 0;
  });

  return !noMatch;
};

export const isFileSitemap = filePath => {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const file = fs.readFileSync(filePath, 'utf8');
  return isSitemapContent(file);
};

export const getUrlMessage = scanner => {
  switch (scanner) {
    case constants.scannerTypes.website:
    case constants.scannerTypes.custom:
      return 'Please enter URL of website: ';
    case constants.scannerTypes.sitemap:
      return 'Please enter URL or file path to sitemap, or drag and drop a sitemap file here: ';

    default:
      return 'Invalid option';
  }
};

export const isInputValid = inputString => {
  if (!validator.isEmpty(inputString)) {
    const removeBlackListCharacters = validator.escape(inputString);

    if (validator.isAscii(removeBlackListCharacters)) {
      return true;
    }
  }

  return false;
};

export const sanitizeUrlInput = url => {
  // Sanitize that there is no blacklist characters
  const sanitizeUrl = validator.blacklist(url, blackListCharacters);
  const data = {};
  if (validator.isURL(sanitizeUrl, urlOptions)) {
    data.isValid = true;
  } else {
    data.isValid = false;
  }

  data.url = sanitizeUrl;
  return data;
};

const checkUrlConnectivity = async url => {
  const res = {};

  const data = sanitizeUrlInput(url);

  if (data.isValid) {
    // Validate the connectivity of URL if the string format is url format
    // User-Agent is modified to emulate a browser to handle cases where some sites ban non browser agents, resulting in a 403 error
    await axios
      .get(data.url, { headers: { 'User-Agent': devices['Desktop Chrome HiDPI'].userAgent }, httpsAgent, timeout: 15000 })
      .then(async response => {
        const redirectUrl = response.request.res.responseUrl;
        res.status = constants.urlCheckStatuses.success.code;

        if (redirectUrl != null) {
          res.url = redirectUrl;
        } else {
          res.url = url;
        }

        res.content = response.data;
        // console.log(res.content);
      })
      .catch(error => {
        if (error.response) {
          // enters here if server responds with a status other than 2xx
          // the scan should still proceed even if error codes are received, so that accessibility scans for error pages can be done too
          res.status = constants.urlCheckStatuses.success.code;
          res.url = url;
          res.content = error.response.data;
          return res;
        } else if (error.request) {
          // enters here if URL cannot be accessed
          res.status = constants.urlCheckStatuses.cannotBeResolved.code;
        } else {
          res.status = constants.urlCheckStatuses.systemError.code;
        }
        silentLogger.error(error);
      });
  } else {
    // enters here if input is not a URL or not using http/https protocols
    res.status = constants.urlCheckStatuses.invalidUrl.code;
  }

  return res;
};

const checkUrlConnectivityWithBrowser = async url => {
  const res = {};

  const data = sanitizeUrlInput(url);

  if (data.isValid) {
    // Validate the connectivity of URL if the string format is url format
    const browser = await chromium.launch({
      channel:"chrome", 
      headless: false
    });
    const context = await browser.newContext(); 
    const page = await context.newPage();
    
    // method will not throw an error when any valid HTTP status code is returned by the remote server, including 404 "Not Found" and 500 "Internal Server Error".
    // navigation to about:blank or navigation to the same URL with a different hash, which would succeed and return null.
    try {
      const response = await page.goto(url, {timeout: 15000}); 
      res.status = constants.urlCheckStatuses.success.code; 

      // Check for redirect link
      const redirectUrl = await (response.request()).url();
      console.log(redirectUrl);

      if (redirectUrl != null) {
        res.url = redirectUrl; 
      } else {
        res.url = url; 
      }

      res.content = await page.content();
      // console.log(res.content);

    } catch (error) {
      // not sure what errors are thrown
      console.log(error);

      res.status = constants.urlCheckStatuses.systemError.code;
    } finally {
      await browser.close();
    }
  } else {
    // enters here if input is not a URL or not using http/https protocols
    res.status = constants.urlCheckStatuses.invalidUrl.code;
  }

  return res;
};

const isSitemapContent = async content => {
  const { status: isValid } = await isValidXML(content);
  if (!isValid) {
    const regexForHtml = new RegExp('<(?:!doctype html|html|head|body)+?>', 'gmi');
    const regexForUrl = new RegExp('^.*(http|https):/{2}.*$', 'gmi');
    // Check that the page is not a HTML page but still contains website links
    if (!String(content).match(regexForHtml) && String(content).match(regexForUrl)) {
      silentLogger.info(
        'Sitemap URL provided is a Valid URL but it is not in XML sitemap, RSS, nor Atom formats.',
      );
      return true;
    }
    silentLogger.info('Not a sitemap, is most likely a HTML page; Possibly a malformed sitemap.');
    return false;
  }

  return true;
};

export const checkUrl = async (scanner, url, browserBased) => {
  let res; 
  if (browserBased) {
    res = await checkUrlConnectivityWithBrowser(url);
  } else {
    res = await checkUrlConnectivity(url);
  }

  if (
    res.status === constants.urlCheckStatuses.success.code &&
    scanner === constants.scannerTypes.sitemap
  ) {
    const isSitemap = await isSitemapContent(res.content);

    if (!isSitemap) {
      res.status = constants.urlCheckStatuses.notASitemap.code;
    }
  }

  return res;
};

const isEmptyObject = obj => !Object.keys(obj).length;

export const prepareData = argv => {
  if (isEmptyObject(argv)) {
    throw Error('No inputs should be provided');
  }
  const {
    scanner,
    headless,
    url,
    deviceChosen,
    customDevice,
    viewportWidth,
    maxpages,
    isLocalSitemap,
    finalUrl,
    browserBased,
  } = argv;

  return {
    type: scanner,
    url: isLocalSitemap ? url : finalUrl,
    isHeadless: headless,
    isBrowserBased: browserBased, 
    deviceChosen,
    customDevice,
    viewportWidth,
    maxRequestsPerCrawl: maxpages || constants.maxRequestsPerCrawl,
    isLocalSitemap,
  };
};

export const getLinksFromSitemap = async (sitemapUrl, maxLinksCount, isBrowserBased) => {
  const urls = new Set(); // for HTML documents

  const isLimitReached = () => {
    return urls.size >= maxLinksCount;
  };

  const processXmlSitemap = async ($, sitemapType, selector) => {
    for (const urlElement of $(selector)) {
      if (isLimitReached()) {
        return;
      }
      let url;
      if (sitemapType === constants.xmlSitemapTypes.atom) {
        url = $(urlElement).prop('href');
      } else {
        url = $(urlElement).text();
      }
      console.log(url);
      urls.add(url);
    }
  };

  const processNonStandardSitemap = data => {
    const urlsFromData = crawlee.extractUrls({ string: data }).slice(0, maxLinksCount);
    urlsFromData.forEach(url => urls.add(url));
  };

  const fetchUrls = async url => {
    let data;
    let sitemapType; 
    if (validator.isURL(url, urlOptions)) {
      if (isBrowserBased) {
        const browser = await chromium.launch({
          channel:"chrome",  
          headless: false,
        });
        const context = await browser.newContext(); 
        const page = await context.newPage();
        await page.goto(url); 
    
        const urlSet = page.locator('urlset'); 
        const sitemapIndex = page.locator('sitemapindex'); 
        const rss = page.locator('rss'); 
        const feed = page.locator('feed');

        const isRoot = async (locator) => {
          return (await locator.count()) > 0;
        }

        if (await isRoot(urlSet)) {
          data = await urlSet.evaluate(elem => elem.outerHTML);
        } else if (await isRoot(sitemapIndex)) {
          data = await sitemapIndex.evaluate(elem => elem.outerHTML);
        } else if (await isRoot(rss)) {
          data = await rss.evaluate(elem => elem.outerHTML);
        } else if (await isRoot(feed)) {
          data = await feed.evaluate(elem => elem.outerHTML);
        }

        await browser.close();
      } else {
        const instance = axios.create({
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
          }),
        });
        data = await (await instance.get(url)).data;
      }
    } else {
      data = fs.readFileSync(url, 'utf8');
    }
    const $ = cheerio.load(data, { xml: true });

    // This case is when the document is not an XML format document
    if ($(':root').length === 0) {
      processNonStandardSitemap(data);
      return;
    }

    // Root element
    const root = $(':root')[0];

    const { xmlns } = root.attribs;
    const xmlFormatNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';

    if (root.name === 'urlset' && xmlns === xmlFormatNamespace) {
      sitemapType = constants.xmlSitemapTypes.xml;
    } else if (root.name === 'sitemapindex' && xmlns === xmlFormatNamespace) {
      sitemapType = constants.xmlSitemapTypes.xmlIndex;
    } else if (root.name === 'rss') {
      sitemapType = constants.xmlSitemapTypes.rss;
    } else if (root.name === 'feed') {
      sitemapType = constants.xmlSitemapTypes.atom;
    } else {
      sitemapType = constants.xmlSitemapTypes.unknown;
    }

    console.log(sitemapType);

    switch (sitemapType) {
      case constants.xmlSitemapTypes.xmlIndex:
        silentLogger.info(`This is a XML format sitemap index.`);
        for (const childSitemapUrl of $('loc')) {
          if (isLimitReached()) {
            break;
          }
          await fetchUrls($(childSitemapUrl, false).text());
        }
        break;
      case constants.xmlSitemapTypes.xml:
        silentLogger.info(`This is a XML format sitemap.`);
        await processXmlSitemap($, sitemapType, 'loc');
        break;
      case constants.xmlSitemapTypes.rss:
        silentLogger.info(`This is a RSS format sitemap.`);
        await processXmlSitemap($, sitemapType, 'link');
        break;
      case constants.xmlSitemapTypes.atom:
        silentLogger.info(`This is a Atom format sitemap.`);
        await processXmlSitemap($, sitemapType, 'link');
        break;
      default:
        silentLogger.info(`This is an unrecognised XML sitemap format.`);
        processNonStandardSitemap(data);
    }
  };

  await fetchUrls(sitemapUrl);
  return Array.from(urls);
};