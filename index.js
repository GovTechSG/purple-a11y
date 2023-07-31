#!/usr/bin/env node
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
import printMessage from 'print-message';
import inquirer from 'inquirer';
import { devices } from 'playwright';
import {
  getVersion,
  cleanUp,
  setHeadlessMode,
  getUserDataTxt,
  writeToUserDataTxt,
} from './utils.js';

import { prepareData, messageOptions } from './constants/common.js';
import questions from './constants/questions.js';
import combineRun from './combine.js';
import playwrightAxeGenerator from './playwrightAxeGenerator.js';
import constants from './constants/constants.js';
import { devices } from 'playwright';

const userData = getUserDataTxt();

if (userData) {
  printMessage(
    [
      `Purple HATS (ver ${getVersion()})`,
      'We recommend using Chrome browser for the best experience.',
      '',
      `Welcome back ${userData.name}!`,
      `(Refer to readme.txt on how to change your profile)`,
    ],
    {
      // Note that the color is based on kleur NPM package
      border: true,
      borderColor: 'magenta',
    },
  ); 

  inquirer.prompt(questions).then(async answers => {
    let screenToScan;
    let playwrightDeviceDetailsObject = {};

    if (answers.deviceChosen !== 'Custom') {
      screenToScan = answers.deviceChosen;
      if (answers.deviceChosen === 'Mobile') {
        playwrightDeviceDetailsObject = devices['iPhone 11'];
      }
    } else if (answers.customDevice !== 'Specify viewport') {
      screenToScan = answers.customDevice;
      // Only iPhone 11 & Samsung Galaxy S9+ are selectable
      if (answers.customDevice === 'Samsung Galaxy S9+') {
        playwrightDeviceDetailsObject = devices['Galaxy S9+'];
      } else {
        playwrightDeviceDetailsObject = devices[answers.customDevice];
      }
    } else if (answers.viewportWidth) {
      screenToScan = `CustomWidth_${answers.viewportWidth}px`;
      playwrightDeviceDetailsObject = {
        viewport: { width: Number(answers.viewportWidth), height: 720 },
      };
    }

    answers.playwrightDeviceDetailsObject = playwrightDeviceDetailsObject;

    // TODO: Do not hard set browser to Chromium after
    // index has option to choose browser
    answers.browserToRun = constants.browserTypes.chromium;

    answers.nameEmail = `${userData.name}:${userData.email}`;

    const data = prepareData(answers);
    data.userDataDirectory = '';

    setHeadlessMode(data.isHeadless);

    const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');

    const domain = answers.isLocalSitemap ? 'custom' : new URL(answers.url).hostname;

    data.randomToken = `PHScan_${domain}_${date}_${time}_${answers.scanner.replaceAll(
      ' ',
      '_',
    )}_${screenToScan.replaceAll(' ', '_')}`;

    printMessage(['Scanning website...'], messageOptions);

    if (answers.scanner === constants.scannerTypes.custom) {
      await playwrightAxeGenerator(data);
    } else {
      await combineRun(data, screenToScan);
    }

    // Delete dataset and request queues
    cleanUp(data.randomToken);
    process.exit(0);
  });
} else {
  printMessage(
    [
      `Purple HATS (ver ${getVersion()})`,
      'We recommend using Chrome browser for the best experience.',
    ],
    {
      // Note that the color is based on kleur NPM package
      border: true,
      borderColor: 'magenta',
    },
  );

  printMessage(
    [
      `To personalise your experience, we will be collecting your name, email address and app usage data.`,
      `Your information fully complies with GovTech's Privacy Policy.`,
    ],
    {
      border: false,
    },
  );

  inquirer.prompt(questions).then(async answers => {
    const { name, email } = answers;

    await writeToUserDataTxt('name', name);
    await writeToUserDataTxt('email', email);

    let screenToScan;
    let playwrightDeviceDetailsObject = {};

    if (answers.deviceChosen !== 'Custom') {
      screenToScan = answers.deviceChosen;
      if (answers.deviceChosen === 'Mobile') {
        playwrightDeviceDetailsObject = devices['iPhone 11'];
      }
    } else if (answers.customDevice !== 'Specify viewport') {
      screenToScan = answers.customDevice;
      // Only iPhone 11 & Samsung Galaxy S9+ are selectable
      if (answers.customDevice === 'Samsung Galaxy S9+') {
        playwrightDeviceDetailsObject = devices['Galaxy S9+'];
      } else {
        playwrightDeviceDetailsObject = devices[answers.customDevice];
      }
    } else if (answers.viewportWidth) {
      screenToScan = `CustomWidth_${answers.viewportWidth}px`;
      playwrightDeviceDetailsObject = {
        viewport: { width: Number(answers.viewportWidth), height: 720 },
      };
    }

    answers.nameEmail = `${name}:${email}`;
    answers.playwrightDeviceDetailsObject = playwrightDeviceDetailsObject;

    // TODO: Do not hard set browser to Chromium after
    // index has option to choose browser
    answers.browserToRun = constants.browserTypes.chromium;

    const data = prepareData(answers);

    setHeadlessMode(data.isHeadless);

    const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');

    const domain = answers.isLocalSitemap ? 'custom' : new URL(answers.url).hostname;

    data.randomToken = `PHScan_${domain}_${date}_${time}_${answers.scanner.replaceAll(
      ' ',
      '_',
    )}_${screenToScan.replaceAll(' ', '_')}`;

    printMessage(['Scanning website...'], messageOptions);

    if (answers.scanner === constants.scannerTypes.custom) {
      await playwrightAxeGenerator(data);
    } else {
      await combineRun(data, screenToScan);
    }

    // Delete dataset and request queues
    cleanUp(data.randomToken);
    process.exit(0);
  });
}
