declare namespace Cypress {
    interface Chainable<Subject> {
      injectPurpleA11yScripts(): Chainable<void>;
      runPurpleA11yScan(options?: PurpleA11yScanOptions): Chainable<void>;
      terminatePurpleA11y(): Chainable<void>;
    }
  
    interface PurpleA11yScanOptions {
      elementsToScan?: string[];
      elementsToClick?: string[];
      metadata?: string;
    }
  }
  
  interface Window {
    runA11yScan: (elementsToScan?: string[]) => Promise<any>;
  }