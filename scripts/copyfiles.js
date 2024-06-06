import { exec } from 'child_process';
import os from 'os';
const sourceDir = process.argv[2];
const destDir = process.argv[3];

if (!sourceDir || !destDir) {
  console.error('Usage: node script.js <sourceDir> <destDir>');
  process.exit(1);
}

const platform = os.platform();

if (platform === 'win32') {
  // Windows
  exec(`powershell -Command "New-Item -Path '${destDir}' -ItemType 'directory' -Force" && xcopy "${sourceDir}" "${destDir}" /E /I /Y`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Output: ${stdout}`);
  });
} else {
  // Other operating systems (Linux, macOS, etc.)
  exec(`mkdir -p "${destDir}" && cp -vr "${sourceDir}/." "${destDir}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Output: ${stdout}`);
  });
}