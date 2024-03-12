
// Define a global variable to store invocation IDs
const invocationIdMap = new Map();
const invocationIdToTraceIdMap = new Map();

// Update the enableTracking function to accept parameters and maintain invocation IDs
module.exports = function enableTracking(disableLogging) {

    before(()=>{
          invocationIdMap.clear();
          invocationIdToTraceIdMap.clear();
     });

    beforeEach(() => {
        const invocationId=Array(16).fill().map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        const titleParts = Cypress.currentTest.titlePath;
        const suite = titleParts[0];
        const name = titleParts[1];
        const testKey = `${suite}#${name}`;

        invocationIdMap.set(testKey, invocationId);
        cy.intercept(
            { url: '*', middleware: true },
            (req) => {
                if (titleParts && titleParts.length >= 2 && titleParts[1] !== 'after all') {
                    const {traceId,_,traceparent}=generateTraceparent(invocationId);
                    if (!invocationIdToTraceIdMap.has(invocationId)) {
                            invocationIdToTraceIdMap.set(invocationId, new Set());
                    }
                    invocationIdToTraceIdMap.get(invocationId).add(traceId);

                    req.headers['trackedtest.suite'] = suite;
                    req.headers['trackedtest.name'] = name;
                    req.headers['test.type'] = 'cypress';
                    req.headers['traceparent']=traceparent;
                    if (!disableLogging) {
                        console.log("Tracked Test metadata attached" + " suite: " + suite + " name: " + name + " invocation_id: " + invocationId + " traceparent " + traceparent + " for url: " + req.url);
                    }
                }
            });
    });

    function generateTraceparent(invocationId) {
        // Generate random trace ID (hexadecimal, 32 characters)
        const traceId = Array(32)
            .fill()
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');

        // Combine trace ID and parent ID in a traceparent format
        const traceparent = `00-${traceId}-${invocationId}-01`;

        // Return trace ID, parent ID, and traceparent
        return { traceId, invocationId, traceparent };
    }

    // After all, clear the map
    after(() => {
        invocationIdMap.clear();
        invocationIdToTraceIdMap.clear();
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





function extractSuiteAndName(testKey) {
    const delimiterIndex = testKey.indexOf('#');
    if (delimiterIndex === -1) {
        return { suite: null, name: null };
    }

    const suite = testKey.substring(0, delimiterIndex);
    const name = testKey.substring(delimiterIndex + 1);

    return [ suite, name ];
}

// Utility function to check assertions
function checkAssertions(config, invocationId, maxRetries, waitTime, failFast,qualifiedTestName) {
  cy.log("Checking assertions for " + qualifiedTestName);
  if (maxRetries <= 0) {
    console.log("Maximum number of retries exhausted. Skipped backend assertion verification.");
    return Cypress.Promise.resolve(true);
  }

  const [testSuite,testName]=extractSuiteAndName(qualifiedTestName);
  console.log("trace ids to send: " + Array.from(invocationIdToTraceIdMap.get(invocationId) || new Set()));
  return cy.request({
    method: 'POST',
    url: `${config.api_endpoint}/assert_invocation`,
    headers: {
      'Project-Id': config.project_id,
      'Api-Key': config.api_key,
    },
    body: {
      "invocation_id": invocationId,
      "trace_ids": Array.from(invocationIdToTraceIdMap.get(invocationId) || new Set()),
      "test_name":{
            "name":testName,
            "suite":testSuite
      },
      "test_type":"cypress"
    },
   }).then((response) => {
    if (response.body.invocationResult === 'FAILED') {
      cy.log('Backend assertions failed');
      if (response.body.assertionResults) {
          response.body.assertionResults.forEach((assertionResult) => {
            cy.log(`Assertion: ${assertionResult.assertionString}`);
            const leftActualValue = logProtoProperty(assertionResult.leftActualValue);
            const rightActualValue = logProtoProperty(assertionResult.rightActualValue);
            cy.log(`Left Actual Value: ${leftActualValue}`);
            cy.log(`Right Actual Value: ${rightActualValue}`);
            cy.log(`Result: ${assertionResult.result}`);
          });
      }
      if (failFast===true) {
        cy.fail('Failing test since backend assertions failed');
        return Cypress.Promise.resolve(false);
      } else {
        return Cypress.Promise.resolve(false);
      }
    } else if (response.body.invocationResult === 'PASSED') {
      cy.log('All backend assertions passed');
      if (response.body.assertionResults) {
          response.body.assertionResults.forEach((assertionResult) => {
            cy.log(`Assertion: ${assertionResult.assertionString}`);
            const leftActualValue = logProtoProperty(assertionResult.leftActualValue);
            const rightActualValue = logProtoProperty(assertionResult.rightActualValue);
            cy.log(`Left Actual Value: ${leftActualValue}`);
            cy.log(`Right Actual Value: ${rightActualValue}`);
            cy.log(`Result: ${assertionResult.result}`);
          });
      }
      return Cypress.Promise.resolve(true);
    } else {
      // No results found, retry after the specified wait time
      return cy.wait(waitTime).then(() => {
        return checkAssertions(config, invocationId, maxRetries - 1, waitTime, failFast,qualifiedTestName);
      });
    }
  });
}


// Cypress custom command for verifying backend assertions
Cypress.Commands.add('verifyBackendAssertions', (waitTime = 10000,retryWaitTime=10000,maxRetryAttempts=3) => {
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
      checkAssertions(config, invocationId, maxRetryAttempts, retryWaitTime,true,testKey);
    });
  } catch (error) {
    console.error(error);
    // Handle the case where the file is not present
    console.error('WARNING: Your tracked-tests-config.json file is not present in the fixtures folder. Please set up the configuration.');
  }
});

// Cypress custom command for verifying backend assertions in all tests within the current suite
Cypress.Commands.add('verifyAllBackendAssertionsInSuite', (waitTime = 10000, retryWaitTime = 10000, maxRetryAttempts = 2) => {
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
        checkAssertions(config, invocationId, maxRetryAttempts, retryWaitTime, false,testKey).then(success => {
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

