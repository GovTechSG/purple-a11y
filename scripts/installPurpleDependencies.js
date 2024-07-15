/* eslint-disable no-console */
import { exec } from 'child_process';
import os from 'os';

const platform = os.platform();

if (platform === 'win32') {
    // Windows
    exec(
        `scripts\\install_purple_dependencies.cmd`,
        (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
            }
            if (stdout) {
                console.log(`Output: ${stdout}`);
            }
            return;
        });
} else {
    // Other operating systems (Linux, macOS, etc.)
    exec(`sh ./scripts/install_purple_dependencies.command`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        if (stdout) {
            console.log(`Output: ${stdout}`);
        }
        return;
    });
}
