#!/usr/bin/env node
/* eslint-disable no-fallthrough */
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
import fs from 'fs-extra';
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import printMessage from 'print-message';
import { devices } from 'playwright';
import { cleanUp, zipResults, setHeadlessMode, getVersion, getStoragePath } from './utils.js';
import {
  checkUrl,
  prepareData,
  isFileSitemap,
  cloneChromeProfiles,
  cloneEdgeProfiles,
  deleteClonedChromeProfiles,
  deleteClonedEdgeProfiles,
} from './constants/common.js';
import { cliOptions, messageOptions } from './constants/cliFunctions.js';
import constants, {
  getDefaultChromeDataDir,
  getDefaultEdgeDataDir,
} from './constants/constants.js';
import combineRun from './combine.js';
import playwrightAxeGenerator from './playwrightAxeGenerator.js';
import { silentLogger } from './logs.js';

const appVersion = getVersion();
const yargs = _yargs(hideBin(process.argv));

const options = yargs
  .version(false)
  .usage(
    `Purple HATS version: ${appVersion}
Usage: node cli.js -c <crawler> -d <device> -w <viewport> -u <url> OPTIONS`,
  )
  .strictOptions(true)
  .options(cliOptions)
  .example([
    [
      `To scan sitemap of website:', 'node cli.js -c [ 1 | ${constants.scannerTypes.sitemap} ] -d <device> -u <url_link> -w <viewportWidth>`,
    ],
    [
      `To scan a website', 'node cli.js -c [ 2 | ${constants.scannerTypes.website} ] -d <device> -u <url_link> -w <viewportWidth>`,
    ],
    [
      `To start a custom flow scan', 'node cli.js -c [ 3 | ${constants.scannerTypes.custom} ] -d <device> -u <url_link> -w <viewportWidth>`,
    ],
  ])
  .coerce('c', option => {
    const { choices } = cliOptions.c;
    if (typeof option === 'number') {
      // Will also allow integer choices
      if (Number.isInteger(option) && option > 0 && option <= choices.length) {
        option = choices[option - 1];
      } else {
        printMessage(
          [
            'Invalid option',
            `Please enter an integer (1 to ${choices.length}) or keywords (${choices.join(', ')}).`,
          ],
          messageOptions,
        );
        process.exit(1);
      }
    }

    return option;
  })
  .coerce('d', option => {
    const device = devices[option];
    if (!device && option !== 'Desktop' && option !== 'Mobile') {
      printMessage(
        [`Invalid device. Please provide an existing device to start the scan.`],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('w', option => {
    if (!option || Number.isNaN(option)) {
      printMessage([`Invalid viewport width. Please provide a number. `], messageOptions);
      process.exit(1);
    } else if (option < 320 || option > 1080) {
      printMessage(
        ['Invalid viewport width! Please provide a viewport width between 320-1080 pixels.'],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('p', option => {
    if (!Number.isInteger(option) || Number(option) <= 0) {
      printMessage(
        [`Invalid maximum number of pages. Please provide a positive integer.`],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('b', option => {
    const { choices } = cliOptions.b;
    if (typeof option === 'number') {
      if (Number.isInteger(option) && option > 0 && option <= choices.length) {
        option = choices[option - 1];
      } else {
        printMessage(
          [
            'Invalid option',
            `Please enter an integer (1 to ${choices.length}) or keywords (${choices.join(', ')}).`,
          ],
          messageOptions,
        );
        process.exit(1);
      }
    }

    return option;
  })
  .check(argvs => {
    if (argvs.scanner === 'custom' && argvs.maxpages) {
      throw new Error('-p or --maxpages is only available in website and sitemap scans');
    }
    return true;
  })
  .conflicts('d', 'w')
  .epilogue('').argv;

const scanInit = async argvs => {
  argvs.scanner = constants.scannerTypes[argvs.scanner];
  argvs.headless = argvs.headless === 'yes';
  argvs.browserToRun = constants.browserTypes[argvs.browserToRun];

  let useChrome = false;
  let useEdge = false;
  let chromeDataDir = null;
  let edgeDataDir = null;
  let clonedDataDir = null;

  if (argvs.browserToRun === constants.browserTypes.chrome) {
    chromeDataDir = getDefaultChromeDataDir();
    if (chromeDataDir) {
      useChrome = true;
      argvs.browserToRun = constants.browserTypes.chrome;
    } else {
      printMessage(
        [
          'Chrome browser profile is not detected in the default directory.',
          'Please ensure the default directory is used. Falling back to Edge browser...',
        ],
        messageOptions,
      );
      edgeDataDir = getDefaultEdgeDataDir();
      if (edgeDataDir) {
        useEdge = true;
        argvs.browserToRun = constants.browserTypes.edge;
      } else {
        printMessage(
          [
            'Both Chrome and Edge browser profile are not detected in the default directory.',
            'Please ensure Edge and Chrome browser profiles are in the default directory before trying again. Falling back to incognito Chromium...',
          ],
          messageOptions,
        );
        argvs.browserToRun = constants.browserTypes.chromium;
      }
    }
  } else if (argvs.browserToRun === constants.browserTypes.edge) {
    edgeDataDir = getDefaultEdgeDataDir();
    if (edgeDataDir) {
      useEdge = true;
      argvs.browserToRun = constants.browserTypes.edge;
    } else {
      printMessage(
        [
          'Edge browser profile is not detected in the default directory.',
          'Please ensure the default directory is used. Falling back to Chrome browser...',
        ],
        messageOptions,
      );
      chromeDataDir = getDefaultChromeDataDir();
      if (chromeDataDir) {
        useChrome = true;
        argvs.browserToRun = constants.browserTypes.chrome;
      } else {
        printMessage(
          [
            'Both Chrome and Edge browser profile are not detected in the default directory.',
            'Please ensure Edge and Chrome browser profiles are in the default directory before trying again. Falling back to incognito Chromium...',
          ],
          messageOptions,
        );
        argvs.browserToRun = constants.browserTypes.chromium;
      }
    }
  } else {
    argvs.browserToRun = constants.browserTypes.chromium;
  }

  if (useChrome) {
    clonedDataDir = cloneChromeProfiles();
  } else if (useEdge) {
    clonedDataDir = cloneEdgeProfiles();
  }

  const res = await checkUrl(argvs.scanner, argvs.url, argvs.browserToRun, clonedDataDir);
  const statuses = constants.urlCheckStatuses;
  // eslint-disable-next-line default-case
  switch (res.status) {
    case statuses.success.code:
      argvs.finalUrl = res.url;
      break;
    case statuses.unauthorised.code:
      printMessage([statuses.unauthorised.message], messageOptions);
      process.exit(res.status);
    case statuses.cannotBeResolved.code:
      printMessage([statuses.cannotBeResolved.message], messageOptions);
      process.exit(res.status);
    case statuses.systemError.code:
      printMessage([statuses.systemError.message], messageOptions);
      process.exit(res.status);
    case statuses.invalidUrl.code:
      if (argvs.scanner !== constants.scannerTypes.sitemap) {
        printMessage([statuses.invalidUrl.message], messageOptions);
        process.exit(res.status);
      }
      /* if sitemap scan is selected, treat this URL as a filepath
        isFileSitemap will tell whether the filepath exists, and if it does, whether the
        file is a sitemap */
      if (isFileSitemap(argvs.url)) {
        argvs.isLocalSitemap = true;
      } else {
        res.status = statuses.notASitemap.code;
      }
    case statuses.notASitemap.code:
      printMessage([statuses.notASitemap.message], messageOptions);
      process.exit(res.status);
    default:
      break;
  }

  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');

  const domain = argvs.isLocalSitemap ? 'custom' : new URL(argvs.url).hostname;

  if (argvs.customDevice === 'Desktop' || argvs.customDevice === 'Mobile') {
    argvs.deviceChosen = argvs.customDevice;
    delete argvs.customDevice;
  }

  const data = prepareData(argvs);

  setHeadlessMode(data.isHeadless);

  let screenToScan;

  if (argvs.deviceChosen) {
    screenToScan = argvs.deviceChosen;
  } else if (argvs.customDevice) {
    screenToScan = argvs.customDevice;
  } else if (argvs.viewportWidth) {
    screenToScan = `CustomWidth_${argvs.viewportWidth}px`;
  } else {
    screenToScan = 'Desktop';
  }

  data.randomToken = `PHScan_${domain}_${date}_${time}_${argvs.scanner.replaceAll(
    ' ',
    '_',
  )}_${screenToScan.replaceAll(' ', '_')}`;

  /**
   * Cloning a second time with random token for parallel browser sessions
   * Also To mitigate agaisnt known bug where cookies are
   * overriden after each browser session - i.e. logs user out
   * after checkingUrl and unable to utilise same cookie for scan
   * */
  if (useChrome) {
    deleteClonedChromeProfiles();
    clonedDataDir = cloneChromeProfiles(data.randomToken);
    data.browser = constants.browserTypes.chrome;
    data.userDataDirectory = clonedDataDir;
  } else if (useEdge) {
    deleteClonedEdgeProfiles();
    clonedDataDir = cloneEdgeProfiles(data.randomToken);
    data.browser = constants.browserTypes.edge;
    data.userDataDirectory = clonedDataDir;
  }
  // Defaults to chromium by not specifying channels in Playwright, if no browser is found
  else {
    data.browser = constants.browserTypes.chromium;
    data.userDataDirectory = null;
  }

  printMessage([`Purple HATS version: ${appVersion}`, 'Starting scan...'], messageOptions);

  if (argvs.scanner === constants.scannerTypes.custom) {
    try {
      await playwrightAxeGenerator(argvs.url, data);
    } catch (error) {
      silentLogger.error(error);
      printMessage([
        `An error has occurred when running the custom flow scan. Please see above and errors.txt for more details.`,
      ]);
      process.exit(2);
    }
  } else {
    await combineRun(data, screenToScan);
  }

  // Delete cloned directory
  if (useChrome) {
    deleteClonedChromeProfiles(data.randomToken);
  } else if (useEdge) {
    deleteClonedEdgeProfiles(data.randomToken);
  }
  // Delete dataset and request queues
  await cleanUp(data.randomToken);

  return getStoragePath(data.randomToken);
};

scanInit(options).then(async storagePath => {
  // Take option if set
  if (typeof options.zip === 'string') {
    constants.cliZipFileName = options.zip;
  }

  await fs
    .ensureDir(storagePath)
    .then(() => {
      zipResults(constants.cliZipFileName, storagePath);
      const messageToDisplay = [
        `Report of this run is at ${constants.cliZipFileName}`,
        `Results directory is at ${storagePath}`,
      ];

      if (process.env.REPORT_BREAKDOWN === '1') {
        messageToDisplay.push(
          'Reports have been further broken down according to their respective impact level.',
        );
      }
      printMessage(messageToDisplay);
      process.exit(0);
    })
    .catch(error => {
      printMessage([`Error in zipping results: ${error}`]);
    });
});
