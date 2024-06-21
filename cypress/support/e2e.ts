Cypress.Commands.add("injectPurpleA11yScripts", () => {
    cy.task("getPurpleA11yScripts").then((s: string) => {
        cy.window().then((win) => {
            win.eval(s);
        });
    });
});

Cypress.Commands.add("runPurpleA11yScan", (items={}) => {
    cy.window().then(async (win) => {
        const { elementsToScan, elementsToClick, metadata } = items;
        const res = await win.runA11yScan(elementsToScan);
        cy.task("pushPurpleA11yScanResults", {res, metadata, elementsToClick}).then((count) => { return count });
        cy.task("pushPurpleA11yScanResults", {res, metadata, elementsToClick}).then((count) => { return count });
        cy.task("finishPurpleA11yTestCase"); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate purpleA11y instance.
    });
});

Cypress.Commands.add("terminatePurpleA11y", () => {
    cy.task("terminatePurpleA11y");
});