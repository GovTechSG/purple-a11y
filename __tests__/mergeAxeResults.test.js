/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
const printMessage = require('print-message');

const privateFuncs = require('../mergeAxeResults');

const issueCountMap = privateFuncs.__get__('issueCountMap');
const thresholdLimitCheck = privateFuncs.__get__('thresholdLimitCheck');

const {
  allIssues,
  allExceptCritical,
  allExceptModerate,
  allExceptSerious,
  allExceptMinor,
  criticalOnly,
  seriousOnly,
  moderateOnly,
  minorOnly,
} = require('../__mocks__/mockIssues');

const { createIssueCountMap, createAlertMessage } = require('../__mocks__/mockFunctions');

jest.mock('print-message');

// Test issueCountMap
describe('test breakdown of issue counts', () => {
  test('should return map of 0 for no issues', () => {
    const result = issueCountMap([]);
    expect(result).toEqual(
      new Map([
        ['critical', 0],
        ['serious', 0],
        ['moderate', 0],
        ['minor', 0],
        ['total', 0],
      ]),
    );
  });

  test('should return map of issue counts', () => {
    const result = issueCountMap(allIssues);
    expect(result).toEqual(
      new Map([
        ['critical', 1],
        ['serious', 1],
        ['moderate', 1],
        ['minor', 1],
        ['total', 4],
      ]),
    );
  });
});

// Test thresholdLimitCheck
describe('test threshold limit check', () => {
  const mockIssueCountMap = mockData => {
    privateFuncs.__set__('issueCountMap', mockData)();
  };

  beforeEach(() => {
    warnlevel = 'none';
    expectedIssueCountMap = [];
  });

  afterEach(() => {
    printMessage.mockReset();
  });

  test('should print issue count with no trigger if warnlevel is none', async () => {
    expectedIssueCountMap = createIssueCountMap(1, 1, 1, 1);
    mockIssueCountMap(expectedIssueCountMap);

    await thresholdLimitCheck(warnlevel, allIssues);
    expect(printMessage).toHaveBeenCalled();
    expect(printMessage.mock.calls.length).toEqual(1);
    expect(printMessage.mock.calls[0][0]).toEqual(expectedIssueCountMap);
  });

  test.each([
    ['critical', allExceptCritical, createIssueCountMap(0, 1, 1, 1)],
    ['serious', allExceptSerious, createIssueCountMap(1, 0, 1, 1)],
    ['moderate', allExceptModerate, createIssueCountMap(1, 1, 0, 1)],
    ['minor', allExceptMinor, createIssueCountMap(1, 1, 1, 0)],
  ])(
    'should print issue count only if all issues except %s issues are present',
    async (warnlevel, data, expected) => {
      mockIssueCountMap(data);

      await thresholdLimitCheck(warnlevel, data);
      expect(printMessage).toHaveBeenCalled();
      expect(printMessage.mock.calls.length).toEqual(1);
      expect(printMessage.mock.calls[0][0]).toEqual(expected);
    },
  );

  test.each([
    ['critical', criticalOnly, createIssueCountMap(1, 0, 0, 0)],
    ['serious', seriousOnly, createIssueCountMap(0, 1, 0, 0)],
    ['moderate', moderateOnly, createIssueCountMap(0, 0, 1, 0)],
    ['minor', minorOnly, createIssueCountMap(0, 0, 0, 1)],
  ])(
    'should print issue count and alert message if %s issues are present',
    async (warnlevel, data, expected) => {
      const expectedAlertMessage = createAlertMessage(warnlevel);
      mockIssueCountMap(data);

      await thresholdLimitCheck(warnlevel, data);
      expect(printMessage).toHaveBeenCalled();
      expect(printMessage.mock.calls.length).toEqual(2);
      expect(printMessage.mock.calls[0][0]).toEqual(expected);
      expect(printMessage.mock.calls[1]).toEqual(expectedAlertMessage);
    },
  );
});
