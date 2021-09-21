// for crawlers
exports.axeScript = 'node_modules/axe-core/axe.min.js';

exports.maxRequestsPerCrawl = 1000;

exports.maxConcurrency = 5;

exports.pseudoUrls = host => [
  // eslint-disable-next-line no-useless-escape
  `[.*(?<!mailto.*)]${host}[(?!.*\.(gif|jpg|jpeg|png|webp|avif|pdf|doc|css|svg|js|ts|xml|csv|tgz|zip|xls|ppt|ico|woff)).*]`,
];

exports.urlsCrawledObj = {
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

// folder paths
const a11yStorage = '.a11y_storage';

exports.a11yStorage = a11yStorage;

exports.a11yDataStoragePath = `${a11yStorage}/datasets`;

exports.currentResultsFolderPath = 'results/current';

exports.allIssueFileName = 'all_issues';

exports.rootPath = __dirname;

// others
exports.impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

exports.wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
exports.axeWebPage = 'https://dequeuniversity.com/rules/axe/4.3/';
