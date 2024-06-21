import purpleA11yInit from '@govtechsg/purple-hats';

(async () => {
    const entryUrl = 'https://gov.tech.sg';
    const purpleA11y = await purpleA11yInit(entryUrl, 'Cypress Test 1', 'yx', 'accessibility@tech.gov.sg');

    const scripts = await purpleA11y.getScripts();

    // Example for using with Cypress
    cy.visit(entryUrl);

    cy.window().then(async (win) => {
        win.eval(scripts);
        const results = await win.runA11yScan();
        await purpleA11y.pushScanResults(results);
        await purpleA11y.terminate();
    });

    // Example for using with Playwright
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(entryUrl);

    await page.evaluate(scripts);

    const results = await page.evaluate(async () => {
        return await runA11yScan();
    });
    await purpleA11y.pushScanResults(results);
    await purpleA11y.terminate();

    await browser.close();
})();
