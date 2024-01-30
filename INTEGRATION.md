## Integrating Purple A11y with end-to-end testing frameworks

Purple A11y provides functionalities that makes it possible to be integrated with end-to-end testing frameworks such as [Cypress](https://www.cypress.io/) and [Playwright](https://playwright.dev/).

### Prerequisites

In order to use this functionality, the testing framework must support:

- Execution of scripts in a NodeJS environment.
- Injection of JavaScript into the document that is being tested.
- Execution of JavaScript in the context of the document and retrieval of results back into the NodeJS environment after execution.

### How to include Purple A11y in your project

1. Add Purple A11y to your project by running the following command:

   `npm install --save-dev @govtechsg/purple-hats`

2. In the file of choice, import Purple A11y using:

   `import purpleA11yInit from '@govtechsg/purple-hats'`

   Note that Purple A11y should be imported in a script that runs in a NodeJS environment.

3. Create an instance of Purple A11y with:

   `const purpleA11y = await purpleA11yInit(entryUrl)`

   `entryUrl` should be a valid URL referring to the domain of the website to be scanned with Purple A11y.

### API Reference

#### `async purpleA11yInit(entryUrl, testLabel, name, email, needsReview, includeScreenshots, viewportSettings, thresholds, scanAboutMetadata)`

Returns an instance of Purple A11y

##### Parameters

- `entryUrl`
  - Initial URL to start the purple a11y scan
- `testLabel`
  - Label for test in report
- `name`
  - For Purple A11y data collection purposes
- `email`
  - For Purple A11y data collection purposes
- `needsReview` (optional)
  - Show potential false positive issues in the report. Defaults to false.
- `includeScreenshots` (optional)
  - Include screenshots of affected elements in the report. Defaults to false.
- `viewportSettings` (optional)
  - Viewport settings used in cypress tests needed to optimize screenshot function. Defaults to cypress’ default viewport settings. Example: `{ width: 1000, height: 600 }`
- `thresholds` (optional)
  - Object containing the max number of mustFix or goodToFix issue occurrences before an error is thrown for test failure. Does not fail tests by default. Example: `{ mustFix: 1, goodToFix: 3 }`
- `scanAboutMetadata` (optional)
  - Include additional information in the Scan About section of the report by passing in a JSON object. 
#### Purple A11y Instance

##### Properties

`scanDetails`

Object containing details about the scan
- E.g. `{
  startTime: 1700104789495,
  crawlType: 'Customized',
  requestUrl: 'https://govtechsg.github.io',
  urlsCrawled: { } 
}`

`randomToken`

Unique identifier for the scan instance

##### Methods

`getScripts()`

Get the axe-core script to be injected into the browser

- `runA11yScan(elementsToScan)`
  Runs axe scan on the current page.
  
  Parameter(s):
  - `elementsToScan`: Specifies which element should and which should not be tested
  
  Returns:
  - Object consisting of the current page url, current page title and axe scan result. `{ pageUrl, pageTitle, axeScanResults }`

`async pushScanResults(res, metadata, elementsToClick)`

Process scan results to be included in the report.

Parameter(s):

- `res`: Object consisting of the current page url, current page title and axe scan result. ` {pageUrl, pageTitle, axeScanResults}`
- `metadata` (optional): Additional information to be displayed for each page scanned in the report
- `elementsToClick` (optional): Elements clicked during the test to reveal hidden elements. Required to be able identify hidden elements if they were scanned for screenshot purposes. Ensure selectors resolve to a single element. 

Returns:
- Object containing the number of mustFix and goodToFix issue occurrences for this scan run e.g. `{ mustFix: 1, goodToFix: 5 }`

`testThresholds()`

Checks the accumulated issue occurrences count against the specified threshold.

- Terminates purpleA11y instance and throws an error if the number of accumulated mustFix or goodToFix issue occurrences exceeds either of the specified thresholds

`async terminate()`

Stops the Purple A11y instance and generates the scan report and other scan result artifacts

### How to use

Example usages for Cypress and Playwright can be found in [this section](#example-usages).

With reference to an instance of Purple A11y as `purpleA11y`:

1. Fetch the necessary scripts needed to be injected to document to be scanned by executing `purpleA11y.getScripts()`. The scripts will be returned as a string.
2. Inject the scripts into the document to be scanned. The easiest way that this can be done is by using `eval()` in the document's environment.
   - Note that this step needs to be done for every page visited.
3. Run a scan by executing `runA11yScan()` in the document's environment.
   - By default, the scan will be run for the entire page.
   - It is possible to run the scan for specific sections or elements in the page. One way to do this is to pass an array of CSS selectors of the elements to be scanned into `runA11yScan`. For example, `runA11yScan(['#my-component', 'button'])`. Other acceptable forms of argument can be found [here](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#context-parameter).
4. Pass the scan results back into the NodeJS environment where `purpleA11y` is in.
5. Push the results using `await purpleA11y.pushScanResults(scanResults)`.
6. Repeat steps 2-5 as many times as desired.
7. Terminate Purple A11y by using `await purpleA11y.terminate()`. A folder containing the details and report of your scan will be created, under the directory `results` which can be found in your project's root directory.

### Example usages

#### Cypress

<details>
<summary>Click here to see an example usage in an E2E Cypress test</summary>

We will be creating the following files in a demo Cypress project:

    ├── cypress
    │   ├── e2e
    │   │   └── spec.cy.js
    │   └── support
    │       └── e2e.js
    ├── cypress.config.js
    └── package.json

Create a <code>package.json</code> by running <code>npm init</code> . Accept the default options or customise it as needed.

Change the type of npm package to module by running <code>npm pkg set type="module";</code>

Install the following node dependencies by running <code>npm install cypress @govtechsg/purple-hats --save-dev </code>

Navigate to <code>node_modules/@govtechsg/purple-hats</code> and run <code>npm install</code> within the folder to install remaining Purple A11y dependencies:

    cd node_modules/@govtechsg/purple-hats
    npm install
    cd ../../..

Create <code>cypress.config.js</code> with the following contents, and change your Name, E-mail address, and boolean value for whether rule items requiring manual review in the report should be displayed below:

    import { defineConfig } from "cypress";
    import purpleA11yInit from "@govtechsg/purple-hats";

    // viewport used in tests to optimise screenshots
    const viewportSettings = { width: 1920, height: 1040 };
    // specifies the number of occurrences before error is thrown for test failure
    const thresholds = { mustFix: 4, goodToFix: 5 };
    // additional information to include in the "Scan About" section of the report
    const scanAboutMetadata = { browser: 'Chrome (Desktop)' };

    const purpleA11y = await purpleA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Cypress Scan", // label for test
        "Your Name",
        "email@domain.com",
        false, // whether to show false positive issues in the report
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
                    getPurpleA11yScipts() {
                        return purpleA11y.getScripts();
                    },
                    async pushPurpleA11yScanResults({res, metadata, elementsToClick}) {
                        return await purpleA11y.pushScanResults(res, metadata, elementsToClick);
                    },
                    returnResultsDir() {
                        return `results/${purpleA11y.randomToken}_${purpleA11y.scanDetails.urlsCrawled.scanned.length}pages/reports/report.html`;
                    },
                    finishPurpleA11yTestCase() {
                        purpleA11y.testThresholds();
                        return null;
                    },
                    async terminatePurpleA11y() {
                        return await purpleA11y.terminate();
                    },
                });
            },
        },
    });

