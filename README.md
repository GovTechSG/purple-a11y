# Purple HATS

Purple HATS is a customisable, automated accessibility testing tool that allows software development teams to assess whether their products are user-friendly to persons with disabilities (PWDs).

## Technology Stack

1. [Crawlee](https://crawlee.dev/)
2. [Axe-core](https://github.com/dequelabs/axe-core)
3. [Node.js](https://Node.js.org/en/)

## Prerequisites and Installations

### Portable Purple hats

Portable Purple hats is the recommended way to run Purple hats as it reduces the difficulty for installation. Refer to [Installation Guide](/INSTALLATION.md) for step-by-step instructions.

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

Purple HATS can perform the following to scan the target URL.

- Results will be compiled in JSON format, followed by generating a HTML report.
- To start using Purple HATS, run `node index`. Questions will be prompted to assist you in providing the right inputs.

> NOTE: For your initial scan, there may be some loading time required before use.

### Scan Selection

You can interact via your arrow keys.

```shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today?
❯ sitemap
  website
  custom flow 
```

### Headless Mode

Headless mode would allow you to run the scan in the background. If you would like to observe the scraping process, please enter `n`

```shell
 % node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? Sitemap
? Do you want purple-hats to run in the background? (Y/n) Y
```

### Sitemap Scan

```shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? Sitemap
? Do you want purple-hats to run in the background? Yes
? Please enter URL to sitemap:  https://www.sitemaps.org/sitemap.xml

Scanning website...

#purple-hats will then start scraping from the file link provided above.
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
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? Website
? Do you want purple-hats to run in the background? Yes
? Please enter URL of website:  https://www.sitemaps.org
```

If the website URL provided is invalid, an error message will be prompted for you to provide a valid input.

```shell
>> Cannot resolve URL. Please provide a valid URL.
```

### Customised Mobile Device Scan

```
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? website
? Do you want purple-hats to run in the background? No
? Which screen size would you like to scan? (Use arrow keys) 
  Desktop 
❯ Mobile 
  Custom 
```

Choose `Mobile` for a default mobile screen size scan and `Custom` to choose a device or specify viewport width options.

### Custom flow (Preview)

Custom flow allows you to record a series of actions in the browser and re-play them and Purple hats will trigger the accessibility scan at each step.  This is useful to scan websites that require user and form input.  The recorded script will be stored as `generatedScript*.js`.

1. Start by choosing the `Custom flow` in the menu selection.
```shell
% node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? (Use arrow keys)
  sitemap 
  website 
❯ custom flow 
  ```
2. Specify the URL of the starting page you wish to scan
3. A Chrome and Playwright Inspector window will appear.  Navigate through the pages you would like to conduct an accessibility scan.
4. Close the Chrome window.  Purple HATS will then proceed to re-run your recorded actions and scan each page for accessibility.

Other options:
- You can specify sites to exclude from accessibility scan (e.g. login page) by adding the domain to `exclusions.txt`.
- You can re-run your accessibility scan by running `node generatedScript-PHScan_...js` file that is generated.

**Caution**: During the custom flow, sensitive information such as username and passwords might be stored in `generatedScript*.js` as part of the recording.

#### Known Issues
If the custom flow fails to start, remove and re-install Playwright:
1. On Windows, delete the folder `%USERPROFILE%\AppData\Local\ms-playwright` where `%USERPROFILE%` is typically located at `C:\Users\<username>`.
2. On MacOS, delete the folder `~/Library/Caches/ms-playwright` where `~` refers to `/Users/<username>`.
3. Within PowerShell (Windows) or Terminal (MacOS) app, run the following two commands to re-install Playwright:
```Shell
npm remove playwright
npm install playwright@1.27.1
```

### CLI Mode

CLI mode is designed to be run in continuous integration (CI) environment. Run `node cli.js` for a set of command-line parameters available. Please note CLI mode is only supported on Mac/Linux at this moment.

```shell
Usage: node cli.js -c <crawler> -u <url> -d <device> -w <viewport width> OPTIONS

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -c, --scanner          Type of crawler, 1) sitemap or 2) website
                                      [required] [choices: "sitemap", "website"]
  -u, --url              Website URL you want to scan        [string] [required]
  -d, --customDevice     Device you want to scan                        [string]
  -w, --viewportWidth    Viewport width (in pixels) you want to scan    [number]
  -o, --zip              Zip filename to save results                   [string]
      --reportbreakdown  Will break down the main report according to impact
                                                      [boolean] [default: false]
      --warn             Track for issues of target impact level
         [choices: "critical", "serious", "moderate", "minor", "none"] [default:
                                                                         "none"]

Examples:
  To scan sitemap of website:', 'node cli.js -c [ 1 | sitemap ] -d <device> -u <url_link>
  To scan a website', 'node cli.js -c [ 2 | website ] -d <device> -u <url_link>

Missing required arguments: c, u
```

### Mobile Device Options
<details>
  <summary>Click here for list of device options supported</summary>

- 'Desktop'
- 'Blackberry_PlayBook'
- 'Blackberry_PlayBook_landscape'
- 'BlackBerry_Z30'
- 'BlackBerry_Z30_landscape'
- 'Galaxy_Note_3'
- 'Galaxy_Note_3_landscape'
- 'Galaxy_Note_II'
- 'Galaxy_Note_II_landscape'
- 'Galaxy_S_III'
- 'Galaxy_S_III_landscape'
- 'Galaxy_S5'
- 'Galaxy_S5_landscape'
- 'Galaxy_S8'
- 'Galaxy_S8_landscape'
- 'Galaxy_S9+'
- 'Galaxy_S9+_landscape'
- 'Galaxy_Tab_S4'
- 'Galaxy_Tab_S4_landscape'
- 'iPad'
- 'iPad_landscape'
- 'iPad_(gen_6)'
- 'iPad_(gen_6)_landscape'
- 'iPad_(gen_7)'
- 'iPad_(gen_7)_landscape'
- 'iPad_Mini'
- 'iPad_Mini_landscape'
- 'iPad_Pro'
- 'iPad_Pro_landscape'
- 'iPad_Pro_11'
- 'iPad_Pro_11_landscape'
- 'iPhone 4'
- 'iPhone_4_landscape'
- 'iPhone_5'
- 'iPhone_5_landscape'
- 'iPhone_6'
- 'iPhone_6_landscape'
- 'iPhone_6_Plus'
- 'iPhone_6_Plus_landscape'
- 'iPhone_7'
- 'iPhone_7_landscape'
- 'iPhone_7_Plus'
- 'iPhone_7_Plus_landscape'
- 'iPhone_8'
- 'iPhone_8_landscape'
- 'iPhone_8_Plus'
- 'iPhone_8_Plus_landscape'
- 'iPhone_SE'
- 'iPhone_SE_landscape'
- 'iPhone_X'
- 'iPhone_X_landscape'
- 'iPhone_XR'
- 'iPhone_XR_landscape'
- 'iPhone_11'
- 'iPhone_11_landscape'
- 'iPhone_11_Pro'
- 'iPhone_11_Pro_landscape'
- 'iPhone_11_Pro_Max'
- 'iPhone_11_Pro_Max_landscape'
- 'iPhone_12'
- 'iPhone_12_landscape'
- 'iPhone_12_Pro'
- 'iPhone_12_Pro_landscape'
- 'iPhone_12_Pro_Max'
- 'iPhone_12_Pro_Max_landscape'
- 'iPhone_12_Mini'
- 'iPhone_12_Mini_landscape'
- 'iPhone_13'
- 'iPhone_13_landscape'
- 'iPhone_13_Pro'
- 'iPhone_13_Pro_landscape'
- 'iPhone_13_Pro_Max'
- 'iPhone_13_Pro_Max_landscape'
- 'iPhone_13_Mini'
- 'iPhone_13_Mini_landscape'
- 'JioPhone_2'
- 'JioPhone_2_landscape'
- 'Kindle_Fire_HDX'
- 'Kindle_Fire_HDX_landscape'
- 'LG_Optimus_L70'
- 'LG_Optimus_L70_landscape'
- 'Microsoft_Lumia_550'
- 'Microsoft_Lumia_950'
- 'Microsoft_Lumia_950_landscape'
- 'Nexus_10'
- 'Nexus_10_landscape'
- 'Nexus_4'
- 'Nexus_4_landscape'
- 'Nexus_5'
- 'Nexus_5_landscape'
- 'Nexus_5X'
- 'Nexus_5X_landscape'
- 'Nexus_6'
- 'Nexus_6_landscape'
- 'Nexus_6P'
- 'Nexus_6P_landscape'
- 'Nexus_7'
- 'Nexus_7_landscape'
- 'Nokia_Lumia_520'
- 'Nokia_Lumia_520_landscape'
- 'Nokia_N9'
- 'Nokia_N9_landscape'
- 'Pixel_2'
- 'Pixel_2_landscape'
- 'Pixel_2_XL'
- 'Pixel_2_XL_landscape'
- 'Pixel_3'
- 'Pixel_3_landscape'
- 'Pixel_4'
- 'Pixel_4_landscape'
- 'Pixel_4a_(5G)'
- 'Pixel_4a_(5G)_landscape'
- 'Pixel_5'
- 'Pixel_5_landscape'
- 'Moto_G4'
- 'Moto_G4_landscape'
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
<user_path>/purple-hats/node_modules/bindings/bindings.js:91
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

**Issue**: Not able to run Purple HATS due to the following error shown below

```shell
dyld: lazy symbol binding failed: Symbol not found: __ZN2v87Isolate37AdjustAmountOfExternalAllocatedMemoryEx
  Referenced from: <user_path>/purple-hats/node_modules/libxmljs/build/Release/xmljs.node
  Expected in: flat namespace

dyld: Symbol not found: __ZN2v87Isolate37AdjustAmountOfExternalAllocatedMemoryEx
  Referenced from: <user_path>/PURPLE_HATS/purple-hats/node_modules/libxmljs/build/Release/xmljs.node
  Expected in: flat namespace

zsh: abort      node index.js
```

**Solutions**:

1. Delete existing `node_modules` folder and re-install the NPM packages with `npm install`.
2. Refer to this [GitHub issue](https://github.com/fsevents/fsevents/issues/313) for more alternative solutions

## How do I limit number of pages scanned?

If you find a scan takes too long to complete due to large website, or there are too many pages in a sitemap to scan, you may choose to limit number of pages scanned.

To do this, open `constants\constants.js` with a text editor. Change the value for `maxRequestsPerCrawl` to a smaller number like 10, e.g. `export let maxRequestsPerCrawl = 10;` and save the file. Start a new purple-hats scan.

## Additional Information on Data

Purple HATS uses third-party open-source tools that may be downloaded over the Internet during the installation process of Purple HATS. Users should be aware of the libraries used by examining `package.json`.

Purple HATS may send information to the website or URL where the user chooses to initiate a Purple HATS scan. By default, data collected by Purple HATS is processed and stored locally on the machine where the tool is run.
