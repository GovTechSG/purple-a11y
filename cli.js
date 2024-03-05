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
  validEmail,
  validName,
  getBrowserToRun,
  getPlaywrightDeviceDetailsObject,
  deleteClonedProfiles,
  getScreenToScan,
  getClonedProfilesWithRandomToken,
  validateDirPath,
  validateFilePath,
  validateCustomFlowLabel,
} from './constants/common.js';
import constants from './constants/constants.js';
import { cliOptions, messageOptions } from './constants/cliFunctions.js';
import combineRun from './combine.js';
import playwrightAxeGenerator from './playwrightAxeGenerator.js';
import { silentLogger } from './logs.js';
import { fileURLToPath } from 'url';
import path from 'path';

const appVersion = getVersion();
const yargs = _yargs(hideBin(process.argv));

const options = yargs
  .version(false)
  .usage(
    `Purple A11y version: ${appVersion}
Usage: node cli.js -c <crawler> -d <device> -w <viewport> -u <url> OPTIONS`,
  )
  .strictOptions(true)
  .options(cliOptions)
  .example([
    [
      `To scan sitemap of website:', 'node cli.js -c [ 1 | sitemap ] -u <url_link> [ -d <device> | -w <viewport_width> ]`,
    ],
    [
      `To scan a website', 'node cli.js -c [ 2 | website ] -u <url_link> [ -d <device> | -w <viewport_width> ]`,
    ],
    [
      `To start a custom flow scan', 'node cli.js -c [ 3 | custom ] -u <url_link> [ -d <device> | -w <viewport_width> ]`,
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
  .coerce('t', option => {
    if (!Number.isInteger(option) || Number(option) <= 0) {
      printMessage(
        [`Invalid number for max concurrency. Please provide a positive integer.`],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('k', nameEmail => {
    if (nameEmail.indexOf(':') === -1) {
      printMessage(
        [`Invalid format. Please provide your name and email address separated by ":"`],
        messageOptions,
      );
      process.exit(1);
    }
    const [name, email] = nameEmail.split(':');
    if (name === '' || name === undefined || name === null) {
      printMessage([`Please provide your name.`], messageOptions);
      process.exit(1);
    }
    if (!validName(name)) {
      printMessage([`Invalid name. Please provide a valid name.`], messageOptions);
      process.exit(1);
    }
    if (!validEmail(email)) {
      printMessage(
        [`Invalid email address. Please provide a valid email address.`],
        messageOptions,
      );
      process.exit(1);
    }
    return nameEmail;
  })
  .coerce('e', option => {
    const validationErrors = validateDirPath(option);
    if (validationErrors) {
      printMessage([`Invalid exportDirectory directory path. ${validationErrors}`], messageOptions);
      process.exit(1);
    }
    return option;
  })
  .coerce('x', option => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    try {
      return validateFilePath(option, __dirname);
    } catch (err) {
      printMessage(
        [`Invalid blacklistedPatternsFilename file path. ${validationErrors}`],
        messageOptions,
      );
      process.exit(1);
    }
  })
  .coerce('i', option => {
    const { choices } = cliOptions.i;
    if (!choices.includes(option)) {
      printMessage(
        [`Invalid value for fileTypes. Please provide valid keywords: ${choices.join(', ')}.`],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('j', option => {
    const { isValid, errorMessage } = validateCustomFlowLabel(option);
    if (!isValid) {
      printMessage([errorMessage], messageOptions);
      process.exit(1);
    }
    return option;
  })
  .coerce('a', option => {
    const { choices } = cliOptions.a;
    if (!choices.includes(option)) {
      printMessage(
        [`Invalid value for additional. Please provide valid keywords: ${choices.join(', ')}.`],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('q', option => {
    try {
      JSON.parse(option);
    } catch (e) {
      // default to empty object
      return '{}';
    }
    return option;
  })
  .coerce('m', option => {
    const headerValues = option.split(', ');
    const allHeaders = {};

    headerValues.map(headerValue => {
      const headerValuePair = headerValue.split(/ (.*)/s);
      if (headerValuePair.length < 2) {
        printMessage(
          [
            `Invalid value for authorisation request header. Please provide valid keywords in the format: "<header> <value>". For multiple authentication headers, please provide the keywords in the format:  "<header> <value>, <header2> <value2>, ..." .`,
          ],
          messageOptions,
        );
        process.exit(1);
      }
      allHeaders[headerValuePair[0]] = headerValuePair[1]; // {"header": "value", "header2": "value2", ...}
    });
    
    return allHeaders;
  })
  .check(argvs => {
    if ((argvs.scanner === 'custom' || argvs.scanner === 'custom2') && argvs.maxpages) {
      throw new Error('-p or --maxpages is only available in website and sitemap scans.');
    }
    return true;
  })
  .check(argvs => {
    if (argvs.scanner !== 'website' && argvs.strategy) {
      throw new Error('-s or --strategy is only available in website scans.');
    }
    return true;
  })
  .conflicts('d', 'w')
  .epilogue('').argv;

const scanInit = async argvs => {
  let isNewCustomFlow = false;
  if (constants.scannerTypes[argvs.scanner] === constants.scannerTypes.custom2) {
    argvs.scanner = constants.scannerTypes.custom;
    isNewCustomFlow = true;
  } else {
    argvs.scanner = constants.scannerTypes[argvs.scanner];
  }
  argvs.headless = argvs.headless === 'yes';
  argvs.followRobots = argvs.followRobots === 'yes';
  argvs.browserToRun = constants.browserTypes[argvs.browserToRun];

  // let chromeDataDir = null;
  // let edgeDataDir = null;
  // Empty string for profile directory will use incognito mode in playwright
  let clonedDataDir = '';
  const statuses = constants.urlCheckStatuses;

  const { browserToRun, clonedBrowserDataDir } = getBrowserToRun(argvs.browserToRun, true);
  argvs.browserToRun = browserToRun;
  clonedDataDir = clonedBrowserDataDir;

  if (argvs.customDevice === 'Desktop' || argvs.customDevice === 'Mobile') {
    argvs.deviceChosen = argvs.customDevice;
    delete argvs.customDevice;
  }

  // Creating the playwrightDeviceDetailObject
  // for use in crawlDomain & crawlSitemap's preLaunchHook
  argvs.playwrightDeviceDetailsObject = getPlaywrightDeviceDetailsObject(
    argvs.deviceChosen,
    argvs.customDevice,
    argvs.viewportWidth,
  );

  const res = await checkUrl(
    argvs.scanner,
    argvs.url,
    argvs.browserToRun,
    clonedDataDir,
    argvs.playwrightDeviceDetailsObject,
    isNewCustomFlow,
    argvs.header,
  );
  switch (res.status) {
    case statuses.success.code:
      argvs.finalUrl = res.url;
      if (process.env.VALIDATE_URL_PH_GUI) {
        console.log('Url is valid');
        process.exit(0);
      }
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
      const finalFilePath = await isFileSitemap(argvs.url);
      if (finalFilePath) {
        argvs.isLocalSitemap = true;
        argvs.finalUrl = finalFilePath;
        if (process.env.VALIDATE_URL_PH_GUI) {
          console.log('Url is valid');
          process.exit(0);
        }
        break;
      } else {
        printMessage([statuses.notASitemap.message], messageOptions);
        process.exit(statuses.notASitemap.code);
      }
    case statuses.notASitemap.code:
      printMessage([statuses.notASitemap.message], messageOptions);
      process.exit(res.status);
    case statuses.browserError.code:
      printMessage([statuses.browserError.message], messageOptions);
      process.exit(res.status);
    default:
      break;
  }

  if (argvs.scanner === constants.scannerTypes.website && !argvs.strategy) {
    argvs.strategy = 'same-domain';
  }

  // File clean up after url check
  // files will clone a second time below if url check passes
  deleteClonedProfiles(argvs.browserToRun);

  if (argvs.exportDirectory) {
    constants.exportDirectory = argvs.exportDirectory;
  }

  const data = await prepareData(argvs);

  setHeadlessMode(data.browser, data.isHeadless);

  const screenToScan = getScreenToScan(argvs.deviceChosen, argvs.customDevice, argvs.viewportWidth);

  // Clone profiles a second time
  clonedDataDir = getClonedProfilesWithRandomToken(data.browser, data.randomToken);
  data.userDataDirectory = clonedDataDir;

  printMessage([`Purple A11y version: ${appVersion}`, 'Starting scan...'], messageOptions);

  if (argvs.scanner === constants.scannerTypes.custom && !isNewCustomFlow) {
    try {
      await playwrightAxeGenerator(data);
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
  deleteClonedProfiles(data.browser);

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

      if (process.env.RUNNING_FROM_MASS_SCANNER && process.env.REPORT_BREAKDOWN != '1') {
        let zipFileNameMessage = {
          type: 'zipFileName',
          payload: `${constants.cliZipFileName}`
        }
        process.send(JSON.stringify(zipFileNameMessage));
      }
      

      printMessage(messageToDisplay);
      

      process.exit(0);
    })
    .catch(error => {
      printMessage([`Error in zipping results: ${error}`]);
    });
});
