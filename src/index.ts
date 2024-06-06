#!/usr/bin/env node
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
import printMessage from 'print-message';
import inquirer from 'inquirer';
import {
  getVersion,
  cleanUp,
  setHeadlessMode,
  getUserDataTxt,
  writeToUserDataTxt,
  getStoragePath,
} from './utils.js';
import {
  prepareData,
  messageOptions,
  getPlaywrightDeviceDetailsObject,
  getBrowserToRun,
  getScreenToScan,
  getClonedProfilesWithRandomToken,
  deleteClonedProfiles,
} from './constants/common.js';
import questions from './constants/questions.js';
import combineRun from './combine.js';
import constants, { BrowserTypes, ScannerTypes } from './constants/constants.js';

export type Answers = {
  headless: boolean;
  deviceChosen: string;
  customDevice: string;
  viewportWidth: number;
  browserToRun: BrowserTypes;
  scanner: ScannerTypes;
  url: string;
  clonedBrowserDataDir: string;
  playwrightDeviceDetailsObject: Object;
  nameEmail: string;
  fileTypes: string;
  metadata: string;
  maxpages: number;
  strategy: string;
  isLocalSitemap: boolean;
  finalUrl: string;
  customFlowLabel: string;
  specifiedMaxConcurrency: number;
  blacklistedPatternsFilename: string;
  additional: string;
  followRobots: boolean;
  header: string;
  safeMode: boolean;
};

export type Data = {
  type: ScannerTypes;
  url: string;
  entryUrl: string;
  isHeadless: boolean;
  deviceChosen: string;
  customDevice: string;
  viewportWidth: number;
  playwrightDeviceDetailsObject: Object;
  maxRequestsPerCrawl: number;
  strategy: string;
  isLocalSitemap: boolean;
  browser: string;
  nameEmail: string;
  customFlowLabel: string;
  specifiedMaxConcurrency: number;
  randomToken: string;
  fileTypes: string;
  blacklistedPatternsFilename: string;
  includeScreenshots: boolean;
  metadata: string;
  followRobots: boolean;
  extraHTTPHeaders: string;
  safeMode: boolean;
  userDataDirectory?: string;
};

const runScan = async (answers: Answers) => {
  const screenToScan = getScreenToScan(
    answers.deviceChosen,
    answers.customDevice,
    answers.viewportWidth,
  );
  answers.playwrightDeviceDetailsObject = getPlaywrightDeviceDetailsObject(
    answers.deviceChosen,
    answers.customDevice,
    answers.viewportWidth,
  );
  let { browserToRun } = getBrowserToRun(BrowserTypes.CHROME);
  deleteClonedProfiles(browserToRun);
  answers.browserToRun = browserToRun;

  if (!answers.nameEmail) {
    answers.nameEmail = `${userData.name}:${userData.email}`;
  }

  answers.fileTypes = 'html-only';
  answers.metadata = '{}';

  const data = await prepareData(answers);
  data.userDataDirectory = getClonedProfilesWithRandomToken(data.browser, data.randomToken);

  setHeadlessMode(data.browser, data.isHeadless);
  printMessage(['Scanning website...'], messageOptions);

  await combineRun(data, screenToScan);
  
  // Delete cloned directory
  deleteClonedProfiles(data.browser);

  // Delete dataset and request queues
  cleanUp(data.randomToken);

  const storagePath = getStoragePath(data.randomToken);
  const messageToDisplay = [
    `Report of this run is at ${constants.cliZipFileName}`,
    `Results directory is at ${storagePath}`,
  ];
  printMessage(messageToDisplay);
  process.exit(0);
};

const userData = getUserDataTxt();

if (userData) {
  printMessage(
    [
      `Purple A11y (ver ${getVersion()})`,
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
    await runScan(answers);
  });
} else {
  printMessage(
    [
      `Purple A11y (ver ${getVersion()})`,
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
    answers.nameEmail = `${name}:${email}`;
    await writeToUserDataTxt('name', name);
    await writeToUserDataTxt('email', email);

    await runScan(answers);
  });
}
