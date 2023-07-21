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

// Do NOT remove. These import statements will be used when the custom flow scan is run from the GUI app
import { chromium, webkit } from 'playwright';
import { createCrawleeSubFolders, runAxeScript } from '#root/crawlers/commonCrawlerFunc.js';
import { generateArtifacts } from '#root/mergeAxeResults.js';
import {
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
  createScreenshotsFolder,
} from '#root/utils.js';
import constants, {
  intermediateScreenshotsPath,
  getExecutablePath,
  removeQuarantineFlag,
} from '#root/constants/constants.js';
import { isSkippedUrl, submitFormViaPlaywright } from '#root/constants/common.js';
import { spawnSync } from 'child_process';
import { getDefaultChromeDataDir, getDefaultEdgeDataDir } from './constants/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const playwrightAxeGenerator = async data => {
  const blacklistedPatternsFilename = 'exclusions.txt';
  let blacklistedPatterns = null;

  if (fs.existsSync(blacklistedPatternsFilename)) {
    blacklistedPatterns = fs.readFileSync(blacklistedPatternsFilename).toString().split('\n');

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

  let { isHeadless, randomToken, deviceChosen, customDevice, viewportWidth, customFlowLabel } = data;
  // these will be appended to the generated script if the scan is run from CLI/index.
  // this is so as the final generated script can be rerun after the scan.
  const importStatements = `
    import { chromium, devices, webkit } from 'playwright';
    import { createCrawleeSubFolders, runAxeScript } from '#root/crawlers/commonCrawlerFunc.js';
    import { generateArtifacts } from '#root/mergeAxeResults.js';
    import { createAndUpdateResultsFolders, createDetailsAndLogs, createScreenshotsFolder } from '#root/utils.js';
    import constants, { intermediateScreenshotsPath, getExecutablePath, removeQuarantineFlag } from '#root/constants/constants.js';
    import fs from 'fs';
    import path from 'path';
    import { isSkippedUrl, submitFormViaPlaywright } from '#root/constants/common.js';
    import { spawnSync } from 'child_process';
    import safe from 'safe-regex';
    import { consoleLogger, silentLogger } from '#root/logs.js';

  `;
  const block1 = `const blacklistedPatternsFilename = 'exclusions.txt';

process.env.CRAWLEE_STORAGE_DIR = '${randomToken}';
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
    requestUrl: '${data.url}',
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
          await page.waitForLoadState('domcontentloaded'); 

          const result = await page.evaluate((prevHeight) => {
              const currentHeight = document.body.scrollHeight;
              return (currentHeight > prevHeight);
          }, prevHeight);

          resolve(result);
        }, 5000);
      });
    }

    const result = await isLoadMoreContent();
    return result;
  };

  if (await usesInfiniteScroll()){
    pageUrl = page.url();
    consoleLogger.info('Screenshot page at: ', pageUrl);
    silentLogger.info('Screenshot page at: ', pageUrl);
	
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
  const result = await runAxeScript(page);
  await dataset.pushData(result);
  urlsCrawled.scanned.push({ url: page.url(), pageTitle: result.pageTitle });
}


const processPage = async page => {
  try {
		await page.waitForLoadState('networkidle', {'timeout': 10000 });
  } catch (e) {
    consoleLogger.info('Unable to detect networkidle');
    silentLogger.info('Unable to detect networkidle');
  }
  
  consoleLogger.info('Visiting page at: ',page.url());
  silentLogger.info('Visiting page at: ',page.url());
  
  if (blacklistedPatterns && isSkippedUrl(page, blacklistedPatterns)) {
	return;
  } else {
	const scanRequired = await checkIfScanRequired(page);
	
	if (scanRequired) {
		await runAxeScan(page);
	}
  }
  

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
            const basicFormHTMLSnippet = await generateArtifacts('${randomToken}', '${
    data.url
  }', 'Customized', '${
    viewportWidth
      ? `CustomWidth_${viewportWidth}px`
      : customDevice
      ? customDevice
      : deviceChosen
      ? deviceChosen
      : 'Desktop'
  }', 
  urlsCrawled.scanned, 
  '${customFlowLabel}');

  await submitFormViaPlaywright(
    "${data.browser}",
    "${data.userDataDirectory}",
    "${data.url}",
    "${data.type}",
    // nameEmail = name:email
    "${data.nameEmail.split(':')[1]}", 
    "${data.nameEmail.split(':')[0]}",
    JSON.stringify(basicFormHTMLSnippet),
  );
        });
        `;

  let tmpDir;
  const appPrefix = 'purple-hats';

  if (!fs.existsSync('./custom_flow_scripts')) {
    fs.mkdirSync('./custom_flow_scripts');
  }

  const generatedScript = `./custom_flow_scripts/generatedScript-${randomToken}.js`;

  console.log(
    ` ℹ️  A new browser will be launched shortly.\n Navigate and record custom steps for ${data.url} in the new browser.\n Close the browser when you are done recording your steps.`,
  );

  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));

    let browser = 'webkit';
    let userAgentOpts = null;
    let channel = null;

    // Performance workaround for macOS Big Sur and Windows to force Chromium browser instead of Webkit
    if (
      (os.platform() === 'darwin' && os.release().startsWith('20.')) ||
      os.platform() === 'win32'
    ) {
      browser = 'chromium';

      if (deviceChosen === 'Mobile') {
        customDevice = 'iPhone 11';
      }

      if (customDevice && !viewportWidth) {
        viewportWidth = devices[customDevice].viewport.width;
        userAgentOpts = `--user-agent \"${devices[customDevice].userAgent}\"`;
      }
    }

    if (os.platform() === 'win32' && getDefaultChromeDataDir()) {
      channel = 'chrome';
    }

    let codegenCmd = `npx playwright codegen --target javascript -o "${tmpDir}/intermediateScript.js" "${data.url}"`;
    let extraCodegenOpts = `${userAgentOpts} --browser ${browser} --block-service-workers --ignore-https-errors ${
      channel && `--channel ${channel}`
    }`;

    if (viewportWidth || customDevice === 'Specify viewport') {
      codegenCmd = `${codegenCmd} --viewport-size=${viewportWidth},720 ${extraCodegenOpts}`;
    } else if (deviceChosen === 'Mobile') {
      codegenCmd = `${codegenCmd} --device="iPhone 11" ${extraCodegenOpts}`;
    } else if (!customDevice || customDevice === 'Desktop' || deviceChosen === 'Desktop') {
      codegenCmd = `${codegenCmd} ${extraCodegenOpts}`;
    } else if (customDevice === 'Samsung Galaxy S9+') {
      codegenCmd = `${codegenCmd} --device="Galaxy S9+" ${extraCodegenOpts}`;
    } else if (customDevice) {
      codegenCmd = `${codegenCmd} --device="${customDevice}" ${extraCodegenOpts}`;
    } else {
      console.error(
        `Error: Unable to parse device requested for scan. Please check the input parameters.`,
      );
    }

    const codegenResult = execSync(codegenCmd, { cwd: __dirname });

    if (codegenResult.toString()) {
      console.error(`Error running Codegen: ${codegenResult.toString()}`);
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

    // used when running a scan on a machine with proxy
    let awaitingProxyLogin = false;
    let secondGotoMicrosoftLoginSeen = false;

    if (!process.env.RUNNING_FROM_PH_GUI) {
      appendToGeneratedScript(importStatements);
    }

    for await (let line of rl) {
      if (/page\d.close\(\)/.test(line.trim())) {
        const handleUndefinedPageBlock = `try{
            ${line}
          } catch(err){
            console.log(err)
          }`;
        appendToGeneratedScript(handleUndefinedPageBlock);
        continue;
      }

      if (
        line.trim() === `const { chromium } = require('playwright');` ||
        line.trim() === `const { webkit } = require('playwright');` ||
        line.trim() === `const { chromium, devices } = require('playwright');` ||
        line.trim() === `const { webkit, devices } = require('playwright');`
      ) {
        appendToGeneratedScript(block1);
        continue;
      }
      if (line.trim() === `headless: false`) {
        if (proxy) {
          appendToGeneratedScript(`slowMo: 100,`);
          if (proxy.type === 'autoConfig') {
            appendToGeneratedScript(`args: ['--proxy-pac-url=${proxy.url}'],`);
          } else {
            appendToGeneratedScript(`args: ['--proxy-server=${proxy.url}'],`);
          }
        }
        if (!proxy && isHeadless) {
          appendToGeneratedScript(`headless: true`);
          continue;
        }
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

      let pageObj = 'page';

      if (line.trim().startsWith(`await page`)) {
        const regexPageObj = /(?<=await )(.*?)(?=\.)/;
        pageObj = line.match(regexPageObj)[0];
      }

      if (proxy && line.trim().startsWith(`await page.goto('https://login.microsoftonline.com/`)) {
        if (!awaitingProxyLogin) {
          awaitingProxyLogin = true;
          continue;
        } else if (!secondGotoMicrosoftLoginSeen) {
          secondGotoMicrosoftLoginSeen = true;
          continue;
        }
      }

      if (awaitingProxyLogin) {
        if (line.trim().startsWith(`await page.goto('${data.url}`)) {
          awaitingProxyLogin = false;
        } else {
          continue;
        }
      }

      if (line.trim().includes(`.goto(`)) {
        if (!firstGoToUrl) {
          if (line.trim().startsWith(`await page.goto('https://login.singpass.gov.sg`)) {
            continue;
          }
          firstGoToUrl = true;
          const firstGoToAddress = line.split(`('`)[1].split(`')`)[0];
          appendToGeneratedScript(
            `${line}
            await page.waitForURL('${firstGoToAddress}', {timeout: 60000});
             await processPage(page);
            `,
          );
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
          await ${pageObj}.waitForURL('${lastGoToUrl}**',{timeout: 60000});
          await processPage(page);
        `);

        lastGoToUrl = null;
      } else if (nextStepNeedsProcessPage) {
        appendToGeneratedScript(`await processPage(page);`);
        nextStepNeedsProcessPage = false;
      }

      if (
        (line.trim().includes('getBy') && !line.trim().includes('getByPlaceholder')) ||
        line.trim().includes('click()')
      ) {
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

      if (line.trim() === `await browser.close();`) {
        appendToGeneratedScript(line);
        appendToGeneratedScript(block2);
        break;
      }

      appendToGeneratedScript(line);
    }

    fileStream.destroy();
    console.log(` Browser closed. Replaying steps and running accessibility scan...\n`);

    if (process.env.RUNNING_FROM_PH_GUI) {
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
    } else {
      await import(generatedScript);
    }
  } catch (e) {
    console.error(`Error: ${e}`);
    throw e;
  } finally {
    try {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error(
        `An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`,
      );
    }

    if (!process.env.RUNNING_FROM_PH_GUI) {
      console.log(
        `\n You may re-run the recorded steps by executing:\n\tnode ${generatedScript} \n`,
      );
    }
  }
};

export default playwrightAxeGenerator;
