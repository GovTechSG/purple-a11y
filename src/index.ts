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
import constants from './constants/constants.js';

export type Answers = {
  headless: string;
  deviceChosen: string;
  customDevice: string;
  viewportWidth: number;
  browserToRun: string;
  scanner: string;
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
  followRobots: string;
  header: string;
  safeMode: string;
};

export type Data = {
  type: string;
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
  let { browserToRun } = getBrowserToRun(constants.browserTypes.chrome);
  deleteClonedProfiles(browserToRun);
  answers.browserToRun = browserToRun;

  if (!answers.nameEmail) {
    answers.nameEmail = `${userData.name}:${userData.email}`;
  }

  answers.fileTypes = 'html-only';
  answers.metadata = '{}';

  let isCustomFlow = false;
  if (answers.scanner === constants.scannerTypes.custom) {
    isCustomFlow = true;
  }

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
