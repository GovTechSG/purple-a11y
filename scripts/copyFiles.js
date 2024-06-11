import { exec } from 'child_process';
import os from 'os';

const sourceDir = process.argv[2];
const destDir = process.argv[3];

if (!sourceDir || !destDir) {
  process.stderr.write('Usage: node script.js <sourceDir> <destDir>');
  process.exit(1);
}

const platform = os.platform();

if (platform === 'win32') {
  // Windows
  exec(
    `powershell -Command "(New-Item -Path '${destDir}' -ItemType 'directory' -Force); (Copy-item -Path '${sourceDir}' -Destination '${destDir}' -Recurse -Force)"`,
    (error, stdout, stderr) => {
      if (error) {
        process.stderr.write(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        process.stderr.write(`Stderr: ${stderr}`);
        return;
      }
      process.stdout.write(`Output: ${stdout}`);
    },
  );
} else {
  // Other operating systems (Linux, macOS, etc.)
  exec(`mkdir -p "${destDir}" && cp -vr "${sourceDir}" "${destDir}"`, (error, stdout, stderr) => {
    if (error) {
      process.stderr.write(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      process.stderr.write(`Stderr: ${stderr}`);
      return;
    }
    process.stdout.write(`Output: ${stdout}`);
  });
}
