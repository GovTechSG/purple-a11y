/// <reference types="cypress" />

describe('CLI Functional Tests', () => {
    it('Sitemap Scan', () => {
      cy.exec('npm run cli -- -c sitemap -k "yx:accessibility@tech.gov.sg" -u http://tech.gov.sg/sitemap.xml -b chrome');
    });
  
    it('Website Scan', () => {
      cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
    });
  
    it('Custom Flow Scan', () => {
      cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
    });
  
    it('Intelligent Scan', () => {
      cy.exec('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome');
    });

    it('Scan Website - Custom Device', () => {
        cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -d mobile');
    });
    
    it('Custom Flow Scan - Specific Viewport Width', () => {
        cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -w 1200');
    });
    
    it('Intelligent Scan - Fixed Name', () => {
        cy.exec('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -o results.zip');
    });
  
    it('Website Scan - Maximum Pages', () => {
      cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -p 200');
    });
  
    it('Scan Website - Safe Mode', () => {
      cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -f yes');
    });
  
    it('Custom Flow Scan - Export Directory', () => {
      cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -e ./scans');
    });
  
    it('Intelligent Scan - Follow Robots Enabled', () => {
      cy.exec('npm run cli -- -c intelligent -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -r yes');
    });
  
    it('Scan Website - Additional Features None', () => {
      cy.exec('npm run cli -- -c website -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -a none');
    });
  
    it('Custom Flow Scan - Custom Flow Label', () => {
      cy.exec('npm run cli -- -c custom -k "yx:accessibility@tech.gov.sg" -u https://www.tech.gov.sg -b chrome -j "Custom Flow Scan"');
    });
  });
  