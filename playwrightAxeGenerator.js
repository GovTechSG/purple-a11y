import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';

const playwrightAxeGenerator = async (domain, randomToken, answers) => {
  const { isHeadless, deviceChosen, customDevice, customWidth } = answers;
  const block1 = `import { chromium, devices, webkit } from "playwright";
import { createCrawleeSubFolders, runAxeScript } from "./crawlers/commonCrawlerFunc.js";
import { generateArtifacts } from './mergeAxeResults.js';
import { createAndUpdateResultsFolders, createDetailsAndLogs } from './utils.js';
import constants from "./constants/constants.js";

process.env.CRAWLEE_STORAGE_DIR = constants.a11yStorage;

const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: 'Custom Flow',
    requestUrl: '${domain}',
};
    
const urlsCrawled = { ...constants.urlsCrawledObj };
const { dataset } = await createCrawleeSubFolders('${randomToken}');
const runAxeScan = async (page) => {
  const host = new URL(page.url()).hostname;
  const result = await runAxeScript(page, host);
  await dataset.pushData(result);
  urlsCrawled.scanned.push(page.url());
}`;

  const block2 = `  return urlsCrawled;
        })().then(async (urlsCrawled) => {
            scanDetails.endTime = new Date().getTime();
            scanDetails.urlsCrawled = urlsCrawled;
            await createDetailsAndLogs(scanDetails, '${randomToken}');
            await createAndUpdateResultsFolders('${randomToken}');
            await generateArtifacts('${randomToken}', 'Automated Scan');
        });`;

  let tmpDir;
  const appPrefix = 'purple-hats';


  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));

    if (customDevice === 'iPhone 11') {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --device='iPhone 11'`,
      );
    } else if (customDevice === 'Samsung Galaxy S9+') {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --device='Galaxy S9+'`,
      );
    } else if (customDevice === 'Specify viewport') {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --viewport-size=${viewportWidth},720`,
      );
    } else {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain}`,
      );
    }

    const fileStream = fs.createReadStream(`${tmpDir}/intermediateScript.js`);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const generatedScript = `./generatedScript-${randomToken}.js`;

    const appendToGeneratedScript = data => {
      fs.appendFileSync(generatedScript, `${data}\n`);
    };

    let firstGoToUrl = false;

    for await (let line of rl) {
      if (
        line.trim() === `const { chromium } = require('playwright');` ||
        line.trim() === `const { chromium, devices } = require('playwright');` ||
        line.trim() === `const { webkit, devices } = require('playwright');`
      ) {
        appendToGeneratedScript(block1);
        continue;
      }
      if (line.trim() === `headless: false` && isHeadless) {
        appendToGeneratedScript(`headless: true`);
        continue;
      }
      //check if more than 1 element located
      if (line.trim().includes('getBy')) {
        const lastIndex = line.lastIndexOf('.');
        const locator = line.substring(0, lastIndex);
        appendToGeneratedScript(
          ` (${locator}.count()>1)? [console.log('Please re-click the intended DOM element'), page.setDefaultTimeout(0)]:
          ${line}
        `,
        );
        continue;
      }
      if (line.trim() === `const page = await context.newPage();`) {
        if (deviceChosen === 'Mobile') {
          appendToGeneratedScript(line);
          appendToGeneratedScript(
            `  const pageHeight = page.viewportSize().height
            await page.setViewportSize({
                      width: 360,
                      height: pageHeight,
                      isMobile: true,
                    });`,
          );
        } else if (customWidth) {
          appendToGeneratedScript(line);
          appendToGeneratedScript(
            `const pageHeight = page.viewportSize().height
            await page.setViewportSize({
            width: ${customWidth},
            height: pageHeight,
            isMobile: true,
          });`,
          );
        } else {
          appendToGeneratedScript(line);
        }
        continue;
      }
      if (line.trim().includes(`/common/login?spcptracking`)) {
        appendToGeneratedScript(
          `await page.goto('https://iam.hdb.gov.sg/common/login', { waitUntil: 'networkidle' });`,
        );
        continue;
      }
      if (line.trim().includes(`spauthsuccess?code=`)) {
        continue;
      }
      if (line.trim().startsWith(`await page.goto(`)) {
        if (!firstGoToUrl) {
          firstGoToUrl = true;
          appendToGeneratedScript(line);
        } else {
            appendToGeneratedScript(
            line.replace('goto', 'waitForURL').replace(')', ', {timeout: 60000})'),
            );

            if (fs.existsSync('exclusions.txt')) {
                const whitelistedDomains = fs.readFileSync('exclusions.txt').toString().split("\n");
        
                let isWhitelisted = whitelistedDomains.filter(function(pattern){
                    return new RegExp(pattern).test(line)
                })

                if (isWhitelisted.length > 0){
                    continue;
                }
            };
        }
        appendToGeneratedScript(` await runAxeScan(page);`);
        continue;
      }
      if (line.trim().startsWith(`await page.waitForURL(`)) {
        appendToGeneratedScript(line);

        if (fs.existsSync('exclusions.txt')) {
            const whitelistedDomains = fs.readFileSync('exclusions.txt').toString().split("\n");
    
            let isWhitelisted = whitelistedDomains.filter(function(pattern){
                return new RegExp(pattern).test(line)
            })

            if (isWhitelisted.length > 0){
                continue;
            }
        };
        appendToGeneratedScript(` await runAxeScan(page);`);
        continue;
      }
      if (line.trim() === `await browser.close();`) {
        appendToGeneratedScript(line);
        appendToGeneratedScript(block2);
        break;
      }
      appendToGeneratedScript(line);
    }

    import(generatedScript);
  } catch (e) {
    console.error(`Error: ${e}`);
  } finally {
    try {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    } catch (e) {
      console.error(
        `An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`,
      );
    }
  }

  // fs.unlinkSync(generatedScript);
};

export default playwrightAxeGenerator;
