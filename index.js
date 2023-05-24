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

inquirer.prompt(questions).then(async answers => {
  const data = prepareData(answers);

  setHeadlessMode(data.isHeadless);

  let screenToScan;

  if (answers.deviceChosen !== 'Custom') {
    screenToScan = answers.deviceChosen;
  } else if (answers.customDevice !== 'Specify viewport') {
    screenToScan = answers.customDevice;
  } else {
    screenToScan = `CustomWidth_${answers.viewportWidth}px`;
  }

  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');

  const domain = answers.isLocalSitemap ? 'custom' : new URL(answers.url).hostname;

  data.randomToken = `PHScan_${domain}_${date}_${time}_${answers.scanner.replaceAll(
    ' ',
    '_',
  )}_${screenToScan.replaceAll(' ', '_')}`;

  printMessage(['Scanning website...'], messageOptions);

  if (answers.scanner === constants.scannerTypes.custom) {
    await playwrightAxeGenerator(answers.url, data);
  } else {
    await combineRun(data, screenToScan);
  }
  // Delete dataset and request queues
  cleanUp(data.randomToken);
});
