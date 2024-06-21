describe("template spec", () => {
    it("should run purple A11y", () => {
        cy.visit(
            "https://govtechsg.github.io/purple-banner-embeds/purple-integrated-scan-example.htm"
        );
        cy.injectPurpleA11yScripts();
        cy.runPurpleA11yScan();
         cy.get("button[onclick=\"toggleSecondSection()\"]").click();
        // Run a scan on <input> and <button> elements
        cy.runPurpleA11yScan({
            elementsToScan: ["input", "button"],
            elementsToClick: ["button[onclick=\"toggleSecondSection()\"]"],
            metadata: "Clicked button"
        });

        cy.terminatePurpleA11y();
    });
});