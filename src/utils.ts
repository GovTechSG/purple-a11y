import { execSync, spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import constants, {
  BrowserTypes,
  destinationPath,
  getIntermediateScreenshotsPath,
} from './constants/constants.js';
import { silentLogger } from './logs.js';

export const getVersion = () => {
  const loadJSON = filePath =>
    JSON.parse(fs.readFileSync(new URL(filePath, import.meta.url)).toString());
  const versionNum = loadJSON('../package.json').version;

  return versionNum;
};

export const getHost = url => new URL(url).host;

export const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

export const isWhitelistedContentType = contentType => {
  const whitelist = ['text/html'];
  return whitelist.filter(type => contentType.trim().startsWith(type)).length === 1;
};

export const getStoragePath = (randomToken: string): string => {
  if (process.env.PURPLE_A11Y_VERBOSE_STORAGE_PATH) {
    return `${process.env.PURPLE_A11Y_VERBOSE_STORAGE_PATH}/${randomToken}`;
  }
  if (constants.exportDirectory === process.cwd()) {
    return `results/${randomToken}`;
  }
  if (!path.isAbsolute(constants.exportDirectory)) {
    constants.exportDirectory = path.resolve(process.cwd(), constants.exportDirectory);
  }
  return `${constants.exportDirectory}/${randomToken}`;
};

export const createDetailsAndLogs = async randomToken => {
  const storagePath = getStoragePath(randomToken);
  const logPath = `logs/${randomToken}`;
  try {
    await fs.ensureDir(storagePath);

    // update logs
    await fs.ensureDir(logPath);
    await fs.pathExists('errors.txt').then(async exists => {
      if (exists) {
        try {
          await fs.copy('errors.txt', `${logPath}/${randomToken}.txt`);
        } catch (error) {
          if (error.code === 'EBUSY') {
            console.log(
              `Unable to copy the file from 'errors.txt' to '${logPath}/${randomToken}.txt' because it is currently in use.`,
            );
            console.log(
              'Please close any applications that might be using this file and try again.',
            );
          } else {
            console.log(`An unexpected error occurred while copying the file: ${error.message}`);
          }
        }
      }
    });
  } catch (error) {
    console.log(`An error occurred while setting up storage or log directories: ${error.message}`);
  }
};

export const getUserDataFilePath = () => {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.APPDATA, 'Purple A11y', 'userData.txt');
  }
  if (platform === 'darwin') {
    return path.join(
      process.env.HOME,
      'Library',
      'Application Support',
      'Purple A11y',
      'userData.txt',
    );
  }
  // linux and other OS
  return path.join(process.env.HOME, '.config', 'purple-a11y', 'userData.txt');
};

export const getUserDataTxt = () => {
  const textFilePath = getUserDataFilePath();

  // check if textFilePath exists
  if (fs.existsSync(textFilePath)) {
    const userData = JSON.parse(fs.readFileSync(textFilePath, 'utf8'));
    return userData;
  }
  return null;
};

export const writeToUserDataTxt = async (key, value) => {
  const textFilePath = getUserDataFilePath();

  // Create file if it doesn't exist
  if (fs.existsSync(textFilePath)) {
    const userData = JSON.parse(fs.readFileSync(textFilePath, 'utf8'));
    userData[key] = value;
    fs.writeFileSync(textFilePath, JSON.stringify(userData, null, 2));
  } else {
    const textFilePathDir = path.dirname(textFilePath);
    if (!fs.existsSync(textFilePathDir)) {
      fs.mkdirSync(textFilePathDir, { recursive: true });
    }
    fs.appendFileSync(textFilePath, JSON.stringify({ [key]: value }, null, 2));
  }
};

export const createAndUpdateResultsFolders = async randomToken => {
  const storagePath = getStoragePath(randomToken);
  await fs.ensureDir(`${storagePath}`);

  const intermediatePdfResultsPath = `${randomToken}/${constants.pdfScanResultFileName}`;

  const transferResults = async (intermPath, resultFile) => {
    try {
      if (fs.existsSync(intermPath)) {
        await fs.copy(intermPath, `${storagePath}/${resultFile}`);
      }
    } catch (error) {
      if (error.code === 'EBUSY') {
        console.log(
          `Unable to copy the file from ${intermPath} to ${storagePath}/${resultFile} because it is currently in use.`,
        );
        console.log('Please close any applications that might be using this file and try again.');
      } else {
        console.log(
          `An unexpected error occurred while copying the file from ${intermPath} to ${storagePath}/${resultFile}: ${error.message}`,
        );
      }
    }
  };

  await Promise.all([transferResults(intermediatePdfResultsPath, constants.pdfScanResultFileName)]);
};

export const createScreenshotsFolder = randomToken => {
  const storagePath = getStoragePath(randomToken);
  const intermediateScreenshotsPath = getIntermediateScreenshotsPath(randomToken);
  if (fs.existsSync(intermediateScreenshotsPath)) {
    fs.readdir(intermediateScreenshotsPath, (err, files) => {
      if (err) {
        console.log(`Screenshots were not moved successfully: ${err.message}`);
      }

      if (!fs.existsSync(destinationPath(storagePath))) {
        try {
          fs.mkdirSync(destinationPath(storagePath), { recursive: true });
        } catch (error) {
          console.error('Screenshots folder was not created successfully:', error);
        }
      }

      files.forEach(file => {
        fs.renameSync(
          `${intermediateScreenshotsPath}/${file}`,
          `${destinationPath(storagePath)}/${file}`,
        );
      });

      fs.rmdir(intermediateScreenshotsPath, rmdirErr => {
        if (rmdirErr) {
          console.log(rmdirErr);
        }
      });
    });
  }
};

