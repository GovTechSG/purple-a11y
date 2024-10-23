## Integrating Oobee with end-to-end testing frameworks

Oobee provides functionalities that makes it possible to be integrated with end-to-end testing frameworks such as [Cypress](https://www.cypress.io/) and [Playwright](https://playwright.dev/).

### Prerequisites

In order to use this functionality, the testing framework must support:

- Execution of scripts in a NodeJS environment.
- Injection of JavaScript into the document that is being tested.
- Execution of JavaScript in the context of the document and retrieval of results back into the NodeJS environment after execution.

### How to include Oobee in your project

1. Add Oobee to your project by running the following command:

   `npm install --save-dev @govtechsg/oobee`

2. In the file of choice, import Oobee using:

   `import oobeeA11yInit from '@govtechsg/oobee'`

   Note that Oobee should be imported in a script that runs in a NodeJS environment.

3. Create an instance of Oobee with:

   `const oobeeA11y = await oobeeA11yInit(entryUrl)`

   `entryUrl` should be a valid URL referring to the domain of the website to be scanned with Oobee.

### API Reference

#### `async oobeeA11yInit(entryUrl, testLabel, name, email, includeScreenshots, viewportSettings, thresholds, scanAboutMetadata)`

Returns an instance of Oobee

##### Parameters

- `entryUrl`
  - Initial URL to start the oobee oobee scan
- `testLabel`
  - Label for test in report
- `name`
  - For Oobee data collection purposes
- `email`
  - For Oobee data collection purposes
- `includeScreenshots` (optional)
  - Include screenshots of affected elements in the report. Defaults to false.
- `viewportSettings` (optional)
  - Viewport settings used in cypress tests needed to optimize screenshot function. Defaults to cypress’ default viewport settings. Example: `{ width: 1000, height: 600 }`
- `thresholds` (optional)
  - Object containing the max number of mustFix or goodToFix issue occurrences before an error is thrown for test failure. Does not fail tests by default. Example: `{ mustFix: 1, goodToFix: 3 }`
- `scanAboutMetadata` (optional)
  - Include additional information in the Scan About section of the report by passing in a JSON object.
- `zip` (optional)
  - Name of the generated zip of Oobee results at the end of scan. Defaults to "oobee-scan-results".

#### Oobee Instance

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

- Terminates oobeeA11y instance and throws an error if the number of accumulated mustFix or goodToFix issue occurrences exceeds either of the specified thresholds.

`async terminate()`

Stops the Oobee instance and generates the scan report and other scan result artifacts. Returns the name of the generated folder containing the results.

### How to use

Example usages for Cypress and Playwright can be found in [this section](#example-usages).

With reference to an instance of Oobee as `oobeeA11y`:

1. Fetch the necessary scripts needed to be injected to document to be scanned by executing `oobeeA11y.getScripts()`. The scripts will be returned as a string.
2. Inject the scripts into the document to be scanned. The easiest way that this can be done is by using `eval()` in the document's environment.
   - Note that this step needs to be done for every page visited.
3. Run a scan by executing `runA11yScan()` in the document's environment.
   - By default, the scan will be run for the entire page.
   - It is possible to run the scan for specific sections or elements in the page. One way to do this is to pass an array of CSS selectors of the elements to be scanned into `runA11yScan`. For example, `runA11yScan(['#my-component', 'button'])`. Other acceptable forms of argument can be found [here](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#context-parameter).
4. Pass the scan results back into the NodeJS environment where `oobeeA11y` is in.
5. Push the results using `await oobeeA11y.pushScanResults(scanResults)`.
6. Repeat steps 2-5 as many times as desired.
7. Terminate Oobee by using `await oobeeA11y.terminate()`. A folder containing the details and report of your scan will be created, under the directory `results` which can be found in your project's root directory.

### Example usages

#### Cypress

<details>
<summary>Click here to see an example usage in an E2E Cypress test (javascript)</summary>

We will be creating the following files in a demo Cypress project:

    ├── cypress
    │   ├── e2e
    │   │   └── spec.cy.js
    │   └── support
    │       └── e2e.js
    ├── cypress.config.js
    └── package.json

Create a <code>package.json</code> by running <code>npm init</code> . Accept the default options or customise it as needed.

Change the type of npm package to module by running <code>npm pkg set type="module"</code>

Install the following node dependencies by running <code>npm install cypress @govtechsg/oobee --save-dev </code>

Navigate to <code>node_modules/@govtechsg/oobee</code> and run <code>npm install</code> and <code>npm run build</code> within the folder to install remaining Oobee dependencies:

    cd node_modules/@govtechsg/oobee
    npm install
    npm run build
    cd ../../..

Create <code>cypress.config.js</code> with the following contents, and change your Name, E-mail address, and boolean value for whether rule items requiring manual review in the report should be displayed below:

    import { defineConfig } from "cypress";
    import oobeeA11yInit from "@govtechsg/oobee";

    // viewport used in tests to optimise screenshots
    const viewportSettings = { width: 1920, height: 1040 };
    // specifies the number of occurrences before error is thrown for test failure
    const thresholds = { mustFix: 20, goodToFix: 25 };
    // additional information to include in the "Scan About" section of the report
    const scanAboutMetadata = { browser: 'Chrome (Desktop)' };
    // name of the generated zip of the results at the end of scan
    const resultsZipName = "oobee-scan-results"

    const oobeeA11y = await oobeeA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Cypress Scan", // label for test
        "Your Name",
        "email@domain.com",
        true, // include screenshots of affected elements in the report
        viewportSettings,
        thresholds,
        scanAboutMetadata,
        resultsZipName
    );

    export default defineConfig({
        taskTimeout: 120000, // need to extend as screenshot function requires some time
        viewportHeight: viewportSettings.height,
        viewportWidth: viewportSettings.width,
        e2e: {
            setupNodeEvents(on, _config) {
                on("task", {
                    getPurpleA11yScripts() {
                        return oobeeA11y.getScripts();
                    },
                    async pushPurpleA11yScanResults({res, metadata, elementsToClick}) {
                        return await oobeeA11y.pushScanResults(res, metadata, elementsToClick);
                    },
                    returnResultsDir() {
                        return `results/${oobeeA11y.randomToken}_${oobeeA11y.scanDetails.urlsCrawled.scanned.length}pages/report.html`;
                    },
                    finishPurpleA11yTestCase() {
                        oobeeA11y.testThresholds();
                        return null;
                    },
                    async terminatePurpleA11y() {
                        return await oobeeA11y.terminate();
                    },
                });
            },
        },
    });

Create a sub-folder and file <code>cypress/support/e2e.js</code> with the following contents:

    Cypress.Commands.add("injectPurpleA11yScripts", () => {
        cy.task("getPurpleA11yScripts").then((s) => {
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
            cy.task("finishPurpleA11yTestCase"); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate oobeeA11y instance.
        });
    });

    Cypress.Commands.add("terminatePurpleA11y", () => {
        cy.task("terminatePurpleA11y");
    });

Create <code>cypress/e2e/spec.cy.js</code> with the following contents:

    describe("template spec", () => {
        it("should run oobee A11y", () => {
            cy.visit(
                "https://govtechsg.github.io/purple-banner-embeds/oobee-integrated-scan-example.htm"
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

Run your test with <code>npx cypress run</code>.  
You will see Oobee results generated in <code>results</code> folder.

</details>
<details>
<summary>Click here to see an example usage in an E2E Cypress test (typescript)</summary>

We will be creating the following files in a demo Cypress project:

    ├── cypress.config.ts
    ├── cypress.d.ts
    ├── package.json
    ├── src
    │   └── cypress
    │       ├── e2e
    │       │   └── spec.cy.ts
    │       └── support
    │           └── e2e.ts
    └── tsconfig.json

Create a <code>package.json</code> by running <code>npm init</code> . Accept the default options or customise it as needed.

Change the type of npm package to module by running <code>npm pkg set type="module"</code>

Install the following node dependencies by running <code>npm install cypress @types/cypress @govtechsg/oobee typescript --save-dev </code>

Create a <code>tsconfig.json</code> in the root directory and add the following:

```
{
"compilerOptions": {
"outDir": "./dist",
"allowJs": true,
"target": "es2021",
"module": "nodenext",
"rootDir": "./src",
"skipLibCheck": true,
"types": ["cypress"]
},
"include": ["./src/**/*", "cypress.d.ts"]
}
```

Navigate to <code>node_modules/@govtechsg/oobee</code> and run <code>npm install</code> and <code>npm run build</code> within the folder to install remaining Oobee dependencies:

    cd node_modules/@govtechsg/oobee
    npm install
    npm run build
    cd ../../..

Create <code>cypress.config.ts</code> with the following contents, and change your Name, E-mail address, and boolean value for whether rule items requiring manual review in the report should be displayed below:

    import { defineConfig } from "cypress";
    import oobeeA11yInit from "@govtechsg/oobee";

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
    // name of the generated zip of the results at the end of scan
    const resultsZipName: string = "oobee-scan-results"

    const oobeeA11y = await oobeeA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Cypress Scan", // label for test
        "Your Name",
        "email@domain.com",
        true, // include screenshots of affected elements in the report
        viewportSettings,
        thresholds,
        scanAboutMetadata,
        resultsZipName
    );

    export default defineConfig({
        taskTimeout: 120000, // need to extend as screenshot function requires some time
        viewportHeight: viewportSettings.height,
        viewportWidth: viewportSettings.width,
        e2e: {
            setupNodeEvents(on, _config) {
                on("task", {
                    getPurpleA11yScripts(): string {
                        return oobeeA11y.getScripts();
                    },
                    async pushPurpleA11yScanResults({res, metadata, elementsToClick}: { res: any, metadata: any, elementsToClick: any[] }): Promise<{ mustFix: number, goodToFix: number }> {
                        return await oobeeA11y.pushScanResults(res, metadata, elementsToClick);
                    },
                    returnResultsDir(): string {
                        return `results/${oobeeA11y.randomToken}_${oobeeA11y.scanDetails.urlsCrawled.scanned.length}pages/reports/report.html`;
                    },
                    finishPurpleA11yTestCase(): null {
                        oobeeA11y.testThresholds();
                        return null;
                    },
                    async terminatePurpleA11y(): Promise<string> {
                        return await oobeeA11y.terminate();
                    },
                });
            },
            supportFile: 'dist/cypress/support/e2e.js',
            specPattern: 'dist/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        },
    });

Create a sub-folder and file <code>src/cypress/support/e2e.ts</code> with the following contents:

    Cypress.Commands.add("injectPurpleA11yScripts", () => {
        cy.task("getPurpleA11yScripts").then((s: string) => {
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
            cy.task("finishPurpleA11yTestCase"); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate oobeeA11y instance.
        });
    });

    Cypress.Commands.add("terminatePurpleA11y", () => {
        cy.task("terminatePurpleA11y");
    });

Create <code>src/cypress/e2e/spec.cy.ts</code> with the following contents:

    describe("template spec", () => {
        it("should run oobee A11y", () => {
            cy.visit(
                "https://govtechsg.github.io/purple-banner-embeds/oobee-integrated-scan-example.htm"
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

Create <code>cypress.d.ts</code> in the root directory with the following contents:

```
declare namespace Cypress {
  interface Chainable<Subject> {
    injectPurpleA11yScripts(): Chainable<void>;
    runPurpleA11yScan(options?: PurpleA11yScanOptions): Chainable<void>;
    terminatePurpleA11y(): Chainable<any>;
  }

  interface PurpleA11yScanOptions {
    elementsToScan?: string[];
    elementsToClick?: string[];
    metadata?: string;
  }
}

interface Window {
  runA11yScan: (elementsToScan?: string[]) => Promise<any>;
}
```

Compile your typescript code with <code>npx tsc</code>.  
Run your test with <code>npx cypress run</code>.

You will see Oobee results generated in <code>results</code> folder.

</details>

#### Playwright

<details>
    <summary>Click here to see an example usage in Playwright (javascript)</summary>

Create a <code>package.json</code> by running <code>npm init</code> . Accept the default options or customise it as needed.

Change the type of npm package to module by running <code>npm pkg set type="module"</code>

Install the following node dependencies by running <code>npm install playwright @govtechsg/oobee --save-dev</code> and <code>npx playwright install</code>

Navigate to <code>node_modules/@govtechsg/oobee</code> and run <code>npm install</code> and <code>npm run build</code> within the folder to install remaining Oobee dependencies:

    cd node_modules/@govtechsg/oobee
    npm install
    npm run build
    cd ../../..

On your project's root folder, create a Playwright test file <code>oobeeA11y-playwright-demo.js</code>:

    import { chromium } from "playwright";
    import oobeeA11yInit from "@govtechsg/oobee";

    // viewport used in tests to optimise screenshots
    const viewportSettings = { width: 1920, height: 1040 };
    // specifies the number of occurrences before error is thrown for test failure
    const thresholds = { mustFix: 20, goodToFix: 25 };
    // additional information to include in the "Scan About" section of the report
    const scanAboutMetadata = { browser: 'Chrome (Desktop)' };

    const oobeeA11y = await oobeeA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Playwright Scan", // label for test
        "Your Name",
        "email@domain.com",
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
            await oobeeA11y.pushScanResults(scanRes);
            oobeeA11y.testThresholds(); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate oobeeA11y instance.
        };

        await page.goto('https://govtechsg.github.io/purple-banner-embeds/oobee-integrated-scan-example.htm');
        await page.evaluate(oobeeA11y.getScripts());
        await runPurpleA11yScan();

        await page.getByRole('button', { name: 'Click Me' }).click();
        // Run a scan on <input> and <button> elements
        await runPurpleA11yScan(['input', 'button'])


        // ---------------------
        await context.close();
        await browser.close();
        await oobeeA11y.terminate();
    })();

Run your test with <code>node oobeeA11y-playwright-demo.js</code> .

You will see Oobee results generated in <code>results</code> folder.

</details>
<details>
    <summary>Click here to see an example usage in Playwright (typescript)</summary>

Create a <code>package.json</code> by running <code>npm init</code> . Accept the default options or customise it as needed.

Change the type of npm package to module by running <code>npm pkg set type="module"</code>

Install the following node dependencies by running <code>npm install playwright @govtechsg/oobee typescript --save-dev</code> and <code>npx playwright install</code>

Create a <code>tsconfig.json</code> in the root directory and add the following:

```
{
"compilerOptions": {
"outDir": "./dist",
"allowJs": true,
"target": "es2021",
"module": "nodenext",
"rootDir": "./src",
"skipLibCheck": true
},
"include": ["./src/**/*"]
}
```

Navigate to <code>node_modules/@govtechsg/oobee</code> and run <code>npm install</code> and <code>npm run build</code> within the folder to install remaining Oobee dependencies:

    cd node_modules/@govtechsg/oobee
    npm install
    npm run build
    cd ../../..

Create a sub-folder and Playwright test file <code>src/oobeeA11y-playwright-demo.ts</code> with the following contents:

    import { Browser, BrowserContext, Page, chromium } from "playwright";
    import oobeeA11yInit from "@govtechsg/oobee";

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

    const oobeeA11y = await oobeeA11yInit(
        "https://govtechsg.github.io", // initial url to start scan
        "Demo Playwright Scan", // label for test
        "Your Name",
        "email@domain.com",
        true, // include screenshots of affected elements in the report
        viewportSettings,
        thresholds,
        scanAboutMetadata,
    );

    (async () => {
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
            await oobeeA11y.pushScanResults(scanRes);
            oobeeA11y.testThresholds(); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate oobeeA11y instance.
        };

        await page.goto('https://govtechsg.github.io/purple-banner-embeds/oobee-integrated-scan-example.htm');
        await page.evaluate(oobeeA11y.getScripts());
        await runPurpleA11yScan();

        await page.getByRole('button', { name: 'Click Me' }).click();
        // Run a scan on <input> and <button> elements
        await runPurpleA11yScan(['input', 'button'])


        // ---------------------
        await context.close();
        await browser.close();
        await oobeeA11y.terminate();
    })();

Compile your typescript code with <code>npx tsc</code>.  
Run your test with <code>node dist/oobeeA11y-playwright-demo.js</code>.

You will see Oobee results generated in <code>results</code> folder.

</details>

#### Automating Web Crawler Login

<details>
    <summary>Click here to see an example automated web crawler login (javascript)</summary>
<code>automated-web-crawler-login.js</code>:
   
    import { chromium } from 'playwright';
    import { exec } from 'child_process';

    const loginAndCaptureHeaders = async (url, email, password) => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(url);
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);

        const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click('input[type="submit"]'),
        ]);

        // Format cookie retrieved from page
        const formatCookies = cookies => {
            return cookies.map(cookie => `cookie ${cookie.name}=${cookie.value}`).join('; ');
        };

        // Retrieve cookies after login
        let cookies = await page.context().cookies();
        const formattedCookies = formatCookies(cookies);

        // Close browser
        await browser.close();

        return formattedCookies;
    };

    const runPurpleA11yScan = command => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(stderr);
            }
            console.log(stdout);
        });
    };

    const runScript = () => {
        loginAndCaptureHeaders(
            // Test example with authenticationtest.com
            'https://authenticationtest.com/simpleFormAuth/',
            'simpleForm@authenticationtest.com',
            'pa$$w0rd',
        )
            .then(formattedCookies => {
                console.log('Cookies retrieved.\n');
                // where -m "..." are the headers needed in the format "header1 value1, header2 value2" etc
                // where -u ".../loginSuccess/" is the destination page after login
                const command = `npm run cli -- -c website -u "https://authenticationtest.com/loginSuccess/" -p 1 -k "Your Name:email@domain.com" -m "${formattedCookies}"`;
                console.log(`Executing PurpleA11y scan command:\n> ${command}\n`);
                runPurpleA11yScan(command);
            })
            .catch(err => {
                console.error('Error:', err);
            });
    };

    runScript();

