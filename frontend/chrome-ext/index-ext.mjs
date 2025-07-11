// Inject the external script only once
if (!window.__scriptInjected) {
  window.__scriptInjected = true;

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injectScript.js');
  script.onload = function () {
    this.remove();
  };
  document.documentElement.appendChild(script);
}


import { record } from 'rrweb';

// Buffer to store events for continuous send (when normal recording is enabled)
var eventBuffer = [];
var stopFn;
var sessionManager;
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

function log(config, log) {
  if (config.enableLogging) {
    console.log(log);
  }
}

function setTrackingIdCookie(sessionId) {
  return new Promise((resolve, reject) => {
    // Check if a value already exists
    chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function (data) {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError));
      }

      if (!data["testchimp.ext-session-record-tracking-id"]) {
        // Set the tracking ID only if it doesn't exist
        chrome.storage.local.set({ "testchimp.ext-session-record-tracking-id": sessionId }, function () {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError));
          }
          console.log("Setting testchimp tracking id to " + sessionId);
          resolve(); // Resolve the promise when setting is complete
        });
        chrome.storage.local.set({ recordingInProgress: true });
      } else {
        // If it already exists, resolve immediately
        resolve();
      }
    });
  });
}


function getTrackingIdCookie() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function (data) {
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
    session_record_source: "EXTENSION",
    current_user_id: config.currentUserId,
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

// Function to start sending events in batches every 5 seconds
function startSendingEvents(endpoint, config, sessionId) {
  const recordOptions = {
    emit: function (event) {
      // Process the event before adding it to the buffer
      const processedEvent = processEvent(event);
      if (processedEvent) {
        eventBuffer.push(processedEvent);
      }
    },
    sampling: samplingConfig,
    blockSelector: '.data-rrweb-ignore, #testchimp-sidebar, #testchimp-sidebar-toggle, #testchimp-sidebar *',
    recordCanvas: false
  };

  function processEvent(event) {
    if (event.type === 2) return event;

    if (event.type === 3 && event.data.source === 0 && event.data.attributes?.length > 0) {
      const filteredAttributes = event.data.attributes.filter(attr => {
        const isTransform = attr.attributes?.style?.transform || attr.attributes?.transform;
        return !isTransform;
      });

      if (filteredAttributes.length === 0) return null;

      return {
        ...event,
        data: {
          ...event.data,
          attributes: filteredAttributes
        }
      };
    }

    return event;
  }

  stopFn = record(recordOptions);
  record.takeFullSnapshot();

  const intervalId = setInterval(() => {
    const sessionDuration = (Date.now() - sessionStartTime) / 1000;
    if (!config.maxSessionDurationSecs || sessionDuration < config.maxSessionDurationSecs) {
      sendEvents(endpoint, config, sessionId, eventBuffer);
    } else {
      clearInterval(intervalId);
      cleanup();
    }
  }, 5000);

  function flushBufferedEventsBeforeExit() {
    if (eventBuffer.length === 0) return;

    const payload = JSON.stringify({
      sessionId,
      events: eventBuffer,
      config
    });

    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(endpoint, blob);

      if (!success) {
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          keepalive: true,
          body: payload
        }).catch((err) => {
          console.error("Fetch fallback failed", err);
        });
      }
    } catch (err) {
      console.error("Failed to flush events", err);
    }

    eventBuffer.length = 0;
  }

  function cleanup() {
    stopSendingEvents(endpoint, config, sessionId);
    window.removeEventListener("beforeunload", flushBufferedEventsBeforeExit);
    window.removeEventListener("pagehide", flushBufferedEventsBeforeExit);
    document.removeEventListener("visibilitychange", visibilityHandler);
  }

  function visibilityHandler() {
    if (document.visibilityState === "hidden") {
      flushBufferedEventsBeforeExit();
    }
  }

  window.addEventListener("beforeunload", flushBufferedEventsBeforeExit);
  window.addEventListener("pagehide", flushBufferedEventsBeforeExit);
  document.addEventListener("visibilitychange", visibilityHandler);

  return {
    stop: () => {
      clearInterval(intervalId);
      cleanup();
    }
  };
}

