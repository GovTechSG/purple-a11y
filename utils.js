const fs = require('fs-extra');
const { a11yDataStoragePath, allIssueFileName } = require('./constants/constants');

exports.getHostnameFromRegex = url => {
  // run against regex
  const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
  // extract hostname (will be null if no match is found)
  return matches && matches[1];
};

exports.getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

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
  const date = new Date();
  const currentDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const storagePath = `results/${currentDate}/${randomToken}`;
  return storagePath;
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

exports.getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  });
};
