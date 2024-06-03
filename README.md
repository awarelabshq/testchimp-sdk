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

