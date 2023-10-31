const express = require('express');
const { context, trace } = require('@opentelemetry/api');

function enableTrackedTests() {
  const app = express();

  // Middleware to intercept incoming requests
  app.use((req, res, next) => {
    const testName = req.headers['trackedtest.name'];
    const testSuite = req.headers['trackedtest.suite'];
    const invocationId = req.headers['trackedtest.invocation_id'];
    const testType = req.headers['trackedtest.type'];

    if(trace.getSpan(context.active())){
          // If there's an active span, add the header values to the current span
        if (testName) {
            trace.getSpan(context.active()).setAttribute('trackedtest.name', testName);
        }
        if (testSuite) {
            trace.getSpan(context.active()).setAttribute('trackedtest.suite', testSuite);
        }
        if (invocationId) {
            trace.getSpan(context.active()).setAttribute('trackedtest.invocation_id', invocationId);
        }
        if (testType) {
            trace.getSpan(context.active()).setAttribute('trackedtest.type', testType);
        }
    }
    next(); // Continue processing the request
  });

  return app;
}

enableTrackedTests();

module.exports = enableTrackedTests;
