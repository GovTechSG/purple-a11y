import fs from 'fs';
import { chromium } from 'playwright';
import printMessage from 'print-message';
import {
  createCrawleeSubFolders,
  runAxeScript,
} from './commonCrawlerFunc.js';
import { guiInfoStatusTypes } from '../constants/constants.js';
import { getPlaywrightLaunchOptions, messageOptions } from '../constants/common.js';
import { guiInfoLog } from '../logs.js';

const scanPage = async (
  filePath,
  randomToken,
  viewportSettings,
  browser,
  userDataDirectory,
  includeScreenshots,
) => {
  let dataset;
  let urlsCrawled = { scanned: [], error: [] };

  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create Crawlee subfolders for the scan
    ({ dataset } = await createCrawleeSubFolders(randomToken));

    // Configure browser launch options
    const launchOptions = getPlaywrightLaunchOptions(browser);
    const { playwrightDeviceDetailsObject } = viewportSettings;

    printMessage(['Launching browser and loading file...'], messageOptions);

    // Launch the browser
    const browser = await constants.launcher.launch({
      ...launchOptions,
      userDataDir: userDataDirectory || '',
    });

    // Create a new page
    const page = await browser.newPage({
      ...playwrightDeviceDetailsObject,
    });

    // Load the local HTML file
    await page.goto(`file://${filePath}`);

    printMessage(['File loaded. Beginning scan...'], messageOptions);

    // Run the axe script on the page
    const results = await runAxeScript(includeScreenshots, page, randomToken);

    // Close the browser
    await browser.close();

    // Log the scan status
    guiInfoLog(guiInfoStatusTypes.SCANNED, {
      numScanned: 1,
      urlScanned: filePath,
    });

    // Save the scan results to the dataset
    await dataset.pushData(results);

    // Update the urlsCrawled object
    urlsCrawled.scanned.push({ url: filePath, pageTitle: results.pageTitle });

    printMessage(['Scan completed.'], messageOptions);

    // Return the urlsCrawled object
    return urlsCrawled;
  } catch (error) {
    // Log the error
    guiInfoLog(guiInfoStatusTypes.ERROR, {
      numScanned: 0,
      urlScanned: filePath,
    });
    console.error(`Error scanning page: ${error.message}`);

    // Update the urlsCrawled object with the error
    urlsCrawled.error.push({ url: filePath });

    // Return the urlsCrawled object
    return urlsCrawled;
  } finally {
    // Log completion status
    guiInfoLog(guiInfoStatusTypes.COMPLETED);
  }
};

export default crawlPage;