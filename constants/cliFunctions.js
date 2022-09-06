exports.messageOptions = {
  border: false,
  marginTop: 2,
  marginBottom: 2,
};

exports.alertMessageOptions = {
  border: true,
  borderColor: 'red',
};

exports.cliOptions = {
  c: {
    alias: 'scanner',
    describe: 'Type of crawler, 1) sitemap or 2) website',
    choices: ['sitemap', 'website'],
    demandOption: true,
  },
  u: {
    alias: 'url',
    describe: 'Website URL you want to scan',
    type: 'string',
    demandOption: true,
  },
  o: {
    alias: 'zip',
    describe: 'Zip filename to save results',
    type: 'string',
    demandOption: false,
  },
  reportbreakdown: {
    describe: 'Will break down the main report according to impact',
    type: 'boolean',
    default: false,
    demandOption: false,
  },
  warn: {
    describe: 'Track for issues of target impact level',
    choices: ['critical', 'serious', 'moderate', 'minor', 'none'],
    default: 'none',
    demandOption: false,
  },
};

exports.configureReportSetting = isEnabled => {
  if (isEnabled) {
    process.env.REPORT_BREAKDOWN = 1;
  } else {
    process.env.REPORT_BREAKDOWN = 0;
  }
};

