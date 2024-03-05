import { execFileSync, execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { destinationPath, getIntermediateScreenshotsPath } from './constants/constants.js';
import fs from 'fs-extra';
import constants from './constants/constants.js';

export const getVersion = () => {
  const loadJSON = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
  const versionNum = loadJSON('./package.json').version;

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

export const getStoragePath = randomToken => {
  if (constants.exportDirectory === process.cwd()) {
    return `results/${randomToken}`;
  } else {
    if (!path.isAbsolute(constants.exportDirectory)) {
      constants.exportDirectory = path.resolve(process.cwd(), constants.exportDirectory);
    }
    return `${constants.exportDirectory}/${randomToken}`;
  }
};

export const createDetailsAndLogs = async (scanDetails, randomToken) => {
  const storagePath = getStoragePath(randomToken);
  const logPath = `logs/${randomToken}`;
  await fs.ensureDir(storagePath);
  await fs.writeFile(`${storagePath}/details.json`, JSON.stringify(scanDetails, 0, 2));

  // update logs
  await fs.ensureDir(logPath);
  await fs.pathExists('errors.txt').then(async exists => {
    if (exists) {
      await fs.copy('errors.txt', `${logPath}/${randomToken}.txt`);
    }
  });
};

export const getUserDataTxt = () => {
  const textFilePath =
    os.platform() === 'win32'
      ? path.join(process.env.APPDATA, 'Purple A11y', 'userData.txt')
      : path.join(
          process.env.HOME,
          'Library',
          'Application Support',
          'Purple A11y',
          'userData.txt',
        );
  // check if textFilePath exists
  if (fs.existsSync(textFilePath)) {
    const userData = JSON.parse(fs.readFileSync(textFilePath, 'utf8'));
    return userData;
  }
  return null;
};

export const writeToUserDataTxt = async (key, value) => {
  const textFilePath =
    os.platform() === 'win32'
      ? path.join(process.env.APPDATA, 'Purple A11y', 'userData.txt')
      : path.join(
          process.env.HOME,
          'Library',
          'Application Support',
          'Purple A11y',
          'userData.txt',
        );

  // Create file if it doesn't exist
  if (fs.existsSync(textFilePath)) {
    const userData = JSON.parse(fs.readFileSync(textFilePath, 'utf8'));
    userData[key] = value;
    fs.writeFileSync(textFilePath, JSON.stringify(userData, 0, 2));
  } else {
    const textFilePathDir = path.dirname(textFilePath);
    if (!fs.existsSync(textFilePathDir)) {
      fs.mkdirSync(textFilePathDir, { recursive: true });
    }
    fs.appendFileSync(textFilePath, JSON.stringify({ [key]: value }, 0, 2));
  }
};

export const createAndUpdateResultsFolders = async randomToken => {
  const storagePath = getStoragePath(randomToken);
  await fs.ensureDir(`${storagePath}/reports`);

  const intermediateDatasetsPath = `${randomToken}/datasets/${randomToken}`;
  const intermediatePdfResultsPath = `${randomToken}/${constants.pdfScanResultFileName}`;

  const transferResults = async (intermPath, resultFile) => {
    if (fs.existsSync(intermPath)) {
      await fs.copy(intermPath, `${storagePath}/${resultFile}`);
    }
  };

  await Promise.all([
    transferResults(intermediateDatasetsPath, constants.allIssueFileName),
    transferResults(intermediatePdfResultsPath, constants.pdfScanResultFileName),
  ]);
};

export const createScreenshotsFolder = randomToken => {
  const storagePath = getStoragePath(randomToken);
  const intermediateScreenshotsPath = getIntermediateScreenshotsPath(randomToken);
  if (fs.existsSync(intermediateScreenshotsPath)) {
    fs.readdir(intermediateScreenshotsPath, (err, files) => {
      if (err) {
        console.log('Screenshots were not moved successfully: ' + err.message);
      }

      if (!fs.existsSync(destinationPath(storagePath))) {
        fs.mkdirSync(destinationPath(storagePath), err => {
          if (err) {
            console.log('Screenshots folder was not created successfully: ' + err.message);
          }
        });
      }

      files.forEach(file => {
        fs.renameSync(
          `${intermediateScreenshotsPath}/${file}`,
          `${destinationPath(storagePath)}/${file}`,
        );
      });

      fs.rmdir(intermediateScreenshotsPath, err => {
        if (err) {
          console.log(err);
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
//   });

export const getWcagPassPercentage = (wcagViolations)=> {
  return parseFloat((Object.keys(constants.wcagLinks).length - wcagViolations.length) / Object.keys(constants.wcagLinks).length * 100).toFixed(2);
  }

export const getFormattedTime = (timestamp) => {
  if (timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
    });
  } else {
    return new Date().toLocaleTimeString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
    });
  }
};

export const formatDateTimeForMassScanner = (dateTimeString) => {
  // Parse the input string to create a Date object
  const parsedDate = new Date(dateTimeString.replace(/,/g, ''));

  // Format date and time parts separately
  const year = parsedDate.getFullYear().toString().slice(-2); // Get the last two digits of the year
  const month = ('0' + (parsedDate.getMonth() + 1)).slice(-2); // Month is zero-indexed
  const day = ('0' + parsedDate.getDate()).slice(-2);
  const hour = ('0' + parsedDate.getHours()).slice(-2);
  const minute = ('0' + parsedDate.getMinutes()).slice(-2);

  // Combine formatted date and time with a slash
  const formattedDateTime = `${day}/${month}/${year} ${hour}:${minute}`;

  return formattedDateTime;
};

export const setHeadlessMode = (browser, isHeadless) => {
  const isWindowsOSAndEdgeBrowser =
    browser === constants.browserTypes.edge && os.platform() === 'win32';
  if (isHeadless || isWindowsOSAndEdgeBrowser) {
    process.env.CRAWLEE_HEADLESS = 1;
  } else {
    process.env.CRAWLEE_HEADLESS = 0;
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
    try {
      execSync(
        `Get-ChildItem -Path "${resultsPath}\\*.*" -Recurse | Compress-Archive -DestinationPath "${zipName}"`,
        { shell: 'powershell.exe' },
      );
    } catch (err) {
      throw err;
    }
  } else {
    // To zip up files recursively )-r) in the results folder path
    // Will only zip up the content of the results folder path with (-j) i.e. junk the path
    const command = '/usr/bin/zip';
    const args = ['-r', '-j', zipName, resultsPath];
    try {
      execFileSync(command, args);
    } catch (err) {
      throw err;
    }
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
  } catch (error) {
    return l1 === l2;
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
}


