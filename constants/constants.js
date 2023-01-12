import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// for crawlers
export let axeScript = 'node_modules/axe-core/axe.min.js';

export let maxRequestsPerCrawl = 100;

export let maxConcurrency = 5;

export let urlsCrawledObj = {
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

export let scannerTypes = {
  login: 'login',
  sitemap: 'sitemap',
  website: 'website',
};

// folder paths
export let a11yStorage = '.a11y_storage';

export let a11yDataStoragePath = `${a11yStorage}/datasets`;

export let allIssueFileName = 'all_issues';

export let cliZipFileName = 'a11y-scan-results.zip';

export let rootPath = __dirname;

// others
export let impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

export let wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
const latestAxeVersion = '4.4';
export let axeVersion = latestAxeVersion;
export let axeWebPage = `https://dequeuniversity.com/rules/axe/${latestAxeVersion}/`;

export let alertMessageOptions = {
  border: true,
  borderColor: 'red',
};
