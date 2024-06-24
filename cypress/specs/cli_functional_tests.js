/// <reference types="cypress" />
describe('CLI Functional Tests', function () {
    it('Sitemap Scan', function () {
        cy.exec('npm run cli -- -c sitemap -k "yx:accessibility@tech.gov.sg" -u http://tech.gov.sg/sitemap.xml -b chrome');
    });
    it('Website Scan', function () {
        cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
    });
    it('Custom Flow Scan', function () {
        cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
    });
    it('Intelligent Scan', function () {
        cy.exec('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
    });
    it('Scan Website - Custom Device', function () {
        cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -d mobile');
    });

    it('Custom Flow Scan - Specific Viewport Width', function () {
        cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -w 1200');
    });
    it('Intelligent Scan - Fixed Name', function () {
        cy.exec('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -o results.zip');
    });
    it('Website Scan - Maximum Pages', function () {
        cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -p 200');
    });
    it('Scan Website - Safe Mode', function () {
        cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -f yes');
    });
    it('Custom Flow Scan - Export Directory', function () {
        cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -e ./scans');
    });
    it('Intelligent Scan - Follow Robots Enabled', function () {
        cy.exec('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -r yes');
    });
    it('Scan Website - Additional Features None', function () {
        cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -a none');
    });
    it('Custom Flow Scan - Custom Flow Label', function () {
        cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -j "Custom Flow Scan"');
    });
});
