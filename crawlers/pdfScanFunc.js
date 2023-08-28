import constants, { getExecutablePath } from '../constants/constants.js';
import { spawnSync } from 'child_process';
import { globSync } from 'glob';
import { consoleLogger, silentLogger } from '../logs.js';
import fs from 'fs';
import { randomUUID } from 'crypto';

// CONSTANTS 

// AAA: 1.4.8, 2.4.9 
// AA: 1.3.4, 1.4.3, 1.4.4, 1.4.10 
// A: 1.3.1, 4.1.1, 4.1.2
const level2aaa = ['2.4.9', '1.4.8'];
const level2aa = ['1.3.4', '1.4.3', '1.4.4', '1.4.10']; 
const level2a = ['1.3.1', '4.1.1', '4.1.2'];
const clauseToLevel = { // mapping of clause to its A/AA/AAA level
  ...(level2aa.reduce((prev, curr) => {
    prev[curr] = 'wcag2aa';
    return prev; 
  }, {})),
  ...(level2a.reduce((prev, curr) => {
    prev[curr] = 'wcag2a';
    return prev; 
  }, {}))
};

const metaToCategoryMap = {
  critical: 'mustFix',
  error: 'goodToFix',
  serious: 'goodToFix',
  warning: 'goodToFix',
  ignore: 'goodToFix'
};

const getVeraExecutable = () => {
  const veraPdfExe = getExecutablePath('**/verapdf', 'verapdf');
  if (!veraPdfExe) {
    let veraPdfExeNotFoundError =
      'Could not find veraPDF executable.  Please ensure veraPDF is installed at current directory.';
    consoleLogger.error(veraPdfExeNotFoundError);
    silentLogger.error(veraPdfExeNotFoundError);
  }
  return veraPdfExe;
};

// get validation profile
const getVeraProfile = () => {
  const veraPdfProfile = globSync('**/verapdf/**/WCAG-21.xml', {
    absolute: true,
    recursive: true,
    nodir: true,
  });

  if (veraPdfProfile.length === 0) {
    let veraPdfProfileNotFoundError =
      'Could not find veraPDF validation profile.  Please ensure veraPDF is installed at current directory.';
    consoleLogger.error(veraPdfProfileNotFoundError);
    silentLogger.error(veraPdfProfileNotFoundError);
    return undefined;
  }
  return veraPdfProfile[0];
};

export const handlePdfDownload = (randomToken, pdfDownloads, request, sendRequest) => {
  const pdfFileName = randomUUID();
  const trimmedUrl = request.url.trim(); 
  const pageTitle = decodeURI(trimmedUrl).split('/').pop();

  pdfDownloads.push(
    new Promise(async (resolve, rej) => {
      const pdfResponse = await sendRequest({ responseType: 'buffer', isStream: true });
      pdfResponse.setEncoding('binary');

      const downloadFile = fs.createWriteStream(`${randomToken}/${pdfFileName}.pdf`, {
        flags: 'a',
      });
      pdfResponse.on('data', chunk => {
        downloadFile.write(chunk, 'binary');
      });
      pdfResponse.on('end', () => {
        downloadFile.end();
      });

      resolve({ url: trimmedUrl, pageTitle });
    }),
  );

  // function to save current uuid -> url mapping to an existing dictionary
  const appendMapping = map => (map[pdfFileName] = trimmedUrl);
  return appendMapping;
};

export const runPdfScan = async (randomToken) => {
  const veraPdfExe = getVeraExecutable();
  const veraPdfProfile = getVeraProfile();
  if (!veraPdfExe || !veraPdfProfile) {
    process.exit(1);
  }

  const intermediateFolder = randomToken; // NOTE: assumes this folder is already created for crawlee

  // store in a intermediate folder as we transfer final results later
  const intermediateResultPath = `${intermediateFolder}/${constants.pdfScanResultFileName}`;

  const veraPdfCmdArgs = [
    '-p',
    veraPdfProfile,
    '--format',
    'json',
    '-r', // recurse through directory
    intermediateFolder,
    '>', // pipe output into a result file
    intermediateResultPath,
  ];

  spawnSync(veraPdfExe, veraPdfCmdArgs, { shell: true });
};