Create a sub-folder and file <code>cypress/support/e2e.js</code> with the following contents::

    Cypress.Commands.add("injectPurpleA11yScripts", () => {
        cy.task("getPurpleA11yScipts").then((s) => {
            cy.window().then((win) => {
                win.eval(s);
            });
        });
    });

    Cypress.Commands.add("runPurpleA11yScan", (items={}) => {
        cy.window().then(async (win) => {
            const { elementsToScan, elementsToClick, metadata } = items; 
            const res = await win.runA11yScan(elementsToScan);
            cy.task("pushPurpleA11yScanResults", {res, metadata, elementsToClick}).then((count) => { return count });
            cy.task("pushPurpleA11yScanResults", {res, metadata, elementsToClick}).then((count) => { return count });
            cy.task("finishPurpleA11yTestCase"); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate purpleA11y instance.
        });
    });

    Cypress.Commands.add("terminatePurpleA11y", () => {
        cy.task("terminatePurpleA11y");
    });

Create <code>cypress/e2e/spec.cy.js</code> with the following contents:

    describe("template spec", () => {
        it("should run purple A11y", () => {
            cy.visit(
                "https://govtechsg.github.io/purple-banner-embeds/purple-integrated-scan-example.htm"
            );
            cy.injectPurpleA11yScripts();
            cy.runPurpleA11yScan();
             cy.get("button[onclick=\"toggleSecondSection()\"]").click();
            // Run a scan on <input> and <button> elements
            cy.runPurpleA11yScan({
                elementsToScan: ["input", "button"], 
                elementsToClick: ["button[onclick=\"toggleSecondSection()\"]"],
                metadata: "Clicked button"
            });

            cy.terminatePurpleA11y();
        });
    });

Run your test with <code>npx cypress run</code> .

You will see Purple A11y results generated in <code>results</code> folder.

</details>

#### Playwright

<details>
    <summary>Click here to see an example usage in Playwright</summary>

Create a <code>package.json</code> by running <code>npm init</code> . Accept the default options or customise it as needed.

Install the following node dependencies by running <code>npm install playwright @govtechsg/purple-hats --save-dev </code>

Navigate to <code>node_modules/@govtechsg/purple-hats</code> and run <code>npm install</code> within the folder to install remaining Purple A11y dependencies.

On your project's root folder, create a Playwright test file <code>purpleA11y-playwright-demo.js</code>:

    import { chromium } from "playwright";
    import purpleA11yInit from "@govtechsg/purple-hats";

    // viewport used in tests to optimise screenshots
    const viewportSettings = { width: 1920, height: 1040 };
    // specifies the number of occurrences before error is thrown for test failure
    const thresholds = { mustFix: 4, goodToFix: 5 };
    // additional information to include in the "Scan About" section of the report
    const scanAboutMetadata = { browser: 'Chrome (Desktop)' };

    const purpleA11y = await purpleA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Playwright Scan", // label for test
        "Your Name",
        "email@domain.com",
        false, // whether to show false positive issues in the report
        true, // include screenshots of affected elements in the report
        viewportSettings,
        thresholds,
        scanAboutMetadata,
    );

    (async () => {
        const browser = await chromium.launch({
            headless: false,
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        const runPurpleA11yScan = async (elementsToScan) => {
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
        await runPurpleA11yScan(['input', 'button'])


        // ---------------------
        await context.close();
        await browser.close();
        await purpleA11y.terminate();
    })();

Run your test with <code>node purpleA11y-playwright-demo.js</code> .

You will see Purple A11y results generated in <code>results</code> folder.

</details>
