#!/usr/bin/env node
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
import printMessage from 'print-message';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { getVersion, getBranch } from './utils.js';
import { cleanUp, setHeadlessMode } from './utils.js';
import { prepareData, messageOptions } from './constants/common.js';
import questions from './constants/questions.js';
import combineRun from './combine.js';
import constants from './constants/constants.js';

// Delete dataset and request queues
cleanUp(constants.a11yStorage);

exec('git branch --show-current', (err, stdout) => {
  if (err) {
    console.error(err);
  } else {
    const appVersion = getVersion();
    const branchName = stdout.trim();

    printMessage(
      [
        'Welcome to HATS Accessibility Testing Tool!',
        'We recommend using Chrome browser for the best experience.',
        '',
        `Version: ${appVersion}-${branchName}`,
      ],
      {
        // Note that the color is based on kleur NPM package
        border: true,
        borderColor: 'magenta',
      },
    );

    let data = {};
    let screenToScan = 'Desktop';

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

      if (answers.deviceChosen === 'Mobile') {
        screenToScan = 'Mobile';
      } else if (answers.deviceChosen === 'Custom') {
        if (answers.customDevice === 'Specify viewport') {
          screenToScan = 'Mobile';
        } else {
          screenToScan = answers.customDevice;
        }
      }

      data.randomToken =
        `PHScan_${domain}_${yyyy}${mm}${dd}_${curHour}${curMinute}_${screenToScan}`.replace(
          /[- )(]/g,
          '',
        );

      printMessage(['Scanning website...'], messageOptions);
      await combineRun(data);
    });
  }
});
