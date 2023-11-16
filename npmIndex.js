import fs from 'fs';
import path from 'path';
import printMessage from 'print-message';
import { fileURLToPath } from 'url';
import constants from './constants/constants.js';
import { 
  deleteClonedProfiles, 
  getBrowserToRun, 
  getPlaywrightLaunchOptions, 
  submitForm 
} from './constants/common.js'
import { createCrawleeSubFolders, filterAxeResults } from './crawlers/commonCrawlerFunc.js';
import {
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
} from './utils.js';
import { generateArtifacts } from './mergeAxeResults.js';
import { takeScreenshotForHTMLElements } from './screenshotFunc/htmlScreenshotFunc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const init = async (
  entryUrl, 
  customFlowLabelTestString, 
  name = "Your Name", 
  email = "email@domain.com", 
  needsReview = false, 
  includeScreenshots = false, 
  viewportSettings = { width: 1000, height: 660 }, // cypress' default viewport settings
  thresholds = undefined, 
  scanAboutMetadata = undefined, 
) => {
  console.log('Starting Purple HATS');

  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');
  const domain = new URL(entryUrl).hostname;
  const sanitisedLabel = customFlowLabelTestString
    ? `_${customFlowLabelTestString.replaceAll(' ', '_')}`
    : '';
  const randomToken = `${date}_${time}${sanitisedLabel}_${domain}`;

  // max numbers of mustFix/goodToFix occurrences before test returns a fail
  const mustFixThreshold = thresholds ? thresholds.mustFix : undefined;
  const goodToFixThreshold = thresholds ? thresholds.goodToFix : undefined;

  process.env.CRAWLEE_STORAGE_DIR = randomToken;

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: 'Custom',
    requestUrl: entryUrl,
    urlsCrawled: { ...constants.urlsCrawledObj },
  };

  const urlsCrawled = { ...constants.urlsCrawledObj };

  const { dataset } = await createCrawleeSubFolders(randomToken);

  let mustFixIssues = 0;
  let goodToFixIssues = 0;

  let isInstanceTerminated = false;
  let numPagesScanned = 0;

  const throwErrorIfTerminated = () => {
    if (isInstanceTerminated) {
      throw new Error('This instance of Purple HATS was terminated. Please start a new instance.');
    }
  };

  const getScripts = () => {
    throwErrorIfTerminated();
    const axeScript = fs.readFileSync(
      path.join(__dirname, 'node_modules/axe-core/axe.min.js'),
      'utf-8',
    );
    async function runA11yScan(elementsToScan = []) {
      axe.configure({
        branding: {
          application: 'purple-hats',
        },
      });
      const axeScanResults = await axe.run(elementsToScan, {
        resultTypes: ['violations', 'passes', 'incomplete'],
      });
      return {
        pageUrl: window.location.href,
        pageTitle: document.title,
        axeScanResults,
      };
    }
    return `${axeScript} ${runA11yScan.toString()}`;
  };

  const pushScanResults = async (res, metadata, elementsToClick) => {
    throwErrorIfTerminated();
    if (includeScreenshots) {
      // use chrome by default
      const { browserToRun, clonedBrowserDataDir } = getBrowserToRun(constants.browserTypes.chrome); 
      const browserContext = await constants.launcher.launchPersistentContext(
        clonedBrowserDataDir, 
        { viewport: scanAboutMetadata.viewport, 
          headless: false,
          ...getPlaywrightLaunchOptions(browserToRun)}
      );
      const page = await browserContext.newPage(); 
      await page.goto(res.pageUrl);
      await page.waitForLoadState('networkidle'); 

      // click on elements to reveal hidden elements so screenshots can be taken 
      elementsToClick?.forEach(async elem => await page.locator(elem).click());

      res.axeScanResults.violations = await takeScreenshotForHTMLElements(res.axeScanResults.violations, page, randomToken, 3000);
      if (needsReview) res.axeScanResults.incomplete = await takeScreenshotForHTMLElements(res.axeScanResults.incomplete, page, randomToken, 3000);  

      await browserContext.close();
      deleteClonedProfiles(browserToRun);
    }
    const pageIndex = urlsCrawled.scanned.length + 1; 
    const filteredResults = filterAxeResults(needsReview, res.axeScanResults, res.pageTitle, { pageIndex , metadata });
    urlsCrawled.scanned.push({ url: res.pageUrl, pageTitle: `${pageIndex}: ${res.pageTitle}` });

    mustFixIssues += filteredResults.mustFix ? filteredResults.mustFix.totalItems : 0;
    goodToFixIssues += filteredResults.goodToFix ? filteredResults.goodToFix.totalItems : 0;
    await dataset.pushData(filteredResults);

    // return counts for users to perform custom assertions if needed
    return {
      mustFix: filteredResults.mustFix ? filteredResults.mustFix.totalItems : 0,
      goodToFix: filteredResults.goodToFix ? filteredResults.goodToFix.totalItems : 0,
    };
  };

  const testThresholdsAndReset = () => {
    // check against thresholds to fail tests
    let isThresholdExceeded = false;
    let thresholdFailMessage = "Exceeded thresholds:\n";
    if (mustFixThreshold !== undefined && mustFixIssues > mustFixThreshold) {
      isThresholdExceeded = true;
      thresholdFailMessage += `mustFix occurrences found: ${mustFixIssues} > ${mustFixThreshold}\n`;
    }

    if (goodToFixThreshold !== undefined && goodToFixIssues > goodToFixThreshold) {
      isThresholdExceeded = true;
      thresholdFailMessage += `goodToFix occurrences found: ${goodToFixIssues} > ${goodToFixThreshold}\n`;
    }

    // reset counts
    mustFixIssues = 0;
    goodToFixIssues = 0;

    if (isThresholdExceeded) {
      throw new Error(thresholdFailMessage);
    }
  };

  const terminate = async () => {
    throwErrorIfTerminated();
    console.log('Stopping Purple HATS');
    isInstanceTerminated = true;
    scanDetails.endTime = new Date().getTime();
    scanDetails.urlsCrawled = urlsCrawled;

    if (urlsCrawled.scanned.length === 0) {
      printMessage([`No pages were scanned.`], constants.alertMessageOptions);
    } else {
      await createDetailsAndLogs(scanDetails, randomToken);
      await createAndUpdateResultsFolders(randomToken);
      const pagesNotScanned = [...scanDetails.urlsCrawled.error, ...scanDetails.urlsCrawled.invalid];
      scanAboutMetadata = {
        viewport: `${viewportSettings.width} x ${viewportSettings.height}`, 
        ...scanAboutMetadata
      };
      const basicFormHTMLSnippet = await generateArtifacts(
        randomToken,
        scanDetails.requestUrl,
        scanDetails.crawlType,
        null,
        scanDetails.urlsCrawled.scanned,
        pagesNotScanned,
        customFlowLabelTestString,
        scanAboutMetadata
      );

      await submitForm(
        constants.browserTypes.chromium,
        '',
        scanDetails.requestUrl,
        scanDetails.crawlType,
        email,
        name,
        JSON.stringify(basicFormHTMLSnippet),
        urlsCrawled.scanned.length,
        "{}",
      );

    }

    return null;
  };

  return {
    getScripts,
    pushScanResults,
    terminate,
    scanDetails,
    randomToken,
    testThresholdsAndReset,
  };
};

export default init