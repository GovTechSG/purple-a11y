import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { globSync } from 'glob';
import which from 'which';
import os from 'os';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const maxRequestsPerCrawl = 100;

export const intermediateScreenshotsPath = './screenshots';
export const destinationPath = storagePath => `${storagePath}/screenshots`;

export const removeQuarantineFlag = function (searchPath) {
  if (os.platform() === 'darwin') {
    let execPaths = globSync(searchPath, { absolute: true, recursive: true, nodir: true });
    if (execPaths.length > 0) {
      execPaths.forEach(filePath => spawnSync('xattr', ['-d', 'com.apple.quarantine', filePath]));
    }
  }
};

export const getExecutablePath = function (dir, file) {
  let execPaths = globSync(dir + '/' + file, { absolute: true, recursive: true, nodir: true });

  if (execPaths.length === 0) {
    let execInPATH = which.sync(file, { nothrow: true });

    if (execInPATH) {
      return fs.realpathSync(execInPATH);
    }
    return null;
  } else {
    removeQuarantineFlag(execPaths[0]);
    return execPaths[0];
  }
};

// for crawlers
export const axeScript = 'node_modules/axe-core/axe.min.js';

const urlsCrawledObj = {
  toScan: [],
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

const scannerTypes = {
  sitemap: 'Sitemap',
  website: 'Website',
  custom: 'Custom',
};

// Check if running in docker container
let launchOptionsArgs = [];
if (fs.existsSync('/.dockerenv')) {
  launchOptionsArgs = ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'];
}

//  _folder_paths
const a11yStorage = '.a11y_storage';

export const impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

const urlCheckStatuses = {
  success: { code: 0 },
  invalidUrl: { code: 11, message: 'Invalid URL or URL is not using http or https.' },
  cannotBeResolved: {
    code: 12,
    message:
      'Provided URL cannot be accessed. Please verify your internet connectivity and the correctness of the domain.',
  },
  errorStatusReceived: {
    code: 13,
    message: 'Provided URL cannot be accessed. Server responded with code ', // append it with the response code received,
  },
  systemError: {
    code: 14,
    message: 'Something went wrong when verifying the URL. Please try again later.',
  },
  notASitemap: { code: 15, message: 'Provided URL or filepath is not a sitemap.' },
};

const xmlSitemapTypes = {
  xml: 0,
  xmlIndex: 1,
  rss: 2,
  atom: 3,
  unknown: 4,
};

export default {
  a11yStorage,
  a11yDataStoragePath: `${a11yStorage}/datasets`,
  allIssueFileName: 'all_issues',
  cliZipFileName: 'a11y-scan-results.zip',
  maxRequestsPerCrawl,
  maxConcurrency: 50,
  scannerTypes,
  urlsCrawledObj,
  impactOrder,
  launchOptionsArgs: launchOptionsArgs,
  xmlSitemapTypes,
  urlCheckStatuses,
};

export const rootPath = __dirname;
export const wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
const latestAxeVersion = '4.4';
export const axeVersion = latestAxeVersion;
export const axeWebPage = `https://dequeuniversity.com/rules/axe/${latestAxeVersion}/`;
