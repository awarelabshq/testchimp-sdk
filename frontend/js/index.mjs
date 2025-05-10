import { record } from 'rrweb';
import { BatchInterceptor } from '@mswjs/interceptors';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { getRelatedFiles } from './getRelatedFiles.ts';
import { getReleaseMetadata } from './getReleaseMetadata.ts';

// Buffer to store events before sending in batches. Used for onError event sending (last N events)
var eventsMatrix = [[]];
// Buffer to store events for continuous send (when normal recording is enabled)
var eventBuffer = [];
var sessionManager;
var stopFn;
var sessionStartTime;
var shouldRecordSession = false;
var shouldRecordSessionOnError = false;
const requestIdToSpanIdMap = new Map();

let samplingConfig = {
  // do not record mouse movement
  mousemove: false,
  // do not record mouse interaction
  mouseInteraction: true,
  // set the interval of scrolling event
  scroll: 150, // do not emit twice in 150ms
  // set the interval of media interaction event
  media: 3000,
  // set the timing of record input
  input: 'last' // When input multiple characters, only record the final input
};

function generateSpanId() {
  let spanId = '';
  for (let i = 0; i < 8; i++) {
    // Generate a random byte and convert it to a 2-character hexadecimal string
    const byte = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    spanId += byte;
  }
  return spanId;
}

function generateTraceparent(parentSpanId) {
  // Generate random trace ID (hexadecimal, 32 characters)
  const traceId = Array(32)
    .fill()
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');

  // Combine trace ID and parent ID in a traceparent format
  const traceparent = `00-${traceId}-${parentSpanId}-01`;
  return traceparent;
}

function setCurrentUserId(userId) {
  document.cookie = "testchimp.current_user_id=" + userId + ";path=/";
}

// Function to get the current_user_id from the cookie
function getCurrentUserId() {
  return getCookie("testchimp.current_user_id");
}

// Function to generate a unique session ID
function generateSessionId() {
  // Custom UUID generation logic
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return 'session_' + uuid;
}

function log(config, log) {
  if (config.enableLogging) {
    console.log(log);
  }
}

// Function to retrieve session ID from standard session ID cookies or custom cookie key
function getSessionIdFromCookie(cookieKey) {
  if (!cookieKey) {
    var standardCookieNames = ['JSESSIONID', 'PHPSESSID', 'ASP.NET_SessionId', 'CFID', 'CFTOKEN']; // Add more standard session ID cookie names if needed
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      for (var j = 0; j < standardCookieNames.length; j++) {
        var standardCookieName = standardCookieNames[j];
        if (cookie.startsWith(standardCookieName + '=')) {
          return cookie.substring(standardCookieName.length + 1);
        }
      }
    }
  } else {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      var cookieParts = cookie.split('=');
      if (cookieParts.length === 2 && cookieParts[0] === cookieKey) {
        return cookieParts[1];
      }
    }
  }
  return null; // Return null if session ID cookie doesn't exist
}

function setTrackingIdCookie(sessionId) {
  var existingCookie = getCookie("testchimp.session-record-tracking-id");
  if (existingCookie === "") {
    document.cookie = "testchimp.session-record-tracking-id=" + sessionId + ";path=/;max-age=600;";
  }
  var parentSessionCookie = getCookie("testchimp.parent-session-record-tracking-id");
  if (parentSessionCookie === "") {
    document.cookie = "testchimp.parent-session-record-tracking-id" + "=" + sessionId + ";path=/";
  }
}

function getTrackingIdCookie() {
  var existingCookie = getCookie("testchimp.session-record-tracking-id");
  if (existingCookie === "") {
    var sessionId = generateSessionId();
    document.cookie = "testchimp.session-record-tracking-id=" + sessionId + ";path=/;max-age=600;";
    triggerFullSnapshot();
    var parentSessionCookie = getCookie("testchimp.parent-session-record-tracking-id");
    if (parentSessionCookie === "") {
      document.cookie = "testchimp.parent-session-record-tracking-id" + "=" + sessionId + ";path=/";
    }
    return sessionId;
  }
  return existingCookie;
}