// transform results from veraPDF to desired format for report 
export const mapPdfScanResults = (randomToken, uuidToUrlMapping) => {
  const intermediateFolder = randomToken;
  const intermediateResultPath = `${intermediateFolder}/${constants.pdfScanResultFileName}`;

  const rawdata = fs.readFileSync(intermediateResultPath);
  const output = JSON.parse(rawdata);

  const errorMetaRaw = fs.readFileSync('constants/errorMeta.json');
  const errorMeta = JSON.parse(errorMetaRaw);

  const resultsList = [];

  // jobs: files that are scanned
  const {
    report: { jobs },
  } = output;

  // loop through all jobs
  for (let jobIdx = 0; jobIdx < jobs.length; jobIdx++) {
    const translated = { // transformed result for current job
      goodToFix: {
        rules: {},
        totalItems: 0, 
      },
      mustFix: {
        rules: {},
        totalItems: 0, 
      }
    };

    const { itemDetails, validationResult, taskResult } = jobs[jobIdx];
    const { name: fileName } = itemDetails;

    const uuid = fileName.split('/').pop().split('.')[0];
    const url = uuidToUrlMapping[uuid]
    const pageTitle = decodeURI(url).split('/').pop();

    translated.url = url;
    translated.pageTitle = pageTitle

    if (!validationResult) { // check for error in scan
      consoleLogger.error(`Unable to scan ${pageTitle}, skipping`);
      silentLogger.error(`Exception type: ${taskResult.type}, message: ${taskResult.exceptionMessage}`);
      continue; // skip this job
    }

    // destructure validation result
    const { passedChecks, failedChecks, ruleSummaries }= validationResult.details;
    const totalChecks = passedChecks + failedChecks;

    translated.totalItems = totalChecks;

    // loop through all failed rules
    for (let ruleIdx = 0; ruleIdx < ruleSummaries.length; ruleIdx++) {
      const rule = ruleSummaries[ruleIdx];
      const { specification, testNumber, clause } = rule; 
      if (level2aaa.includes(clause)) continue; // exclude level AAA rules
      const [ruleId, transformedRule] = transformRule(rule);

      // ignore if violation is not in the meta file
      const meta = errorMeta[specification][clause][testNumber]?.STATUS ?? 'ignore';
      const category = translated[metaToCategoryMap[meta]]; 

      category.rules[ruleId] = transformedRule;
      category.totalItems += transformedRule.totalItems;
    }

    resultsList.push(translated); 
  }
  return resultsList;
};

const getPageFromContext = (context) => {
  const path = context.split('/')
  let pageNumber = -1;
  if (context?.includes('pages') && path[path.length - 1].startsWith('pages')) {
    path.forEach(nodeString => {
      if (nodeString.includes('pages')) {
        pageNumber = parseInt(nodeString.split(/[[\]]/)[1], 10) + 1;
      }
    });
  }
  return pageNumber;
};

const transformRule = (rule) => {
  // get specific rule
  const transformed = {};
  const { specification, description, clause, testNumber, checks } = rule;

  transformed.description = description;
  transformed.totalItems = checks.length;

  if (specification === 'WCAG2.1') {
    transformed.conformance = [clauseToLevel[clause], 'wcag' + clause.split('.').join('')];
  } else {
    transformed.conformance = ['best-practice'];
  }

  transformed.items = [];

  for (let checkIdx = 0; checkIdx < checks.length; checkIdx++) {
    const { errorMessage, context } = checks[checkIdx];
    transformed.items.push({ message: errorMessage, page: getPageFromContext(context) });
  }
  const ruleId = `pdf-${specification}-${clause}-${testNumber}`.replaceAll(' ', '_'); // TODO: rule id
  
  return [ruleId, transformed]; 
};
