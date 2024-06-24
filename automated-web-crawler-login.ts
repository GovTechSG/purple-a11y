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