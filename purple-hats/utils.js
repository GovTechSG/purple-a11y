const fs = require('fs-extra');
const crypto = require('crypto');
const { a11yDataStoragePath, allIssueFileName } = require('./constants/constants');

exports.getHostnameFromRegex = url => {
  const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);

  // extract hostname (will be null if no match is found)
  return matches && matches[1];
};

const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

exports.getCurrentDate = getCurrentDate;

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

exports.cleanUp = async (pathToDelete, setDefaultFolders = false) => {
  await fs.pathExists(pathToDelete).then(exists => {
    if (exists) {
      fs.removeSync(pathToDelete);
    }
  });


};

/* istanbul ignore next */
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

exports.generateRandomToken = () => {
  const timeStamp = Math.floor(Date.now() / 1000);
  const randomString = crypto.randomBytes(16).toString('hex').slice(0, 10);
  return `${timeStamp}${randomString}`;
};

exports.setThresholdLimits = setWarnLevel => {
  process.env.WARN_LEVEL = setWarnLevel;
};

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