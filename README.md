# TestChimp SDK - Enabling Full Stack Recording for Test Creation
[![](https://jitpack.io/v/awarelabshq/aware-sdk.svg)](https://jitpack.io/#awarelabshq/testchimp-sdk)

## Introduction

[TestChimp](https://testchimp.io) empowers teams to capture what happens in their entire stack during manual testing / prod sessions, and create repeatable full-stack automation tests that cover the entire stack.

TestChimp SDK consists of frontend and backend libraries for different technologies enabling Aware’s full stack capturing capabilities. Teams simply need to install the relevant SDKs (and configure) in their tech stack. After that, via Aware platform, they can then create automated full stack tests from the captured sessions.

Prerequisite: Your system should be instrumented with OpenTelemetry. Refer to guide [here](https://awarelabs.io/blog/getting-started) for more details.

The sdk is organized as follows:

- frontend/ : This includes SDKs for enabling frontend recording
  - [js](https://github.com/awarelabshq/testchimp-sdk?tab=readme-ov-file#javascript)    
- backend/ : This includes SDKs for enabling backend service recording
  - [Java (Spring)](https://github.com/awarelabshq/testchimp-sdk/tree/main/backend/java-spring#java-spring)
  - [NodeJS](https://github.com/awarelabshq/testchimp-sdk/blob/main/backend/nodejs/README.md#aware-sdk-for-nodejs)    
- protos/ : Defines proto structure for communicating payloads (this is used by different backend SDKs to communicate payloads consistently in a tech-stack agnostic manner).

## Frontend

### JavaScript

#### Installation Guide

1) Run: ```npm install @testchimp/js```
2) Include the following code snippet (with updated configuration as detailed below) in your initial loading js file (index.js or equivalent) to configure the sdk.

```
import {AwareSDK} from "@testchimp/js"


window.onload = function () {
 AwareSDK.startRecording({
   projectId: "<YOUR TESTCHIMP PROJECT ID>",
   apiKey: "<YOUR SESSION RECORDING API  KEY FOR TESTCHIMP PROJECT>",
   untracedUriRegexListToTrack:".*\.your-domain\.com.*$"
 });
```

3) Call ```TestChimpSDK.setCurrentUserId()``` (Recommended)

   Call ```TestChimpSDK.setCurrentUserId(<USER_ID)``` to register a human readable user id (such as email) at any point during the session (for instance, after login step). This will enable querying by the test user id to fetch related sessions for easier session filtering.

4) Call ```TestChimpSDK.endTrackedSession()``` to end the current session recording (Recommended)

  By default, the session id is reset only after the browser window is closed. If you want it to be cleared upon the user signing out from your application, you can call ```TestChimpSDK.endTrackedSession()``` when the user logs out.
  
#### Configuration Guide

The SDK behaviour can be configured with the following config params:

```projectId```: (Required) This is the project id for your project in Aware Platform (Access via Project Settings -> General -> Project ID)

```sessionRecordingApiKey```: (Required) This is the session recording api key for your project (Access via Project Settings -> General -> Session Recording API key) - Note: Not Api Key (which is used for data api access for integration with your CI / CD pipelines etc.)

```tracedUriRegexListToTrack```: If you have enabled full stack recording with backend Aware SDKs, add regex of your backend entrypoints called by the client for this attribute. Eg:  ".*://your-domain.*$" Default: ```"/^$/"``` (No matched urls)

```untracedUriRegexListToTrack```: If you have NOT enabled full stack recording with backend Aware SDKs, add regex of your backend entrypoints called by the client for this attribute. Eg:  ".*://your-domain.*$" This will capture the API layer interactions, allowing you to create tests covering the API layer from recorded sessions. If you have enabled backend tracing, no need to specify this. Default: ```"/^$/"``` (No matched urls)

``` enableRecording```: (Optional) This flag helps selectively disable recording (for instance, based on environment). Default: ```true```

```samplingProbability```: (Optional) This is the probability an arbitrary session will be recorded. Set this to 1.0 to capture all sessions (recommended setting for test environments). Default: ```1.0```

```samplingProbabilityOnError```: (Optional) This is the probability of recording if an error occurs. Useful for capturing erroring scenario recordings in production. ```<eventWindowToSaveOnError>``` number of preceding events will be recorded if being sampled on error. Default: ```0.0```

```maxSessionDurationSecs```: (Optional) Maximum number of seconds of a session to be recorded. Default: ```300```

```eventWindowToSaveOnError```: (Optional) number of events to be recoded preceding an error. Default: ```200```

```excludedUriRegexList```: (Optional) URIs matching regexes in this list will not be captured. Default: ```[]``` (No uris excluded).

```enableOptionsCallTracking```: (Optional) Enables tracking OPTIONS http calls. Default: ```false```

## Backend

If you are only interested in recording the UI layer along with API interactions initiated by the UI (and creating tests covering only the API layer), installing just the frontend SDK is sufficient. To enable recording of the complete stack (and creation of tests covering the entire stack):
1. Enable OpenTelemetry in your backend services.
2. Install and configure Aware SDK for each backend service.

Currently, Aware SDK is supported for the following tech stacks:
1. Java Spring - [Documentation](https://github.com/awarelabshq/testchimp-sdk/tree/main/backend/java-spring#java-spring)
2. NodeJS - [Documentation](https://github.com/awarelabshq/testchimp-sdk/tree/main/backend/nodejs#nodejs)

## Support

If your preferred tech stack is not supported, feel free to raise a [feature request](https://github.com/awarelabshq/testchimp-sdk/issues/new).
