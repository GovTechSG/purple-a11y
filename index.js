#!/usr/bin/env node
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
const printMessage = require('print-message');
const inquirer = require('inquirer');
const { cleanUp, setHeadlessMode, generateRandomToken } = require('./utils');
const { prepareData, messageOptions } = require('./constants/common');
const { questions } = require('./constants/questions');
const { combineRun } = require('./combine');
const { a11yStorage } = require('./constants/constants');

// Delete dataset and request queues
cleanUp(a11yStorage);

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

  data.randomToken = generateRandomToken();

  printMessage(['Scanning website...'], messageOptions);
  await combineRun(data);
});
