const { v4: uuidv4 } = require('uuid');

// Export the function that sets up the beforeEach block
module.exports = function enableTracking() {
  beforeEach(() => {
    cy.intercept(
      { url: '*', middleware: true },
      (req) => {
        const currentTestSuite = Cypress.mocha.getRunner().suite.ctx.parent?.title || '';
        const currentTestName = Cypress.mocha.getRunner().suite.ctx.test.title;
        const uniqueUUID = uuidv4();

        req.headers['trackedtest.name'] = `${currentTestSuite}#${currentTestName}`;
        req.headers['trackedtest.invocation_id'] = uniqueUUID;
        req.headers['trackedtest.type'] = 'automated';
      }
    );
  });
};
