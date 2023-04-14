#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
import fs from 'fs-extra';
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import printMessage from 'print-message';
import {
  cleanUp,
  zipResults,
  setHeadlessMode,
  setThresholdLimits,
  getVersion,
  getStoragePath,
} from './utils.js';
import { checkUrl, prepareData, isValidHttpUrl, isFileSitemap } from './constants/common.js';
import { cliOptions, messageOptions, configureReportSetting } from './constants/cliFunctions.js';
import constants from './constants/constants.js';
import combineRun from './combine.js';
import playwrightAxeGenerator from './playwrightAxeGenerator.js';
import { devices } from 'playwright';
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
    if (!device) {
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

  // Set the parameters required to indicate whether to break down report
  configureReportSetting(argvs.reportbreakdown);

  // Set the parameters required to indicate threshold limits
  setThresholdLimits(argvs.warn);

  const res = await checkUrl(argvs.scanner, argvs.url);
  const statuses = constants.urlCheckStatuses;
  switch (res.status) {
    case statuses.success.code:
      argvs.finalUrl = res.url;
      break;
    case statuses.cannotBeResolved.code:
      printMessage([statuses.cannotBeResolved.message], messageOptions);
      process.exit(res.status);
    case statuses.errorStatusReceived.code:
      printMessage(
        [`${statuses.errorStatusReceived.message}${res.serverResponse}.`],
        messageOptions,
      );
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
        break;
      } else {
        res.status = statuses.notASitemap.code;
      }
    case statuses.notASitemap.code:
      printMessage([statuses.notASitemap.message], messageOptions);
      process.exit(res.status);
  }

  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');

  const domain = argvs.isLocalSitemap ? 'custom' : new URL(argvs.url).hostname;

  const data = prepareData(argvs);

  setHeadlessMode(data.isHeadless);

  let screenToScan;

  if (!argvs.customDevice && !argvs.viewportWidth) {
    screenToScan = 'Desktop';
  } else if (argvs.customDevice) {
    screenToScan = argvs.customDevice;
  } else {
    screenToScan = `CustomWidth_${argvs.viewportWidth}px`;
  }

  data.randomToken = `PHScan_${domain}_${date}_${time}_${argvs.scanner.replaceAll(
    ' ',
    '_',
  )}_${screenToScan.replaceAll(' ', '_')}`;

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

  return getStoragePath(data.randomToken);
};

scanInit(options).then(async storagePath => {
  // Delete dataset and request queues
  cleanUp(constants.a11yStorage);

  // Take option if set
  if (typeof options.zip === 'string') {
    constants.cliZipFileName = options.zip;
  }

  await fs
    .ensureDir(storagePath)
    .then(async () => {
      await zipResults(constants.cliZipFileName, storagePath);
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
    })
    .catch(error => {
      printMessage([`Error in zipping results: ${error}`]);
    });
});
