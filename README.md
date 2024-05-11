# Aware SDK - Enabling Full Stack Recording for Test Creation
[![](https://jitpack.io/v/awarelabshq/aware-sdk.svg)](https://jitpack.io/#awarelabshq/aware-sdk)

## Introduction

[Aware Labs](https://awarelabs.io) empowers teams to capture what happens in their entire stack during manual testing / prod sessions, and create repeatable full-stack automation tests that cover the entire stack.

Aware SDK consists of frontend and backend libraries for different technologies enabling Aware’s full stack capturing capabilities. Teams simply need to install the relevant SDKs (and configure) in their tech stack. After that, via Aware platform, they can then create automated full stack tests from the captured sessions.

Prerequisite: Your system should be instrumented with OpenTelemetry. Refer to guide [here](https://awarelabs.io/blog/getting-started) for more details.

If your preferred tech stack is not supported, feel free to raise a [feature request](https://github.com/awarelabshq/aware-sdk/issues/new).

The sdk is organized as follows:

- frontend/ : This includes SDKs for enabling frontend recording
  - [js](https://github.com/awarelabshq/aware-sdk?tab=readme-ov-file#javascript)    
- backend/ : This includes SDKs for enabling backend service recording
  - [Java (Spring)](https://github.com/awarelabshq/aware-sdk?tab=readme-ov-file#java-spring)
- protos/ : Defines proto structure for communicating payloads (this is used by different backend SDKs to communicate payloads consistently in a tech-stack agnostic manner).

## Frontend

### JavaScript

#### Installation Guide

1) Run: ```npm install aware-sdk-js@latest```
2) Include the following code snippet (with updated configuration as detailed below) in your initial loading js file (index.js or equivalent) to configure the sdk.

```
import {AwareSDK} from "aware-sdk-js"


window.onload = function () {
 AwareSDK.startRecording({
   projectId: "<YOUR AWARE PROJECT ID>",
   apiKey: "<YOUR SESSION RECORDING API  KEY FOR AWARE PROJECT>",
   samplingProbabilityOnError: 0.1,
   samplingProbability: 1.0,
   maxSessionDurationSecs: 500,
   eventWindowToSaveOnError: 200,
   urlRegexToAddTracking:".*\.awarelabs\.io.*$"
 });
```

#### Configuration Guide

The SDK behaviour can be configured with the following config params:

```projectId```: This is the project id for your project in Aware Platform (Access via Project Settings -> General -> Project ID)

```apiKey```: This is the session recording api key for your project (Access via Project Settings -> General -> Session Recording API key) - Note: Not Api Key (which is used for data api access for integration with your CI / CD pipelines etc.)

```samplingProbability```: This is the probability an arbitrary session will be recorded. Set this to 1.0 to capture all sessions (recommended setting for test environments).

```samplingProbabilityOnError```: This is the probability of recording if an error occurs. Useful for capturing erroring scenario recordings in production. ```<eventWindowToSaveOnError>``` number of preceding events will be recorded if being sampled on error.

```maxSessionDurationSecs```: Maximum number of seconds of a session to be recorded. (Default: 300)

```eventWindowToSaveOnError```: number of events to be recoded preceding an error.

```urlRegexToAddTracking```: Regex describing the uris to which calls should be tracked (usually the urls of your API layer that the client app communicates with)

## Backend

### Java (Spring)

#### Installation Guide

1) Add following to your gradle file to import Aware SDK library:

```
repositories {
   maven { url = uri("https://jitpack.io") }
}

...

implementation("com.github.awarelabshq:aware-sdk:0.0.1")

```

2) Add ```@EnableAspectJAutoProxy``` In your ```@SpringApplication``` annotated class (This wires up the sdk components to the spring contexts. However, the components are by default disabled, which can be enabled via property definitions).

#### Configuration Guide

Aware SDK looks for the following properties (defined via ```application.properties``` or equivalent) to enable / disable features:

```aware.sdk.enabled```: true | false (default: false)

This enables the sdk and captures tracking headers (session tracking / test invocation tracking etc.)

```aware.request_body_capture.enabled```: true | false (default: false)

This enables request body capture on incoming requests to the service. The exact requests captured, the fields that are captured and ignored etc. are configured via request_body_captrue_config.yml file.

```aware.response_body_capture.enabled```: true | false (default: false)

This enables response body capture on the service. The exact responses captured, the fields that are captured and ignored etc. are configured via request_body_captrue_config.yml file.

```aware.request_body_capture.config.file.path```: (default: ```classpath:aware_request_body_capture_config.yml```)

This yml file details how the requests / responses should be captured (field masking, header ignoring etc.) Refer to Aware Request Capture Config section for more details.

### Aware Request / Response Capture Configuration

Aware backend sdks request / response capture behaviour can be configured via a yml file with the following structure:

```
global_config:
  # payload of urls that match this set will not be captured
  ignored_urls:
    - ".*/admin/get_detailed_user_info"
  # globally, the following headers will not be captured
  ignored_headers:
    - "Authorization"
  # If there is a user id field passed as a header, it can be specified here. This will be used to tag the session to
  # the given user so that sessions for a given test user can be queried later from Aware Studio. This is only expected
  # to be extracted in test environments and not prod for PII preservation.
  user_id_header: "x-user-id"
url_configs:
  # Each section is formatted as "url_pattern" under which:
  # request - section will describe how requests are captured for uris matching the url_pattern (if request block not present, request won't be captured)
  # response - section will describe how responses are captured for uris matching the url_pattern (if response block not present, response won't be captured)
  .*/admin/.*:
    request:
    response:
      # listed headers under this will be specifically not captured for this url_pattern
      ignored_headers:
        - "User-Auth-Token"
      # fields matching the following json path queries will be ignored in the captured request / response.
      ignored_fields:
        - "$.results[*].items[*].bar"
      # fields matching the following json queries will be captured as span attributes (the name of the span attribute will be the name of the field). If there are multiple matches, the values will be concat using ","
      extract_to_span_attributes:
        - "$.results[*].item_type"
      # Headers listed below will be captured as separate span attributes. The name of the attribute will be the name of the header field.
      extract_headers_to_span_attributes:
        - "project_id"
      # If the unique user id is part of the body (either response or request) rather than a header, the json path to
      # the body element can be specified here. This will be used to extract and tag each session to the corresponding
      # test user so that sessions for a given user can be queried via Aware Studio. This is only recommended in test
      # envs to preserve PII in prod.
      user_id_field:
        "$.user_info.user_id"
```

For example, the following configuration does the following:
1) Ignore ```Authorization``` header from all requests / responses
2) Ignore payload capturing for all urls matching ```.*/health/.*```
3) Captures request & response payloads for urls matching ```.*/user/.*```. Ignores ```$.password``` field in json request body.
4) Captures _only_ request payloads for urls matching ```.*/admin/.*```. Captures ```$.user_info.email``` json field as user_id of the requestor (which enables teams to find sessions corresponding to a given test user via Aware Studio)

Sample Config:

```
global_config:
  ignored_urls:
    - ".*/health/.*
  ignored_headers:
    - "Authorization"
url_configs:
  .*/user/.*:
    request:
      ignored_fields:
        - "$.password
    response:
  .*/admin/.*:
    request:
      user_id_field:
        "$.user_info.email"
```