function getParentTrackingIdCookie() {
  var parentSessionCookie = getCookie("testchimp.parent-session-record-tracking-id");
  if (parentSessionCookie === "") {
    var sessionId = generateSessionId();
    document.cookie = "testchimp.parent-session-record-tracking-id" + "=" + sessionId + ";path=/";
    return sessionId;
  }
  return parentSessionCookie;
}


function getSessionRecordSourceCookie() {
  var cookie = getCookie("testchimp.session-record-source");
  if (cookie === "") {
    return "SDK"
  }
  return cookie;
}

function getCookie(name) {
  var nameEQ = name + "=";
  var cookies = document.cookie.split(';');
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i];
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) == 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }
  return "";
}

function sendPayloadToEndpoint(payload, endpoint) {
  const body = JSON.stringify(payload);
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    mode: 'no-cors',
    body: body,
  }).catch(function (error) {
    console.error('Error sending payload:', error);
  });
}

async function populateHttpPayload(config, rawPayloadIn) {
  var rawPayload = rawPayloadIn.clone();
  const method = rawPayload.method;
  const httpPayload = {
    headerMap: {},
    queryParamMap: {},
    httpMethod: method ?? ""
  };

  // Convert headers to a plain object
  rawPayload.headers.forEach((value, key) => {
    httpPayload.headerMap[key] = value;
  });

  if (rawPayload.status) {
    httpPayload.responseCode = rawPayload.status;
  }

  const urlParams = new URLSearchParams(rawPayload.url.split('?')[1] || '');
  urlParams.forEach((value, key) => {
    httpPayload.queryParamMap[key] = value;
  });

  const contentType = rawPayload.headers.get('content-type') || '';

  if (method !== 'GET') {
    if (contentType.includes('application/json')) {
      try {
        const body = await rawPayload.json();
        httpPayload.jsonBody = JSON.stringify(body);
      } catch {
        httpPayload.jsonBody = "{}";
      }
    } else if (contentType.includes('multipart/form-data')) {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);

      if (boundaryMatch) {
        // Process as boundary-based form data
        try {
          const boundary = boundaryMatch[1];
          const bodyText = await rawPayload.text();

          if (bodyText.includes(`--${boundary}`)) {
            const parts = bodyText.split(`--${boundary}`);
            const keyValueMap = {};

            for (const part of parts) {
              if (part.trim() && !part.includes('--')) {  // Skip empty parts and boundary end
                const [headers, ...contentParts] = part.trim().split('\r\n\r\n');
                const content = contentParts.join('\r\n\r\n');

                const nameMatch = headers.match(/name="([^"]+)"/);
                if (nameMatch) {
                  const name = nameMatch[1];
                  const filenameMatch = headers.match(/filename="([^"]+)"/);

                  if (filenameMatch) {
                    // Handle file uploads if needed
                    keyValueMap[name] = {
                      filename: filenameMatch[1],
                      content: content
                    };
                  } else {
                    keyValueMap[name] = content.trim();
                  }
                }
              }
            }
            httpPayload.httpFormDataBody = { keyValueMap };
          }
        } catch (error) {
          console.error('Error processing boundary-based form data:', error);
        }
      } else {
        // Process as regular form data
        try {
          const formData = await rawPayload.formData();
          const keyValueMap = {};
          let formDataSize = 0;

          for (const [key, value] of formData.entries()) {
            formDataSize += value.size || 0;
            if (formDataSize > 10 * 1024 * 1024) {
              log(config, "Binary data exceeds 10MB. Dropping data.");
              break;
            }
            keyValueMap[key] = value;
          }
          httpPayload.httpFormDataBody = { keyValueMap };
        } catch (error) {
          console.error('Error processing regular form data:', error);
        }
      }
    } else if (contentType.includes('application/octet-stream')) {
      try {
        const buffer = await rawPayload.arrayBuffer();
        if (buffer.byteLength <= 10 * 1024 * 1024) {
          httpPayload.binaryDataBody = { data: buffer };
        } else {
          log(config, "Binary data exceeds 10MB. Dropping data.");
        }
      } catch {
        // Handle error
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const body = new URLSearchParams(await rawPayload.text());
        const keyValueMap = {};
        body.forEach((value, key) => {
          keyValueMap[key] = value;
        });
        httpPayload.httpFormUrlencodedBody = { keyValueMap };
      } catch {
        // Handle error
      }
    } else {
      try {
        const body = await rawPayload.text();
        if (contentType.includes('text/plain')) {
          httpPayload.textBody = body;
        } else if (contentType.includes('text/html')) {
          httpPayload.htmlBody = body;
        } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
          httpPayload.xmlBody = body;
        } else {
          httpPayload.textBody = body;
        }
      } catch (error) {
        console.error('Error reading payload:', error);
      }
    }
  }

  return httpPayload;
}

