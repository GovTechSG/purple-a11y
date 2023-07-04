/* eslint-disable consistent-return */
/* eslint-disable no-console */
import fs from 'fs-extra';
import printMessage from 'print-message';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import constants from './constants/constants.js';
import { getCurrentTime, getStoragePath } from './utils.js';
import { consoleLogger, silentLogger } from './logs.js';
import itemTypeDescription from './constants/itemTypeDescription.js';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extractFileNames = async directory =>
  fs
    .readdir(directory)
    .then(allFiles => allFiles.filter(file => path.extname(file).toLowerCase() === '.json'))
    .catch(readdirError => {
      consoleLogger.info('An error has occurred when retrieving files, please try again.');
      silentLogger.error(`(extractFileNames) - ${readdirError}`);
    });

const parseContentToJson = async rPath =>
  fs
    .readFile(rPath, 'utf8')
    .then(content => JSON.parse(content))
    .catch(parseError => {
      consoleLogger.info('An error has occurred when parsing the content, please try again.');
      silentLogger.error(`(parseContentToJson) - ${parseError}`);
    });

const writeResults = async (allissues, storagePath, jsonFilename = 'compiledResults') => {
  const finalResultsInJson = JSON.stringify(allissues, null, 4);

  const passedItemsJson = {};

  allissues.items.passed.rules.forEach(r => {
    passedItemsJson[r.description] = {
      totalOccurrencesInScan: r.totalItems,
      totalPages: r.pagesAffected.length,
      pages: r.pagesAffected.map(p => ({
        pageTitle: p.pageTitle,
        url: p.url,
        totalOccurrencesInPage: p.items.length,
        occurrences: p.items,
      })),
    };
  });

  try {
    await fs.writeFile(`${storagePath}/reports/${jsonFilename}.json`, finalResultsInJson);
    await fs.writeFile(
      `${storagePath}/reports/passed_items.json`,
      JSON.stringify(passedItemsJson, null, 4),
    );
  } catch (writeResultsError) {
    consoleLogger.info(
      'An error has occurred when compiling the results into the report, please try again.',
    );
    silentLogger.error(`(writeResults) - ${writeResultsError}`);
  }
};

const writeHTML = async (allIssues, storagePath, htmlFilename = 'report') => {
  const ejsString = fs.readFileSync(path.join(__dirname, './static/ejs/report.ejs'), 'utf-8');
  const template = ejs.compile(ejsString, {
    filename: path.join(__dirname, './static/ejs/report.ejs'),
  });
  const html = template(allIssues);
  fs.writeFileSync(`${storagePath}/reports/${htmlFilename}.html`, html);
};

const writeSummaryHTML = async (allIssues, storagePath, htmlFilename = 'summary') => {
  const ejsString = fs.readFileSync(path.join(__dirname, './static/ejs/summary.ejs'), 'utf-8');
  const template = ejs.compile(ejsString, {
    filename: path.join(__dirname, './static/ejs/summary.ejs'),
  });
  const html = template(allIssues);
  fs.writeFileSync(`${storagePath}/reports/${htmlFilename}.html`, html);
};

const writeSummaryPdf = async (htmlFilePath, fileDestinationPath) => {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
  });

  const page = await context.newPage();

  fs.readFile(htmlFilePath, 'utf8', async (err, data) => {
    await page.setContent(data);
  });

  await page.waitForLoadState('networkidle', {'timeout': 10000 });

    await page.emulateMedia({ media: 'print' });

    await page.pdf({
    margin: { bottom: '32px' },
    path: fileDestinationPath,
    format: 'A4',
    displayHeaderFooter: true,
    footerTemplate: `
    <div style="margin-top:50px;color:#333333;font-family:Open Sans;text-align: center;width: 100%;font-weight:400">
      <span style="color:#333333;font-size: 14px;font-weight:400">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `,
  });

  await page.close();

  await context.close();
  await browser.close();
};

