import fs from 'fs';
import path from 'path';
import printMessage from 'print-message';
import { fileURLToPath } from 'url';
import constants from './constants/constants.js';
import { submitForm } from './constants/common.js'
import { createCrawleeSubFolders, filterAxeResults } from './crawlers/commonCrawlerFunc.js';
import {
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
} from './utils.js';
import { generateArtifacts } from './mergeAxeResults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const init = async (entryUrl, customFlowLabelTestString, name = "Your Name", email = "email@domain.com", needsReview = false, thresholds=undefined) => {
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
    crawlType: 'Customized',
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
    async function runA11yScan(elements = []) {
      axe.configure({
        branding: {
          application: 'purple-hats',
        },
      });
      const axeScanResults = await axe.run(elements, {
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

  const pushScanResults = async res => {
    throwErrorIfTerminated();
    const filteredResults = filterAxeResults(needsReview, res.axeScanResults, res.pageTitle);
    urlsCrawled.scanned.push({ url: res.pageUrl, pageTitle: res.pageTitle });

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
      const basicFormHTMLSnippet = await generateArtifacts(
        randomToken,
        scanDetails.requestUrl,
        scanDetails.crawlType,
        null,
        scanDetails.urlsCrawled.scanned,
        pagesNotScanned,
        customFlowLabelTestString,
      );

      // await submitForm(
      //   constants.browserTypes.chromium,
      //   '',
      //   scanDetails.requestUrl,
      //   scanDetails.crawlType,
      //   email,
      //   name,
      //   JSON.stringify(basicFormHTMLSnippet),
      //   urlsCrawled.scanned.length,
      //   "{}",
      // );

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