async function enableRequestIntercept(config) {
  let urlRegex = config.tracedUriRegexListToTrack;
  let untracedUrisToTrackRegex = config.untracedUriRegexListToTrack;
  let excludedUriRegexList = config.excludedUriRegexList;
  let enableOptionsCallTracking = config.enableOptionsCallTracking;

  const parentSessionId = getParentTrackingIdCookie();
  if (typeof urlRegex === 'string') {
    urlRegex = urlRegex.split(',').map(item => item.trim());
  }

  if (typeof untracedUrisToTrackRegex === 'string') {
    untracedUrisToTrackRegex = untracedUrisToTrackRegex.split(',').map(item => item.trim());
  }

  if (typeof excludedUriRegexList === 'string') {
    excludedUriRegexList = excludedUriRegexList.split(',').map(item => item.trim());
  }

  // Get sessionId from the storage
  log(config, "Using interception to add tracking cookie for url regex: " + urlRegex);
  // Create instances of the interceptors
  const fetchInterceptor = new FetchInterceptor();
  const xhrInterceptor = new XMLHttpRequestInterceptor();

  // Create a BatchInterceptor to combine the interceptors
  const interceptor = new BatchInterceptor({
    name: 'request-interceptor',
    interceptors: [fetchInterceptor, xhrInterceptor],
  });

  // Map to store requestId -> request.url
  const requestUrls = new Map();

  // Object to store request payloads
  const requestPayloads = {};
  const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

  function isBroadRegex(regexList) {
    return regexList.some(regex => regex.toString() === "/.*/" || regex.toString() === "/^.*$/");
  }

  function isExcludedApiCall(url) {
    return url.includes('/insert_client_recorded_payloads') || url.includes('/session_records');
  }

  // Add listeners for the 'request' event on the BatchInterceptor
  interceptor.on('request', async ({ request, requestId }) => {
    if (!enableOptionsCallTracking && request.method === 'OPTIONS') {
      return;
    }
    let sessionId = getTrackingIdCookie();
    let matchedTracedUri = urlRegex.some(regex => request.url.match(regex));
    let matchedUntracedUri = untracedUrisToTrackRegex.some(regex => request.url.match(regex));
    let matchedExcludedUri = excludedUriRegexList.some(regex => request.url.match(regex));

    if (isBroadRegex(urlRegex) || isBroadRegex(untracedUrisToTrackRegex)) {
      console.log("Regex for capturing requests is too broad. Define a narrow regex");
      return;
    }

    // Ignore excluded API calls
    if (isExcludedApiCall(request.url)) {
      return;
    }


    if (!matchedExcludedUri) {
      if (matchedTracedUri) {
        log(config, "request matches regex for interception " + request.url);
        // Add the 'testchimp-session-record-tracking-id' header
        request.headers.set('testchimp-session-record-tracking-id', sessionId);
        request.headers.set('testchimp-parent-session-record-tracking-id', parentSessionId);
        let currentUserId = getCurrentUserId();
        if (currentUserId) {
          request.headers.set('testchimp-current-user-id', currentUserId);
        }
      } else if (matchedUntracedUri) {
        log(config, "request matches regex for untraced uris to track " + request.url);
        // Store the request URL in the map
        const parsedUrl = new URL(request.url);
        const urlWithoutQueryParams = `${parsedUrl.origin}${parsedUrl.pathname}`;
        // Store the request URL without query parameters in the map
        requestUrls.set(requestId, urlWithoutQueryParams);

        let traceparent = request.headers.get('traceparent');
        if (!traceparent) {
          traceparent = generateTraceparent(generateSpanId());
          log(config, "Generating new traceparent " + traceparent);
        }
        const parts = traceparent.split('-');
        let spanId = parts[2];
        requestIdToSpanIdMap.set(requestId, spanId);

        // Capture request body and headers
        try {
          const requestPayload = await populateHttpPayload(config, request);
          if (JSON.stringify(requestPayload).length > MAX_PAYLOAD_SIZE) {
            log(config, "Skipping request capture due to large payload size");
            return;
          }
          requestPayloads[requestId] = requestPayload;
        } catch (error) {
          console.error('Error populating request payload:', error);
        }
      }
    }
  });

  // Add listeners for the 'response' event on the BatchInterceptor
  interceptor.on('response', async ({ response, requestId }) => {

    if (isExcludedApiCall(response.url)) {
      return;
    }

    let matchedUntracedUri = untracedUrisToTrackRegex.some(regex => response.url.match(regex));
    let matchedExcludedUri = excludedUriRegexList.some(regex => response.url.match(regex));
    if (!matchedExcludedUri) {
      let sessionId = getTrackingIdCookie();
      if (matchedUntracedUri || requestUrls.has(requestId)) {
        // Capture response body and headers
        try {
          const responsePayload = await populateHttpPayload(config, response);
          if (JSON.stringify(responsePayload).length > MAX_PAYLOAD_SIZE) {
            delete requestPayloads[requestId];
            log(config, "Skipping response capture due to large payload size");
            return;
          }
          const requestPayload = requestPayloads[requestId];
          const requestUrl = requestUrls.get(requestId);
          const spanId = requestIdToSpanIdMap.get(requestId);

          if (requestPayload && requestUrl && spanId) {
            const payload = {
              requestPayload: {
                spanId: spanId,
                httpPayload: requestPayload
              },
              responsePayload: {
                spanId: spanId,
                httpPayload: responsePayload
              }
            };
            const insertPayloadRequest = {
              aware_project_id: config.projectId,
              aware_session_tracking_api_key: config.sessionRecordingApiKey,
              request_payload: JSON.stringify(payload.requestPayload),
              response_payload: JSON.stringify(payload.responsePayload),
              current_user_id: getCurrentUserId(), // Include the current_user_id
              url: requestUrl, // Use the stored request.url
              tracking_id: sessionId,
              parent_tracking_id: parentSessionId,
              environment: config.environment,
              request_timestamp: new Date().getTime(),
              response_timestamp: new Date().getTime()
            };
            sendPayloadToEndpoint(insertPayloadRequest, config.endpoint + '/insert_client_recorded_payloads');

            // Remove the requestId from the maps after processing
            requestUrls.delete(requestId);
            requestIdToSpanIdMap.delete(requestId);
            delete requestPayloads[requestId];
          }
        } catch (error) {
          console.error('Error populating response payload:', error);
        }
      }
    }
  });

  // Apply the interceptor
  interceptor.apply();
}

