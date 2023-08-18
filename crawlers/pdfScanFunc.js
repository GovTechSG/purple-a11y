import constants, { getExecutablePath } from '../constants/constants.js';
import { spawnSync } from 'child_process';
import { globSync } from 'glob';
import { consoleLogger, silentLogger } from '../logs.js';

const getVeraExecutable = () => {
  const veraPdfExe = getExecutablePath('**/verapdf', 'verapdf');
  if (!veraPdfExe) {
    let veraPdfExeNotFoundError =
      'Could not find veraPDF executable.  Please ensure veraPDF is installed at current directory.';
    consoleLogger.error(veraPdfExeNotFoundError);
    silentLogger.error(veraPdfExeNotFoundError);
  }
  return veraPdfExe; 
}

// get validation profile
const getVeraProfile = () => {
  const veraPdfProfile = globSync('**/verapdf/**/WCAG-21-Complete.xml', {
    absolute: true,
    recursive: true,
    nodir: true,
  });

  if (veraPdfProfile.length === 0) {
    let veraPdfProfileNotFoundError =
      'Could not find veraPDF validation profile.  Please ensure veraPDF is installed at current directory.';
    consoleLogger.error(veraPdfProfileNotFoundError);
    silentLogger.error(veraPdfProfileNotFoundError);
    return undefined; 
  }
  return veraPdfProfile[0];
}

export const runPdfScan = async (randomToken) => {
  const veraPdfExe = getVeraExecutable();
  const veraPdfProfile = getVeraProfile();
  if (!veraPdfExe || !veraPdfProfile) {
    process.exit(1);
  }

  const intermediateFolder = randomToken; // NOTE: assumes this folder is already created for crawlee

  // store in a intermediate folder as we transfer final results later
  const intermediateResultPath = `${intermediateFolder}/${constants.pdfScanResultFileName}`;

  const veraPdfCmdArgs = [
    '-p',
    veraPdfProfile,
    '--format',
    'json',
    '-r', // recurse through directory
    intermediateFolder,
    '>', // pipe output into a result file
    intermediateResultPath,
  ];

  spawnSync(veraPdfExe, veraPdfCmdArgs, { shell: true });
};
