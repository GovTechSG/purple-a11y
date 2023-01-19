import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// for crawlers
export const axeScript = 'node_modules/axe-core/axe.min.js';

const urlsCrawledObj = {
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

const scannerTypes = {
  login: 'login',
  sitemap: 'sitemap',
  website: 'website',
};

const a11yStorage = '.a11y_storage';

export const impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

const xmlSitemapTypes = {
  xml: 0,
  xmlIndex: 1,
  rss: 2,
  atom: 3,
  unknown: 4
}

export default {
  a11yStorage: a11yStorage,
  a11yDataStoragePath: `${a11yStorage}/datasets`,
  allIssueFileName: 'all_issues',
  cliZipFileName: 'a11y-scan-results.zip',
  maxRequestsPerCrawl: 100,
  maxConcurrency: 5,
  scannerTypes: scannerTypes,
  urlsCrawledObj: urlsCrawledObj,
  impactOrder: impactOrder,
  xmlSitemapTypes
}

export const rootPath = __dirname;
export const wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
const latestAxeVersion = '4.4';
export const axeVersion = latestAxeVersion;
export const axeWebPage = `https://dequeuniversity.com/rules/axe/${latestAxeVersion}/`;

export const alertMessageOptions = {
  border: true,
  borderColor: 'red',
};
