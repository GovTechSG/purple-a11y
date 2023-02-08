import { checkUrl, getUrlMessage, isFileSitemap, isValidHttpUrl, sanitizeUrlInput } from './common.js';
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
    choices: [
      constants.scannerTypes.sitemap,
      constants.scannerTypes.website,
      constants.scannerTypes.customFlow,
    ],
  },
  {
    type: 'confirm',
    name: 'isHeadless',
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

      // Return the data required to evaluate
      if (isValidHttpUrl(url)) {
        const res = await checkUrl(answers.scanner, url);

        if (res.status === 200) {
          answers.finalUrl = res.url;
          return true;
        }
      } else if (answers.scanner === constants.scannerTypes.sitemap && isFileSitemap(url)) {
        answers.isLocalSitemap = true;
        return true;
      }

      if (answers.scanner === constants.scannerTypes.sitemap) {
        return 'Invalid sitemap format. Please provide a URL or file path with a valid sitemap.';
      }
      return 'Cannot resolve URL. Please provide a valid URL.';
    },
    filter: (input) => {
      return sanitizeUrlInput(input.trim()).url
    }
  },
];

export default questions;
