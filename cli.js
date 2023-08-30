#!/usr/bin/env node
/* eslint-disable no-fallthrough */
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
import fs from 'fs-extra';
import path from 'path';
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import printMessage from 'print-message';
import { devices, webkit } from 'playwright';
import { cleanUp, zipResults, setHeadlessMode, getVersion, getStoragePath } from './utils.js';
import {
  checkUrl,
  prepareData,
  isFileSitemap,
  cloneChromeProfiles,
  cloneEdgeProfiles,
  deleteClonedChromeProfiles,
  deleteClonedEdgeProfiles,
  validEmail,
  validName,
} from './constants/common.js';
import { cliOptions, messageOptions } from './constants/cliFunctions.js';
import constants, {
  getDefaultChromeDataDir,
  getDefaultEdgeDataDir,
} from './constants/constants.js';
import combineRun from './combine.js';
import playwrightAxeGenerator from './playwrightAxeGenerator.js';
import { silentLogger } from './logs.js';
import os from 'os';

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
        [`Invalid emaill address. Please provide a valid email adress.`],
        messageOptions,
      );
      process.exit(1);
    }
    return nameEmail;
  })
  .coerce('f', option => {
    if (!cliOptions.f.choices.includes(option)) {
      printMessage(
        [`Invalid value for needsReviewItems. Please provide boolean value(true/false).`],
        messageOptions,
      );
      process.exit(1);
    }
    return option;
  })
  .coerce('e', option => {
    try {
      if (typeof option === 'string') {
        let dirPath = option;
        if (!path.isAbsolute(dirPath)) {
          dirPath = path.resolve(process.cwd(), dirPath);
        }
        fs.accessSync(dirPath);
        return option;  
      } else {
        throw Error('Invalid path');
      }
    } catch (e) {
      printMessage(
        [`Invalid directory path. Please ensure path provided exists.`],
        messageOptions,
      );
      process.exit(1);
    }
  })

  .check(argvs => {
    if (argvs.scanner === 'custom' && argvs.maxpages) {
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
  argvs.scanner = constants.scannerTypes[argvs.scanner];
  argvs.headless = argvs.headless === 'yes';
  argvs.browserToRun = constants.browserTypes[argvs.browserToRun];

  let useChrome = false;
  let useEdge = false;
  let chromeDataDir = null;
  let edgeDataDir = null;
  // Empty string for profile directory will use incognito mode in playwright
  let clonedDataDir = '';
  const statuses = constants.urlCheckStatuses;

  if (argvs.browserToRun === constants.browserTypes.chrome) {
    chromeDataDir = getDefaultChromeDataDir();
    clonedDataDir = cloneChromeProfiles();
    if (chromeDataDir && clonedDataDir) {
      argvs.browserToRun = constants.browserTypes.chrome;
      useChrome = true;
    } else {
      if (os.platform() !== 'darwin') {
        printMessage(['Unable to use Chrome, falling back to Edge browser...'], messageOptions);
        edgeDataDir = getDefaultEdgeDataDir();
        clonedDataDir = cloneEdgeProfiles();
        if (edgeDataDir && clonedDataDir) {
          useEdge = true;
          argvs.browserToRun = constants.browserTypes.edge;
        } else {
          printMessage(['Unable to use both Chrome and Edge. Please try again.'], messageOptions);
          process.exit(statuses.browserError.code);
        }
      } else {
        //mac user who specified -b chrome but does not have chrome
        // printMessage(
        //   ['Unable to use Chrome. Please install Chrome before running the scan.'],
        //   messageOptions,
        // );
        // process.exit(statuses.browserError.code);
        argvs.browserToRun = null;
        constants.launcher = webkit;
        clonedDataDir = '';
        printMessage(
          ['Unable to use Chrome, falling back to webkit...']
        )
      }
    }
  } else if (argvs.browserToRun === constants.browserTypes.edge) {
    edgeDataDir = getDefaultEdgeDataDir();
    clonedDataDir = cloneEdgeProfiles();
    if (edgeDataDir && clonedDataDir) {
      useEdge = true;
      argvs.browserToRun = constants.browserTypes.edge;
    } else {
      printMessage(['Unable to use Edge, falling back to Chrome browser...'], messageOptions);
      chromeDataDir = getDefaultChromeDataDir();
      clonedDataDir = cloneChromeProfiles();
      if (chromeDataDir && clonedDataDir) {
        useChrome = true;
        argvs.browserToRun = constants.browserTypes.chrome;
      } else {
        if (os.platform() === 'darwin') {
          //  mac user who specified -b edge but does not have edge or chrome
          printMessage(
            ['Unable to use Chrome, falling back to webkit...']
          )
          argvs.browserToRun = null;
          constants.launcher = webkit;
          clonedDataDir = '';
        } else {
          printMessage(['Unable to use both Chrome and Edge. Please try again.'], messageOptions);
          process.exit(statuses.browserError.code);
        }
      }
    }
  } else {
    argvs.browserToRun = null;
    clonedDataDir = '';
  }

  if (argvs.customDevice === 'Desktop' || argvs.customDevice === 'Mobile') {
    argvs.deviceChosen = argvs.customDevice;
    delete argvs.customDevice;
  }

  // Creating the playwrightDeviceDetailObject
  // for use in crawlDomain & crawlSitemap's preLaunchHook
  if (argvs.deviceChosen === 'Mobile' || argvs.customDevice === 'iPhone 11') {
    argvs.playwrightDeviceDetailsObject = devices['iPhone 11'];
  } else if (argvs.customDevice === 'Samsung Galaxy S9+') {
    argvs.playwrightDeviceDetailsObject = devices['Galaxy S9+'];
  } else if (argvs.viewportWidth) {
    argvs.playwrightDeviceDetailsObject = {
      viewport: { width: Number(argvs.viewportWidth), height: 720 },
    };
  } else if (argvs.customDevice) {
    argvs.playwrightDeviceDetailsObject = devices[argvs.customDevice.replace('_', / /g)];
  } else {
    argvs.playwrightDeviceDetailsObject = {};
  }

  const res = await checkUrl(
    argvs.scanner,
    argvs.url,
    argvs.browserToRun,
    clonedDataDir,
    argvs.playwrightDeviceDetailsObject,
  );

  if (argvs.scanner === constants.scannerTypes.website && !argvs.strategy) {
    argvs.strategy = 'same-domain';
  }

  // File clean up after url check
  // files will clone a second time below if url check passes
  if (useChrome) {
    deleteClonedChromeProfiles();
  } else if (useEdge) {
    deleteClonedEdgeProfiles();
  }

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
        break;
      } else {
        res.status = statuses.notASitemap.code;
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

  if (argvs.exportDirectory) {
    constants.exportDirectory = argvs.exportDirectory;
  }
  const data = prepareData(argvs);

  if (os.platform() === 'win32' && argvs.browserToRun === constants.browserTypes.edge) {
    setHeadlessMode(false);
  } else {
    setHeadlessMode(data.isHeadless);
  }

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

  /**
   * Cloning a second time with random token for parallel browser sessions
   * Also To mitigate agaisnt known bug where cookies are
   * overriden after each browser session - i.e. logs user out
   * after checkingUrl and unable to utilise same cookie for scan
   * */
  if (useChrome) {
    clonedDataDir = cloneChromeProfiles(data.randomToken);
    data.browser = constants.browserTypes.chrome;
    data.userDataDirectory = clonedDataDir;
  } else if (useEdge) {
    clonedDataDir = cloneEdgeProfiles(data.randomToken);
    data.browser = constants.browserTypes.edge;
    data.userDataDirectory = clonedDataDir;
  }
  // Defaults to chromium by not specifying channels in Playwright, if no browser is found
  else {
    data.browser = null;
    data.userDataDirectory = '';
  }

  printMessage([`Purple HATS version: ${appVersion}`, 'Starting scan...'], messageOptions);

  if (argvs.scanner === constants.scannerTypes.custom) {
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
  if (useChrome) {
    deleteClonedChromeProfiles();
  } else if (useEdge) {
    deleteClonedEdgeProfiles();
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
