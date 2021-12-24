/* eslint-disable no-undef */
const actualFs = jest.requireActual('fs-extra');
const actualPath = jest.requireActual('path');

exports.createIssueCountMap = jest.fn((critical, serious, moderate, minor) => {
  const totalCount = critical + serious + moderate + minor;
  return [
    `Total Issue Count: ${totalCount}`,
    `Issue Breakdown`,
    `Critical: ${critical}`,
    `Serious: ${serious}`,
    `Moderate: ${moderate}`,
    `Minor: ${minor}`,
  ];
});

exports.createAlertMessage = jest.fn(warnlevel => [
  [
    `Issues with impact level - ${warnlevel} found in your project. Please review the accessibility issues.`,
  ],
  { border: true, borderColor: 'red' },
]);

exports.createFilenames = jest.fn(() => {
  const allFiles = actualFs.readdirSync(actualPath.resolve('./__mocks__/mock_all_issues'));
  return allFiles;
});

exports.createFinalResultsInJson = jest.fn((allissues, dateTimeStamp) => {
  const finalResultsInJson = JSON.stringify(
    { startTime: dateTimeStamp, count: allissues.length, allissues },
    null,
    4,
  );

  return finalResultsInJson;
});
