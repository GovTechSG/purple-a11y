import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs-extra';
import crypto from 'crypto';

import constants from './constants/constants.js';

export const getHostnameFromRegex = url => {
  const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);

  // extract hostname (will be null if no match is found)
  return matches && matches[1];
};

export const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

export const isWhitelistedContentType = (contentType) => {
  const whitelist = ['text/html'];
  return whitelist.filter(type => contentType.trim().startsWith(type)).length === 1;
}

export const getStoragePath = randomToken =>
  `results/${randomToken}_${constants.urlsCrawledObj.scanned.length}pages`;

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
}

export const createAndUpdateResultsFolders = async (randomToken) => {
  const storagePath = getStoragePath(randomToken);
  await fs.ensureDir(`${storagePath}/reports`);
  await fs.copy(`${constants.a11yDataStoragePath}/${randomToken}`, `${storagePath}/${constants.allIssueFileName}`);
  await fs.mkdir(`${storagePath}/${constants.allIssueFileName}`);
};

export const cleanUp = async (pathToDelete, setDefaultFolders = false) => {
  await fs.pathExists(pathToDelete).then(exists => {
    if (exists) {
      fs.removeSync(pathToDelete);
    }
  });
};

/* istanbul ignore next */
export const getCurrentTime = () =>
  new Date().toLocaleTimeString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  });

export const setHeadlessMode = isHeadless => {
  if (isHeadless) {
    process.env.CRAWLEE_HEADLESS = 1;
  } else {
    process.env.CRAWLEE_HEADLESS = 0;
  }
};

export const setThresholdLimits = setWarnLevel => {
  process.env.WARN_LEVEL = setWarnLevel;
};

export const zipResults = async (zipName, resultsPath) => {
  // Check prior zip file exist and remove
  if (fs.existsSync(zipName)) {
    fs.unlink(zipName);
  }

  // To zip up files recursively )-r) in the results folder path
  // Will only zip up the content of the results folder path with (-j) i.e. junk the path
  const command = '/usr/bin/zip';
  const args = ['-r', '-j', zipName, resultsPath];
  execFile(command, args, err => {
    if (err) {
      throw err;
    }
  });
};