// Function to stop sending events
function stopSendingEvents(endpoint, config, sessionId) {
  try {
    if (stopFn) {
      stopFn(); // Stop recording events
      stopFn = null;
    }
    // Flush remaining events in the buffer
    if (eventBuffer.length > 0) {
      console.log("Sending remaining events of size: ", eventBuffer.length);
      sendEvents(endpoint, config, sessionId, eventBuffer);
    }
  } catch (error) {
    console.log("Error stopping session:", error);
  }
}


function clearTrackingIdCookie() {
  try {
    chrome.storage.local.set({ "testchimp.ext-session-record-tracking-id": '' }, function () {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError);
        return;
      }
      console.log("TestChimp tracking id cleared");
    });
    chrome.storage.local.set({ recordingInProgress: false });

  } catch (error) {
    console.error("Security error caught:", error);
  }
}

async function endTrackedSession() {
  console.log("Ending current tracking session");
  if (sessionManager) {
    sessionManager.stop();
  }
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
  console.log("Session id for TC", sessionId);
  // Record the session start time
  sessionStartTime = new Date().getTime();

  const defaultMaxSessionDurationSecs = 600; // 10 mins
  const defaultEventWindowToSaveOnError = 200;
  const defaultUrlRegexToAddTracking = ["/^$/"]; // Match no URLs
  const defaultUntracedUrisToTrackRegex = ["/^$/"]; // Match no URLs
  const defaultSamplingProbability = 0.0;
  const defaultSamplingProbabilityOnError = 0.0;
  const defaultEnvironment = "QA";
  const defaultCurrentUserId = "default_tester";

  if (!config.projectId) {
    console.error("No project id specified for session capture");
    return;
  }
  if (!config.sessionRecordingApiKey) {
    console.error("No session recording api key specified for session capture");
    return;
  }

  config = {
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
    currentUserId: config.currentUserId || defaultCurrentUserId
  };

  console.log("config used for session recording: ", config);

  // Determine whether to record the session based on samplingProbability
  shouldRecordSession = config.samplingProbability && Math.random() <= config.samplingProbability;

  // Determine the sampling decision for error scenarios
  shouldRecordSessionOnError = config.samplingProbabilityOnError && Math.random() <= config.samplingProbabilityOnError;

  if (shouldRecordSession) {
    sessionManager = startSendingEvents(endpoint, config, sessionId);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTCRecording') {
    startRecording(message.data);
  }
  if (message.action === 'endTCRecording') {
    endTrackedSession();
  }
  if (message.action === "open_extension_popup") {
    chrome.runtime.sendMessage({ type: "trigger_popup" });
  }

});