// Function to send events to the backend and reset the events array
function sendEvents(endpoint, config, events) {
  if (events.length === 0 || !config.projectId || !config.sessionRecordingApiKey) return;

  const sessionRecordEvents = events.map(event => {
    return {
      payload: JSON.stringify(event),
    };
  });

  // Clear the event buffer. While sendEvents is used in both onError and normal recording, the eventBuffer is utilized only in normal recording.
  eventBuffer = [];

  let sessionId = getTrackingIdCookie();
  let parentSessionId = getParentTrackingIdCookie();
  let sessionRecordSource = getSessionRecordSourceCookie();
  const body = {
    tracking_id: sessionId,
    parent_tracking_id: parentSessionId,
    aware_project_id: config.projectId,
    aware_session_tracking_api_key: config.sessionRecordingApiKey,
    session_record_source: sessionRecordSource,
    current_user_id: getCurrentUserId(),
    environment: config.environment,
    event_list: {
      events: sessionRecordEvents
    }
  };

  let sessionSendEnabled = true;
  let sessionRecordEndpoint = endpoint + "/session_records";
  if (sessionSendEnabled) {
    sendPayloadToEndpoint(body, sessionRecordEndpoint);
  }
}

function triggerFullSnapshot() {
  if (stopFn && stopFn.takeFullSnapshot) {
    const fullSnapshot = stopFn.takeFullSnapshot();
    if (fullSnapshot) {
      eventBuffer.push(fullSnapshot);
    }
  } else {
    console.error('Full snapshot function is not available.');
  }
}

