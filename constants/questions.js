const { isInputValid, isSelectorValid, getUrlMessage } = require('./common');
const { checkUrl } = require('./common');
const { scannerTypes } = require('./constants')

const isLoginScan = (answers) => {
  return !!answers.scanner && answers.scanner === scannerTypes.login;
}

// Questions used in Inquirer.js
exports.questions = [
  {
    type: 'list',
    name: 'scanner',
    message: 'What would you like to scan today?',
    choices: [scannerTypes.sitemap, scannerTypes.website],
  },
  {
    type: 'confirm',
    name: 'isHeadless',
    message: 'Do you want purple-hats to run in the background?',
    choices: ['Yes', 'No'],
  },

  {
    type: 'input',
    name: 'url',
    message: (answers) => {

      return getUrlMessage(answers.scanner)
    },
    // eslint-disable-next-line func-names
    // eslint-disable-next-line object-shorthand
    validate: async function (url, answers) {
      const checkIfExit = url.toLowerCase();

      if (checkIfExit === 'exit') {
        process.exit(1);
      }

      // Return the data required to evaluate
      const res = await checkUrl(answers.scanner, url);

      if (res.status === 200) {
        answers.url = res.url;
        return true;
      }

      if (answers.scanner === scannerTypes.sitemap) {
        return 'Invalid sitemap format. Please provide a URL with a valid sitemap.';
      }
      return 'Cannot resolve URL. Please provide a valid URL.';
    },
  },

];

