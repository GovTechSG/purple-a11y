import constants from './constants.js';

export const messageOptions = {
  border: false,
  marginTop: 2,
  marginBottom: 2,
};

export const alertMessageOptions = {
  border: true,
  borderColor: 'red',
};

export const cliOptions = {
  c: {
    alias: 'scanner',
    describe: 'Type of scan, 1) sitemap, 2) website crawl, 3) custom flow',
    choices: Object.keys(constants.scannerTypes),
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
  h: {
    alias: 'headless',
    describe: 'Whether to run the scan in headless mode. Defaults to yes.',
    type: 'string',
    choices: ['yes', 'no'],
    requiresArg: true,
    default: 'yes',
    demandOption: false,
  },
  b: {
    alias: 'browserToRun',
    describe: 'Browser to run the scan on: 1) Chromium, 2) Chrome, 3) Edge. Defaults to Chromium.',
    choices: Object.keys(constants.browserTypes),
    requiresArg: true,
    default: 'chrome',
    demandOption: false,
  },
  s: {
    alias: 'strategy',
    describe:
      'Strategy to choose which links to crawl in a website scan. Defaults to "same-domain".',
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
    describe: `To personalise your experience, we will be collecting your name, email address and app usage data. Your information fully complies with GovTech’s Privacy Policy. Please provice your name and email address in this format "John Doe:john@domain.com".`,
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
  f: {
    alias: 'needsReviewItems',
    describe: 'Whether to display items requiring manual review in report. Defaults to false.',
    type: 'string',
    choices: ['true', 'false'],
    demandOption: false,
  },
  x: {
    alias: 'blacklistedPatternsFilename',
    describe:
      'Txt file that has a list of pattern of domains to exclude from accessibility scan separated by new line',
    type: 'string',
    demandOption: false,
  },
};

export const configureReportSetting = isEnabled => {
  if (isEnabled) {
    process.env.REPORT_BREAKDOWN = 1;
  } else {
    process.env.REPORT_BREAKDOWN = 0;
  }
};