export const cleanUp = async pathToDelete => {
  fs.removeSync(pathToDelete);
};

/* istanbul ignore next */
// export const getFormattedTime = () =>
//   new Date().toLocaleTimeString('en-GB', {
//     year: 'numeric',
//     month: 'short',
//     day: 'numeric',
//     hour12: true,
//     hour: 'numeric',
//     minute: '2-digit',
//     timeZoneName: "longGeneric",
//   });

export const getWcagPassPercentage = (wcagViolations: string[]): string => {
  const totalChecks = Object.keys(constants.wcagLinks).length;
  const passedChecks = totalChecks - wcagViolations.length;
  const passPercentage = (passedChecks / totalChecks) * 100;

  return passPercentage.toFixed(2); // toFixed returns a string, which is correct here
};

export const getFormattedTime = inputDate => {
  if (inputDate) {
    return inputDate.toLocaleTimeString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour12: false,
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return new Date().toLocaleTimeString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour12: false,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'longGeneric',
  });
};

export const formatDateTimeForMassScanner = date => {
  // Format date and time parts separately
  const year = date.getFullYear().toString().slice(-2); // Get the last two digits of the year
  const month = `0${date.getMonth() + 1}`.slice(-2); // Month is zero-indexed
  const day = `0${date.getDate()}`.slice(-2);
  const hour = `0${date.getHours()}`.slice(-2);
  const minute = `0${date.getMinutes()}`.slice(-2);

  // Combine formatted date and time with a slash
  const formattedDateTime = `${day}/${month}/${year} ${hour}:${minute}`;

  return formattedDateTime;
};

export const setHeadlessMode = (browser: string, isHeadless: boolean): void => {
  const isWindowsOSAndEdgeBrowser = browser === BrowserTypes.EDGE && os.platform() === 'win32';
  if (isHeadless || isWindowsOSAndEdgeBrowser) {
    process.env.CRAWLEE_HEADLESS = '1';
  } else {
    process.env.CRAWLEE_HEADLESS = '0';
  }
};

export const setThresholdLimits = setWarnLevel => {
  process.env.WARN_LEVEL = setWarnLevel;
};

export const zipResults = (zipName, resultsPath) => {
  // Check prior zip file exist and remove
  if (fs.existsSync(zipName)) {
    fs.unlinkSync(zipName);
  }

  if (os.platform() === 'win32') {
    execSync(
      `Get-ChildItem -Path "${resultsPath}\\*.*" -Recurse | Compress-Archive -DestinationPath "${zipName}"`,
      { shell: 'powershell.exe' },
    );
  } else {
    // Get zip command in Mac and Linux
    const command = '/usr/bin/zip';
    // Check if user specified absolute or relative path
    const zipFilePath = path.isAbsolute(zipName) ? zipName : path.join(process.cwd(), zipName);

    // To zip up files recursively (-r) in the results folder path and write it to user's specified path
    const args = ['-r', zipFilePath, '.'];

    // Change working directory only for the zip command
    const options = {
      cwd: resultsPath,
    };

    spawnSync(command, args, options);
  }
};

// areLinksEqual compares 2 string URLs and ignores comparison of 'www.' and url protocol
// i.e. 'http://google.com' and 'https://www.google.com' returns true
export const areLinksEqual = (link1, link2) => {
  try {
    const format = link => {
      return new URL(link.replace(/www\./, ''));
    };
    const l1 = format(link1);
    const l2 = format(link2);

    const areHostEqual = l1.host === l2.host;
    const arePathEqual = l1.pathname === l2.pathname;

    return areHostEqual && arePathEqual;
  } catch {
    return link1 === link2;
  }
};

export const randomThreeDigitNumberString = () => {
  // Generate a random decimal between 0 (inclusive) and 1 (exclusive)
  const randomDecimal = Math.random();
  // Multiply by 900 to get a decimal between 0 (inclusive) and 900 (exclusive)
  const scaledDecimal = randomDecimal * 900;
  // Add 100 to ensure the result is between 100 (inclusive) and 1000 (exclusive)
  const threeDigitNumber = Math.floor(scaledDecimal) + 100;
  return String(threeDigitNumber);
};

export const isFollowStrategy = (link1, link2, rule) => {
  const parsedLink1 = new URL(link1);
  const parsedLink2 = new URL(link2);
  if (rule === 'same-domain') {
    const link1Domain = parsedLink1.hostname.split('.').slice(-2).join('.');
    const link2Domain = parsedLink2.hostname.split('.').slice(-2).join('.');
    return link1Domain === link2Domain;
  }
  return parsedLink1.hostname === parsedLink2.hostname;
};

/* eslint-disable no-await-in-loop */
export const retryFunction = async (func, maxAttempt) => {
  let attemptCount = 0;
  while (attemptCount < maxAttempt) {
    attemptCount += 1;
    try {
      const result = await func();
      return result;
    } catch (error) {
      silentLogger.error(`(Attempt count: ${attemptCount} of ${maxAttempt}) ${error}`);
    }
  }
};
/* eslint-enable no-await-in-loop */
