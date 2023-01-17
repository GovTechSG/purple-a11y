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

const document = new JSDOM('').window;

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
      .get(data.url, { timeout: 15000 })
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

const checkXmlSitemapType = (content) => {
  if ('urlset' in content || 'sitemapindex' in content) {
    return constants.xmlSitemapTypes.xml;
  } else if ('rss' in content) {
    return constants.xmlSitemapTypes.rss;
  } else if ('feed' in content) {
    return constants.xmlSitemapTypes.atom;
  } else {
    return constants.xmlSitemapTypes.unknown;
  }
}

export const isSitemapContent = async content => {
  const { status: isValid, parsedContent } = await isValidXML(content);

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

  switch (checkXmlSitemapType(parsedContent)) {
    case constants.xmlSitemapTypes.xml:
      silentLogger.info(`This is a XML sitemap format sitemap.`);
      break;
    case constants.xmlSitemapTypes.rss:
      silentLogger.info(`This is a RSS format sitemap.`);
      break;
    case constants.xmlSitemapTypes.atom:
      silentLogger.info(`This is a atom format sitemap.`);
      break;
    default:
      silentLogger.info(`This is an unrecognised XML sitemap format.`);
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

  let data;
  if (scanType === constants.scannerTypes.sitemap || scanType === constants.scannerTypes.website) {
    data = {
      type: argv.scanner,
      url: argv.url,
    };
  }

  if (scanType === constants.scannerTypes.login) {
    data = {
      type: argv.scanner,
      url: argv.url,
      loginID: argv.username,
      loginPW: argv.userPassword,
      idSelector: argv.usernameField,
      pwSelector: argv.passwordField,
      submitSelector: argv.submitBtnField,
    };
  }
  return data;
};

export const getLinksFromSitemap = async (url) => {
  const { data } = await axios.get(url);
  const { status: isXML, parsedContent } = await isValidXML(data);

  if (!isXML) {
    return crawlee.extractUrls({ string: data });
  }

  const urls = [];
  const addedUrls = new Set();
  const $ = cheerio.load(data, { xml: true });

  const addUrl = (url) => {
    if (!addedUrls.has(url)) {
      addedUrls.add(url);
      urls.push(url);
    }
  }

  switch (checkXmlSitemapType(parsedContent)) {
    case constants.xmlSitemapTypes.xml:
      $('loc').each(function() {
        addUrl($(this).text());
      })
      break;
    case constants.xmlSitemapTypes.rss:
      $('link').each(function() {
        addUrl($(this).text());
      })
      break;
    case constants.xmlSitemapTypes.atom:
      $('link').each(function() {
        addUrl($(this).prop('href'));
      })
      break;
    default:
      return crawlee.extractUrls({ string: data });
  }

  return urls;
}