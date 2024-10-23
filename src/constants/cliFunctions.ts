import { Options } from 'yargs';
import printMessage from 'print-message';
import { BrowserTypes, ScannerTypes } from './constants.js';

export const messageOptions = {
  border: false,
  marginTop: 2,
  marginBottom: 2,
};

export const alertMessageOptions = {
  border: true,
  borderColor: 'red',
};

export const cliOptions: { [key: string]: Options } = {
  c: {
    alias: 'scanner',
    describe:
      'Type of scan, 1) sitemap, 2) website crawl, 3) custom flow, 4) intelligent 5) local file',
    requiresArg: true,
    coerce: option => {
      const choices = ['sitemap', 'website', 'custom', 'intelligent', 'localfile'];
      let resolvedOption = option;

      if (typeof option === 'number') {
        // Will also allow integer choices
        if (
          Number.isInteger(resolvedOption) &&
          resolvedOption > 0 &&
          resolvedOption <= choices.length
        ) {
          resolvedOption = choices[resolvedOption - 1];
        }
      }

      switch (resolvedOption) {
        case 'sitemap':
          return ScannerTypes.SITEMAP;
        case 'website':
          return ScannerTypes.WEBSITE;
        case 'custom':
          return ScannerTypes.CUSTOM;
        case 'localfile':
          return ScannerTypes.LOCALFILE;
        case 'intelligent':
          return ScannerTypes.INTELLIGENT;
        default:
          printMessage(
            [
              `Invalid option: ${resolvedOption}`,
              `Please enter an integer (1 to ${choices.length}) or keywords (${choices.join(', ')}).`,
            ],
            messageOptions,
          );
          process.exit(1);
          return null;
      }
    },
    demandOption: true,
  },
  u: {
    alias: 'url',
    describe: 'Website URL you want to scan',
    type: 'string',
    demandOption: true,
  },
  d: {
    alias: 'customDevice',
    describe: 'Device you want to scan',
    type: 'string',
    demandOption: false,
  },
  w: {
    alias: 'viewportWidth',
    describe: 'Viewport width (in pixels) you want to scan',
    type: 'number',
    demandOption: false,
  },
  o: {
    alias: 'zip',
    describe: 'Zip filename to save results',
    type: 'string',
    demandOption: false,
  },
  p: {
    alias: 'maxpages',
    describe:
      'Maximum number of pages to scan (default: 100). Only available in website and sitemap scans',
    type: 'number',
    demandOption: false,
  },
  f: {
    alias: 'safeMode',
    describe:
      'Disable dynamically clicking of page buttons and links to find links, which resolve issues on some websites. [yes / no]',
    type: 'string',
    requiresArg: true,
    default: 'no',
    demandOption: false,
    coerce: (value: string) => {
      if (value.toLowerCase() === 'yes') {
        return true;
      }
      if (value.toLowerCase() === 'no') {
        return false;
      }
      throw new Error(`Invalid value "${value}" for -f, --safeMode. Use "yes" or "no".`);
    },
  },
  h: {
    alias: 'headless',
    describe: 'Run the scan in headless mode. [yes / no]',
    type: 'string',
    requiresArg: true,
    default: 'yes',
    demandOption: false,
    coerce: (value: string) => {
      if (value.toLowerCase() === 'yes') {
        return true;
      }
      if (value.toLowerCase() === 'no') {
        return false;
      }
      throw new Error(`Invalid value "${value}" for -h, --headless. Use "yes" or "no".`);
    },
  },
  b: {
    alias: 'browserToRun',
    describe: 'Browser to run the scan on: 1) Chromium, 2) Chrome, 3) Edge. Defaults to Chromium.',
    requiresArg: true,
    coerce: option => {
      const choices = ['chromium', 'chrome', 'edge'];
      let resolvedOption = option;
      if (typeof option === 'number') {
        // Will also allow integer choices
        if (
          Number.isInteger(resolvedOption) &&
          resolvedOption > 0 &&
          resolvedOption <= choices.length
        ) {
          resolvedOption = choices[resolvedOption - 1];
        }
      }

      switch (resolvedOption) {
        case 'chromium':
          return BrowserTypes.CHROMIUM;
        case 'chrome':
          return BrowserTypes.CHROME;
        case 'edge':
          return BrowserTypes.EDGE;
        default:
          printMessage(
            [
              `Invalid option: ${resolvedOption}`,
              `Please enter an integer (1 to ${choices.length}) or keywords (${choices.join(', ')}).`,
            ],
            messageOptions,
          );
          process.exit(1);
          return null;
      }
    },
    demandOption: false,
  },
  s: {
    alias: 'strategy',
    describe:
      'Crawls up to general (same parent) domains, or only specific hostname. Defaults to "same-domain".',
    choices: ['same-domain', 'same-hostname'],
    requiresArg: true,
    demandOption: false,
  },
  e: {
    alias: 'exportDirectory',
    describe: 'Preferred directory to store scan results. Path is relative to your home directory.',
    type: 'string',
    requiresArg: true,
    demandOption: false,
  },
  j: {
    alias: 'customFlowLabel',
    describe: 'Give Custom Flow Scan a label for easier reference in the report',
    type: 'string',
    requiresArg: true,
    demandOption: false,
  },
  k: {
    alias: 'nameEmail',
    describe: `To personalise your experience, we will be collecting your name, email address and app usage data. Your information fully complies with GovTech’s Privacy Policy. Please provide your name and email address in this format "John Doe:john@domain.com".`,
    type: 'string',
    demandOption: true,
  },
  t: {
    alias: 'specifiedMaxConcurrency',
    describe:
      'Maximum number of pages to scan concurrently. Use for sites with throttling. Defaults to 25.',
    type: 'number',
    demandOption: false,
  },

  i: {
    alias: 'fileTypes',
    describe: 'File types to include in the scan. Defaults to html-only.',
    type: 'string',
    choices: ['all', 'pdf-only', 'html-only'],
    demandOption: false,
    requiresArg: true,
    default: 'html-only',
  },
  x: {
    alias: 'blacklistedPatternsFilename',
    describe:
      'Txt file that has a list of pattern of domains to exclude from accessibility scan separated by new line',
    type: 'string',
    demandOption: false,
  },
  a: {
    alias: 'additional',
    describe:
      'Additional features to include in the report: \nscreenshots - Include element screenshots in the generated report \nnone - Exclude all additional features in the generated report',
    type: 'string',
    default: 'screenshots',
    choices: ['screenshots', 'none'],
    requiresArg: true,
    demandOption: false,
  },
  q: {
    alias: 'metadata',
    describe:
      'Json string that contains additional scan metadata for telemetry purposes. Defaults to "{}"',
    type: 'string',
    default: '{}',
    demandOption: false,
  },
  r: {
    alias: 'followRobots',
    describe: 'Crawler adheres to robots.txt rules if it exists. [yes / no]',
    type: 'string',
    requiresArg: true,
    default: 'no',
    demandOption: false,
    coerce: (value: string) => {
      if (value.toLowerCase() === 'yes') {
        return true;
      }
      if (value.toLowerCase() === 'no') {
        return false;
      }
      throw new Error(`Invalid value "${value}" for -r, --followRobots. Use "yes" or "no".`);
    },
  },
  m: {
    alias: 'header',
    describe:
      'The HTTP authentication header keys and their respective values to enable crawler access to restricted resources.',
    type: 'string',
    requiresArg: true,
    demandOption: false,
  },
};

export const configureReportSetting = (isEnabled: boolean): void => {
  if (isEnabled) {
    process.env.REPORT_BREAKDOWN = '1';
  } else {
    process.env.REPORT_BREAKDOWN = '0';
  }
};
