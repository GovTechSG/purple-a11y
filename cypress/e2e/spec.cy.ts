/// <reference types="cypress" />

describe('CLI Functional Tests', () => {
  const runCommand = (command) => {
    // Return the promise directly
    return cy.exec(command, { failOnNonZeroExit: false, timeout: 60000 }).then((result) => {
          if (result.code !== 0) {
              console.error(`Command failed: ${command}`);
              console.error(`Error: ${result.stderr}`);
              throw new Error(`Command failed with exit code ${result.code}`);
          } else {
              console.log(`Command succeeded: ${command}`);
              console.log(`Output: ${result.stdout}`);
          }
      });
  };


  it('Sitemap Scan', () => {
    runCommand('npm run cli -- -c sitemap -k "yx:accessibility@tech.gov.sg" -u http://tech.gov.sg/sitemap.xml -b chrome')
            .then(() => {
                cy.injectPurpleA11yScripts();
                return cy.runPurpleA11yScan();
            })
            .then(() => {
                // Additional Cypress commands or assertions
                cy.get("button[onclick=\"toggleSecondSection()\"]").click();
                cy.runPurpleA11yScan({
                    elementsToScan: ["input", "button"],
                    elementsToClick: ["button[onclick=\"toggleSecondSection()\"]"],
                    metadata: "Clicked button"
                });
            })
            .then(() => {
                cy.terminatePurpleA11y();
            });
  });

  it('Website Scan', () => {
    runCommand('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
  });

  it('Custom Flow Scan', () => {
    runCommand('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
  });

  it('Intelligent Scan', () => {
    runCommand('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
  });

  it('Scan Website - Custom Device', () => {
    runCommand('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -d mobile');
  });

  it('Custom Flow Scan - Specific Viewport Width', () => {
    runCommand('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -w 1200');
  });

  it('Intelligent Scan - Fixed Name', () => {
    runCommand('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -o results.zip');
  });

  it('Website Scan - Maximum Pages', () => {
    runCommand('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -p 200');
  });

  it('Scan Website - Safe Mode', () => {
    runCommand('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -f yes');
  });

  it('Custom Flow Scan - Export Directory', () => {
    runCommand('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -e ./scans');
  });

  it('Intelligent Scan - Follow Robots Enabled', () => {
    runCommand('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -r yes');
  });

  it('Scan Website - Additional Features None', () => {
    runCommand('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -a none');
  });

  it('Custom Flow Scan - Custom Flow Label', () => {
    runCommand('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -j "Custom Flow Scan"');
  });
});
