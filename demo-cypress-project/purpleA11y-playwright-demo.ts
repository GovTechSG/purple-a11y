import { Browser, BrowserContext, Page, chromium } from "playwright";
import purpleA11yInit from "@govtechsg/purple-hats";

declare const runA11yScan: (elementsToScan?: string[]) => Promise<any>;

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
const thresholds: Thresholds = { mustFix: 20, goodToFix: 25 };
// additional information to include in the "Scan About" section of the report
const scanAboutMetadata: ScanAboutMetadata = { browser: 'Chrome (Desktop)' };

(async () => {
    const purpleA11y = await purpleA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Playwright Scan", // label for test
        "Your Name",
        "email@domain.com",
        true, // include screenshots of affected elements in the report
        viewportSettings,
        thresholds,
        scanAboutMetadata,
    );

    const browser: Browser = await chromium.launch({
        headless: false,
    });
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    const runPurpleA11yScan = async (elementsToScan?: string[]) => {
        const scanRes = await page.evaluate(
            async elementsToScan => await runA11yScan(elementsToScan),
            elementsToScan,
        );
        await purpleA11y.pushScanResults(scanRes);
        purpleA11y.testThresholds(); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate purpleA11y instance.
    };

    await page.goto('https://govtechsg.github.io/purple-banner-embeds/purple-integrated-scan-example.htm');
    await page.evaluate(purpleA11y.getScripts());
    await runPurpleA11yScan();

    await page.getByRole('button', { name: 'Click Me' }).click();
    // Run a scan on <input> and <button> elements
    await runPurpleA11yScan(['input', 'button']);

    // ---------------------
    await context.close();
    await browser.close();
    await purpleA11y.terminate();
})();