</details>
<details>
    <summary>Click here to see an example automated web crawler login (typescript)</summary>
<code>automated-web-crawler-login.ts</code>:
   
    import { chromium, Browser, Page, Cookie } from 'playwright';
    import { exec } from 'child_process';

    const loginAndCaptureHeaders = async (url: string, email: string, password: string): Promise<string> => {
        const browser: Browser = await chromium.launch({ headless: true });
        const page: Page = await browser.newPage();

        await page.goto(url);
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);

        const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click('input[type="submit"]'),
        ]);

        // Format cookie retrieved from page
        const formatCookies = (cookies: Cookie[]): string => {
            return cookies.map(cookie => `cookie ${cookie.name}=${cookie.value}`).join('; ');
        };

        // Retrieve cookies after login
        let cookies: Cookie[] = await page.context().cookies();
        const formattedCookies: string = formatCookies(cookies);

        // Close browser
        await browser.close();

        return formattedCookies;
    };

    const runPurpleA11yScan = (command: string): void => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(stderr);
            }
            console.log(stdout);
        });
    };

    const runScript = (): void => {
        loginAndCaptureHeaders(
            // Test example with authenticationtest.com
            'https://authenticationtest.com/simpleFormAuth/',
            'simpleForm@authenticationtest.com',
            'pa$$w0rd',
        )
            .then((formattedCookies: string) => {
                console.log('Cookies retrieved.\n');
                // where -m "..." are the headers needed in the format "header1 value1, header2 value2" etc
                // where -u ".../loginSuccess/" is the destination page after login
                const command: string = `npm run cli -- -c website -u "https://authenticationtest.com/loginSuccess/" -p 1 -k "Your Name:email@domain.com" -m "${formattedCookies}"`;
                console.log(`Executing PurpleA11y scan command:\n> ${command}\n`);
                runPurpleA11yScan(command);
            })
            .catch((err: Error) => {
                console.error('Error:', err);
            });
    };

    runScript();

</details>
