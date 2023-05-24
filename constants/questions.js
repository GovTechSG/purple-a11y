import {
  checkUrl,
  getUrlMessage,
  isFileSitemap,
  sanitizeUrlInput,
} from './common.js';
import constants from './constants.js';

// const isLoginScan = (answers) => {
//   return !!answers.scanner && answers.scanner === constants.scannerTypes.login;
// }

// Questions used in Inquirer.js
const questions = [
  {
    type: 'list',
    name: 'scanner',
    message: 'What would you like to scan today?',
    choices: Object.values(constants.scannerTypes),
  },
  {
    type: 'confirm',
    name: 'headless',
    message: 'Do you want purple-hats to run in the background?',
    choices: ['Yes', 'No'],
  },
  {
    type: 'list',
    name: 'deviceChosen',
    message: 'Which screen size would you like to scan? (Use arrow keys)',
    choices: ['Desktop', 'Mobile', 'Custom'],
  },
  {
    type: 'list',
    name: 'customDevice',
    message: 'Custom: (use arrow keys)',
    when: answers => answers.deviceChosen === 'Custom',
    choices: ['iPhone 11', 'Samsung Galaxy S9+', 'Specify viewport'],
  },
  {
    type: 'input',
    name: 'viewportWidth',
    message: 'Specify width of the viewport in pixels (e.g. 360):',
    when: answers => answers.customDevice === 'Specify viewport',
    validate: viewport => {
      if (!Number.isInteger(Number(viewport))) {
        return 'Invalid viewport width. Please provide a number.';
      }
      if (viewport < 320 || viewport > 1080) {
        return 'Invalid viewport width! Please provide a viewport width between 320-1080 pixels.';
      }
      return true;
    },
  },
  {
    type: 'input',
    name: 'url',
    message: answers => getUrlMessage(answers.scanner),
    // eslint-disable-next-line func-names
    // eslint-disable-next-line object-shorthand
    validate: async function (url, answers) {
      const checkIfExit = url.toLowerCase();

      if (checkIfExit === 'exit') {
        process.exit(1);
      }

      const res = await checkUrl(answers.scanner, url);
      const statuses = constants.urlCheckStatuses;

      switch (res.status) {
        case statuses.success.code:
          answers.finalUrl = res.url;
          return true;
        case statuses.cannotBeResolved.code:
          return statuses.cannotBeResolved.message;
        case statuses.systemError.code:
          return statuses.systemError.message;
        case statuses.invalidUrl.code:
          if (answers.scanner !== constants.scannerTypes.sitemap) {
            return statuses.invalidUrl.message;
          }

          /* if sitemap scan is selected, treat this URL as a filepath
            isFileSitemap will tell whether the filepath exists, and if it does, whether the
            file is a sitemap */
          if (isFileSitemap(answers.url)) {
            answers.isLocalSitemap = true;
            return true;
          } else {
            res.status = statuses.notASitemap.code;
          }
        case statuses.notASitemap.code:
          return statuses.notASitemap.message;
      }
    },

    filter: input => {
      return sanitizeUrlInput(input.trim()).url;
    },
  },
];

export default questions;
