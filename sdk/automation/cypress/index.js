const { v4: uuidv4 } = require('uuid');

// Define a global variable to store invocation IDs
const invocationIdMap = new Map();

// Update the enableTracking function to accept parameters and maintain invocation IDs
module.exports = function enableTracking(disableLogging) {
    beforeEach(() => {
        const uniqueUUID = uuidv4();
        const titleParts = Cypress.currentTest.titlePath;
        const suite = titleParts[0];
        const name = titleParts[1];
        const testKey = `${suite}#${name}`;

        invocationIdMap.set(testKey, uniqueUUID);
        cy.intercept(
            { url: '*', middleware: true },
            (req) => {
                ;
                if (titleParts && titleParts.length >= 2 && titleParts[1] !== 'after all') {
                    req.headers['trackedtest.suite'] = suite;
                    req.headers['trackedtest.name'] = name;
                    req.headers['trackedtest.invocation_id'] = uniqueUUID;
                    req.headers['trackedtest.type'] = 'cypress';
                    if (!disableLogging) {
                        console.log("Tracked Test metadata attached" + " suite: " + suite + " name: " + name + " invocation_id: " + uniqueUUID);
                    }
                }
            });
    });

    // After all, clear the map
    after(() => {
        invocationIdMap.clear();
    });
};

function logProtoProperty(protoMessage) {
  if (protoMessage.stringValue) {
    return protoMessage.stringValue;
  } else if (protoMessage.floatValue) {
    return protoMessage.floatValue;
  } else if (protoMessage.boolValue) {
    return protoMessage.boolValue;
  } else {
    return 'No value present';
  }
}

// Utility function to check assertions
function checkAssertions(config, invocationId, maxRetries, waitTime, failFast) {
  if (maxRetries <= 0) {
    cy.log("Maximum number of retries exhausted. Skipped backend assertion verification.");
    return Cypress.Promise.resolve(true);
  }

  return cy.request({
    method: 'POST',
    url: `${config.api_endpoint}/assert_invocation`,
    headers: {
      'Project-Id': config.project_id,
      'Api-Key': config.api_key,
    },
    body: {
      "invocation_id": invocationId,
    },
  }).then((response) => {
    if (response.body.invocationResult === 'FAILED') {
      cy.log('Backend assertions failed');
      response.body.assertionResults.forEach((assertionResult) => {
        cy.log(`Assertion: ${assertionResult.assertionString}`);
        const leftActualValue = logProtoProperty(assertionResult.leftActualValue);
        const rightActualValue = logProtoProperty(assertionResult.rightActualValue);
        cy.log(`Left Actual Value: ${leftActualValue}`);
        cy.log(`Right Actual Value: ${rightActualValue}`);
        cy.log(`Result: ${assertionResult.result}`);
      });
      if (failFast===true) {
        cy.fail('Failing test since backend assertions failed');
        return Cypress.Promise.resolve(false);
      } else {
        return Cypress.Promise.resolve(false);
      }
    } else if (response.body.invocationResult === 'PASSED') {
      cy.log('All backend assertions passed');
      response.body.assertionResults.forEach((assertionResult) => {
        cy.log(`Assertion: ${assertionResult.assertionString}`);
        const leftActualValue = logProtoProperty(assertionResult.leftActualValue);
        const rightActualValue = logProtoProperty(assertionResult.rightActualValue);
        cy.log(`Left Actual Value: ${leftActualValue}`);
        cy.log(`Right Actual Value: ${rightActualValue}`);
        cy.log(`Result: ${assertionResult.result}`);
      });
      return Cypress.Promise.resolve(true);
    } else {
      // No results found, retry after the specified wait time
      return cy.wait(waitTime).then(() => {
        return checkAssertions(config, invocationId, maxRetries - 1, waitTime, failFast);
      });
    }
  });
}


// Cypress custom command for verifying backend assertions
Cypress.Commands.add('verifyBackendAssertions', (waitTime = 120000,retryWaitTime=30000,maxRetryAttempts=2) => {
  try {
    cy.fixture('tracked-tests-config.json').then((configData) => {
      const config = configData;
      if (!config || !config.project_id || !config.api_key || !config.api_endpoint) {
        // Log a message if any of the required fields are missing in the config
        cy.log('Missing configuration fields. Please ensure that "project_id," "api_key," and "api_endpoint" are set in the fixtures/tracked-tests-config.json.');
        return;
      }

      const titleParts = Cypress.currentTest.titlePath;
      const suite = titleParts[0];
      const name = titleParts[1];
      const testKey = `${suite}#${name}`;

      const invocationId = invocationIdMap.get(testKey);
      if (!invocationId) {
        throw new Error('Invocation ID for the test not found. Make sure enableTracking() is present in your support/e2e.js file.');
      }

      // Start checking assertions
      cy.wait(waitTime);
      checkAssertions(config, invocationId, maxRetryAttempts, retryWaitTime,true);
    });
  } catch (error) {
    console.error(error);
    // Handle the case where the file is not present
    console.error('WARNING: Your tracked-tests-config.json file is not present in the fixtures folder. Please set up the configuration.');
  }
});

// Cypress custom command for verifying backend assertions in all tests within the current suite
Cypress.Commands.add('verifyAllBackendAssertionsInSuite', (waitTime = 120000, retryWaitTime = 0, maxRetryAttempts = 1) => {
  try {
    cy.fixture('tracked-tests-config.json').then((configData) => {
      const config = configData;
      if (!config || !config.project_id || !config.api_key || !config.api_endpoint) {
        // Log a message if any of the required fields are missing in the config
        cy.log('Missing configuration fields. Please ensure that "project_id," "api_key," and "api_endpoint" are set in the fixtures/tracked-tests-config.json.');
        return;
      }
      cy.wait(waitTime);

      let failedAssertionsCount = 0;

      invocationIdMap.forEach((invocationId, testKey) => {
        cy.log("Verifying backend assertions for " + testKey + " invocation_id: " + invocationId);
        checkAssertions(config, invocationId, maxRetryAttempts, retryWaitTime, false).then(success => {
          if (!success) {
            cy.log("Backend assertions failed for " + testKey);
            failedAssertionsCount++;
          }
        });
      });

      // Delay the check to ensure the loop has completed
      cy.wait(500).then(() => {
        const anyTestFailed = failedAssertionsCount > 0;
        cy.log("failed assertion count " + failedAssertionsCount).then(()=>{
          if (anyTestFailed) {
            // Fail the test if any assertion failed
            cy.fail('One or more backend assertions failed');
          }
        });
      });
    });
  } catch (error) {
    console.error(error);
    // Handle the case where the file is not present
    console.error('WARNING: Your tracked-tests-config.json file is not present in the fixtures folder. Please set up the configuration.');
  }
});

