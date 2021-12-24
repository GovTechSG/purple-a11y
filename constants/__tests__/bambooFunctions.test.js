const { configureReportSetting } = require('../bambooFunctions');

describe('test report setting', () => {

    afterAll(() => {
        delete process.env.REPORT_BREAKDOWN;
    });

    test('should be 1 when enabled', () => {
        configureReportSetting(true);
        expect(process.env.REPORT_BREAKDOWN).toBe("1");
    });

    test('should be 0 when not enabled', () => {
        configureReportSetting(false);
        expect(process.env.REPORT_BREAKDOWN).toBe("0");
    });

});