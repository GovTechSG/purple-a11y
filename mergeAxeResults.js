/* eslint-disable consistent-return */
/* eslint-disable no-console */
const fs = require('fs-extra');
const printMessage = require('print-message');
const path = require('path');
const Mustache = require('mustache');
const axeIssuesList = require('./constants/axeTypes.json');
const wcagList = require('./constants/wcagLinks.json');
const { allIssueFileName, impactOrder } = require('./constants/constants');
const { getCurrentTime, getStoragePath } = require('./utils');
const { alertMessageOptions } = require('./constants/constants');
const { consoleLogger, silentLogger } = require('./logs');

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

const fetchIcons = async (disabilities, impact) =>
  Promise.all(
    disabilities.map(async disability => {
      const template = await fs
        .readFile(path.join(__dirname, `/static/${disability}.mustache`), 'utf8')
        .catch(templateError => {
          consoleLogger.info('An error has occurred when reading the template, please try again.');
          silentLogger.error(`(fetchIcons, mapping disabilities) - ${templateError}`);
        });

      return Mustache.render(template, { impact });
    }),
  ).catch(iconError => {
    consoleLogger.info('An error has occurred when fetching icons, please try again.');
    silentLogger.error(`(fetchIcons) - ${iconError}`);
  });

const writeResults = async (allissues, storagePath, jsonFilename = 'compiledResults') => {
  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: allissues.length, allissues },
    null,
    4,
  );

  try {
    await fs.writeFile(`${storagePath}/reports/${jsonFilename}.json`, finalResultsInJson);
  } catch (writeResultsError) {
    consoleLogger.info(
      'An error has occurred when compiling the results into the report, please try again.',
    );
    silentLogger.error(`(writeResults) - ${writeResultsError}`);
  }
};

const writeHTML = async (allissues, storagePath, htmlFilename = 'report') => {
  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: allissues.length, allissues },
    null,
    4,
  );

  try {
    const musTemp = await fs.readFile(path.join(__dirname, '/static/report.mustache'));
    const output = Mustache.render(musTemp.toString(), JSON.parse(finalResultsInJson));
    await fs.writeFile(`${storagePath}/reports/${htmlFilename}.html`, output);
  } catch (templateError) {
    consoleLogger.info('An error has ocurred when generating the report, please try again.');
    silentLogger.error(`(writeHTML) - ${templateError}`);
  }
};

const flattenAxeResults = async rPath => {
  const parsedContent = await parseContentToJson(rPath);

  const flattenedIssues = [];
  const { url, page, errors } = parsedContent;
  errors.forEach(error => {
    error.fixes.forEach(item => {
      const { id: errorId, impact, description, helpUrl } = error;
      const { disabilities, wcag } = axeIssuesList.find(obj => obj.id === errorId) || {};

      const wcagLinks = wcag
        ? wcag.map(element => wcagList.find(obj => obj.wcag === element) || { wcag: element })
        : null;

      flattenedIssues.push({
        url,
        page,
        description,
        impact,
        helpUrl,
        htmlElement: item.htmlElement,
        order: impactOrder[impact],
        wcagLinks,
        disabilities,
      });
    });
  });

  return Promise.all(
    flattenedIssues.map(async issue => {
      const { disabilities, impact, ...rest } = issue;
      const icons = disabilities ? await fetchIcons(disabilities, impact) : null;
      return { ...rest, impact, disabilities: icons };
    }),
  );
};

const granularReporting = async (randomToken, allIssues) => {
  if (allIssues.length > 0) {
    const storagePath = getStoragePath(randomToken);
    const impactLevels = ['critical', 'serious', 'moderate', 'minor'];

    let currentImpactLevelIssues;
    impactLevels.forEach(async impactLevel => {
      currentImpactLevelIssues = allIssues.filter(issue => issue.impact === impactLevel);

      if (currentImpactLevelIssues.length > 0) {
        const writeSeverityResult = writeResults(
          currentImpactLevelIssues,
          storagePath,
          `compiledResults-${impactLevel}`,
        );
        const writeHTMLSeverityReport = writeHTML(
          currentImpactLevelIssues,
          storagePath,
          `report-${impactLevel}`,
        );
        await Promise.all([writeSeverityResult, writeHTMLSeverityReport]);
      }
    });

    return true;
  }

  return false;
};

const issueCountMap = allIssues => {
  const criticalImpact = allIssues.filter(issue => issue.impact === 'critical');
  const seriousImpact = allIssues.filter(issue => issue.impact === 'serious');
  const moderateImpact = allIssues.filter(issue => issue.impact === 'moderate');
  const minorImpact = allIssues.filter(issue => issue.impact === 'minor');

  const issueCount = new Map();
  issueCount.set('critical', criticalImpact.length);
  issueCount.set('serious', seriousImpact.length);
  issueCount.set('moderate', moderateImpact.length);
  issueCount.set('minor', minorImpact.length);
  issueCount.set('total', allIssues.length);

  return issueCount;
};

const thresholdLimitCheck = async (warnLevel, allIssues) => {
  const issueCounts = issueCountMap(allIssues);

  const messages = [
    [
      `Total Issue Count: ${issueCounts.get('total')}`,
      `Issue Breakdown`,
      `Critical: ${issueCounts.get('critical')}`,
      `Serious: ${issueCounts.get('serious')}`,
      `Moderate: ${issueCounts.get('moderate')}`,
      `Minor: ${issueCounts.get('minor')}`,
    ],
  ];

  if (warnLevel !== 'none' && issueCounts.get(warnLevel) > 0) {
    messages.push([
      `Issues with impact level - ${warnLevel} found in your project. Please review the accessibility issues.`,
    ]);
    process.exitCode = 1;
  }

  messages.forEach((message, index, array) => {
    if (array.length !== 1 && index === array.length - 1) {
      printMessage(message, alertMessageOptions);
    } else {
      printMessage(message);
    }
  });
};

exports.generateArtifacts = async randomToken => {
  const storagePath = getStoragePath(randomToken);
  const directory = `${storagePath}/${allIssueFileName}`;
  let allIssues = [];
  const allFiles = await extractFileNames(directory);

  await Promise.all(
    allFiles.map(async file => {
      const rPath = `${directory}/${file}`;
      const flattenedIssues = await flattenAxeResults(rPath);

      allIssues = allIssues.concat(flattenedIssues);
    }),
  ).catch(flattenIssuesError => {
    consoleLogger.info('An error has occurred when flattening the issues, please try again.');
    silentLogger.error(flattenIssuesError);
  });

  if (process.env.REPORT_BREAKDOWN === '1') {
    await granularReporting(randomToken, allIssues);
  }

  await thresholdLimitCheck(process.env.WARN_LEVEL, allIssues);

  await writeResults(allIssues, storagePath);
  await writeHTML(allIssues, storagePath);
};