const pushResults = async (rPath, allIssues) => {
  const pageResults = await parseContentToJson(rPath);
  const { url, pageTitle } = pageResults;

  allIssues.totalPagesScanned += 1;

  const totalIssuesInPage = new Set();
  Object.keys(pageResults.mustFix.rules).forEach(k => totalIssuesInPage.add(k));
  Object.keys(pageResults.goodToFix.rules).forEach(k => totalIssuesInPage.add(k));
  allIssues.topFiveMostIssues.push({ url, pageTitle, totalIssues: totalIssuesInPage.size });

  ['mustFix', 'goodToFix', 'passed'].forEach(category => {
    const { totalItems, rules } = pageResults[category];
    const currCategoryFromAllIssues = allIssues.items[category];

    currCategoryFromAllIssues.totalItems += totalItems;

    Object.keys(rules).forEach(rule => {
      const { description, helpUrl, conformance, totalItems: count, items } = rules[rule];

      if (!(rule in currCategoryFromAllIssues.rules)) {
        currCategoryFromAllIssues.rules[rule] = {
          description,
          helpUrl,
          conformance,
          totalItems: 0,
          pagesAffected: {},
        };
      }

      if (category !== 'passed') {
        conformance
          .filter(c => /wcag[0-9]{3,4}/.test(c))
          .forEach(c => allIssues.wcagViolations.add(c));
      }

      const currRuleFromAllIssues = currCategoryFromAllIssues.rules[rule];

      currRuleFromAllIssues.totalItems += count;

      if (!(url in currRuleFromAllIssues.pagesAffected)) {
        currRuleFromAllIssues.pagesAffected[url] = { pageTitle, items: [] };
      }

      currRuleFromAllIssues.pagesAffected[url].items.push(...items);
    });
  });
};

const flattenAndSortResults = allIssues => {
  ['mustFix', 'goodToFix', 'passed'].forEach(category => {
    allIssues.totalItems += allIssues.items[category].totalItems;
    allIssues.items[category].rules = Object.entries(allIssues.items[category].rules)
      .map(ruleEntry => {
        const [rule, ruleInfo] = ruleEntry;
        ruleInfo.pagesAffected = Object.entries(ruleInfo.pagesAffected)
          .map(pageEntry => {
            const [url, pageInfo] = pageEntry;
            return { url, ...pageInfo };
          })
          .sort((page1, page2) => page2.items.length - page1.items.length);
        return { rule, ...ruleInfo };
      })
      .sort((rule1, rule2) => rule2.totalItems - rule1.totalItems);
  });
  allIssues.topFiveMostIssues.sort((page1, page2) => page2.totalIssues - page1.totalIssues);
  allIssues.topFiveMostIssues = allIssues.topFiveMostIssues.slice(0, 5);
  // convert the set to an array
  allIssues.wcagViolations = Array.from(allIssues.wcagViolations);
};

export const generateArtifacts = async (randomToken, urlScanned, scanType, viewport) => {
  const storagePath = getStoragePath(randomToken);

  const directory = `${storagePath}/${constants.allIssueFileName}`;
  const allIssues = {
    startTime: getCurrentTime(),
    urlScanned,
    scanType,
    viewport,
    totalPagesScanned: 0,
    totalItems: 0,
    topFiveMostIssues: [],
    wcagViolations: new Set(),
    items: {
      mustFix: { description: itemTypeDescription.mustFix, totalItems: 0, rules: {} },
      goodToFix: { description: itemTypeDescription.goodToFix, totalItems: 0, rules: {} },
      passed: { description: itemTypeDescription.passed, totalItems: 0, rules: {} },
    },
  };

  const allFiles = await extractFileNames(directory);

  await Promise.all(
    allFiles.map(async file => {
      const rPath = `${directory}/${file}`;
      await pushResults(rPath, allIssues);
    }),
  ).catch(flattenIssuesError => {
    consoleLogger.info('An error has occurred when flattening the issues, please try again.');
    silentLogger.error(flattenIssuesError.stack);
  });

  flattenAndSortResults(allIssues);

  printMessage([
    'Scan Summary',
    '',
    `Must Fix: ${allIssues.items.mustFix.rules.length} issues / ${allIssues.items.mustFix.totalItems} occurrences`,
    `Good to Fix: ${allIssues.items.goodToFix.rules.length} issues / ${allIssues.items.goodToFix.totalItems} occurrences`,
    `Passed: ${allIssues.items.passed.totalItems} occurrences`,
  ]);

  const htmlFilename = `${storagePath}/reports/summary.html`;
  const fileDestinationPath = `${storagePath}/reports/summary.pdf`;
  await writeResults(allIssues, storagePath);
  await writeHTML(allIssues, storagePath);
  await writeSummaryHTML(allIssues, storagePath);
  await writeSummaryPdf(htmlFilename, fileDestinationPath);
};
