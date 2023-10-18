const { v4: uuidv4 } = require('uuid');

// Export the function that sets up the beforeEach block
module.exports = function enableTracking() {
  beforeEach(() => {
    cy.intercept(
      { url: '*', middleware: true },
      (req) => {
        const uniqueUUID = uuidv4();
        const titleParts=Cypress.currentTest.titlePath
        if(titleParts){
          const testName = titleParts.join('#');
          req.headers['trackedtest.name'] = testName;
          req.headers['trackedtest.invocation_id'] = uniqueUUID;
          req.headers['trackedtest.type'] = 'automated';
      }
      }
    );
  });
};