window.addEventListener("message", (event) => {
  // Ensure the message is from the correct source
  if (event.source !== window) {
    return;
  }

  if (event.data.type === "interceptedResponse") {

    const { responseHeaders, responseBody, statusCode, url, requestId } = event.data.detail;

    chrome.runtime?.sendMessage({
      type: 'capturedResponse',
      requestId: requestId,
      responseHeaders: responseHeaders,
      responseBody: responseBody,
      statusCode: statusCode,
      url: url?.toString() || ''
    });
    return true;
  } else if (event.data.type === "checkUrl") {
    chrome.runtime.sendMessage({ type: "checkUrl", url: event.data.url }, (response) => {
      window.postMessage(
        {
          type: "checkUrlResponse",
          shouldIntercept: response?.shouldIntercept || false,
        },
        "*"
      );
    });
    return true;
  } else if (event.data.type === "fallbackRequestBody") {
    const { url, method, responseHeaders, requestId, requestHeaders, requestBody } = event.data.detail;

    chrome.runtime?.sendMessage({
      type: 'interceptedRequest',
      url,
      method,
      responseHeaders,
      requestId,
      requestHeaders,
      requestBody
    });
    return true;
  } else if (event.data?.type === "get_tc_ext_config") {
    // Fetch currentUserId and userAuthKey from chrome.storage.sync
    chrome.storage.sync.get(["currentUserId", "userAuthKey"], (result) => {
      window.postMessage(
        {
          type: "get_tc_ext_config_response",
          payload: {
            currentUserId: result.currentUserId ?? null,
            userAuthKey: result.userAuthKey ?? null,
          },
        },
        "*"
      );
    });
    return true;
  } else if (event.data.type === "tc_open_options_page") {
    console.log("Received message tc_open_options_page");
    // Open the options page
    chrome.runtime.sendMessage({ type: "tc_open_options_page_in_bg" });
    return true;
  } else if (event.data.type === "show_testchimp_ext_popup") {
    chrome.runtime.sendMessage({ type: "trigger_popup" });
    return true;
  } else if (event.data.type === "get_latest_session") {
    chrome.runtime.sendMessage({ type: "get_latest_session" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("get_latest_session error:", chrome.runtime.lastError.message);
        window.postMessage({
          type: "latest_session_response",
          latestSession: null,
          error: chrome.runtime.lastError.message,
        }, "*");
        return;
      }

      window.postMessage({
        type: "latest_session_response",
        latestSession: response?.latestSession ?? null,
      }, "*");
    });
    return true;
  } else if (event.data.type === "update_tc_ext_config") {
    console.log("Received extension configuration message:", event.data.payload);
    // Extract the data to be stored from the message
    const dataToStore = event.data.payload; // Assuming payload contains the key-value pairs

    // Store the data in chrome.storage.sync
    chrome.storage.sync.set(dataToStore, () => {
      if (chrome.runtime.lastError) {
        console.error("Error storing data:", chrome.runtime.lastError.message);
        window.postMessage({ type: "update_tc_ext_config_response", success: false, error: chrome.runtime.lastError.message }, "*");
      } else {
        window.postMessage({ type: "update_tc_ext_config_response", success: true }, "*");
      }
    });
    return true;
  } else {
    // Handle check_extension and run_tests_request
    chrome.runtime.sendMessage(event.data, (response) => {
      if (!event.data.type) {
        return;
      }

      if (chrome.runtime.lastError) {
        // Error communicating with the background script
        if (event.data.type === "check_extension") {
          window.postMessage({ type: "check_extension_response", success: false }, "*");
        } else if (event.data.type === "run_tests_request") {
          window.postMessage({ type: "run_tests_response", error: "Extension error: " + chrome.runtime.lastError.message }, "*");
        }
      } else if (response.error) {
        // Background script returned an error
        if (event.data.type === "check_extension") {
          window.postMessage({ type: "check_extension_response", success: false }, "*");
        } else if (event.data.type === "run_tests_request") {
          window.postMessage({ type: "run_tests_response", error: response.error }, "*");
        }
      } else {
        // Successful responses
        if (event.data.type === "check_extension") {
          window.postMessage({ type: "check_extension_response", success: response.success }, "*");
        } else if (event.data.type === "run_tests_request") {
          window.postMessage({ type: "run_tests_response", response: response.data }, "*");
        }
      }
    });
  }

});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward the message back to the webpage
  window.postMessage(message, "*");
});

// Relay host page console logs to background
window.addEventListener('message', function(event) {
  if (
    event.source === window &&
    event.data &&
    event.data.type === 'testchimp-host-console-log'
  ) {
    chrome.runtime.sendMessage({
      type: 'host_console_log',
      logType: event.data.logType,
      log: event.data.log,
      timestamp: event.data.timestamp
    });
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
      'uriRegexToIntercept',
      'currentUserId'
    ], function (items) {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving settings from storage:', chrome.runtime.lastError);
        return;
      }

      console.log("ITEMS FROM CHROME: ", items);

      startRecording({
        projectId: items.projectId,
        sessionRecordingApiKey: items.sessionRecordingApiKey,
        endpoint: items.endpoint,
        samplingProbabilityOnError: 0.0,
        samplingProbability: 1.0,
        maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
        eventWindowToSaveOnError: 200,
        currentUserId: items.currentUserId,
        untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
      });
    });
  }
}

// Check for the cookie when the page is loaded
document.addEventListener('DOMContentLoaded', checkAndStartRecording);

// Relay user/project info to sidebar for login state and project updates
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data && (event.data.type === 'fetchProjects' || event.data.type === 'getUserAuthInfo')) {
    chrome.storage.sync.get(['userAuthKey', 'currentUserId', 'projectId'], (result) => {
      window.postMessage({
        type: 'userAuthInfo',
        userAuthKey: result.userAuthKey,
        currentUserId: result.currentUserId,
        projectId: result.projectId,
      }, '*');
    });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.userAuthKey || changes.currentUserId || changes.projectId)) {
    chrome.storage.sync.get(['userAuthKey', 'currentUserId', 'projectId'], (result) => {
      window.postMessage({
        type: 'userAuthInfo',
        userAuthKey: result.userAuthKey,
        currentUserId: result.currentUserId,
        projectId: result.projectId,
      }, '*');
    });
  }
});
