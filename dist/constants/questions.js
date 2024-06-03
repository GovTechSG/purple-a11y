import { getUserDataTxt } from '../utils.js';
import { checkUrl, deleteClonedProfiles, getBrowserToRun, getPlaywrightDeviceDetailsObject, getUrlMessage, isFileSitemap, sanitizeUrlInput, validEmail, validName, validateCustomFlowLabel, } from './common.js';
import constants from './constants.js';
const userData = getUserDataTxt();
const questions = [];
const startScanQuestions = [
    {
        type: 'list',
        name: 'scanner',
        message: 'What would you like to scan?',
        choices: Object.values(constants.scannerTypes),
    },
    {
        type: 'confirm',
        name: 'headless',
        message: 'Do you want purple-a11y to run in the background?',
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
            const statuses = constants.urlCheckStatuses;
            const { browserToRun, clonedBrowserDataDir } = getBrowserToRun(constants.browserTypes.chrome);
            const playwrightDeviceDetailsObject = getPlaywrightDeviceDetailsObject(answers.deviceChosen, answers.customDevice, answers.viewportWidth);
            const res = await checkUrl(answers.scanner, url, browserToRun, clonedBrowserDataDir, playwrightDeviceDetailsObject);
            deleteClonedProfiles(browserToRun);
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
                    const finalFilePath = await isFileSitemap(url);
                    if (finalFilePath) {
                        answers.isLocalSitemap = true;
                        answers.finalUrl = finalFilePath;
                        return true;
                    }
                    else {
                        return statuses.notASitemap.message;
                    }
                case statuses.notASitemap.code:
                    return statuses.notASitemap.message;
            }
        },
        filter: input => sanitizeUrlInput(input.trim()).url,
    },
    {
        type: 'input',
        name: 'customFlowLabel',
        message: 'Give a preferred label to your custom scan flow (Optional)',
        when: answers => answers.scanner === constants.scannerTypes.custom,
        validate: label => {
            const { isValid, errorMessage } = validateCustomFlowLabel(label);
            if (!isValid) {
                return errorMessage;
            }
            return true;
        },
    },
];
const newUserQuestions = [
    {
        type: 'input',
        name: 'name',
        message: `Name:`,
        validate: name => {
            // if (name === '' || name === undefined || name === null) {
            //   return true;
            // }
            if (!validName(name)) {
                return 'Invalid name. Please provide a valid name. Only alphabets in under 50 characters allowed.';
            }
            return true;
        },
    },
    {
        type: 'input',
        name: 'email',
        message: `Email:`,
        validate: email => {
            // if (email === '' || email === undefined || email === null) {
            //   return true;
            // }
            if (!validEmail(email)) {
                return 'Invalid email address. Please provide a valid email address.';
            }
            return true;
        },
    },
];
if (userData) {
    questions.unshift(...startScanQuestions);
}
else {
    newUserQuestions.push(...startScanQuestions);
    questions.unshift(...newUserQuestions);
}
export default questions;
