# Frontend

This module contains frontend SDKs for enabling TestChimp recording capabilities. Currently, all JS based tech stacks are supported via the testchimp-js library.

## JavaScript

### Installation Guide

1. Run: ```npm install testchimp-js@latest```
2. Include the following code snippet (replace with your project id / api key) in your initial loading js file (index.js or equivalent) to configure the sdk.

```
import { TestChimpSDK } from "testchimp-js";

document.addEventListener("DOMContentLoaded", function () {
  window.TestChimpSDK = TestChimpSDK; // Attach to global window
  TestChimpSDK.startRecording({
    projectId: <Your project id>,
    sessionRecordingApiKey: <Your recording API key>,
    untracedUriRegexListToTrack: ".*your-domain.com.*",
    excludedUriRegexList: "<regex of uris you want to ignore capturing"
  });
});
```

3. _(Recommended)_ To capture the user for whom the session belongs to (so that it can be retrieved easier via TestChimp platform), you can tag the current sessions' user (a readable id such as email) by calling:

```TestChimpSDK.setCurrentUserId(<USER_ID>)```

4. Call ```TestChimpSDK.endTrackedSession()``` when the user signs out from your app.

To ensure the user session is aligned with your apps' user session lifecycle, call ```TestChimpSDK.endTrackedSession()``` when the user signs out of your app.

### Advanced Configuration Guide

The SDK behaviour can be configured with the following config params:

* ```projectId```: (Required) This is the project id for your project in Aware Platform (Access via Project Settings -> General -> Project ID)

* ```sessionRecordingApiKey```: (Required) This is the session recording api key for your project (Access via Project Settings -> General -> Session Recording API key) - Note: Not Api Key (which is used for data api access for integration with your CI / CD pipelines etc.)

* ```tracedUriRegexListToTrack```: If you have enabled full stack recording with backend Aware SDKs, add regex of your backend entrypoints called by the client for this attribute. Eg:  ".*://your-domain.*$" Default: ```"/^$/"``` (No matched urls)

* ```untracedUriRegexListToTrack```: If you have NOT enabled full stack recording with backend Aware SDKs, add regex of your backend entrypoints called by the client for this attribute. Eg:  ".*://your-domain.*$" This will capture the API layer interactions, allowing you to create tests covering the API layer from recorded sessions. If you have enabled backend tracing, no need to specify this. Default: ```"/^$/"``` (No matched urls)

* ``` enableRecording```: (Optional) This flag helps selectively disable recording (for instance, based on environment). Default: ```true```

* ```samplingProbability```: (Optional) This is the probability an arbitrary session will be recorded. Set this to 1.0 to capture all sessions (recommended setting for test environments). Default: ```1.0```

* ```samplingProbabilityOnError```: (Optional) This is the probability of recording if an error occurs. Useful for capturing erroring scenario recordings in production. ```<eventWindowToSaveOnError>``` number of preceding events will be recorded if being sampled on error. Default: ```0.0```

* ```maxSessionDurationSecs```: (Optional) Maximum number of seconds of a session to be recorded. Default: ```300```

* ```eventWindowToSaveOnError```: (Optional) number of events to be recoded preceding an error. Default: ```200```

* ```excludedUriRegexList```: (Optional) URIs matching regexes in this list will not be captured. Default: ```[]``` (No uris excluded).

* ```enableOptionsCallTracking```: (Optional) Enables tracking OPTIONS http calls. Default: ```false```
