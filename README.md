# Tracked Tests

## Introduction

"Tracked Tests" connects your frontend automation tests (Cypress, Selenium, Appium, Playwright etc.) to the full stack execution data of your system by utilizing telemetric tracking, giving you complete transparency in to how the backend systems behaved within the execution of each test case. This is utilized by [Aware Labs](https://awarelabs.io) - A Telemetry Centric Test Governance Platform, to deliver powerful capabilities such as:
1) Add assertions on backend behaviour expectations anywhere in the stack - enabling you to augment your existing frontend automation tests to become full stack whitebox tests - so that you dont need to write separate integration tests.
2) Identify root causes faster when a test fails by leveraging the full stack visibility of what happened in each layer of your backend when serving the requests made within the frontend test
3) Enable powerful governance functionalities such as identify production execution paths of related flows that are not covered by a given test case - helping you to plan how to improve the test case
4) View related test cases that cover a given backend operation - so that you can identify which tests should be improved when a backend operation is identified as failing for certain conditions.

Currently, Tracked Tests project supports the following automation tools:
1) Cypress

And the following backend technologies:
1) Java (Spring)
2) NodeJS

If your preferred automation tool or backend is not supported, feel free to raise a [feature request](https://github.com/awarelabshq/tracked-tests/issues/new).

For more details on value added capabilities Aware Platform provides using Tracked Tests, visit: [https://awarelabs.io/blog/tracked-tests](https://awarelabs.io/blog/tracked-tests).

## How it Works

Tracked Tests works by adding the following attributes to the Traces at the backend (when initiated by an automation test case):

1) `trackedtest.suite`: name of the current test suite
2) `trackedtest.name`: name of the current test case
3) `trackedtest.invocation_id`: unique identifier identifying an individual invocation of a test case (a unique run of a test case)
4) `trackedtest.type`: type of test (for instance, `cypress`)

This is achieved by adding an interceptor on the automation test tool side which adds equivalently named http headers to all the requests that are sent from a test case, and an interceptor at the backend which extracts those http headers and injects them to the current Trace.span attributes - enabling correlation of traces at an individual test case (invocation) level.

## How to Use

Enabling Tracked Tests requires enabling it in your automation tests and enabing your backend systems to receive (and inject) the additional tracking metadata sent via the request headers.

### Enabling in Automation Script

#### Cypress

Steps:

1) Install `tracked-tests-cypress` npm library:
`npm install tracked-tests-cypress`
2) Add the following in support/e2e.js:
`const enableTracking = require('tracked-tests-cypress')
enableTracking();`

### Updating backends to receive the tracking metadata

#### Java (Spring)

Steps:

1) Install `tracked-tests-spring-boot-starter` library:
`implementation("org.trackedtests:tracked-tests-spring-boot-starter:0.0.7-SNAPSHOT")`
2) Add `@EnabledTrackedTests` to your `@SpringBootApplication` class.

### NodeJS

Steps:

1) Install `tracked-tests-nodejs` npm library:
`npm install tracked-tests-nodejs`
2) Add the following in your app.ts (or other entrypoint ts / js file):
`import enableTrackedTests from 'tracked-tests-nodejs';
app.use(enableTrackedTests());`

Proudly powered by [Aware Labs](https://awarelabs.io)
