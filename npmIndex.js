import fs from 'fs';
import path from 'path';
import printMessage from 'print-message';
import { fileURLToPath } from 'url';
import constants from './constants/constants.js';
import { createCrawleeSubFolders, filterAxeResults } from './crawlers/commonCrawlerFunc.js';
import {
  cleanUp,
  createAndUpdateResultsFolders,
  createDetailsAndLogs,
  getStoragePath,
} from './utils.js';
import { generateArtifacts } from './mergeAxeResults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const init = async (entryUrl, customFlowLabelTestString) => {
  console.log('Starting Purple HATS');

  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');
  const domain = new URL(entryUrl).hostname;

  const randomToken = `PHScan_${domain}_${date}_${time}_IntegratedScan`;

  process.env.CRAWLEE_STORAGE_DIR = randomToken;

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: 'Customized',
    requestUrl: entryUrl,
    urlsCrawled: { ...constants.urlsCrawledObj },
  };

  const urlsCrawled = { ...constants.urlsCrawledObj };

  const { dataset } = await createCrawleeSubFolders(randomToken);

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
    const filteredResults = filterAxeResults(res.axeScanResults, res.pageTitle);
    urlsCrawled.scanned.push({ url: res.pageUrl, pageTitle: res.pageTitle });
    await dataset.pushData(filteredResults);
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
      await generateArtifacts(
        randomToken,
        scanDetails.requestUrl,
        scanDetails.crawlType,
        null,
        scanDetails.urlsCrawled.scanned,
        customFlowLabelTestString,
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
  };
};

export default init;
