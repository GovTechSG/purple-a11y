/* eslint-disable camelcase */
/* eslint-disable no-use-before-define */
import validator from 'validator';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import crawlee from 'crawlee';
import { parseString } from 'xml2js';
import fs from 'fs';
import path from 'path';
import * as https from 'https';
import os from 'os';
import { globSync } from 'glob';
import { chromium, devices } from 'playwright';
import constants from './constants.js';
import { silentLogger } from '../logs.js';
import { getDefaultChromeDataDir, getDefaultEdgeDataDir } from './constants.js';

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

  const noMatch = Object.keys(isWhitelisted).every(key => isWhitelisted[key].length === 0);

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
      .get(data.url, {
        headers: { 'User-Agent': devices['Desktop Chrome HiDPI'].userAgent },
        httpsAgent,
        timeout: 15000,
      })
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
          if (error.response.status === 401) {
            // enters here if URL is protected by basic auth
            res.status = constants.urlCheckStatuses.unauthorised.code;
          } else {
            // enters here if server responds with a status other than 2xx
            // the scan should still proceed even if error codes are received, so that accessibility scans for error pages can be done too
            res.status = constants.urlCheckStatuses.success.code;
          }
          res.url = url;
          res.content = error.response.data;
          return res;
        }
        if (error.request) {
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

const checkUrlConnectivityWithBrowser = async (url, browserToRun, clonedDataDir) => {
  const res = {};

  const data = sanitizeUrlInput(url);

  if (data.isValid) {
    // Validate the connectivity of URL if the string format is url format
    const browserContext = await chromium.launchPersistentContext(
      clonedDataDir,
      getPlaywrightLaunchOptions(browserToRun),
    );
    // const context = await browser.newContext();
    const page = await browserContext.newPage();

    // method will not throw an error when any valid HTTP status code is returned by the remote server, including 404 "Not Found" and 500 "Internal Server Error".
    // navigation to about:blank or navigation to the same URL with a different hash, which would succeed and return null.
    try {
      const response = await page.goto(url, { timeout: 15000 });
      res.status = constants.urlCheckStatuses.success.code;

      // Check for redirect link
      const redirectUrl = await response.request().url();

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
      await browserContext.close();
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

export const checkUrl = async (scanner, url, browser, clonedDataDir) => {
  let res;
  if (browser) {
    res = await checkUrlConnectivityWithBrowser(url, browser, clonedDataDir);
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

export const getLinksFromSitemap = async (
  sitemapUrl,
  maxLinksCount,
  browser,
  userDataDirectory,
) => {
  const urls = new Set(); // for HTML documents

  const isLimitReached = () => urls.size >= maxLinksCount;

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
      if (browser) {
        const browserContext = await chromium.launchPersistentContext(
          userDataDirectory,
          getPlaywrightLaunchOptions(browser),
        );
        const page = await browserContext.newPage();
        await page.goto(url);

        const urlSet = page.locator('urlset');
        const sitemapIndex = page.locator('sitemapindex');
        const rss = page.locator('rss');
        const feed = page.locator('feed');

        const isRoot = async locator => {
          return (await locator.count()) > 0;
        };

        if (await isRoot(urlSet)) {
          data = await urlSet.evaluate(elem => elem.outerHTML);
        } else if (await isRoot(sitemapIndex)) {
          data = await sitemapIndex.evaluate(elem => elem.outerHTML);
        } else if (await isRoot(rss)) {
          data = await rss.evaluate(elem => elem.outerHTML);
        } else if (await isRoot(feed)) {
          data = await feed.evaluate(elem => elem.outerHTML);
        }

        await browserContext.close();
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

/**
 * Clone the Chrome profile cookie files to the destination directory
 * @param {*} options glob options object
 * @param {*} destDir destination directory
 * @returns void
 */
const cloneChromeProfileCookieFiles = (options, destDir) => {
  let profileCookiesDir;
  // Cookies file per profile is located in .../User Data/<profile name>/Network/Cookies for windows
  // and ../Chrome/<profile name>/Cookies for mac
  let profileNamesRegex;
  if (os.platform() === 'win32') {
    profileCookiesDir = globSync('**/Network/Cookies', {
      ...options,
      ignore: ['Purple-HATS/**'],
    });
    profileNamesRegex = /User Data\\(.*?)\\Network/;
  } else if (os.platform() === 'darwin') {
    // maxDepth 2 to avoid copying cookies from the Purple-HATS directory if it exists
    profileCookiesDir = globSync('**/Cookies', {
      ...options,
      ignore: 'Purple-HATS/**',
    });
    profileNamesRegex = /Chrome\/(.*?)\/Cookies/;
  }

  if (profileCookiesDir.length > 0) {
    profileCookiesDir.map(dir => {
      const profileName = dir.match(profileNamesRegex)[1];
      if (profileName) {
        let destProfileDir = path.join(destDir, profileName);
        if (os.platform() === 'win32') {
          destProfileDir = path.join(destProfileDir, 'Network');
        }
        // Recursive true to create all parent directories (e.g. PbProfile/Default/Cookies)
        if (!fs.existsSync(destProfileDir)) {
          fs.mkdirSync(destProfileDir, { recursive: true });
          if (!fs.existsSync(destProfileDir)) {
            fs.mkdirSync(destProfileDir);
          }
        }

        // Prevents duplicate cookies file if the cookies already exist
        if (!fs.existsSync(path.join(destProfileDir, 'Cookies'))) {
          fs.copyFileSync(dir, path.join(destProfileDir, 'Cookies'));
        }
      }
    });
  } else {
    console.error('Unable to find Chrome profile cookies file in the system.');
    return;
  }
};

/**
 * Clone the Chrome profile cookie files to the destination directory
 * @param {*} options glob options object
 * @param {*} destDir destination directory
 * @returns void
 */
const cloneEdgeProfileCookieFiles = (options, destDir) => {
  let profileCookiesDir;
  // Cookies file per profile is located in .../User Data/<profile name>/Network/Cookies for windows
  // and ../Chrome/<profile name>/Cookies for mac
  let profileNamesRegex;
  // Ignores the cloned Purple-HATS directory if exists
  if (os.platform() === 'win32') {
    ignore: ['Purple-HATS/**'],
      (profileCookiesDir = globSync('**/Network/Cookies', {
        ...options,
      }));
    profileNamesRegex = /User Data\\(.*?)\\Network/;
  } else if (os.platform() === 'darwin') {
    // Ignores copying cookies from the Purple-HATS directory if it exists
    profileCookiesDir = globSync('**/Cookies', {
      ...options,
      ignore: 'Purple-HATS/**',
    });
    profileNamesRegex = /Microsoft Edge\/(.*?)\/Cookies/;
  }

  if (profileCookiesDir.length > 0) {
    profileCookiesDir.map(dir => {
      const profileName = dir.match(profileNamesRegex)[1];
      if (profileName) {
        let destProfileDir = path.join(destDir, profileName);
        if (os.platform() === 'win32') {
          destProfileDir = path.join(destProfileDir, 'Network');
        }
        // Recursive true to create all parent directories (e.g. PbProfile/Default/Cookies)
        if (!fs.existsSync(destProfileDir)) {
          fs.mkdirSync(destProfileDir, { recursive: true });
          if (!fs.existsSync(destProfileDir)) {
            fs.mkdirSync(destProfileDir);
          }
        }

        // Prevents duplicate cookies file if the cookies already exist
        if (!fs.existsSync(path.join(destProfileDir, 'Cookies'))) {
          fs.copyFileSync(dir, path.join(destProfileDir, 'Cookies'));
        }
      }
    });
  } else {
    console.error('Unable to find Edge profile cookies file in the system.');
    return;
  }
};

/**
 * Both Edge and Chrome Local State files are located in the .../User Data directory
 * @param {*} options - glob options object
 * @param {string} destDir - destination directory
 * @returns {void}
 */
const cloneLocalStateFile = (options, destDir) => {
  const localState = globSync('**/*Local State', {
    ...options,
    maxDepth: 1,
  });

  if (localState.length > 0) {
    localState.map(dir => {
      fs.copyFileSync(dir, path.join(destDir, 'Local State'));
    });
  } else {
    console.error('Unable to find local state file in the system.');
    return;
  }
};

/**
 * Checks if the Chrome data directory exists and creates a clone
 * of all profile within the Purple-HATS directory located in the
 * .../User Data directory for Windows and
 * .../Chrome directory for Mac.
 * @returns {void}
 */
export const cloneChromeProfiles = () => {
  const baseDir = getDefaultChromeDataDir();

  if (!baseDir) {
    console.error('Unable to find Chrome data directory in the system.');
    return;
  }

  const destDir = path.join(baseDir, 'Purple-HATS');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
  }

  const baseOptions = {
    cwd: baseDir,
    recursive: true,
    absolute: true,
    nodir: true,
  };
  cloneChromeProfileCookieFiles(baseOptions, destDir);
  cloneLocalStateFile(baseOptions, destDir);
  // eslint-disable-next-line no-undef, consistent-return
  return path.join(baseDir, 'Purple-HATS');
};

/**
 * Checks if the Edge data directory exists and creates a clone
 * of all profile within the Purple-HATS directory located in the
 * .../User Data directory for Windows and
 * .../Microsoft Edge directory for Mac.
 * @returns {void}
 */
export const cloneEdgeProfiles = () => {
  const baseDir = getDefaultEdgeDataDir();

  if (!baseDir) {
    console.error('Unable to find Edge data directory in the system.');
    return;
  }

  const destDir = path.join(baseDir, 'Purple-HATS');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
  }

  const baseOptions = {
    cwd: baseDir,
    recursive: true,
    absolute: true,
    nodir: true,
  };
  cloneEdgeProfileCookieFiles(baseOptions, destDir);
  cloneLocalStateFile(baseOptions, destDir);
  // eslint-disable-next-line no-undef, consistent-return
  return path.join(baseDir, 'Purple-HATS');
};

export const deleteClonedChromeProfiles = () => {
  const baseDir = getDefaultChromeDataDir();

  if (!baseDir) {
    console.error('Unable to find Chrome data directory in the system.');
    return;
  }

  const destDir = path.join(baseDir, 'Purple-HATS');

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
    return;
  } else {
    console.error('Unable to find Purple-HATS directory in the Chrome data directory.');
    return;
  }
};

export const deleteClonedEdgeProfiles = () => {
  const baseDir = getDefaultEdgeDataDir();

  if (!baseDir) {
    console.error('Unable to find Edge data directory in the system.');
    return;
  }

  const destDir = path.join(baseDir, 'Purple-HATS');

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
    return;
  } else {
    console.error('Unable to find Purple-HATS directory in the Edge data directory.');
    return;
  }
};

/**
 * @param {string} browser browser name ("chrome" or "edge", null for chromium, the default Playwright browser)
 * @returns playwright launch options object. For more details: https://playwright.dev/docs/api/class-browsertype#browser-type-launch
 */
export const getPlaywrightLaunchOptions = browser => ({
  // Drop the --use-mock-keychain flag to allow MacOS devices
  // to use the cloned cookies.
  ignoreDefaultArgs: ['--use-mock-keychain'],
  args: constants.launchOptionsArgs,
  ...(browser && { channel: browser }),
});
