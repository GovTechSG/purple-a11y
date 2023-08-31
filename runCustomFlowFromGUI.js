import { chromium, webkit, devices } from 'playwright';
import { getComparator } from 'playwright-core/lib/utils';
import { spawnSync, execSync } from 'child_process';
import { argv } from 'process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import safe from 'safe-regex';
import printMessage from 'print-message';
import { createCrawleeSubFolders, runAxeScript } from '#root/crawlers/commonCrawlerFunc.js';
import { generateArtifacts } from '#root/mergeAxeResults.js';
import {
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
  createScreenshotsFolder,
  cleanUp,
  getStoragePath,
} from '#root/utils.js';
import constants, {
  proxy,
  getIntermediateScreenshotsPath,
  getExecutablePath,
  removeQuarantineFlag,
  getDefaultChromeDataDir,
  getDefaultEdgeDataDir,
  guiInfoStatusTypes,
} from '#root/constants/constants.js';
import { isSkippedUrl, submitForm, getBlackListedPatterns } from '#root/constants/common.js';
import { consoleLogger, silentLogger, guiInfoLog } from './logs.js';

const generatedScript = argv[2];
console.log(argv);
console.log(generatedScript);
const genScriptString = fs.readFileSync(generatedScript, 'utf-8');
const genScriptCompleted = new Promise((resolve, reject) => {
  eval(`(async () => {
        try {
            ${genScriptString} 
            resolve(); 
        } catch (e) {
            reject(e)
        }
        })();`);
});

await genScriptCompleted;

// const run = () => {
//     eval(`(async () => {
//         try {
//             ${genScriptString}
//         } catch (e) {
//             console.log(e);
//         }
//     })();`)
// }

// run();
