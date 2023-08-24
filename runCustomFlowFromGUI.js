import { chromium, webkit } from 'playwright';
import { getComparator } from 'playwright-core/lib/utils';
import { createCrawleeSubFolders, runAxeScript } from '#root/crawlers/commonCrawlerFunc.js';
import { generateArtifacts } from '#root/mergeAxeResults.js';
import {
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
  createScreenshotsFolder,
  cleanUp,
  getStoragePath
} from '#root/utils.js';
import constants, {
  getIntermediateScreenshotsPath,
  getExecutablePath,
  removeQuarantineFlag,
} from '#root/constants/constants.js';
import { isSkippedUrl, submitFormViaPlaywright } from '#root/constants/common.js';
import { spawnSync } from 'child_process';
import { getDefaultChromeDataDir, getDefaultEdgeDataDir } from './constants/constants.js';
import { argv } from 'process';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import safe from 'safe-regex';
import { devices } from 'playwright';
import { consoleLogger, silentLogger } from './logs.js';
import { fileURLToPath } from 'url';
import { proxy } from './constants/constants.js';
import printMessage from 'print-message';

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