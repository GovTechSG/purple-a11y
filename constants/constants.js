// for crawlers
exports.axeScript = 'node_modules/axe-core/axe.min.js';

exports.maxRequestsPerCrawl = 100;

exports.maxConcurrency = 5;

exports.pseudoUrls = host => [
  // eslint-disable-next-line no-useless-escape
  `[.*(?<!mailto.*)]${host}[(?!.*\.(gif|jpg|jpeg|png|pdf|doc|css|svg|js|ts|xml|csv|tgz|zip|xls|ppt|ico|woff)).*]`,
];

exports.urlsCrawledObj = {
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

exports.scannerTypes = {
  login: 'login',
  sitemap: 'sitemap',
  website: 'website',
};

// folder paths
const a11yStorage = '.a11y_storage';
exports.a11yStorage = a11yStorage;

exports.a11yDataStoragePath = `${a11yStorage}/datasets`;

exports.allIssueFileName = 'all_issues';

exports.cliZipFileName = 'a11y-scan-results.zip';

exports.rootPath = __dirname;

// others
exports.impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

exports.wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
const latestAxeVersion = '4.4';
exports.axeVersion = latestAxeVersion;
exports.axeWebPage = `https://dequeuniversity.com/rules/axe/${latestAxeVersion}/`;

exports.alertMessageOptions = {
  border: true,
  borderColor: 'red',
};
