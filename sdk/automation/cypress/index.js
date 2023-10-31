const { v4: uuidv4 } = require('uuid');

// Export the function that sets up the beforeEach block
module.exports = function enableTracking(disableLogging) {
    beforeEach(() => {
        const uniqueUUID = uuidv4();
        cy.intercept(
          { url: '*', middleware: true },
          (req) => {
            const titleParts = Cypress.currentTest.titlePath;
            if (titleParts && titleParts.length >= 2 && titleParts[1]!='"after all" hook') {
              req.headers['trackedtest.suite'] = titleParts[0];
              req.headers['trackedtest.name'] = titleParts[1];
              req.headers['trackedtest.invocation_id'] = uniqueUUID;
              req.headers['trackedtest.type'] = 'cypress';
              if(!disableLogging){
                console.log("Tracked Test metadata attached" + " suite: " + req.headers['trackedtest.suite'] + " name: " + req.headers['trackedtest.name'] + " invocation_id: " + uniqueUUID);
              }
            }
          }
        );
    });
};
