import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import safe from 'safe-regex';
import { consoleLogger, silentLogger } from './logs.js';

const playwrightAxeGenerator = async (domain, data) => {

  const blacklistedPatternsFilename = 'exclusions.txt';
  let blacklistedPatterns = null;

  if (fs.existsSync(blacklistedPatternsFilename)) {
    blacklistedPatterns = fs.readFileSync(blacklistedPatternsFilename).toString().split('\n');

    let unsafe = blacklistedPatterns.filter(function (pattern) {
      return !safe(pattern);
    });
    
    if (unsafe.length > 0 ) {
      let unsafeExpressionsError = "Unsafe expressions detected: '"+ unsafe +"' Please revise " + blacklistedPatternsFilename;
      consoleLogger.error(unsafeExpressionsError);
      silentLogger.error(unsafeExpressionsError);
      process.exit(1);
    };
  }

  const { isHeadless, randomToken, deviceChosen, customDevice, viewportWidth } = data;
  const block1 = `import { chromium, devices, webkit } from 'playwright';
  import { createCrawleeSubFolders, runAxeScript } from '#root/crawlers/commonCrawlerFunc.js';
  import { generateArtifacts } from '#root/mergeAxeResults.js';
  import { createAndUpdateResultsFolders, createDetailsAndLogs, createScreenshotsFolder } from '#root/utils.js';
  import constants, { intermediateScreenshotsPath, getExecutablePath, removeQuarantineFlag } from '#root/constants/constants.js';
  import fs from 'fs';
  import path from 'path';
  import { isSkippedUrl } from '#root/constants/common.js';
  import { spawnSync } from 'child_process';
  import safe from 'safe-regex';
  import { consoleLogger, silentLogger } from '#root/logs.js';
  const blacklistedPatternsFilename = 'exclusions.txt';

process.env.CRAWLEE_STORAGE_DIR = constants.a11yStorage;
const compareExe = getExecutablePath('**/ImageMagick*/bin','compare');

if (!compareExe) {
  let ImagMagickNotFoundError = "Could not find ImageMagick compare.  Please ensure ImageMagick is installed at current directory.";
  consoleLogger.error(ImagMagickNotFoundError);
  silentLogger.error(ImagMagickNotFoundError);
  process.exit(1);
} 

removeQuarantineFlag('**/ImageMagick*/lib/*.dylib');
const ImageMagickPath = path.resolve(compareExe, '../../');
process.env.MAGICK_HOME = ImageMagickPath;
process.env.DYLD_LIBRARY_PATH = ImageMagickPath + '/lib/';

const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: 'Custom Flow',
    requestUrl: '${domain}',
};
    
const urlsCrawled = { ...constants.urlsCrawledObj };
const { dataset } = await createCrawleeSubFolders(
  '${randomToken}',
);

let blacklistedPatterns = null;

if (fs.existsSync(blacklistedPatternsFilename)) {
  blacklistedPatterns = fs.readFileSync(blacklistedPatternsFilename).toString().split('\\n');

  let unsafe = blacklistedPatterns.filter(function (pattern) {
    return !safe(pattern);
  });
  
  if (unsafe.length > 0) {
    let unsafeExpressionsError =
      "Unsafe expressions detected: '" +
      unsafe +
      "' Please revise " +
      blacklistedPatternsFilename;
    consoleLogger.error(unsafeExpressionsError);
    silentLogger.error(unsafeExpressionsError);
    process.exit(1);
  }
}

var index = 1;
var urlImageDictionary = {};
let pageUrl;

const checkIfScanRequired = async page => {
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
    return true;
  } else {
    try {
        var currImg = imgPath;
        var currImgCanny = currImg.replace(/.[^/.]+$/, '') + '-canny.png';
        spawnSync('convert', [currImg, '-canny', '0x1+10%+30%', currImgCanny]);
  
        for (const prevImg of urlImageDictionary[pageUrl]) {
          var prevImgCanny = prevImg.replace(/.[^/.]+$/, '') + '-canny.png';
  
          spawnSync('convert', [prevImg, '-canny', '0x1+10%+30%', prevImgCanny]);
  
          const nccOutput = spawnSync(compareExe, ['-metric', 'NCC', prevImgCanny, currImgCanny, 'null:']);
  
          const output = parseFloat(nccOutput.stderr.toString().trim());
  
          if (output > 0.5) {
            fs.unlink(currImg, err => {
              if (err) throw err;
            });
  
            isSimilarPage = true;
  
            break;
          }
        }
  
        if (!isSimilarPage) {
        urlImageDictionary[pageUrl].push(currImg)
        return true;
        } 

    } catch (error) {
      console.error('error: ', error);
    }
  }
};

const runAxeScan = async page => {
  const host = new URL(pageUrl).hostname;
  const result = await runAxeScript(page, host);
  await dataset.pushData(result);
  urlsCrawled.scanned.push(pageUrl);
}


const processPage = async page => {
  await page.waitForLoadState('networkidle'); 

  if (await checkIfScanRequired(page)) {
    if (blacklistedPatterns && isSkippedUrl(page, blacklistedPatterns)) {
      return;
    } else {
      await runAxeScan(page);
    }
  };
};`;

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
            createScreenshotsFolder('${randomToken}');
            await generateArtifacts('${randomToken}', 'Automated Scan');
        });`;

  let tmpDir;
  const appPrefix = 'purple-hats';

  if (!fs.existsSync('./custom_flow_scripts')) {
    fs.mkdirSync('./custom_flow_scripts');
  }

  const generatedScript = `./custom_flow_scripts/generatedScript-${randomToken}.js`;

  console.log(` Launching browser. Navigate and record custom steps for ${domain} in the new browser.\n Close the browser when you are done recording.`);

  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));

    let codegenCmd = `npx playwright codegen --target javascript -o ${tmpDir}/intermediateScript.js ${domain}`;
    let extraCodegenOpts = `--browser chromium --ignore-https-errors`;
    let codegenResult;

    if (customDevice === 'Specify viewport') {
      codegenResult = execSync(
        `${codegenCmd} --viewport-size=${viewportWidth},720 ${extraCodegenOpts}`,
      );
    } else if (!customDevice || customDevice === 'Desktop' || deviceChosen === 'Desktop') {
      codegenResult = execSync(`${codegenCmd} ${extraCodegenOpts}`);
    } else if (deviceChosen === 'Mobile') {
      codegenResult = execSync(`${codegenCmd} --device="iPhone 11" ${extraCodegenOpts}`);
    } else if (customDevice === 'Samsung Galaxy S9+') {
      codegenResult = execSync(`${codegenCmd} --device="Galaxy S9+" ${extraCodegenOpts}`);
    } else if (customDevice) {
      codegenResult = execSync(`${codegenCmd} --device="${customDevice}" ${extraCodegenOpts}`);
    } else {
      console.error(
        `Error: Unable to parse device requested for scan. Please check the input parameters.`,
      );
    }

    if (codegenResult.toString()) {
      console.error(
        `Error running Codegen: ${codegenResult.toString()}`,
      );
    }

    const fileStream = fs.createReadStream(`${tmpDir}/intermediateScript.js`);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const appendToGeneratedScript = data => {
      fs.appendFileSync(generatedScript, `${data}\n`);
    };

    let firstGoToUrl = false;
    let lastGoToUrl;
    let nextStepNeedsProcessPage = false;

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
      if (line.trim() === `const browser = await webkit.launch({`) {
        appendToGeneratedScript(`const browser = await chromium.launch({`);
        continue;
      }
      if (line.trim() === `(async () => {`) {
        appendToGeneratedScript(`await (async () => {`);
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
        } else if (viewportWidth) {
          appendToGeneratedScript(line);
          appendToGeneratedScript(
            `const pageHeight = page.viewportSize().height
            await page.setViewportSize({
            width: ${viewportWidth},
            height: pageHeight,
            isMobile: true,
          });`,
          );
        } else {
          appendToGeneratedScript(line);
        }
        continue;
      }

      if (line.trim().startsWith(`await page.goto(`)) {
        if (!firstGoToUrl) {
          firstGoToUrl = true;
          appendToGeneratedScript(
            `${line}
             await processPage(page);
            `
          ,);
          continue;
        } else {
          const regexURL = /(?<=goto\(\')(.*?)(?=\'\))/;
          const foundURL = line.match(regexURL)[0];
          const withoutParamsURL = foundURL.split('?')[0];
          lastGoToUrl = withoutParamsURL;
          continue;
        }
      } else if (lastGoToUrl) {
        appendToGeneratedScript(`
          await page.waitForURL('${lastGoToUrl}**',{timeout: 60000});
          await processPage(page);
        `,
        );

        lastGoToUrl = null;

      } else if (nextStepNeedsProcessPage) {
        appendToGeneratedScript(`await processPage(page);`);
        nextStepNeedsProcessPage = false;
      }

      if (line.trim().includes('getBy') || line.trim().includes('click()')) {
        const lastIndex = line.lastIndexOf('.');
        const locator = line.substring(0, lastIndex);
        appendToGeneratedScript(
          ` (${locator}.count()>1)? [console.log('Please re-click the intended DOM element'), page.setDefaultTimeout(0)]:
          ${line}
        `,
        );

        nextStepNeedsProcessPage = true;
        continue;
      } else {
        nextStepNeedsProcessPage = false;
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
      
      if (line.trim() === `await browser.close();`) {
        appendToGeneratedScript(line);
        appendToGeneratedScript(block2);
        break;
      }

      appendToGeneratedScript(line);
    }

    console.log(` Browser closed. Replaying steps and running accessibility scan...\n`);

    await import(generatedScript);

  } catch (e) {
    console.error(`Error: ${e}`);
    throw e;
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

    console.log(`\n You may re-run the recorded steps by executing:\n\tnode ${generatedScript} \n`);

  }

};

export default playwrightAxeGenerator;
