# Tracked Tests - Bringing Full Stack Visibility to Automation Tests
[![](https://jitpack.io/v/awarelabshq/tracked-tests.svg)](https://jitpack.io/#awarelabshq/tracked-tests)

## Introduction

"Tracked Tests" connects your automation tests (Cypress, Selenium, Appium, Playwright, Locust etc.) to the full stack execution data of your system by utilizing telemetric tracking, giving you complete transparency in to how the backend systems behaved within the execution of each test case. This is utilized by [Aware Labs](https://awarelabs.io), to deliver powerful capabilities such as:
1) Add assertions on backend behaviour expectations anywhere in the stack - enabling you to augment your existing frontend automation tests to become full stack whitebox tests - so that you dont need to write separate integration tests.
2) Identify root causes faster when a test fails by leveraging the full stack visibility of what happened in each layer of your backend when serving the requests made within the frontend test
3) Enable powerful governance functionalities such as identify production execution paths of related flows that are not covered by a given test case - helping you to plan how to improve the test case
4) View related test cases that cover a given backend operation - so that you can identify which tests should be improved when a backend operation is identified as failing for certain conditions.

Currently, Tracked Tests project supports the following automation tools:
1) Cypress
2) Locust

If your preferred automation tool or backend is not supported, feel free to raise a [feature request](https://github.com/awarelabshq/tracked-tests/issues/new).

For more details on value added capabilities Aware Platform provides using Tracked Tests, visit: [https://awarelabs.io/blog/tracked-tests](https://awarelabs.io/blog/tracked-tests).

## How it Works

Tracked Tests works by adding the following attributes to the Traces at the backend (when initiated by an automation test case):

1) `trackedtest.suite`: name of the current test suite
2) `trackedtest.name`: name of the current test case
3) `traceparent`: traceparent which sets the trace id as well as the parent id for that trace (which groups all the traces generated in a single run of a given test case)
4) `trackedtest.type`: type of test (for instance, `cypress`)

This is achieved by adding an interceptor on the automation test tool side which adds equivalently named http headers to all the requests that are sent from a test case, and an interceptor at the backend which extracts those http headers and injects them to the current Trace.span attributes - enabling correlation of traces at an individual test case (invocation) level.

## How to Use

Enabling Tracked Tests requires enabling it in your automation tests and enabing your backend systems to receive (and inject) the additional tracking metadata sent via the request headers.

### Enabling in Automation Script

#### Cypress

Steps:

1. Install `tracked-tests-cypress` npm library:  

```
npm install tracked-tests-cypress
``` 

  
2. Add the following in `support/e2e.js` file:  

```
const enableTracking = require('tracked-tests-cypress')
enableTracking();
```

  
### Updating backends to receive the tracking metadata

Simply update your ```OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST``` environment variable to include the trackedtests related headers like below, which will capture the headers and inject in to the spans as an attribute:
```
ENV OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST="trackedtest.suite,trackedtest.name,traceparent,test.type"
```

## Request Capture

Tracked Tests library also supports capturing request body / headers and extracting specific request fields and injecting them as OTel span attributes. This enables software teams to capture actual requests relating to arbitrary criteria such as:
1) Find a sampling of payloads for erroring requests
2) Find a sampling of payloads for slow requests
3) Find a sampling of payloads for API calls that went through a certain execution path / attribute value in the execution tree.

Aware platform utilizes this to enable building tests using production traffic as a baseline, allowing teams to create tests for erroring scenarios / high latency scenarios / untested execution paths etc.

Currently Java (Spring) is supported for request capture.

### Java Spring integration of Request Capture

1) Add gradle dependency:

```
    implementation("com.github.awarelabshq:tracked-tests:<latest_version>")
```

2) Enable the request capture filter:

Set aware.request_body_capture.enabled property to true (if not set, defaults to false).

```
aware.request_body_capture.enabled=true
```

3) (Optional) Configure the request scrubbing / span attribute extraction

   The behaviour of the filter can be configured to specify which request fields should be scrubbed and which request fields need to be extracted in to separate span attributes. By default, it looks for a file named: aware_request_body_capture_config.yml in the classpath. This can be overridden by specifiying aware.request_body_capture.config.file.path in your application.properties / yml file.
   The yml is of the following format:
   ```
   <uri pattern>:
     ignoredFields:
       - "<json selector>"
       - "<json selector>"
     extractToSpanAttributes:
       - "<json selector>"
       - "<json selector>"
   ```

   Sample:
  ```
   /foo/bar:
    extractToSpanAttributes:
      - "$.user_country"
    ignoredFields:
      - "$.user_info.user_id

  /foo/*:
    ignoredFields:
      - "$.auth_info.token
 ```

  When a request to a uri is received, all the uri patterns configured in the yml file that matches that uri is utilized. So, in the above example, all uris under /foo will get its auth_info.token field scrubbed (so that you dont need to repeatedly specify it for all endpoints), and /foo/bar requests will specifically have their user_info.user_id field scrubbed. Additionally, user_country field will be extracted as a separate span attribute. The name of the extracted attribute will be the name of the json field (user_country).
  
For questions / suggestions, reach out to [contact@awarelabs.io](mailto:contact@awarelabs.io).

Proudly powered by [Aware Labs](https://awarelabs.io)