function startSendingEventsWithCheckout(config) {

  stopFn = record({
    emit: function (event, isCheckout) {
      // isCheckout is a flag to tell if the events have been checked out
      if (isCheckout) {
        eventsMatrix.push([]);
      }
      const lastEvents = eventsMatrix[eventsMatrix.length - 1];
      lastEvents.push(event);
    },
    sampling: samplingConfig,
    checkoutEveryNth: config.eventWindowToSaveOnError || 200, // Default checkout every 200 events
  });
}

function startSendingEvents(endpoint, config) {
  const recordOptions = {
    emit: function (event) {
      // Process the event before adding it to the buffer
      const processedEvent = processEvent(event);
      if (processedEvent) {
        eventBuffer.push(processedEvent);
      }
    },
    sampling: samplingConfig,
    ignore: (node) => {
      return node.tagName === 'VIDEO' ||
        node.tagName === 'CANVAS' ||
        (node.hasAttribute && node.hasAttribute('data-rrweb-ignore'));
    },
    recordCanvas: false
  };

  function processEvent(event) {
    // Always keep snapshot events unchanged
    if (event.type === 2) {
      return event;
    }

    // For DOM mutations with attribute changes
    if (event.type === 3 && event.data.source === 0 &&
      event.data.attributes && event.data.attributes.length > 0) {

      // Create a filtered array of attributes without transform changes
      const filteredAttributes = event.data.attributes.filter(attr => {
        // Check if this is a transform attribute
        const isTransformChange =
          (attr.attributes.style && attr.attributes.style.transform) ||
          attr.attributes.transform;

        // Keep attributes that are not transform-related
        return !isTransformChange;
      });

      // If all attributes were transform-related, filter out the entire event
      if (filteredAttributes.length === 0) {
        return null;
      }

      // Otherwise create a modified event with transforms removed
      const modifiedEvent = JSON.parse(JSON.stringify(event));
      modifiedEvent.data.attributes = filteredAttributes;
      return modifiedEvent;
    }

    // Pass through all other event types unchanged
    return event;
  }

  stopFn = record(recordOptions);

  // Rest of your code remains the same
  var intervalId = setInterval(function () {
    var sessionDuration = (new Date().getTime() - sessionStartTime) / 1000;
    if (!config.maxSessionDurationSecs || (config.maxSessionDurationSecs && sessionDuration < config.maxSessionDurationSecs)) {
      sendEvents(endpoint, config, eventBuffer);
    } else {
      clearInterval(intervalId);
      if (typeof stopFn === 'function') {
        stopFn();
        stopFn = null;
      }
    }
  }, config.snapshotInterval ?? 5000);

  return {
    stop: function () {
      clearInterval(intervalId);
      stopSendingEvents(endpoint, config);
    }
  };
}

// Function to stop sending events
function stopSendingEvents(endpoint, config) {
  try {
    if (stopFn) {
      stopFn(); // Stop recording events
      stopFn = null;
    }
    // Flush remaining events in the buffer
    if (eventBuffer.length > 0) {
      console.log("Sending remaining events of size: ", eventBuffer.length);
      sendEvents(endpoint, config, eventBuffer);
    }
  } catch (error) {
    console.log("Error stopping session:", error);
  }
}

function initRecording(endpoint, config) {
  // Start sending events
  if (shouldRecordSession) {
    sessionManager = startSendingEvents(endpoint, config);
  } else {
    if (shouldRecordSessionOnError) {
      startSendingEventsWithCheckout(config);
    }
  }
};

function clearTrackingIdCookie() {
  document.cookie = "testchimp.session-record-tracking-id=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;max-age=0;";
  document.cookie = "testchimp.parent-session-record-tracking-id=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;max-age=0;";
}

function endTrackedSession() {
  if (sessionManager) {
    sessionManager.stop();
  }
  clearTrackingIdCookie();
}

