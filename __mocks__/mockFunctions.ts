/* eslint-disable no-undef */
const actualFs = jest.requireActual('fs-extra');
const actualPath = jest.requireActual('path');

export const createIssueCountMap = jest.fn((critical, serious, moderate, minor) => {
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

export const createAlertMessage = jest.fn(warnlevel => [
  [
    `Issues with impact level - ${warnlevel} found in your project. Please review the accessibility issues.`,
  ],
  { border: true, borderColor: 'red' },
]);

export const createFinalResultsInJson = jest.fn((allissues, dateTimeStamp) => {
  const finalResultsInJson = JSON.stringify(
    { startTime: dateTimeStamp, count: allissues.length, allissues },
    null,
    4,
  );

  return finalResultsInJson;
});
