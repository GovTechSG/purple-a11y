/* eslint-disable no-undef */
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
