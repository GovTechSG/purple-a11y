Cypress.Commands.add("injectPurpleA11yScripts", () => {
    cy.task("getPurpleA11yScripts").then((s: string) => {
        cy.window().then((win) => {
            win.eval(s);
        });
    });
});

Cypress.Commands.add("runPurpleA11yScan", (items = {}) => {
    cy.window().then(async (win) => {
        const { elementsToScan, elementsToClick, metadata } = items;
        try {
            const res = await win.runA11yScan(elementsToScan);
            cy.task("pushPurpleA11yScanResults", { res, metadata, elementsToClick }).then((count) => {
                return count;
            });
            cy.task("finishPurpleA11yTestCase");
        } catch (error) {
            // Handle any potential errors in running the scan or pushing results
            cy.log("Error running Purple Hats scan or pushing results: ", error);
        }
    });
});

Cypress.Commands.add("terminatePurpleA11y", () => {
    cy.task("terminatePurpleA11y");
});
