/* Utility functions for web accessibility testing */
const fs = require('fs-extra');
const crypto = require('crypto');
const { a11yDataStoragePath, allIssueFileName } = require('./constants/constants');

/* This function takes a URL as an argument and returns the hostname of the URL. */
exports.getHostnameFromRegex = url => {
  const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);

  // extract hostname (will be null if no match is found)
  return matches && matches[1];
};

/* This function returns the current date in the format "YYYY-MM-DD". */
const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

exports.getCurrentDate = getCurrentDate;

/* takes a URL as an argument and returns a boolean indicating whether it is 
likely HTML file based on extension. */
exports.validateUrl = url => {
  const invalidURLends = [
    '.gif',
    '.jpg',
    '.jpeg',
    '.png',
    '.pdf',
    '.doc',
    '.css',
    '.svg',
    '.js',
    '.ts',
    '.xml',
    '.csv',
    '.tgz',
    '.zip',
    '.xls',
    '.ppt',
    '.ico',
    '.woff',
  ];
  return !invalidURLends.some(urlEnd => url.includes(urlEnd));
};

const getStoragePath = randomToken => {
  const currentDate = getCurrentDate();
  return `results/${currentDate}/${randomToken}`;
};

exports.getStoragePath = getStoragePath;

/*  scan details object and a random token as arguments and creates a folder 
structure for storing the results of a scan. It also writes the scan details to a 
JSON file and copies a file containing all issues to the results folder. */
exports.createAndUpdateFolders = async (scanDetails, randomToken) => {
  const storagePath = getStoragePath(randomToken);
  const logPath = `logs/${randomToken}`;

  await fs.ensureDir(`${storagePath}/reports`);
  await fs.writeFile(`${storagePath}/details.json`, JSON.stringify(scanDetails, 0, 2));
  await fs.copy(`${a11yDataStoragePath}/${randomToken}`, `${storagePath}/${allIssueFileName}`);

  // update logs
  await fs.ensureDir(logPath);
  await fs.pathExists('errors.txt').then(async exists => {
    if (exists) {
      await fs.copy('errors.txt', `${logPath}/${randomToken}.txt`);
    }
  });
};

/* Take a path to delete and a boolean indicating whether to set default 
folders as arguments and deletes the provided path if it exists. */
exports.cleanUp = async (pathToDelete, setDefaultFolders = false) => {
  await fs.pathExists(pathToDelete).then(exists => {
    if (exists) {
      fs.removeSync(pathToDelete);
    }
  });

};

/* Returns the current time in the format "hh:mm AM/PM, DD MMM YYYY". */
exports.getCurrentTime = () =>
  new Date().toLocaleTimeString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  });



exports.setHeadlessMode = isHeadless => {
  if (isHeadless) {
    process.env.APIFY_HEADLESS = 1;
  } else {
    process.env.APIFY_HEADLESS = 0;
  }
};

/* Generates a random token by combining a timestamp with a random string. */
exports.generateRandomToken = () => {
  const timeStamp = Math.floor(Date.now() / 1000);
  const randomString = crypto.randomBytes(16).toString('hex').slice(0, 10);
  return `${timeStamp}${randomString}`;
};

exports.setThresholdLimits = setWarnLevel => {
  process.env.WARN_LEVEL = setWarnLevel;
};

/* takes a zip name and a results path as arguments and zips up the contents of 
the results folder. It also removes any previously created zip files with the 
same name. */
exports.zipResults = async (zipName, resultsPath) => {
  // eslint-disable-next-line global-require
  const { execFile } = require('child_process');
  
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
