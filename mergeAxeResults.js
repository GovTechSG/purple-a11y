/* eslint-disable consistent-return */
/* eslint-disable no-console */
import os from 'os';
import fs from 'fs-extra';
import printMessage from 'print-message';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import constants from './constants/constants.js';
import { getCurrentTime, getStoragePath, getVersion } from './utils.js';
import { consoleLogger, silentLogger } from './logs.js';
import itemTypeDescription from './constants/itemTypeDescription.js';
import { chromium } from 'playwright';
import { createWriteStream } from 'fs';
import { AsyncParser } from '@json2csv/node';
import crypto from 'crypto';
import { purpleAiHtmlETL, purpleAiRules } from './constants/purpleAi.js';

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
      `${storagePath}/reports/passed_items.json.txt`,
      JSON.stringify(passedItemsJson, null, 4),
    );
  } catch (writeResultsError) {
    consoleLogger.info(
      'An error has occurred when compiling the results into the report, please try again.',
    );
    silentLogger.error(`(writeResults) - ${writeResultsError}`);
  }
};

const writeCsv = async (allIssues, storagePath) => {
  const csvOutput = createWriteStream(`${storagePath}/reports/report.csv`, { encoding: 'utf8' });
  const formatPageViolation = pageNum => {
    if (pageNum < 0) return 'Document';
    return `Page ${pageNum}`;
  };

  // transform allIssues into the form:
  // [['mustFix', rule1], ['mustFix', rule2], ['goodToFix', rule3], ...]
  const getRulesByCategory = (allIssues) => {
    return Object.entries(allIssues.items)
      .filter(([category]) => category !== 'passed')
      .reduce((prev, [category, value]) => {
        const rules = value.rules;
        for (let rule of rules) {
          prev.push([category, rule]);
        }
        return prev;
      }, [])
      .sort((a, b) => { // sort rules according to severity, then ruleId
        const compareCategory = -(a[0].localeCompare(b[0])); 
        return compareCategory === 0
          ? a[1].rule.localeCompare(b[1].rule)
          : compareCategory;
      });
  };
  const flattenRule = ([severity, rule]) => {
    const results = [];
    const {
      rule: issueId,
      description: issueDescription,
      conformance,
      pagesAffected,
      helpUrl: learnMore
    } = rule;
    // we filter out the below as it represents the A/AA/AAA level, not the clause itself
    const clausesArr = conformance.filter(
      clause => !['wcag2a', 'wcag2aa', 'wcag2aaa'].includes(clause),
    );
    pagesAffected.sort((a, b) => a.url.localeCompare(b.url));
    // format clauses as a string
    const wcagConformance = clausesArr.join(',');
    for (let page of pagesAffected) {
      const { url, items } = page;
      items.forEach(item => {
        const { html, page, message } = item;
        const howToFix = message.replace(/(\r\n|\n|\r)/g, ' '); // remove newlines

        // page is a number, not string
        const violation = html ? html : formatPageViolation(page);
        const context = violation.replace(/(\r\n|\n|\r)/g, ''); // remove newlines
        results.push({
          severity,
          issueId,
          issueDescription,
          wcagConformance,
          url,
          context,
          howToFix,
          learnMore,
        });
      })
    }
    if (results.length === 0) return {};
    return results;
  };
  const opts = {
    transforms: [getRulesByCategory, flattenRule],
  };
  const parser = new AsyncParser(opts);
  parser.parse(allIssues).pipe(csvOutput);
};

const writeHTML = async (
  allIssues,
  storagePath,
  scanType,
  customFlowLabel,
  htmlFilename = 'report',
) => {
  const ejsString = fs.readFileSync(path.join(__dirname, './static/ejs/report.ejs'), 'utf-8');
  const template = ejs.compile(ejsString, {
    filename: path.join(__dirname, './static/ejs/report.ejs'),
  });
  const html = template(allIssues);
  fs.writeFileSync(`${storagePath}/reports/${htmlFilename}.html`, html);
};

const writeSummaryHTML = async (
  allIssues,
  storagePath,
  scanType,
  customFlowLabel,
  htmlFilename = 'summary',
) => {
  const ejsString = fs.readFileSync(path.join(__dirname, './static/ejs/summary.ejs'), 'utf-8');
  const template = ejs.compile(ejsString, {
    filename: path.join(__dirname, './static/ejs/summary.ejs'),
  });
  const html = template(allIssues);
  fs.writeFileSync(`${storagePath}/reports/${htmlFilename}.html`, html);
};

let browserChannel = 'chrome';

if (os.platform() === 'win32') {
  browserChannel = 'msedge';
}

if (os.platform() === 'linux') {
  browserChannel = 'chromium';
}

const writeSummaryPdf = async (htmlFilePath, fileDestinationPath) => {
  const browser = await chromium.launch({
    headless: true,
    channel: browserChannel,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
  });

  const page = await context.newPage();

  const data = fs.readFileSync(htmlFilePath, { encoding: 'utf-8' });
  await page.setContent(data);
  // fs.readFile(htmlFilePath, 'utf8', async (err, data) => {
  //   await page.setContent(data);
  // });

  await page.waitForLoadState('networkidle', { timeout: 10000 });

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

  fs.unlinkSync(htmlFilePath);
};

