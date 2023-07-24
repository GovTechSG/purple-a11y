import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { globSync } from 'glob';
import which from 'which';
import os from 'os';
import { spawnSync } from 'child_process';
import { silentLogger } from '../logs.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const maxRequestsPerCrawl = 3;

// Attributes to process axe outputted HTML into basicFormHTML snippets
// for sending to backend services to query GPT
export const ruleIdsWithHtml = [
  'aria-allowed-attr',
  'aria-hidden-focus',
  'aria-input-field-name',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-toggle-field-name',
  'aria-valid-attr-value',
  'aria-valid-attr',
  'input-button-name',
  'link-name',
  'nested-interactive',
  'avoid-inline-spacing',
  'aria-allowed-role',
];

// Whitelisted attributes (to not drop)
// i.e. any other attribute will be dropped
export const whitelistedAttributes = [
  `type`,
  `tabindex`,
  `lang`,
  `scope`,
  `alt`,
  `role`,
  `charset`,
  `for`,
  `content`,
  `name`,
  `onclick`,
  `aria*`,
  `src`,
  `value`,
  `href`,
  `title`,
  `style`,
];

// Attributes to mute, to be replace with "..."
export const mutedAttributeValues = [
  `name`,
  `data`,
  `src`,
  `value`,
  `href`,
  `title`,
  `aria-describedby`,
  `aria-label`,
  `aria-labelledby`,
];

export const intermediateScreenshotsPath = './screenshots';
export const destinationPath = storagePath => `${storagePath}/screenshots`;

/**  Get the path to Default Profile in the Chrome Data Directory
 * as per https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md
 * @returns {string} path to Default Profile in the Chrome Data Directory
 */
export const getDefaultChromeDataDir = () => {
  try {
    let defaultChromeDataDir = null;
    if (os.platform() === 'win32') {
      defaultChromeDataDir = path.join(
        os.homedir(),
        'AppData',
        'Local',
        'Google',
        'Chrome',
        'User Data',
      );
    } else if (os.platform() === 'darwin') {
      defaultChromeDataDir = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Google',
        'Chrome',
      );
    }
    if (defaultChromeDataDir && fs.existsSync(defaultChromeDataDir)) {
      return defaultChromeDataDir;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error in getDefaultChromeDataDir(): ${error}`);
  }
};

/**
 * Get the path to Default Profile in the Edge Data Directory
 * @returns {string} - path to Default Profile in the Edge Data Directory
 */
export const getDefaultEdgeDataDir = () => {
  try {
    let defaultEdgeDataDir = null;
    if (os.platform() === 'win32') {
      defaultEdgeDataDir = path.join(
        os.homedir(),
        'AppData',
        'Local',
        'Microsoft',
        'Edge',
        'User Data',
      );
    } else if (os.platform() === 'darwin') {
      defaultEdgeDataDir = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Microsoft Edge',
      );
    }

    if (defaultEdgeDataDir && fs.existsSync(defaultEdgeDataDir)) {
      return defaultEdgeDataDir;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error in getDefaultEdgeDataDir(): ${error}`);
  }
};

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

/**
 * Matches the pattern user:password@domain.com
 */
export const basicAuthRegex = /^.*\/\/.*:.*@.*$/i;

// for crawlers
export const axeScript = path.join(__dirname, '../node_modules/axe-core/axe.min.js');

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

let launchOptionsArgs = [];

// Check if running in docker container
if (fs.existsSync('/.dockerenv')) {
  launchOptionsArgs = ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'];
}

export const getProxy = () => {
  if (os.platform() === 'win32') {
    let internetSettings;
    try {
      internetSettings = execSync(
        'Get-ItemProperty -Path "Registry::HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"',
        { shell: 'powershell.exe' },
      )
        .toString()
        .split('\n');
    } catch (e) {
      console.log(e.toString());
      silentLogger.error(e.toString());
    }

    const getSettingValue = settingName =>
      internetSettings
        .find(s => s.startsWith(settingName))
        // split only once at with ':' as the delimiter
        ?.split(/:(.*)/s)[1]
        ?.trim();

    if (getSettingValue('AutoConfigURL')) {
      return { type: 'autoConfig', url: getSettingValue('AutoConfigURL') };
    } else if (getSettingValue('ProxyEnable') === '1') {
      return { type: 'manualProxy', url: getSettingValue('ProxyServer') };
    } else {
      return null;
    }
  } else {
    // develop for mac
    return null;
  }
};

export const proxy = getProxy();

if (proxy && proxy.type === 'autoConfig') {
  launchOptionsArgs.push(`--proxy-pac-url=${proxy.url}`);
} else if (proxy && proxy.type === 'manualProxy') {
  launchOptionsArgs.push(`--proxy-server=${proxy.url}`);
}

export const impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

export const formDataFields = {
  formUrl: `https://docs.google.com/forms/d/e/1FAIpQLSem5C8fyNs5TiU5Vv2Y63-SH7CHN86f-LEPxeN_1u_ldUbgUA/formResponse`,
  websiteUrlField: 'entry.1562345227',
  scanTypeField: 'entry.1148680657',
  emailField: 'entry.52161304',
  nameField: 'entry.1787318910',
  resultsField: 'entry.904051439',
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
    // unused for now
    code: 13,
    message: 'Provided URL cannot be accessed. Server responded with code ', // append it with the response code received,
  },
  systemError: {
    code: 14,
    message: 'Something went wrong when verifying the URL. Please try again later.',
  },
  notASitemap: { code: 15, message: 'Provided URL or filepath is not a sitemap.' },
  unauthorised: { code: 16, message: 'Provided URL needs basic authorisation.' },
};

const browserTypes = {
  chrome: 'chrome',
  edge: 'msedge',
  chromium: 'chromium',
};

const xmlSitemapTypes = {
  xml: 0,
  xmlIndex: 1,
  rss: 2,
  atom: 3,
  unknown: 4,
};

export default {
  allIssueFileName: 'all_issues',
  cliZipFileName: 'a11y-scan-results.zip',
  maxRequestsPerCrawl,
  maxConcurrency: 50,
  scannerTypes,
  browserTypes,
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

export const saflyIconSelector = `#__safly_icon`;
