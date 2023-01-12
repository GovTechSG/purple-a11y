#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
import fs from 'fs-extra';
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import printMessage from 'print-message';
import {
  cleanUp,
  getStoragePath,
  zipResults,
  setHeadlessMode,
  setThresholdLimits,
} from './utils.js';

import { 
  checkUrl, 
  prepareData, 
  isSelectorValid, 
  isInputValid 
} from './constants/common.js';

import { 
  cliOptions, 
  messageOptions, 
  configureReportSetting
} from './constants/cliFunctions.js';

import { scannerTypes } from './constants/constants.js';
import { cliZipFileName } from './constants/constants.js';
import { consoleLogger } from './logs.js';
import { combineRun } from './combine.js';

setHeadlessMode(true);

cleanUp('.a11y_storage');

const yargs = _yargs(hideBin(process.argv));

const options = yargs
  .usage('Usage: node cli.js -c <crawler> -u <url> OPTIONS')
  .strictOptions(true)
  .options(cliOptions)
  .example([
    [`To scan sitemap of website:', 'node cli.js -c [ 1 | ${scannerTypes.sitemap} ] -u <url_link>`],
    [`To scan a website', 'node cli.js -c [ 2 | ${scannerTypes.website} ] -u <url_link>`]
  ])
  .coerce('c', option => {
    if (typeof option === 'number') {
      // Will also allow integer choices
      switch (option) {
        case 1:
          option = scannerTypes.sitemap;
          break;
        case 2:
          option = scannerTypes.website;
          break;
        default:
          printMessage(
            [
              'Invalid option',
              `Please choose to enter numbers (1,2) or keywords (${scannerTypes.sitemap}, ${scannerTypes.website}).`,
            ],
            messageOptions,
          );
          process.exit(1);
      }
    }

    return option;
  })
  .epilogue('').argv;

const scanInit = async argvs => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const curHour = today.getHours() < 10 ? '0' + today.getHours() : today.getHours();
  const curMinute = today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes();

  // Set the parameters required to indicate whether to break down report
  configureReportSetting(argvs.reportbreakdown);

  // Set the parameters required to indicate threshold limits
  setThresholdLimits(argvs.warn);

  // Validate the URL
  const res = await checkUrl(argvs.scanner, argvs.url);
  if (res.status === 200) {
    // To take the final url from the validation
    argvs.url = res.url;

    const data = prepareData(argvs.scanner, argvs);
    const domain = new URL(argvs.url).hostname;

    data.randomToken = `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}`;

    printMessage(['Scanning website...'], messageOptions);
    await combineRun(data);
  } else {
    printMessage(
      [`Invalid ${argvs.scanner} page. Please provide a URL to start the ${argvs.scanner} scan.`],
      messageOptions,
    );
    process.exit(1);
  }

  const domain = new URL(argvs.url).hostname;
  return `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}`;
};

scanInit(options).then(async storagePath => {
  // Path to scan result
  storagePath = fs.readdirSync('results').filter(fn => fn.startsWith(storagePath));

  // Take option if set
  if (typeof options.zip === 'string') {
    cliZipFileName = options.zip;
  }

  await fs
    .ensureDir(`results/${storagePath[0]}`)
    .then(async () => {
      await zipResults(cliZipFileName, `results/${storagePath[0]}`);
      const messageToDisplay = [`Report of this run is at ${cliZipFileName}`];

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