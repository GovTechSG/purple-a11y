/* eslint-disable consistent-return */
/* eslint-disable no-console */
import fs from 'fs-extra';
import printMessage from 'print-message';
import path from 'path';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import constants, { intermediateScreenshotsPath, destinationPath } from './constants/constants.js';
import { getCurrentTime, getStoragePath } from './utils.js';
import { consoleLogger, silentLogger } from './logs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const axeIssuesList = JSON.parse(fs.readFileSync('./constants/axeTypes.json'));
const wcagList = JSON.parse(fs.readFileSync('./constants/wcagLinks.json'));

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

const writeHTML = async (allissues, storagePath, deviceToScan, htmlFilename = 'report') => {
  const issueCounts = issueCountMap(allissues);
  const domainScanned = storagePath.split('_')[1];
  var deviceUsed = storagePath.split('_')[4];

  const totalIssues = issueCounts.get('total');
  const totalCritical = issueCounts.get('critical');
  const totalSerious = issueCounts.get('serious');
  const totalModerate = issueCounts.get('moderate');
  const totalMinor = issueCounts.get('minor');
  const totalUnique = new Set(allissues.map(issue => issue.description)).size;

  const issueImpact = {
    totalIssues,
    totalCritical,
    totalSerious,
    totalModerate,
    totalMinor,
    totalUnique,
  };

  let deviceIconHtml;
  switch (deviceUsed) {
    case 'Desktop':
      deviceIconHtml = `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M80.24 19.76H19.76C16.9736 19.76 14.72 22.0208 14.72 24.8072V65.1776C14.72 67.964 16.9736 70.2248 19.76 70.2248H42.44V75.1928H37.4C36.0104 75.1928 34.88 76.3232 34.88 77.7128C34.88 79.1096 36.0104 80.2328 37.4 80.2328H62.6C63.9896 80.2328 65.12 79.1024 65.12 77.7128C65.12 76.316 63.9896 75.1928 62.6 75.1928H57.56V70.2248H80.24C83.0264 70.2248 85.28 67.964 85.28 65.1776V24.8072C85.28 22.0208 83.0264 19.76 80.24 19.76ZM80.24 63.68C80.24 64.5512 79.5344 65.2568 78.6632 65.2568H21.3368C20.4656 65.2568 19.76 64.5512 19.76 63.68V26.4632C19.76 25.592 20.4656 24.8864 21.3368 24.8864H78.6704C79.5416 24.8864 80.2472 25.592 80.2472 26.4632L80.24 63.68Z">
      </svg>`;
      break;
    case 'Mobile':
      deviceIconHtml = `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M36.6667 17C33.353 17 30.6667 19.6456 30.6667 22.9091V76.0909C30.6667 79.3544 33.353 82 36.6667 82H61.6667C64.9805 82 67.6667 79.3544 67.6667 76.0909V22.9091C67.6667 19.6456 64.9805 17 61.6667 17H36.6667ZM63.6667 24.8788H34.6667V72.1515H63.6667V24.8788ZM43.6667 20.447C43.6667 20.175 43.8906 19.9545 44.1667 19.9545H55.1667C55.4429 19.9545 55.6667 20.175 55.6667 20.447C55.6667 20.7189 55.4429 20.9394 55.1667 20.9394H44.1667C43.8906 20.9394 43.6667 20.7189 43.6667 20.447ZM49.6667 80.0303C51.3236 80.0303 52.6667 78.7075 52.6667 77.0758C52.6667 75.444 51.3236 74.1212 49.6667 74.1212C48.0099 74.1212 46.6667 75.444 46.6667 77.0758C46.6667 78.7075 48.0099 80.0303 49.6667 80.0303Z">
      </svg>`;
      break;
    case 'CustomWidth':
      deviceUsed = storagePath.split('_')[5] + ' width viewport';
      deviceIconHtml = `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M25 35C25 29.4772 29.4772 25 35 25H65C70.5228 25 75 29.4772 75 35V65C75 70.5228 70.5228 75 65 75H35C29.4772 75 25 70.5228 25 65V35ZM34.2466 52.3973C32.9226 52.3973 31.8493 53.4705 31.8493 54.7945V65.7534C31.8493 67.0774 32.9226 68.1507 34.2466 68.1507C34.3627 68.1507 34.4769 68.1424 34.5887 68.1265C34.7007 68.1425 34.8151 68.1508 34.9315 68.1508H45.8904C47.2144 68.1508 48.2877 67.0775 48.2877 65.7535C48.2877 64.4296 47.2144 63.3563 45.8904 63.3563H36.6438V54.7945C36.6438 53.4706 35.5705 52.3973 34.2466 52.3973ZM68.8356 45.2055C68.8356 46.5295 67.7623 47.6027 66.4384 47.6027C65.1144 47.6027 64.0411 46.5295 64.0411 45.2055V36.6437L54.7945 36.6437C53.4706 36.6437 52.3973 35.5704 52.3973 34.2465C52.3973 32.9225 53.4706 31.8492 54.7945 31.8492L65.7534 31.8492C65.8698 31.8492 65.9843 31.8575 66.0963 31.8735C66.208 31.8576 66.3222 31.8493 66.4384 31.8493C67.7623 31.8493 68.8356 32.9226 68.8356 34.2466V45.2055Z">
      </svg>`;
      break;
    default:
      deviceUsed = deviceToScan.replaceAll('_', ' ');
      deviceIconHtml = `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M36.6667 17C33.353 17 30.6667 19.6456 30.6667 22.9091V76.0909C30.6667 79.3544 33.353 82 36.6667 82H61.6667C64.9805 82 67.6667 79.3544 67.6667 76.0909V22.9091C67.6667 19.6456 64.9805 17 61.6667 17H36.6667ZM63.6667 24.8788H34.6667V72.1515H63.6667V24.8788ZM43.6667 20.447C43.6667 20.175 43.8906 19.9545 44.1667 19.9545H55.1667C55.4429 19.9545 55.6667 20.175 55.6667 20.447C55.6667 20.7189 55.4429 20.9394 55.1667 20.9394H44.1667C43.8906 20.9394 43.6667 20.7189 43.6667 20.447ZM49.6667 80.0303C51.3236 80.0303 52.6667 78.7075 52.6667 77.0758C52.6667 75.444 51.3236 74.1212 49.6667 74.1212C48.0099 74.1212 46.6667 75.444 46.6667 77.0758C46.6667 78.7075 48.0099 80.0303 49.6667 80.0303Z">
      </svg>`;
  }

  const finalResultsInJson = JSON.stringify(
    {
      startTime: getCurrentTime(),
      count: allissues.length,
      allissues,
      issueImpact,
      domainScanned,
      deviceUsed,
      deviceIconHtml,
    },
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
        order: constants.impactOrder[impact],
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

const thresholdLimitCheck = async (warnLevel, allIssues, totalUniqueIssues) => {
  const issueCounts = issueCountMap(allIssues);

  const messages = [
    [`Total Issues: ${issueCounts.get('total')}`, `Total Unique Issues: ${totalUniqueIssues}`],
    [
      `Issue Breakdown`,
      `Critical: ${issueCounts.get('critical')}`,
      `Serious: ${issueCounts.get('serious')}`,
      `Moderate: ${issueCounts.get('moderate')}`,
      `Minor: ${issueCounts.get('minor')}`,
    ],
  ];

  const uniqueIssues = [`Unique: ${totalUniqueIssues}`];

  if (warnLevel !== 'none' && issueCounts.get(warnLevel) > 0) {
    messages.push([
      `Issues with impact level - ${warnLevel} found in your project. Please review the accessibility issues.`,
    ]);
    process.exitCode = 1;
  }

  messages.forEach((message, index, array) => {
    if (array.length !== 1 && index === array.length - 1) {
      printMessage(message, constants.alertMessageOptions);
    } else {
      printMessage(message);
    }
  });
};

export const generateArtifacts = async (randomToken, deviceToScan) => {
  const storagePath = getStoragePath(randomToken);
  const directory = `${storagePath}/${constants.allIssueFileName}`;
  let allIssues = [];
  const allFiles = await extractFileNames(directory);

  if (fs.existsSync(intermediateScreenshotsPath)) {
    fs.readdir(intermediateScreenshotsPath, (err, files) => {
      if (err) {
        console.log('Screenshots were not moved successfully: ' + err.message);
      }

      fs.mkdir(destinationPath(storagePath), err => {
        console.log('Screenshots folder was not created successfully: ' + err.message);
      });

      files.forEach(file => {
        fs.rename(
          `${intermediateScreenshotsPath}/${file}`,
          `${destinationPath(storagePath)}/${file}`,
          err => {
            if (err) {
              console.log('Screenshots were not moved successfully: ' + err.message);
            } else {
              console.log(`Moved ${file} to ${destinationPath(storagePath)}`);
            }
          },
        );
      });

      fs.rmdir(intermediateScreenshotsPath, err => {
        if (err) {
          console.log(err);
        }
      });
    });
  }

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

  const totalUniqueIssues = new Set(allIssues.map(issue => issue.description)).size;
  if (process.env.REPORT_BREAKDOWN === '1') {
    await granularReporting(randomToken, allIssues);
  }

  await thresholdLimitCheck(process.env.WARN_LEVEL, allIssues, totalUniqueIssues);

  await writeResults(allIssues, storagePath);
  await writeHTML(allIssues, storagePath, deviceToScan);
};