const pushResults = async (pageResults, allIssues) => {
  const { url, pageTitle, filePath } = pageResults;

  allIssues.totalPagesScanned += 1;

  const totalIssuesInPage = new Set();
  Object.keys(pageResults.mustFix.rules).forEach(k => totalIssuesInPage.add(k));
  Object.keys(pageResults.goodToFix.rules).forEach(k => totalIssuesInPage.add(k));
  allIssues.topFiveMostIssues.push({ url, pageTitle, totalIssues: totalIssuesInPage.size });

  ['mustFix', 'goodToFix', 'passed'].forEach(category => {
    if (!pageResults[category]) return;
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
          // numberOfPagesAffectedAfterRedirects: 0,
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
        currRuleFromAllIssues.pagesAffected[url] = { 
          pageTitle,
          items: [],
          ...(filePath && { filePath }),
        };
        /*if (actualUrl) {
          currRuleFromAllIssues.pagesAffected[url].actualUrl = actualUrl;
          // Deduct duplication count from totalItems
          currRuleFromAllIssues.totalItems -= 1;
          // Previously using pagesAffected.length to display no. of pages affected
          // However, since pagesAffected array contains duplicates, we need to deduct the duplicates
          // Hence, start with negative offset, will add pagesAffected.length later
          currRuleFromAllIssues.numberOfPagesAffectedAfterRedirects -= 1;
          currCategoryFromAllIssues.totalItems -= 1;
        }*/
      }

      currRuleFromAllIssues.pagesAffected[url].items.push(...items);
      // currRuleFromAllIssues.numberOfPagesAffectedAfterRedirects +=
      //   currRuleFromAllIssues.pagesAffected.length;
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

const createRuleIdJson = allIssues => {
  const compiledRuleJson = {};

  const ruleIterator = rule => {
    const ruleId = rule.rule;
    let snippets = [];

    if (purpleAiRules.includes(ruleId)) {
      const snippetsSet = new Set();
      rule.pagesAffected.forEach(page => {
        page.items.forEach(htmlItem => {
          snippetsSet.add(purpleAiHtmlETL(htmlItem.html));
        });
      });
      snippets = [...snippetsSet];
    }
    compiledRuleJson[ruleId] = {
      snippets,
      occurrences: rule.totalItems,
    };
  };

  allIssues.items.mustFix.rules.forEach(ruleIterator);
  allIssues.items.goodToFix.rules.forEach(ruleIterator);

  return compiledRuleJson;
};

const moveScreenshots = (randomToken, storagePath) => {
  const currentScreenshotsPath = `${randomToken}/elemScreenshots`; 
  const resultsScreenshotsPath = `${storagePath}/reports/elemScreenshots`;
  if (fs.existsSync(currentScreenshotsPath)) {
    fs.moveSync(currentScreenshotsPath, resultsScreenshotsPath); 
  }
}

export const generateArtifacts = async (
  randomToken,
  urlScanned,
  scanType,
  viewport,
  pagesScanned,
  pagesNotScanned,
  customFlowLabel,
  browserToRun
) => {
  const phAppVersion = getVersion();
  const storagePath = getStoragePath(randomToken);
  const directory = `${storagePath}/${constants.allIssueFileName}`;
  const allIssues = {
    storagePath,
    purpleAi: {
      htmlETL: purpleAiHtmlETL,
      rules: purpleAiRules,
    },
    startTime: getCurrentTime(),
    urlScanned,
    scanType,
    viewport,
    pagesScanned,
    pagesNotScanned,
    totalPagesScanned: 0,
    totalPagesNotScanned: pagesNotScanned.length,
    totalItems: 0,
    topFiveMostIssues: [],
    wcagViolations: new Set(),
    customFlowLabel,
    phAppVersion,
    items: {
      mustFix: { description: itemTypeDescription.mustFix, totalItems: 0, rules: {} },
      goodToFix: { description: itemTypeDescription.goodToFix, totalItems: 0, rules: {} },
      passed: { description: itemTypeDescription.passed, totalItems: 0, rules: {} },
    },
  };
  const allFiles = await extractFileNames(directory);

  const jsonArray = await Promise.all(
    allFiles.map(async file => parseContentToJson(`${directory}/${file}`)),
  );

  await Promise.all(
    jsonArray.map(async pageResults => {
      await pushResults(pageResults, allIssues);
    }),
  ).catch(flattenIssuesError => {
    consoleLogger.info('An error has occurred when flattening the issues, please try again.');
    silentLogger.error(flattenIssuesError.stack);
  });

  flattenAndSortResults(allIssues);

  allIssues.totalPages = allIssues.totalPagesScanned + allIssues.totalPagesNotScanned;

  printMessage([
    'Scan Summary',
    '',
    `Must Fix: ${allIssues.items.mustFix.rules.length} issues / ${allIssues.items.mustFix.totalItems} occurrences`,
    `Good to Fix: ${allIssues.items.goodToFix.rules.length} issues / ${allIssues.items.goodToFix.totalItems} occurrences`,
    `Passed: ${allIssues.items.passed.totalItems} occurrences`,
  ]);

  // move screenshots folder to report folders
  moveScreenshots(randomToken, storagePath); 

  const htmlFilename = `${storagePath}/reports/summary.html`;
  const fileDestinationPath = `${storagePath}/reports/summary.pdf`;
  await writeResults(allIssues, storagePath);
  await writeCsv(allIssues, storagePath);
  await writeHTML(allIssues, storagePath, scanType, customFlowLabel);
  await writeSummaryHTML(allIssues, storagePath, scanType, customFlowLabel);
  await writeSummaryPdf(htmlFilename, fileDestinationPath);
  return createRuleIdJson(allIssues);
};
