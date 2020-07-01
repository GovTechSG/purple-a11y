/* eslint-disable no-console */
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');
const axeIssuesList = require('./constants/axeTypes.json');
const wcagList = require('./constants/wcagLinks.json');
const { allIssueFileName, impactOrder } = require('./constants/constants');
const { getCurrentTime, getStoragePath } = require('./utils');

const extractFileNames = async directory => {
  const allFiles = await fs
    .readdir(directory)
    .catch(readdirError => console.log('Error reading file', readdirError));
  return allFiles.filter(file => path.extname(file).toLowerCase() === '.json');
};

const parseContentToJson = async rPath => {
  const content = await fs
    .readFile(rPath, 'utf8')
    .catch(parseError => console.log('Error parsing JSON string', parseError));
  return JSON.parse(content);
};

const fetchIcons = async (disabilities, impact) => {
  return Promise.all(
    disabilities.map(async disability => {
      const template = await fs
        .readFile(path.join(__dirname, `/static/${disability}.mustache`), 'utf8')
        .catch(iconError => console.log('Error fetching icon', iconError));
      return Mustache.render(template, { impact });
    }),
  ).catch(iconError => console.log('Error fetching all icons', iconError));
};

const writeResults = async (allissues, storagePath) => {
  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: allissues.length, allissues },
    null,
    4,
  );
  await fs
    .writeFile(`${storagePath}/reports/compiledResults.json`, finalResultsInJson)
    .catch(writeResultsError => console.log('Error writing to file', writeResultsError));
};

const writeHTML = async (allissues, storagePath) => {
  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: allissues.length, allissues },
    null,
    4,
  );

  const musTemp = await fs
    .readFile(path.join(__dirname, '/static/report.mustache'))
    .catch(templateError => console.log('Error fetching template', templateError));
  const output = Mustache.render(musTemp.toString(), JSON.parse(finalResultsInJson));
  await fs.writeFile(`${storagePath}/reports/report.html`, output);
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

exports.mergeFiles = async randomToken => {
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
  ).catch(flattenIssuesError => console.log('Error flattening all issues', flattenIssuesError));

  await writeResults(allIssues, storagePath);
  await writeHTML(allIssues, storagePath);
};