// Function to start recording user sessions
async function startRecording(config) {
  console.log("Initializing recording for TestChimp Project: " + config.projectId);

  // Retrieve session ID from cookie
  var sessionId = getSessionIdFromCookie(config.sessionIdCookieKey);

  // If session ID doesn't exist in cookie, generate a new one
  if (!sessionId) {
    sessionId = generateSessionId();
  }
  setTrackingIdCookie(sessionId);
  sessionId = getTrackingIdCookie();

  // Record the session start time
  sessionStartTime = new Date().getTime();

  const defaultMaxSessionDurationSecs = 600; // 10 mins
  const defaultEventWindowToSaveOnError = 200;
  const defaultUrlRegexToAddTracking = ["/^$/"]; // Match no URLs
  const defaultUntracedUrisToTrackRegex = ["/^$/"]; // Match no URLs
  const defaultSamplingProbability = 1.0;
  const defaultSamplingProbabilityOnError = 0.0;
  const defaultEnvironment = "QA";
  const defaultSnapshotInterval = 5000;
  const defaultEndpoint = "https://ingress.testchimp.io";

  if (!config.projectId) {
    console.log("No project id specified for session capture");
    return;
  }
  if (!config.sessionRecordingApiKey) {
    console.log("No session recording api key specified for session capture");
    return;
  }

  let endpoint = config.endpoint || defaultEndpoint;
  window.TestChimpSDKConfig = {
    enableRecording: config.enableRecording || true,
    endpoint: endpoint,
    projectId: config.projectId,
    sessionRecordingApiKey: config.sessionRecordingApiKey,
    samplingProbability: config.samplingProbability || defaultSamplingProbability,
    maxSessionDurationSecs: config.maxSessionDurationSecs || defaultMaxSessionDurationSecs,
    samplingProbabilityOnError: config.samplingProbabilityOnError || defaultSamplingProbabilityOnError,
    eventWindowToSaveOnError: config.eventWindowToSaveOnError || defaultEventWindowToSaveOnError,
    tracedUriRegexListToTrack: config.tracedUriRegexListToTrack || defaultUrlRegexToAddTracking,
    untracedUriRegexListToTrack: config.untracedUriRegexListToTrack || defaultUntracedUrisToTrackRegex,
    excludedUriRegexList: config.excludedUriRegexList || [],
    environment: config.environment || defaultEnvironment,
    enableLogging: config.enableLogging || true,
    enableOptionsCallTracking: config.enableOptionsCallTracking || false,
    snapshotInterval: config.snapshotInterval || defaultSnapshotInterval
  };


  config = window.TestChimpSDKConfig;
  if (config.snapshotInterval < 1000) {
    config.snapshotInterval = 1000;
  }

  console.log("config used for session recording: ", config);

  // Determine whether to record the session based on samplingProbability
  shouldRecordSession = config.samplingProbability && Math.random() <= config.samplingProbability;

  // Determine the sampling decision for error scenarios
  shouldRecordSessionOnError = config.samplingProbabilityOnError && Math.random() <= config.samplingProbabilityOnError;

  log(config, "Should record session: " + shouldRecordSession + " should record on error: " + shouldRecordSessionOnError);
  // Intercept all outgoing requests and add additional HTTP header
  if (shouldRecordSession || shouldRecordSessionOnError) {
    log(config, "Setting tracking id in cookie " + sessionId);
    await enableRequestIntercept(config);
  }

  window.onerror = function () {
    if (shouldRecordSessionOnError && !shouldRecordSession) {
      const len = eventsMatrix.length;
      const events = eventsMatrix[len - 2].concat(eventsMatrix[len - 1]);
      sendEvents(endpoint, config, events);
    }
  };

  initRecording(endpoint, config);
}

function captureCurrentSnapshot() {
  if (stopFn && stopFn.takeFullSnapshot) {
    const fullSnapshot = stopFn.takeFullSnapshot();
    if (fullSnapshot) {
      return fullSnapshot;
    }
  } else {
    console.error('Full snapshot function is not available.');
  }
  return "";
}

// Expose the startRecording function along with other recording-related methods to consumers
var TestChimpSDK = {
  startRecording: startRecording,
  captureCurrentSnapshot: captureCurrentSnapshot,
  endTrackedSession: endTrackedSession,
  stopRecording: endTrackedSession, // Expose the stopRecording function
  setCurrentUserId: setCurrentUserId // Expose the setCurrentUserId function
};

// Export TestChimpSDK
export { TestChimpSDK };
export { getRelatedFiles };
export { getReleaseMetadata };