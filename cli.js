#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
import fs from 'fs-extra';
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import printMessage from 'print-message';
import { cleanUp, zipResults, setHeadlessMode, setThresholdLimits, getVersion } from './utils.js';
import { exec } from 'child_process';
import { checkUrl, prepareData, isSelectorValid, isInputValid } from './constants/common.js';

import { cliOptions, messageOptions, configureReportSetting } from './constants/cliFunctions.js';

import constants from './constants/constants.js';
import { consoleLogger } from './logs.js';
import combineRun from './combine.js';

setHeadlessMode(true);

cleanUp('.a11y_storage');

const yargs = _yargs(hideBin(process.argv));

exec('git branch --show-current', (err, stdout) => {
  const appVersion = getVersion();
  const branchName = stdout.trim();

  const options = yargs
    .version(false)
    .usage(
      `Version number: ${appVersion}-${branchName}
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
    ])
    // .coerce('v', option => {
    //   exec('git branch --show-current', (err, stdout) => {
    //     const appVersion = getVersion();
    //     const branchName = stdout.trim();
    //     option = `Version no`;
    //     return option;
    //   });
    // })
    .coerce('c', option => {
      if (typeof option === 'number') {
        // Will also allow integer choices
        switch (option) {
          case 1:
            option = constants.scannerTypes.sitemap;
            break;
          case 2:
            option = constants.scannerTypes.website;
            break;
          default:
            printMessage(
              [
                'Invalid option',
                `Please choose to enter numbers (1,2) or keywords (${constants.scannerTypes.sitemap}, ${constants.scannerTypes.website}).`,
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
      if (option && !deviceString) {
        printMessage(
          [`Invalid device. Please provide an existing device to start the scan.`],
          messageOptions,
        );
        process.exit(1);
      }
      return option;
    })
    .coerce('w', option => {
      if (Number.isNaN(option)) {
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
    .conflicts('d', 'w')
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

      if (!argvs.customDevice && !argvs.viewportWidth) {
        argvs.customDevice = 'Desktop';
        data.randomToken = `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}_${argvs.customDevice}`;
      } else if (argvs.customDevice) {
        data.randomToken = `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}_${argvs.customDevice}`;
      } else if (!argvs.customDevice) {
        data.randomToken = `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}_CustomWidth_${argvs.viewportWidth}px`;
      }

      exec('git branch --show-current', (err, stdout) => {
        if (err) {
          console.log(err);
        } else {
          const appVersion = getVersion();
          const branchName = stdout.trim();
          printMessage(
            [`Version: ${appVersion}-${branchName}`, 'Scanning website...'],
            messageOptions,
          );
        }
      });

      await combineRun(data);
    } else {
      printMessage(
        [`Invalid ${argvs.scanner} page. Please provide a URL to start the ${argvs.scanner} scan.`],
        messageOptions,
      );
      process.exit(1);
    }

    const domain = new URL(argvs.url).hostname;

    return `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}_${argvs.customDevice}`;
  };

  scanInit(options).then(async storagePath => {
    // Path to scan result
    storagePath = fs.readdirSync('results').filter(fn => fn.startsWith(storagePath));

    // Take option if set
    if (typeof options.zip === 'string') {
      constants.cliZipFileName = options.zip;
    }

    await fs
      .ensureDir(`results/${storagePath[0]}`)
      .then(async () => {
        await zipResults(constants.cliZipFileName, `results/${storagePath[0]}`);
        const messageToDisplay = [`Report of this run is at ${constants.cliZipFileName}`];

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
});
