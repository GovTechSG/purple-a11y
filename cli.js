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
    const deviceString = constants.devices.includes(option);
    if (!deviceString) {
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

  const validateUrl = async () => {
    if (isValidHttpUrl(argvs.url)) {
      const res = await checkUrl(argvs.scanner, argvs.url);
      if (res.status === 200) {
        // To take the final url from the validation
        argvs.finalUrl = res.url;
        return true;
      }
    } else if (argvs.scanner === constants.scannerTypes.sitemap && isFileSitemap(argvs.url)) {
      argvs.isLocalSitemap = true;
      return true;
    }
    return false;
  };

  const isValidUrl = await validateUrl();

  if (!isValidUrl) {
    printMessage(
      [
        `Invalid URL provided. Either it does not exist or it cannot be used for a ${argvs.scanner} scan.`,
      ],
      messageOptions,
    );
    process.exit(1);
  }

  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');

  const domain = argvs.isLocalSitemap ? 'custom' : new URL(argvs.url).hostname;

  const data = prepareData(argvs);

  setHeadlessMode(data.isHeadless);

  let screenToScan;
  
  if (argvs.customDevice) {
    screenToScan = argvs.customDevice;
  } else {
    screenToScan = `CustomWidth_${argvs.viewportWidth}px`;
  }

  data.randomToken = `PHScan_${domain}_${date}_${time}_${argvs.scanner.replaceAll(' ', '_')}_${screenToScan}`;

  printMessage([`Purple HATS version: ${appVersion}`, 'Starting scan...'], messageOptions);
  
  if (argvs.scanner === constants.scannerTypes.custom) {
    try {
      await playwrightAxeGenerator(argvs.url, data);
    } catch (error) {
      printMessage([`An error has occurred when running the custom flow scan. Please see above and errors.txt for more details.`]);
      process.exit(2);
    }
  } else {
    await combineRun(data, screenToScan.replaceAll('_', ' '));
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
