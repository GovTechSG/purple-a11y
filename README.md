# Purple A11y

[Purple A11y](https://go.gov.sg/purple-a11y-cli) is a customisable, automated accessibility testing tool that allows software development teams to assess whether their products are user-friendly to persons with disabilities (PWDs).

This is the engine and command-line interface (CLI) for Purple A11y.  For a desktop graphical user interface (GUI), check out [Purple A11y Desktop](https://go.gov.sg/purple-a11y). The official application can only be downloaded at [https://go.gov.sg/purple-a11y-cicd](https://go.gov.sg/purple-a11y-cicd). We recommend that you download the software only from the official link, as other sources and/or third party links may pose risks and/or compromise your system.


## Technology Stack

1. [Crawlee](https://crawlee.dev/)
2. [Axe-core](https://github.com/dequelabs/axe-core)
3. [Node.js](https://Node.js.org/en/)
4. [Playwright](https://playwright.dev/)
5. [Pixelmatch](https://github.com/mapbox/pixelmatch)
6. [Corretto](https://aws.amazon.com/corretto)
7. [VeraPDF](https://github.com/veraPDF/veraPDF-apps)

## Using Purple A11y as a NodeJS module

If you wish to use Purple A11y as a NodeJS module that can be integrated with end-to-end testing frameworks, refer to the [integration guide](./INTEGRATION.md) on how you can do so.

## Prerequisites and Installations

### Portable Purple A11y

Portable Purple A11y is the recommended way to run Purple A11y as it reduces the difficulty for installation. Refer to [Installation Guide](/INSTALLATION.md) for step-by-step instructions.

### Manual Installation

Please ensure the following requirements are met:

- **Node.js version to be version 15.10.0 and above.**
- If you do not have node, or if there is a need to manage your node versions, you can consider using [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm).
- Make sure NVM is pointing to a node version >= 15.10.0. Please refer to [Usage of Node Version Manager (NVM)](<#usage-of-node-version-manager-(NVM)>)
- Install the required NPM packages with `npm install`.

#### Usage of Node Version Manager (NVM)

```shell
# If have not installed a version >= v15, install NodeJs version with NVM
nvm install <nodejs_version_greater_than_15>

# For subsequent use, you will need to run the command below as time you open a new terminal
nvm use <nodejs_version_greater_than_15>
```

#### Facing issues?

Please refer to [Troubleshooting section](#troubleshooting) for more information.

---

## Features

Purple A11y can perform the following to scan the target URL.

- Results will be compiled in JSON format, followed by generating a HTML report.
- To start using Purple A11y, run `node index`. Questions will be prompted to assist you in providing the right inputs.

> NOTE: For your initial scan, there may be some loading time required before use. Purple-A11y will also ask for your name and email address and collect your app usage data to personalise your experience. Your information fully complies with [GovTech’s Privacy Policy](https://www.tech.gov.sg/privacy/).
> You may delete your cached name and e-mail address by running the following command to delete `userDtata.txt`:
> - Windows (PowerShell): `rm "$env:APPDATA\Purple A11y\userData.txt"`
> - MacOS (Terminal): `rm "$HOME/Library/Application Support/Purple A11y/userData.txt"`

### Scan Selection

You can interact via your arrow keys.

```shell
% node index
┌────────────────────────────────────────────────────────────┐
│  Purple A11y (ver      )                                   │
│  We recommend using Chrome browser for the best experience.│
│                                                            │
│ Welcome back User!!                                        │
│ (Refer to readme.txt on how to change your profile)        │
└────────────────────────────────────────────────────────────┘
? What would you like to scan? (Use arrow keys)
❯ Sitemap
  Website
  Custom
```

### Headless Mode

Headless mode would allow you to run the scan in the background. If you would like to observe the scraping process, please enter `n`

```shell
 % node index
┌────────────────────────────────────────────────────────────┐
│ Purple A11y (ver      )                                    │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Welcome back User!                                         │
│ (Refer to readme.txt on how to change your profile)        │
└────────────────────────────────────────────────────────────┘
? What would you like to scan? Sitemap
? Do you want purple-a11y to run in the background? (Y/n) Y
```

### Sitemap Scan

```shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Purple A11y (ver      )                                     │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Welcome back User!                                         │
│ (Refer to readme.txt on how to change your profile)        │
└────────────────────────────────────────────────────────────┘
? What would you like to scan? Sitemap
? Do you want purple-a11y to run in the background? Yes
? Which screen size would you like to scan? (Use arrow keys) Desktop
? Please enter URL or file path to sitemap, or drag and drop a sitemap file here:  https://www.sitemaps.org/sitemap.xml


 Scanning website...


 Fetching URLs. This might take some time...


Scanning website...

#purple-a11y will then start scraping from the file link provided above.
#Console results

```

If the sitemap URL provided is invalid, an error message will be prompted for you to provide a valid input.

```shell
>> Invalid sitemap format. Please provide a URL with a valid sitemap.
```

### Website Scan

```shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Purple A11y (ver      )                                    │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Welcome back User!                                         │
│ (Refer to readme.txt on how to change your profile)        │
└────────────────────────────────────────────────────────────┘
? What would you like to scan? Website
? Do you want purple-a11y to run in the background? Yes
? Which screen size would you like to scan? (Use arrow keys) Desktop
? Please enter URL of website:  https://www.domain.org

```

If the website URL provided is invalid, an error message will be prompted for you to provide a valid input.

```shell
>> Cannot resolve URL. Please provide a valid URL.
```

### Customised Mobile Device Scan

``` shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Purple A11y (ver      )                                   │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Welcome back User!                                         │
│ (Refer to readme.txt on how to change your profile)        │
└────────────────────────────────────────────────────────────┘
? What would you like to scan? Website
? Do you want purple-a11y to run in the background? No
? Which screen size would you like to scan? (Use arrow keys) (Use arrow keys)
❯ Desktop 
  Mobile
  Custom
```

Choose `Mobile` for a default mobile screen size scan and `Custom` to choose a device or specify viewport width options.

### Custom flow (Preview)

Custom flow allows you to record a series of actions in the browser and re-play them and Purple A11y will trigger the accessibility scan at each step.  This is useful to scan websites that require user and form input.  The recorded script will be stored as `generatedScript*.js`.

1. Start by choosing the `Custom flow` in the menu selection.

```shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Purple A11y (ver      )                                   │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Welcome back User!                                         │
│ (Refer to readme.txt on how to change your profile)        │
└────────────────────────────────────────────────────────────┘
? What would you like to scan?
  Sitemap
  Website
❯ Custom
  ```

1. Specify the URL of the starting page you wish to scan
2. A Chrome and Playwright Inspector window will appear.  Navigate through the pages you would like to conduct an accessibility scan.
3. Close the Chrome window.  Purple A11y will then proceed to re-run your recorded actions and scan each page for accessibility.

Other options:

- You can specify sites to exclude from accessibility scan (e.g. login page) by adding a pattern of the domain to `exclusions.txt`. An example of `exclusions.txt`:

``` txt
\.*singpass.gov.sg\.*
```

- You can re-run your accessibility scan by running `node generatedScript-PHScan_...js` file that is generated.

**Caution**: During the custom flow, sensitive information such as username and passwords might be stored in `generatedScript*.js` as part of the recording.

#### Known Issues

If the custom flow fails to start, you might be running multiple versions of Playwright. Re-install Playwright:

1. On Windows, delete the folder `%USERPROFILE%\AppData\Local\ms-playwright` where `%USERPROFILE%` is typically located at `C:\Users\<username>`.
2. On MacOS, delete the folder `~/Library/Caches/ms-playwright` where `~` refers to `/Users/<username>`.
3. Within PowerShell (Windows) or Terminal (MacOS) app, run the following two commands to re-install Playwright:

```Shell
npx playwright@1.27.1 install
```

### CLI Mode

CLI mode is designed to be run in continuous integration (CI) environment. Run `node cli.js` for a set of command-line parameters available. Please note CLI mode is only supported on Mac/Linux at this moment.

```shell
Usage: node cli.js -c <crawler> -d <device> -w <viewp
ort> -u <url> OPTIONS

Options:
      --help             Show help                                     [boolean]
  -c, --scanner          Type of scan, 1) sitemap, 2) website crawl, 3) custom f
                         low, 4) custom flow 2.0
                                                                      [required] 
                             [choices: "sitemap", "website", "custom", "custom2]
  -u, --url              Website URL you want to scan        [string] [required]
  -d, --customDevice     Device you want to scan   [string] [default: "Desktop"]
  -w, --viewportWidth    Viewport width (in pixels) you want to scan    [number]
  -o, --zip              Zip filename to save results                   [string]
  -p, --maxpages         Maximum number of pages to scan (default: 100). Only av
                         ailable in website and sitemap scans           [number]
  -h, --headless         Whether to run the scan in headless mode. Defaults to y
                         es.    [string] [choices: "yes", "no"] [default: "yes"]
  -b, --browserToRun   Browser to run the scan on: 1) Chromium, 2) Chrome, 3) Ed
                       ge. Defaults to Chromium.
                   [choices: "chrome", "edge", "chromium"] [default: "chromium"]
  -s, --strategy       Strategy to choose which links to crawl in a website scan
                       . Defaults to "same-domain".
                                       [choices: "same-domain", "same-hostname"]
  -k, --nameEmail      To personalise your experience, we will be
                       collecting your name, email address and usage data. 
                       Your information fully complies with GovTech’s Privacy Policy. 
                       Please provide your name and email address 
                       in this format "John Doe:john@domain.com".                   
                                        [string] [required]
  -j, --customFlowLabel  Give Custom Flow Scan a label for easier reference in t
                         he report                                      [string]
  -t, --specifiedMaxConcurrency  Maximum number of pages to scan concurrently.
                                 Use for sites with throttling. Defaults to 25.
                                                                        [number]
  -f, --needsReviewItems  Whether to display rule items requiring manual review 
                          in report. Defaults to false.
                                                      [choices: "true", "false"]
  -i, --fileTypes                    File types to include in the scan. Defaults
                                      to html-only.
       [string] [choices: "all", "pdf-only", "html-only"] [default: "html-only"]
  -x, --blacklistedPatternsFilename  Txt file that has a list of pattern of 
                                     domains to exclude from accessibility scan 
                                     separated by new line
                                            [string] [default: "exclusions.txt"]
  -a, --additional  Additional features to include in the report:
                    screenshots - Include element screenshots in the generated 
                    report
                    none - Exclude all additional features in the generated re
                    port
              [string] [choices: "screenshots", "none"] [default: "screenshots"]
  -q, --metadata  Json string that contains additional scan metadata for
                  telemetry purposes.
                  Defaults to "{}"
                                                        [string] [default: "{}"]
  -r, --followRobots                 Option for crawler to adhere to robots.txt
                                     rules if it exists
                                 [string] [choices: "yes", "no"] [default: "no"]
Examples:
  To scan sitemap of website:', 'node cli.js -c [ 1 | Sitemap ] -d <device> -u
   <url_link> -w <viewportWidth>
  To scan a website', 'node cli.js -c [ 2 | Website ] -d <device> -u <url_link
  > -w <viewportWidth>
  To start a custom flow scan', 'node cli.js -c [ 3 | Custom ] -d <device> -u
  <url_link> -w <viewportWidth>
```

### Device Options

<details>
  <summary>Click here for list of device options supported</summary>

- "Desktop" (defaults to a 1280x720 viewport)
- "Mobile" (defaults to iPhone 11 viewport)
- "Desktop Chrome HiDPI"
- "Desktop Edge HiDPI"
- "Desktop Firefox HiDPI"
- "Desktop Safari"
- "Desktop Chrome"
- "Desktop Edge"
- "Desktop Firefox"
- "Blackberry PlayBook"
- "Blackberry PlayBook landscape"
- "BlackBerry Z30"
- "BlackBerry Z30 landscape"
- "Galaxy Note 3"
- "Galaxy Note 3 landscape"
- "Galaxy Note II"
- "Galaxy Note II landscape"
- "Galaxy S III"
- "Galaxy S III landscape"
- "Galaxy S5"
- "Galaxy S5 landscape"
- "Galaxy S8"
- "Galaxy S8 landscape"
- "Galaxy S9+"
- "Galaxy S9+ landscape"
- "Galaxy Tab S4"
- "Galaxy Tab S4 landscape"
- "iPad (gen 6)"
- "iPad (gen 6) landscape"
- "iPad (gen 7)"
- "iPad (gen 7) landscape"
- "iPad Mini"
- "iPad Mini landscape"
- "iPad Pro 11"
- "iPad Pro 11 landscape"
- "iPhone 6"
- "iPhone 6 landscape"
- "iPhone 6 Plus"
- "iPhone 6 Plus landscape"
- "iPhone 7"
- "iPhone 7 landscape"
- "iPhone 7 Plus"
- "iPhone 7 Plus landscape"
- "iPhone 8"
- "iPhone 8 landscape"
- "iPhone 8 Plus"
- "iPhone 8 Plus landscape"
- "iPhone SE"
- "iPhone SE landscape"
- "iPhone X"
- "iPhone X landscape"
- "iPhone XR"
- "iPhone XR landscape"
- "iPhone 11"
- "iPhone 11 landscape"
- "iPhone 11 Pro"
- "iPhone 11 Pro landscape"
- "iPhone 11 Pro Max"
- "iPhone 11 Pro Max landscape"
- "iPhone 12"
- "iPhone 12 landscape"
- "iPhone 12 Pro"
- "iPhone 12 Pro landscape"
- "iPhone 12 Pro Max"
- "iPhone 12 Pro Max landscape"
- "iPhone 12 Mini"
- "iPhone 12 Mini landscape"
- "iPhone 13"
- "iPhone 13 landscape"
- "iPhone 13 Pro"
- "iPhone 13 Pro landscape"
- "iPhone 13 Pro Max"
- "iPhone 13 Pro Max landscape"
- "iPhone 13 Mini"
- "iPhone 13 Mini landscape"
- "Kindle Fire HDX"
- "Kindle Fire HDX landscape"
- "LG Optimus L70"
- "LG Optimus L70 landscape"
- "Microsoft Lumia 550"
- "Microsoft Lumia 550 landscape"
- "Microsoft Lumia 950"
- "Microsoft Lumia 950 landscape"
- "Nexus 10"
- "Nexus 10 landscape"
- "Nexus 4"
- "Nexus 4 landscape"
- "Nexus 5"
- "Nexus 5 landscape"
- "Nexus 5X"
- "Nexus 5X landscape"
- "Nexus 6"
- "Nexus 6 landscape"
- "Nexus 6P"
- "Nexus 6P landscape"
- "Nexus 7"
- "Nexus 7 landscape"
- "Nokia Lumia 520"
- "Nokia Lumia 520 landscape"
- "Nokia N9"
- "Nokia N9 landscape"
- "Pixel 2"
- "Pixel 2 landscape"
- "Pixel 2 XL"
- "Pixel 2 XL landscape"
- "Pixel 3"
- "Pixel 3 landscape"
- "Pixel 4"
- "Pixel 4 landscape"
- "Pixel 4a (5G)"
- "Pixel 4a (5G) landscape"
- "Pixel 5"
- "Pixel 5 landscape"
- "Moto G4"
- "Moto G4 landscape"

</details>

If the device name contains ```(``` and ```)```, wrap the device name in single quotes when entered into the CLI.
Please note that ```-d``` and ```-w``` are mutually exclusive. If none are specified, the default device used for the CLI scan is Desktop.

For example, to conduct a website scan to the URL `http://localhost:8000` and write to `a11y-scan-results.zip` with an `iPad_(gen_7)_landscape` screen, run

```shell
node cli.js -c 2 -o a11y-scan-results.zip -u http://localhost:8000 -d 'iPad_(gen_7)_landscape'
```

For example, to conduct a website scan to the URL `http://localhost:8000` and write to `a11y-scan-results.zip` with a custom screen width `360`, run

```shell
node cli.js -c 2 -o a11y-scan-results.zip -u http://localhost:8000 -w 360
```

## Accessibility Scan Results
For details on which accessibility scan results trigger "Must Fix" / "Good to Fix" findings, you may refer to [Scan Issue Details](https://github.com/GovTechSG/purple-a11y/blob/master/DETAILS.md).

## Troubleshooting

Please refer to the information below to exist in debugging. Most errors below are due to the switching between Node.js versions.

### Incompatible Node.js versions

**Issue**: When your Node.js version is incompatible, you may face the following syntax error.
**Solution**: Install Node.js versions > v15.10.0, i.e. Node.js v16 and above.

```shell
const URL_NO_COMMAS_REGEX = RegExp('https?://(www\\.)?[\\p{L}0-9][-\\p{L}0-9@:%._\\+~#=]{0,254}[\\p{L}0-9]\\.[a-z]{2,63}(:\\d{1,5})?(/[-\\p{L}0-9@:%_\\+.~#?&//=\\(\\)]*)?', 'giu'); // eslint-disable-line
                            ^
SyntaxError: Invalid regular expression: /https?://(www\.)?[\p{L}0-9][-\p{L}0-9@:%\._\+~#=]{0,254}[\p{L}0-9]\.[a-z]{2,63}(:\d{1,5})?(/[-\p{L}0-9@:%_\+.~#?&//=\(\)]*)?/: Invalid escape
```

### Compiled against a different Node.js version

**Issue**: When you switch between different versions of Node.js in your environment, you may face the following error.

```shell
<user_path>/purple-a11y/node_modules/bindings/bindings.js:91
        throw e
        ^

Error: The module '<module_file_path>'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 57. This version of Node.js requires
NODE_MODULE_VERSION 88. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```

**Solution**: As recommended in the error message, run `npm rebuild` or `npm install`

### dyld Error

**Issue**: Not able to run Purple A11y due to the following error shown below

```shell
dyld: lazy symbol binding failed: Symbol not found: __ZN2v87Isolate37AdjustAmountOfExternalAllocatedMemoryEx
  Referenced from: <user_path>/purple-a11y/node_modules/libxmljs/build/Release/xmljs.node
  Expected in: flat namespace

dyld: Symbol not found: __ZN2v87Isolate37AdjustAmountOfExternalAllocatedMemoryEx
  Referenced from: <user_path>/PURPLE_A11y/purple-a11y/node_modules/libxmljs/build/Release/xmljs.node
  Expected in: flat namespace

zsh: abort      node index.js
```

**Solutions**:

1. Delete existing `node_modules` folder and re-install the NPM packages with `npm install`.
2. Refer to this [GitHub issue](https://github.com/fsevents/fsevents/issues/313) for more alternative solutions

### Element Screenshot Limitation

**Limitation**: Due to animations causing elements to shift out of the viewport after an Axe scan, there's a risk of element screenshots timing out within 5 seconds if the element is not found. This known issue is particularly prevalent in scenarios like carousels with interval-based transitions.

## How do I limit number of pages scanned?

If you find a scan takes too long to complete due to large website, or there are too many pages in a sitemap to scan, you may choose to limit number of pages scanned.

To do this, run CLI mode `node cli.js` with the needed settings and specify `-p 10` where `10` is the number of pages you wish to scan.

## Additional Information on Data

Purple A11y uses third-party open-source tools that may be downloaded over the Internet during the installation process of Purple A11y. Users should be aware of the libraries used by examining `package.json`.

Purple A11y may send information to the website, URL and HTML code snippets where the user chooses to initiate a Purple A11y scan for telemetry purposes.
