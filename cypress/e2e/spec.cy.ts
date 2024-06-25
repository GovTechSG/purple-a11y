describe('CLI Functional Tests', () => {
  const runCommand = (command) => {
    return cy.exec(command, { failOnNonZeroExit: false, timeout: 240000 }).then((result) => {
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
    runCommand('npm run cli -- -c sitemap -k "yx:accessibility@tech.gov.sg" -u http://tech.gov.sg/sitemap.xml -b chrome').then(() => {
      cy.visit('http://tech.gov.sg');
      cy.injectPurpleA11yScripts();
      cy.runPurpleA11yScan();
      
      // Wait for the button to become visible and then click it
      cy.get("button[onclick=\"toggleSecondSection()\"]", { timeout: 10000 }).should('be.visible').click();
      
      // Run a scan on <input> and <button> elements
      cy.runPurpleA11yScan({
        elementsToScan: ["input", "button"],
        elementsToClick: ["button[onclick=\"toggleSecondSection()\"]"],
        metadata: "Clicked button"
      });
      
      cy.terminatePurpleA11y();
    });
  });
});
