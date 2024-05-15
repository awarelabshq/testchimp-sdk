import {record} from 'rrweb';
import { BatchInterceptor } from '@mswjs/interceptors';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
// Buffer to store events before sending in batches. Used for onError event sending (last N events)
var eventsMatrix = [[]];
// Buffer to store events for continuous send (when normal recording is enabled)
var eventBuffer = [];
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
  media: 800,
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
  document.cookie = "aware.current_user_id=" + userId + ";path=/";
}

// Function to get the current_user_id from the cookie
function getCurrentUserId() {
  return getCookie("aware.current_user_id");
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

function log(config,log){
    if(config.enableLogging){
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
  var existingCookie = getCookie("aware.session-record-tracking-id");
  if (existingCookie === "") {
    document.cookie = "aware.session-record-tracking-id" + "=" + sessionId + ";path=/";
  }
}

function getTrackingIdCookie(){
    return getCookie("aware.session-record-tracking-id");
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

function enableRequestIntercept(config){
  let urlRegex = config.urlRegexToAddTracking;
  let untracedUrisToTrackRegex=config.untracedUrisToTrackRegex;

  // Get sessionId from the storage
  var sessionId = getTrackingIdCookie();
  log(config,"Using interception to add tracking cookie in header value: " + sessionId + " for url regex: " + urlRegex);

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

  // Add listeners for the 'request' event on the BatchInterceptor
  interceptor.on('request', ({ request, requestId }) => {
    if (request.url.match(urlRegex)) {
      log(config,"request matches regex for interception " + request.url);
      // Add the 'aware-session-record-tracking-id' header
      request.headers.set('aware-session-record-tracking-id', sessionId);
    } else if (request.url.match(untracedUrisToTrackRegex)) {
      log(config,"request matches regex for untraced uris to track " + request.url);
      // Store the request URL in the map
      requestUrls.set(requestId, request.url);
      let traceparent = request.headers.get('traceparent');
      if (!traceparent) {
       traceparent=generateTraceparent(generateSpanId());
       log(config,"Generating new traceparent " + traceparent);
       request.headers.set('traceparent', traceparent);
     }
      const parts = traceparent.split('-');
      let spanId = parts[2];
      requestIdToSpanIdMap.set(requestId, spanId);

      // Capture request body and headers
      const requestPayload = {
        headerMap: {},
        jsonBody: null
      };
      request.headers.forEach((value, key) => {
        requestPayload.headerMap[key] = value;
      });
      request.text().then(body => {
        requestPayload.jsonBody = body;
        // Store the request payload
        requestPayloads[requestId] = requestPayload;
      });
    }
  });

  // Add listeners for the 'response' event on the BatchInterceptor
  interceptor.on('response', ({ response, requestId }) => {
    if (response.url.match(untracedUrisToTrackRegex) || requestUrls.has(requestId)) {
      // Capture response body and headers
      const responsePayload = {
        headerMap: {},
        jsonBody: null
      };
      response.headers.forEach((value, key) => {
        responsePayload.headerMap[key] = value;
      });
      response.text().then(body => {
        responsePayload.jsonBody = body;
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
            request_timestamp: new Date().getTime(),
            response_timestamp: new Date().getTime()
          };
          sendPayloadToEndpoint(insertPayloadRequest, config.endpoint + '/insert_client_recorded_payloads');

          // Remove the requestId from the maps after processing
          requestUrls.delete(requestId);
          requestIdToSpanIdMap.delete(requestId);
          delete requestPayloads[requestId];
        }
      });
    }
  });

  // Apply the interceptor
  interceptor.apply();
}

// Function to send events to the backend and reset the events array
function sendEvents(endpoint, config, sessionId, events) {
  if (events.length === 0 || !config.projectId || !config.sessionRecordingApiKey) return;

  const sessionRecordEvents = events.map(event => {
    return {
      payload: JSON.stringify(event),
    };
  });

  // Clear the event buffer. While sendEvents is used in both onError and normal recording, the eventBuffer is utilized only in normal recording.
  eventBuffer = [];

  const body = {
    tracking_id: sessionId,
    aware_project_id: config.projectId,
    aware_session_tracking_api_key: config.sessionRecordingApiKey,
    event_list:{
        events: sessionRecordEvents
    }
  };

  let sessionSendEnabled=true;
  let sessionRecordEndpoint=endpoint+"/session_records";
  if(sessionSendEnabled){
    sendPayloadToEndpoint(body,sessionRecordEndpoint);
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

// Function to start sending events in batches every 5 seconds
function startSendingEvents(endpoint, config, sessionId) {

  stopFn =record({
    emit: function (event) {
      eventBuffer.push(event)
    },
    sampling: samplingConfig,
  });

  // Save events every 5 seconds
  var intervalId = setInterval(function () {
    var sessionDuration = (new Date().getTime() - sessionStartTime) / 1000;
    if (!config.maxSessionDurationSecs || (config.maxSessionDurationSecs && sessionDuration < config.maxSessionDurationSecs)) {
      sendEvents(endpoint, config, sessionId, eventBuffer);
    } else {
      clearInterval(intervalId); // Clear the interval
      if (typeof stopFn === 'function') {
        stopFn(); // Stop the recording
        stopFn = null;
      }
    }
  }, 5000);
}

// Function to stop sending events
function stopSendingEvents() {
  if (stopFn) {
    stopFn(); // Stop recording events
    stopFn = null;
  }
}

function initRecording(endpoint,config,sessionId){
  // Start sending events
  if (shouldRecordSession) {
    startSendingEvents(endpoint, config, sessionId);
  } else {
    if (shouldRecordSessionOnError) {
      startSendingEventsWithCheckout(config);
    }
  }
};

function clearTrackingIdCookie(){
    document.cookie = "aware.session-record-tracking-id=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;max-age=0;";
}

function endTrackedSession(){
    stopSendingEvents()
    clearTrackingIdCookie();
}

// Function to start recording user sessions
function startRecording(config) {
  console.log("Initializing recording for Aware Project: " + config.projectId);
  // Default endpoint if not provided
  var endpoint = (config.endpoint || 'https://ingress.awarelabs.io');

  // Retrieve session ID from cookie
  var sessionId = getSessionIdFromCookie(config.sessionIdCookieKey);

  // If session ID doesn't exist in cookie, generate a new one
  if (!sessionId) {
    sessionId = generateSessionId();
  }
  setTrackingIdCookie(sessionId);
  sessionId=getTrackingIdCookie();

  // Record the session start time
  sessionStartTime = new Date().getTime();

  const defaultMaxSessionDurationSecs = 600; // 10 mins
  const defaultEventWindowToSaveOnError = 200;
  const defaultUrlRegexToAddTracking = /^$/; // Match no URLs
  const defaultUntracedUrisToTrackRegex = /^$/; // Match no URLs
  const defaultSamplingProbability=0.0;
  const defaultSamplingProbabilityOnError=0.0;

    if(!config.projectId){
      console.log("No project id specified for session capture");
      return;
    }
    if(!config.sessionRecordingApiKey){
      console.log("No session recording api key specified for session capture");
      return;
    }

  // Store endpoint, projectId, sessionRecordingApiKey, samplingProbability, maxSessionDurationSecs, samplingProbabilityOnError, and maxDurationToSaveOnError in window.AwareSDKConfig
  window.AwareSDKConfig = {
    endpoint: endpoint,
    projectId: config.projectId,
    sessionRecordingApiKey: config.sessionRecordingApiKey,
    samplingProbability: config.samplingProbability || defaultSamplingProbability,
    maxSessionDurationSecs: config.maxSessionDurationSecs || defaultMaxSessionDurationSecs,
    samplingProbabilityOnError: config.samplingProbabilityOnError || defaultSamplingProbabilityOnError,
    eventWindowToSaveOnError: config.eventWindowToSaveOnError || defaultEventWindowToSaveOnError,
    urlRegexToAddTracking: config.urlRegexToAddTracking || defaultUrlRegexToAddTracking,
    untracedUrisToTrackRegex: config.untracedUrisToTrackRegex || defaultUntracedUrisToTrackRegex,
    enableLogging:config.enableLogging || true
 };

  config=window.AwareSDKConfig;
  console.log("config used for session recording: " + config);

  // Determine whether to record the session based on samplingProbability
  shouldRecordSession = config.samplingProbability && Math.random() <= config.samplingProbability;

  // Determine the sampling decision for error scenarios
  shouldRecordSessionOnError = config.samplingProbabilityOnError && Math.random() <= config.samplingProbabilityOnError;

  log(config,"Should record session: " + shouldRecordSession + " should record on error: " + shouldRecordSessionOnError);
  // Intercept all outgoing requests and add additional HTTP header
  if (shouldRecordSession || shouldRecordSessionOnError) {
      log(config,"Setting tracking id in cookie " + sessionId);
      enableRequestIntercept(config);
  }

  window.onerror = function () {
    if (shouldRecordSessionOnError && !shouldRecordSession) {
      const len = eventsMatrix.length;
      const events = eventsMatrix[len - 2].concat(eventsMatrix[len - 1]);
      sendEvents(endpoint, config, sessionId, events);
    }
  };

  initRecording(endpoint,config,sessionId);
}

// Expose the startRecording function along with other recording-related methods to consumers
var AwareSDK = {
  startRecording: startRecording,
  endTrackedSession:endTrackedSession,
  stopRecording: stopSendingEvents, // Expose the stopRecording function
  setCurrentUserId: setCurrentUserId // Expose the setCurrentUserId function
};

// Export AwareSDK
export { AwareSDK };
