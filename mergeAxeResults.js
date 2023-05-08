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
  const ejsString = fs.readFileSync('./static/ejs/report.ejs', 'utf-8');
  const template = ejs.compile(ejsString, { filename: './static/ejs/report.ejs' });
  const html = template(allIssues);
  fs.writeFileSync(`${storagePath}/reports/${htmlFilename}.html`, html);
};

// const granularReporting = async (randomToken, allIssues) => {
//   if (allIssues.length > 0) {
//     const storagePath = getStoragePath(randomToken);
//     const impactLevels = ['critical', 'serious', 'moderate', 'minor'];

//     let currentImpactLevelIssues;
//     impactLevels.forEach(async impactLevel => {
//       currentImpactLevelIssues = allIssues.filter(issue => issue.impact === impactLevel);

//       if (currentImpactLevelIssues.length > 0) {
//         const writeSeverityResult = writeResults(
//           currentImpactLevelIssues,
//           storagePath,
//           `compiledResults-${impactLevel}`,
//         );
//         const writeHTMLSeverityReport = writeHTML(
//           currentImpactLevelIssues,
//           storagePath,
//           `report-${impactLevel}`,
//         );
//         await Promise.all([writeSeverityResult, writeHTMLSeverityReport]);
//       }
//     });

//     return true;
//   }

//   return false;
// };

// const issueCountMap = allIssues => {
//   const criticalImpact = allIssues.filter(issue => issue.impact === 'critical');
//   const seriousImpact = allIssues.filter(issue => issue.impact === 'serious');
//   const moderateImpact = allIssues.filter(issue => issue.impact === 'moderate');
//   const minorImpact = allIssues.filter(issue => issue.impact === 'minor');

//   const issueCount = new Map();
//   issueCount.set('critical', criticalImpact.length);
//   issueCount.set('serious', seriousImpact.length);
//   issueCount.set('moderate', moderateImpact.length);
//   issueCount.set('minor', minorImpact.length);
//   issueCount.set('total', allIssues.length);

//   return issueCount;
// };

// const thresholdLimitCheck = async (warnLevel, allIssues, totalUniqueIssues) => {
//   const issueCounts = issueCountMap(allIssues);

//   const messages = [
//     [`Total Issues: ${issueCounts.get('total')}`, `Total Unique Issues: ${totalUniqueIssues}`],
//     [
//       `Issue Breakdown`,
//       `Critical: ${issueCounts.get('critical')}`,
//       `Serious: ${issueCounts.get('serious')}`,
//       `Moderate: ${issueCounts.get('moderate')}`,
//       `Minor: ${issueCounts.get('minor')}`,
//     ],
//   ];

//   const uniqueIssues = [`Unique: ${totalUniqueIssues}`];

//   if (warnLevel !== 'none' && issueCounts.get(warnLevel) > 0) {
//     messages.push([
//       `Issues with impact level - ${warnLevel} found in your project. Please review the accessibility issues.`,
//     ]);
//     process.exitCode = 1;
//   }

//   messages.forEach((message, index, array) => {
//     if (array.length !== 1 && index === array.length - 1) {
//       printMessage(message, constants.alertMessageOptions);
//     } else {
//       printMessage(message);
//     }
//   });
// };

// export const generateArtifacts = async (randomToken, deviceToScan) => {
//   const storagePath = getStoragePath(randomToken);
//   const directory = `${storagePath}/${constants.allIssueFileName}`;
//   let allIssues = [];
//   const allFiles = await extractFileNames(directory);

//   await Promise.all(
//     allFiles.map(async file => {
//       const rPath = `${directory}/${file}`;
//       const flattenedIssues = await flattenAxeResults(rPath);
//       allIssues = allIssues.concat(flattenedIssues);
//     }),
//   ).catch(flattenIssuesError => {
//     consoleLogger.info('An error has occurred when flattening the issues, please try again.');
//     silentLogger.error(flattenIssuesError);
//   });

//   const totalUniqueIssues = new Set(allIssues.map(issue => issue.description)).size;
//   if (process.env.REPORT_BREAKDOWN === '1') {
//     await granularReporting(randomToken, allIssues);
//   }

//   await thresholdLimitCheck(process.env.WARN_LEVEL, allIssues, totalUniqueIssues);

//   await writeResults(allIssues, storagePath);
//   await writeHTML(allIssues, storagePath, deviceToScan);
// };

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

  await writeResults(allIssues, storagePath);
  await writeHTML(allIssues, storagePath);
};
