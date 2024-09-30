// Inject the external script only once
if (!window.__scriptInjected) {
  window.__scriptInjected = true;

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injectScript.js');
  script.onload = function() {
    this.remove();
  };
  document.documentElement.appendChild(script);
}

window.addEventListener('interceptedResponse', (event) => {
  const { responseHeaders, responseBody, statusCode, url, requestId } = event.detail;
  chrome.runtime?.sendMessage({
    type: 'capturedResponse',
    requestId: requestId,
    responseHeaders: responseHeaders,
    responseBody: responseBody,
    statusCode: statusCode,
    url: url
  });
});

import {record} from 'rrweb';

// Buffer to store events for continuous send (when normal recording is enabled)
var eventBuffer = [];
var stopFn;
var sessionStartTime;
var shouldRecordSession = false;
var shouldRecordSessionOnError = false;

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

function setTrackingIdCookie(sessionId) {
    return new Promise((resolve, reject) => {
        // Check if a value already exists
        chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function(data) {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError));
            }

            if (!data["testchimp.ext-session-record-tracking-id"]) {
                // Set the tracking ID only if it doesn't exist
                chrome.storage.local.set({ "testchimp.ext-session-record-tracking-id": sessionId }, function() {
                    if (chrome.runtime.lastError) {
                        return reject(new Error(chrome.runtime.lastError));
                    }
                    console.log("Setting testchimp tracking id to " + sessionId);
                    resolve(); // Resolve the promise when setting is complete
                });
            } else {
                // If it already exists, resolve immediately
                resolve();
            }
        });
    });
}


function getTrackingIdCookie() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function(data) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(data["testchimp.ext-session-record-tracking-id"] || "");
            }
        });
    });
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
try{
  if (stopFn) {
    stopFn(); // Stop recording events
    stopFn = null;
  }
  }catch(error){
    console.log("Error",error);
  }
}

function initRecording(endpoint,config,sessionId){
  // Start sending events
  if (shouldRecordSession) {
    startSendingEvents(endpoint, config, sessionId);
  }
};

function clearTrackingIdCookie() {
    try {
        chrome.storage.local.set({ "testchimp.ext-session-record-tracking-id": '' }, function() {
            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError);
                return;
            }
            console.log("TestChimp tracking id cleared");
        });
    } catch (error) {
        console.error("Security error caught:", error);
    }
}

async function endTrackedSession(){
    console.log("Ending current tracking session");
    stopSendingEvents()
    clearTrackingIdCookie();
}

// Function to start recording user sessions
async function startRecording(config) {
  console.log("Initializing recording for TestChimp Project: " + config.projectId);
  // Default endpoint if not provided
  var endpoint = (config.endpoint || 'https://ingress.testchimp.io');

  var sessionId = generateSessionId();
  await setTrackingIdCookie(sessionId);
  // The set method above sets only if no value present. This is needed so that page re-directs persists the session tracking (since this code runs on page load of each page).
  sessionId = await getTrackingIdCookie();
  console.log("Session id for TC",sessionId);
  // Record the session start time
  sessionStartTime = new Date().getTime();

  const defaultMaxSessionDurationSecs = 600; // 10 mins
  const defaultEventWindowToSaveOnError = 200;
  const defaultUrlRegexToAddTracking = ["/^$/"]; // Match no URLs
  const defaultUntracedUrisToTrackRegex = ["/^$/"]; // Match no URLs
  const defaultSamplingProbability = 0.0;
  const defaultSamplingProbabilityOnError = 0.0;
  const defaultEnvironment = "QA";

  if (!config.projectId) {
    console.error("No project id specified for session capture");
    return;
  }
  if (!config.sessionRecordingApiKey) {
    console.error("No session recording api key specified for session capture");
    return;
  }

  config = {
    enableRecording:config.enableRecording || true,
    endpoint: endpoint,
    projectId: config.projectId,
    sessionRecordingApiKey: config.sessionRecordingApiKey,
    samplingProbability: config.samplingProbability || defaultSamplingProbability,
    maxSessionDurationSecs: config.maxSessionDurationSecs || defaultMaxSessionDurationSecs,
    samplingProbabilityOnError: config.samplingProbabilityOnError || defaultSamplingProbabilityOnError,
    eventWindowToSaveOnError: config.eventWindowToSaveOnError || defaultEventWindowToSaveOnError,
    tracedUriRegexListToTrack: config.tracedUriRegexListToTrack || defaultUrlRegexToAddTracking,
    untracedUriRegexListToTrack: config.untracedUriRegexListToTrack || defaultUntracedUrisToTrackRegex,
    excludedUriRegexList:config.excludedUriRegexList || [],
    environment: config.environment || defaultEnvironment,
    enableLogging: config.enableLogging || true,
    enableOptionsCallTracking:config.enableOptionsCallTracking || false
  };

  console.log("config used for session recording: ", config);

  // Determine whether to record the session based on samplingProbability
  shouldRecordSession = config.samplingProbability && Math.random() <= config.samplingProbability;

  // Determine the sampling decision for error scenarios
  shouldRecordSessionOnError = config.samplingProbabilityOnError && Math.random() <= config.samplingProbabilityOnError;

  initRecording(endpoint, config, sessionId);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTCRecording') {
    startRecording(message.data);
  }if(message.action==='endTCRecording'){
    endTrackedSession();
  }
});

async function checkAndStartRecording() {
    console.log("Content script is loaded.");
    const cookie = await getTrackingIdCookie();
    if (cookie && cookie.trim() !== '') {
      // Cookie is set, retrieve settings and start recording
      chrome.storage.sync.get([
        'projectId',
        'sessionRecordingApiKey',
        'endpoint',
        'maxSessionDurationSecs',
        'eventWindowToSaveOnError',
        'uriRegexToIntercept'
      ], function(items) {
        if (chrome.runtime.lastError) {
          console.error('Error retrieving settings from storage:', chrome.runtime.lastError);
          return;
        }

        startRecording({
          projectId: items.projectId,
          sessionRecordingApiKey: items.sessionRecordingApiKey,
          endpoint: items.endpoint,
          samplingProbabilityOnError: 0.0,
          samplingProbability: 1.0,
          maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
          eventWindowToSaveOnError: 200,
          untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
        });
      });
    }
}

// Check for the cookie when the page is loaded
document.addEventListener('DOMContentLoaded', checkAndStartRecording);