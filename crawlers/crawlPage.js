import { chromium } from 'playwright';
import { runAxeScript } from './commonCrawlerFunc.js';
import fs from 'fs';

/**
 * Scans a local HTML file for accessibility issues using Playwright and axe-core.
 * @param {string} filePath Path to the local HTML file.
 * @param {boolean} includeScreenshots Whether to include screenshots in the report.
 * @param {string} randomToken A token for dataset identification, if necessary.
 */
async function scanPage(filePath, includeScreenshots = false, randomToken = '') {
  if (!fs.existsSync(filePath)) {
      console.error('File does not exist:', filePath);
      return;
  }

  // Initialize Playwright browser and page
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Read the HTML file's content
  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  await page.setContent(htmlContent);

  // Run the axe-core accessibility scan
  const scanResults = await runAxeScript(page, includeScreenshots, randomToken);

  // Output scan results
  console.log('Accessibility scan results:', scanResults);

  // Close the browser
  await browser.close();
}

export default scanPage;
