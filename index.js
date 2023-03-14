#!/usr/bin/env node
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
import printMessage from 'print-message';
import inquirer from 'inquirer';
import { getVersion } from './utils.js';
import { cleanUp, setHeadlessMode } from './utils.js';
import { prepareData, messageOptions } from './constants/common.js';
import questions from './constants/questions.js';
import combineRun from './combine.js';
import playwrightAxeGenerator from './playwrightAxeGenerator.js';
import constants from './constants/constants.js';

// Delete dataset and request queues
cleanUp(constants.a11yStorage);

printMessage(
  [
    'Welcome to HATS Accessibility Testing Tool!',
    'We recommend using Chrome browser for the best experience.',
    '',
    `Version: ${getVersion()}`,
  ],
  {
    // Note that the color is based on kleur NPM package
    border: true,
    borderColor: 'magenta',
  },
);

let data = {};
let screenToScan;

inquirer.prompt(questions).then(async answers => {
  if (!answers.isHeadless) {
    setHeadlessMode(false);
  } else {
    setHeadlessMode(true);
  }

  data = prepareData(answers.scanner, answers);

  switch (answers.deviceChosen) {
    case 'Desktop':
      screenToScan = answers.scanner === 'custom flow' ? 'Custom_Flow_Desktop' : 'Desktop';
      break;
    case 'Mobile':
      screenToScan = answers.scanner === 'custom flow' ? 'Custom_Flow_Mobile' : 'Mobile';
      break;
    default:
      if (answers.customDevice === 'Specify viewport') {
        screenToScan =
          answers.scanner === 'custom flow'
            ? `Custom_Flow_CustomWidth_${answers.viewportWidth}px`
            : `CustomWidth_${answers.viewportWidth}px`;
      } else {
        screenToScan =
          answers.scanner === 'custom flow'
            ? `Custom_Flow_${answers.customDevice}`
            : answers.customDevice;
      }
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const curHour = today.getHours() < 10 ? '0' + today.getHours() : today.getHours();
  const curMinute = today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes();
  const domain = answers.isLocalSitemap ? 'custom' : new URL(answers.url).hostname;

  data.randomToken =
    `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}_${screenToScan}`.replace(
      /[- )(]/g,
      '',
    );

  printMessage(['Scanning website...'], messageOptions);

  if (answers.scanner === 'custom flow') {
    playwrightAxeGenerator(answers.url, data.randomToken, answers);
  } else {
    await combineRun(data, screenToScan);
  }
});
