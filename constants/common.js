/* eslint-disable camelcase */
/* eslint-disable no-use-before-define */
import validator from 'validator';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import crawlee from 'crawlee';
import { parseString } from 'xml2js';
import constants from './constants.js';
import { consoleLogger, silentLogger } from '../logs.js';
import * as https from 'https';
import { isWhitelistedContentType } from '../utils.js';

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
      silentLogger.error('Failed to parse sitemap xml', err);
      status = false;
    }
  });
  return { status, parsedContent };
};

export const getUrlMessage = scanner => {
  switch (scanner) {
    case constants.scannerTypes.website:
      return 'Please enter URL of website: ';
    case constants.scannerTypes.sitemap:
      return 'Please enter URL to sitemap: ';

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

const sanitizeUrlInput = url => {
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
    await axios
      .get(data.url, { httpsAgent, timeout: 15000 })
      .then(async response => {
        const redirectUrl = response.request.res.responseUrl;
        res.status = response.status;

        if (redirectUrl != null) {
          res.url = redirectUrl;
        } else {
          res.url = url;
        }

        res.content = response.data;
      })
      .catch(error => {
        consoleLogger.info('Provided URL cannot be accessed. Please verify connectivity.');
        silentLogger.error(error);
        res.status = 400;
      });
  } else {
    res.status = 400;
  }

  return res;
};

export const isSitemapContent = async content => {
  const { status: isValid } = await isValidXML(content);

  if (!isValid) {
    const regexForHtml = new RegExp('<(?:!doctype html|html|head|body)+?>', 'gmi');
    const regexForUrl = new RegExp('^(http|https):/{2}.*$', 'gmi');
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

export const checkUrl = async (scanner, url) => {
  const res = await checkUrlConnectivity(url);

  if (res.status === 200) {
    if (scanner === constants.scannerTypes.sitemap) {
      const isSitemap = await isSitemapContent(res.content);

      if (!isSitemap) {
        res.status = 400;
      }
    }
  }

  return res;
};

const isEmptyObject = obj => !Object.keys(obj).length;

export const prepareData = (scanType, argv) => {
  if (isEmptyObject(argv)) {
    throw Error('No inputs should be provided');
  }
  const { scanner, url, deviceChosen, customDevice, viewportWidth } = argv;

  let data;
  if (scanType === constants.scannerTypes.sitemap || scanType === constants.scannerTypes.website) {
    data = {
      type: scanner,
      url,
      deviceChosen,
      customDevice,
      viewportWidth,
    };
  }

  if (scanType === constants.scannerTypes.login) {
    data = {
      type: argv.scanner,
      url,
      deviceChosen,
      customDevice,
      viewportWidth,
      loginID: argv.username,
      loginPW: argv.userPassword,
      idSelector: argv.usernameField,
      pwSelector: argv.passwordField,
      submitSelector: argv.submitBtnField,
    };
  }
  return data;
};

const checkFeedType = async content => {
  const formData = new URLSearchParams();
  formData.append('rawdata', content);

  const { data } = await axios.post('https://validator.w3.org/feed/check.cgi', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const $ = cheerio.load(data);
  const result = $('h2').first();

  // Not a valid RSS or Atom sitemap
  if (result.text() === 'Sorry') {
    return constants.xmlSitemapTypes.unknown;
  }

  const feedTypeMessage = result.next();

  if (feedTypeMessage.text().includes('RSS')) {
    return constants.xmlSitemapTypes.rss;
  } else {
    return constants.xmlSitemapTypes.atom;
  }
};

export const getLinksFromSitemap = async (url, maxLinksCount) => {
  const validUrls = new Set(); // for HTML documents
  const invalidUrls = new Set(); // for non-HTML documents

  const isLimitReached = () => {
    return validUrls.size + invalidUrls.size >= maxLinksCount;
  };

  const addUrl = async url => {
    try {
      const { headers } = await axios.head(url);
      const urlContentType = headers.getContentType();

      if (isWhitelistedContentType(urlContentType)) {
        validUrls.add(url);
      } else {
        invalidUrls.add(url);
      }
    } catch (error) {
      invalidUrls.add(url);
      silentLogger.error('Failed to get URL content type: ', error);
    }
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
      await addUrl(url);
    }
  };

  const processNonStandardSitemap = async data => {
    const urls = crawlee.extractUrls({ string: data }).slice(0, maxLinksCount);
    for (const url of urls) {
      if (isLimitReached()) {
        return;
      }
      await addUrl(url);
    }
  };

  const fetchUrls = async url => {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data, { xml: true });

    // This case is when the document is not an XML format document
    if ($(':root').length === 0) {
      await processNonStandardSitemap(data);
      return;
    }

    // Root element
    const root = $(':root')[0];

    const xmlns = root.attribs?.xmlns;
    const xmlFormatNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';

    let sitemapType;

    if (root.name === 'urlset' && xmlns === xmlFormatNamespace) {
      sitemapType = constants.xmlSitemapTypes.xml;
    } else if (root.name === 'sitemapindex' && xmlns === xmlFormatNamespace) {
      sitemapType = constants.xmlSitemapTypes.xmlIndex;
    } else {
      sitemapType = await checkFeedType(data);
    }

    switch (sitemapType) {
      case constants.xmlSitemapTypes.xmlIndex:
        silentLogger.info(`This is a XML format sitemap index.`);
        for (const childSitemapUrl of $('loc')) {
          if (isLimitReached()) {
            break;
          }
          await fetchUrls($(childSitemapUrl).text());
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
        await processNonStandardSitemap(data);
        break;
    }
  };

  await fetchUrls(url);
  return {
    validUrls: Array.from(validUrls),
    invalidUrls: Array.from(invalidUrls),
    numberOfLinks: validUrls.size + invalidUrls.size,
  };
};
