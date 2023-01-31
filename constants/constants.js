import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const maxRequestsPerCrawl = 100;

// for crawlers
export const axeScript = 'node_modules/axe-core/axe.min.js';

const urlsCrawledObj = {
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

const scannerTypes = {
  login: 'login',
  sitemap: 'sitemap',
  website: 'website',
};


// Check if running in docker container
let launchOptionsArgs = [];
if (fs.existsSync('/.dockerenv')) {
  launchOptionsArgs = ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'];
}

const devices = [
  'Desktop',
  'Blackberry_PlayBook',
  'Blackberry_PlayBook_landscape',
  'BlackBerry_Z30',
  'BlackBerry_Z30_landscape',
  'Galaxy_Note_3',
  'Galaxy_Note_3_landscape',
  'Galaxy_Note_II',
  'Galaxy_Note_II_landscape',
  'Galaxy_S_III',
  'Galaxy_S_III_landscape',
  'Galaxy_S5',
  'Galaxy_S5_landscape',
  'Galaxy_S8',
  'Galaxy_S8_landscape',
  'Galaxy_S9+',
  'Galaxy_S9+_landscape',
  'Galaxy_Tab_S4',
  'Galaxy_Tab_S4_landscape',
  'iPad',
  'iPad_landscape',
  'iPad_(gen_6)',
  'iPad_(gen_6)_landscape',
  'iPad_(gen_7)',
  'iPad_(gen_7)_landscape',
  'iPad_Mini',
  'iPad_Mini_landscape',
  'iPad_Pro',
  'iPad_Pro_landscape',
  'iPad_Pro_11',
  'iPad_Pro_11_landscape',
  'iPhone 4',
  'iPhone_4_landscape',
  'iPhone_5',
  'iPhone_5_landscape',
  'iPhone_6',
  'iPhone_6_landscape',
  'iPhone_6_Plus',
  'iPhone_6_Plus_landscape',
  'iPhone_7',
  'iPhone_7_landscape',
  'iPhone_7_Plus',
  'iPhone_7_Plus_landscape',
  'iPhone_8',
  'iPhone_8_landscape',
  'iPhone_8_Plus',
  'iPhone_8_Plus_landscape',
  'iPhone_SE',
  'iPhone_SE_landscape',
  'iPhone_X',
  'iPhone_X_landscape',
  'iPhone_XR',
  'iPhone_XR_landscape',
  'iPhone_11',
  'iPhone_11_landscape',
  'iPhone_11_Pro',
  'iPhone_11_Pro_landscape',
  'iPhone_11_Pro_Max',
  'iPhone_11_Pro_Max_landscape',
  'iPhone_12',
  'iPhone_12_landscape',
  'iPhone_12_Pro',
  'iPhone_12_Pro_landscape',
  'iPhone_12_Pro_Max',
  'iPhone_12_Pro_Max_landscape',
  'iPhone_12_Mini',
  'iPhone_12_Mini_landscape',
  'iPhone_13',
  'iPhone_13_landscape',
  'iPhone_13_Pro',
  'iPhone_13_Pro_landscape',
  'iPhone_13_Pro_Max',
  'iPhone_13_Pro_Max_landscape',
  'iPhone_13_Mini',
  'iPhone_13_Mini_landscape',
  'JioPhone_2',
  'JioPhone_2_landscape',
  'Kindle_Fire_HDX',
  'Kindle_Fire_HDX_landscape',
  'LG_Optimus_L70',
  'LG_Optimus_L70_landscape',
  'Microsoft_Lumia_550',
  'Microsoft_Lumia_950',
  'Microsoft_Lumia_950_landscape',
  'Nexus_10',
  'Nexus_10_landscape',
  'Nexus_4',
  'Nexus_4_landscape',
  'Nexus_5',
  'Nexus_5_landscape',
  'Nexus_5X',
  'Nexus_5X_landscape',
  'Nexus_6',
  'Nexus_6_landscape',
  'Nexus_6P',
  'Nexus_6P_landscape',
  'Nexus_7',
  'Nexus_7_landscape',
  'Nokia_Lumia_520',
  'Nokia_Lumia_520_landscape',
  'Nokia_N9',
  'Nokia_N9_landscape',
  'Pixel_2',
  'Pixel_2_landscape',
  'Pixel_2_XL',
  'Pixel_2_XL_landscape',
  'Pixel_3',
  'Pixel_3_landscape',
  'Pixel_4',
  'Pixel_4_landscape',
  'Pixel_4a_(5G)',
  'Pixel_4a_(5G)_landscape',
  'Pixel_5',
  'Pixel_5_landscape',
  'Moto_G4',
  'Moto_G4_landscape',
];

//  _folder_paths
const a11yStorage = '.a11y_storage';

export const impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

const xmlSitemapTypes = {
  xml: 0,
  xmlIndex: 1,
  rss: 2,
  atom: 3,
  unknown: 4
}

export default {
  a11yStorage,
  a11yDataStoragePath: `${a11yStorage}/datasets`,
  allIssueFileName: 'all_issues',
  cliZipFileName: 'a11y-scan-results.zip',
  maxRequestsPerCrawl,
  maxConcurrency: 5,
  scannerTypes,
  urlsCrawledObj,
  impactOrder,
  devices,
  launchOptionsArgs: launchOptionsArgs,
  xmlSitemapTypes
}

export const rootPath = __dirname;
export const wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
const latestAxeVersion = '4.4';
export const axeVersion = latestAxeVersion;
export const axeWebPage = `https://dequeuniversity.com/rules/axe/${latestAxeVersion}/`;

export const alertMessageOptions = {
  border: true,
  borderColor: 'red',
};
