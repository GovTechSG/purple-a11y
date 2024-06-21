import { defineConfig } from "cypress";
import purpleA11yInit from "@govtechsg/purple-hats";

interface ViewportSettings {
    width: number;
    height: number;
}

interface Thresholds {
    mustFix: number;
    goodToFix: number;
}

interface ScanAboutMetadata {
    browser: string;
}

// viewport used in tests to optimise screenshots
const viewportSettings: ViewportSettings = { width: 1920, height: 1040 };
// specifies the number of occurrences before error is thrown for test failure
const thresholds: Thresholds = { mustFix: 20, goodToFix: 20 };
// additional information to include in the "Scan About" section of the report
const scanAboutMetadata: ScanAboutMetadata = { browser: 'Chrome (Desktop)' };

const purpleA11y = await purpleA11yInit(
    "https://govtechsg.github.io", // initial url to start scan
    "Demo Cypress Scan", // label for test
    "YX",
    "accesibility@tech.gov.sg",
    true, // include screenshots of affected elements in the report
    viewportSettings,
    thresholds,
    scanAboutMetadata,
);

export default defineConfig({
    taskTimeout: 120000, // need to extend as screenshot function requires some time
    viewportHeight: viewportSettings.height,
    viewportWidth: viewportSettings.width,
    e2e: {
        setupNodeEvents(on, _config) {
            on("task", {
                getPurpleA11yScripts(): string {
                    return purpleA11y.getScripts();
                },
                async pushPurpleA11yScanResults({res, metadata, elementsToClick}: { res: any, metadata: any, elementsToClick: any[] }): Promise<{ mustFix: number, goodToFix: number }> {
                    return await purpleA11y.pushScanResults(res, metadata, elementsToClick);
                },
                returnResultsDir(): string {
                    return `results/${purpleA11y.randomToken}_${purpleA11y.scanDetails.urlsCrawled.scanned.length}pages/reports/report.html`;
                },
                finishPurpleA11yTestCase(): null {
                    purpleA11y.testThresholds();
                    return null;
                },
                async terminatePurpleA11y(): Promise<null> {
                    return await purpleA11y.terminate();
                },
            });
        },
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    },
});