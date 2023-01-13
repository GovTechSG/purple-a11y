#!/usr/bin/env node
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
import printMessage from 'print-message';
import inquirer from 'inquirer';
import { cleanUp, setHeadlessMode} from './utils.js';
import { prepareData, messageOptions } from './constants/common.js';
import { questions } from './constants/questions.js';
import { combineRun } from './combine.js';
import constants from './constants/constants.js';

// Delete dataset and request queues
cleanUp(constants.a11yStorage);

printMessage(
  [
    'Welcome to HATS Accessibility Testing Tool!',
    'We recommend using Chrome browser for the best experience.',
  ],
  {
    // Note that the color is based on kleur NPM package
    border: true,
    borderColor: 'magenta',
  },
);

let data = {};

inquirer.prompt(questions).then(async answers => {
  if (!answers.isHeadless) {
    setHeadlessMode(false);
  } else {
    setHeadlessMode(true);
  }

  data = prepareData(answers.scanner, answers);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const curHour = today.getHours() < 10 ? '0' + today.getHours() : today.getHours();
  const curMinute = today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes();
  const domain = new URL(answers.url).hostname;

  data.randomToken = `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}`.replace(
    /[- )(]/g,
    '',
  );

  printMessage(['Scanning website...'], messageOptions);
  await combineRun(data);
});