# Frontend

This module contains frontend SDKs for enabling Aware recording capabilities. Currently, all JS based tech stacks are supported via the aware-sdk-js library.

## JavaScript

### Installation Guide

1. Run: ```npm install aware-sdk-js@latest```
2. Include the following code snippet (with updated configuration as detailed below) in your initial loading js file (index.js or equivalent) to configure the sdk.

```
import {AwareSDK} from "aware-sdk-js"


window.onload = function () {
 AwareSDK.startRecording({
   projectId: "<YOUR AWARE PROJECT ID>",
   apiKey: "<YOUR SESSION RECORDING API  KEY FOR AWARE PROJECT>",
   untracedUriRegexListToTrack:".*\.your-domain\.com.*$"
 });
```

3. (Recommended) To capture the user for whom the session belongs to (so that it can be retrieved easier via Aware platform), you can tag the current sessions' user (a readable id such as email) by calling:

```AwareSDK.setCurrentUserId(<USER_ID>)```

### Configuration Guide

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
