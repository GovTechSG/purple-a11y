import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';

const playwrightAxeGenerator = async (domain, randomToken, answers) => {
  const { isHeadless, deviceChosen, customDevice, customWidth } = answers;
  const block1 = `import { chromium, devices, webkit } from 'playwright';
  import { createCrawleeSubFolders, runAxeScript } from './crawlers/commonCrawlerFunc.js';
  import { generateArtifacts } from './mergeAxeResults.js';
  import { createAndUpdateResultsFolders, createDetailsAndLogs, getStoragePath } from './utils.js';
  import constants, { intermediateScreenshotsPath } from './constants/constants.js';
  import fs from 'fs';
  import { isSkippedUrl } from './constants/common.js';
  import { spawnSync } from 'child_process';

process.env.CRAWLEE_STORAGE_DIR = constants.a11yStorage;

const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: 'Custom Flow',
    requestUrl: '${domain}',
};
    
const urlsCrawled = { ...constants.urlsCrawledObj };
const { dataset } = await createCrawleeSubFolders(
  '${randomToken}',
);

var whitelistedDomains = fs.existsSync('exclusions.txt')? fs.readFileSync('exclusions.txt').toString().split('\\n') : undefined;

var index = 1;
var urlImageDictionary = {};
let pageUrl;

const checkForAxeScan = async page => {
    const imgPath = './screenshots/PHScan-screenshot' + index.toString() + '.png';

  index += 1;

  const fullPageSize = await page.evaluate(() => {
    return {
      width: Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.body.clientWidth,
        document.documentElement.clientWidth,
      ),
      height: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight,
      ),
    };
  });

  const originalSize = page.viewportSize();
  await page.setViewportSize(fullPageSize);
  const usesInfiniteScroll = async () => {
    const prevHeight = await page.evaluate(() => document.body.scrollHeight);

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    const isLoadMoreContent = async () => {
      return new Promise((resolve) => {
        setTimeout(async () => {
          await page.waitForLoadState();

          const result = await page.evaluate((prevHeight) => {
              const currentHeight = document.body.scrollHeight;
              return (currentHeight > prevHeight);
          }, prevHeight);

          resolve(result);
        }, 3000);
      });
    }

    const result = await isLoadMoreContent();
    return result;
  };

  if (await usesInfiniteScroll()){
    pageUrl = page.url();
    await page.screenshot({
      path: imgPath,
      clip: {
        x: 0,
        y: 0,
        width: fullPageSize.width,
        height: 5400
      },
      fullPage: true,
    });
  } else {
    pageUrl = page.url();
    await page.screenshot({ path: imgPath, fullPage: true });
  }
  await page.setViewportSize(originalSize);

  var isSimilarPage = false;

  if (!urlImageDictionary[pageUrl]) {
    urlImageDictionary[pageUrl] = [imgPath];
  } else {
    try {
        var img2 = imgPath;
        var img2Canny = img2.replace(/.[^/.]+$/, '') + '-canny.png';
        spawnSync('convert', [img2, '-canny', '0x1+10%+30%', img2Canny]);
  
        for (const img of urlImageDictionary[pageUrl]) {
          var img1Canny = img.replace(/.[^/.]+$/, '') + '-canny.png';
  
          spawnSync('convert', [img, '-canny', '0x1+10%+30%', img1Canny]);
  
          const nccOutput = spawnSync('compare', ['-metric', 'NCC', img1Canny, img2Canny, 'null:']);
  
          const output = parseFloat(nccOutput.stderr.toString().trim());
  
          if (output > 0.5) {
            fs.unlink(img2, err => {
              if (err) throw err;
            });
  
            isSimilarPage = true;
  
            break;
          }
        }
  
        if (!isSimilarPage) {
        const host = new URL(pageUrl).hostname;
        const result = await runAxeScript(page, host);
        await dataset.pushData(result);
        urlsCrawled.scanned.push(pageUrl);
  
        urlImageDictionary[pageUrl].push(img2)
        } 

    } catch (error) {
      console.error('error: ', error);
    }
  }

  const host = new URL(pageUrl).hostname;
  const result = await runAxeScript(page, host);
  await dataset.pushData(result);
  urlsCrawled.scanned.push(pageUrl);
};


const runAxeScan = async page => {
  if (whitelistedDomains && isSkippedUrl(page, whitelistedDomains)) {
    return;
  }

  await page.waitForLoadState();  
  await checkForAxeScan(page);
};`

  const block2 = `  return urlsCrawled;
        })().then(async (urlsCrawled) => {
            fs.readdir(intermediateScreenshotsPath, (err, files) => {
                if (err) {
                  console.error(\`Error reading directory: \${err}\`);
                  return;
                }
                const filteredFiles = files.filter(file => file.includes('canny'));
            
                filteredFiles.forEach(file => {
                  fs.unlink(\`./screenshots/\${file}\`,  err => {
                    if (err) throw err;
                  });
                });
              });

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

    if (customDevice === 'iPhone 11' || deviceChosen === 'Mobile') {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --device='iPhone 11' --block-service-workers --ignore-https-errors`,
      );
    } else if (customDevice === 'Samsung Galaxy S9+') {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --device='Galaxy S9+' --block-service-workers --ignore-https-errors`,
      );
    } else if (customDevice === 'Specify viewport') {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --viewport-size=${viewportWidth},720 --block-service-workers --ignore-https-errors`,
      );
    } else {
      execSync(
        `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain} --block-service-workers --ignore-https-errors`,
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

      if (line.trim().includes('getBy') || line.trim().includes('click()')) {
        const lastIndex = line.lastIndexOf('.');
        const locator = line.substring(0, lastIndex);
        appendToGeneratedScript(
          ` (${locator}.count()>1)? [console.log('Please re-click the intended DOM element'), page.setDefaultTimeout(0)]:
          ${line}
          await runAxeScan(page);
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
            line.replace('goto', 'waitForURL').replace(')', `,{timeout: 60000})`),
          );
        }

        if (fs.existsSync('exclusions.txt')) {
          const whitelistedDomains = fs.readFileSync('exclusions.txt').toString().split('\n');

          let isWhitelisted = whitelistedDomains.filter(function (pattern) {
            return new RegExp(pattern).test(line);
          });

          let noMatch = Object.keys(isWhitelisted).every(function (key) {
            return isWhitelisted[key].length === 0;
          });

          if (!noMatch) {
            continue;
          }
        }

        appendToGeneratedScript(` await runAxeScan(page);`);
        continue;
      }
      if (line.trim().startsWith(`await page.waitForURL(`)) {
        appendToGeneratedScript(line);

        if (fs.existsSync('exclusions.txt')) {
          const whitelistedDomains = fs.readFileSync('exclusions.txt').toString().split('\n');

          let isWhitelisted = whitelistedDomains.filter(function (pattern) {
            return new RegExp(pattern).test(line);
          });

          let noMatch = Object.keys(isWhitelisted).every(function (key) {
            return isWhitelisted[key].length === 0;
          });

          if (!noMatch) {
            continue;
          }
        }

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
