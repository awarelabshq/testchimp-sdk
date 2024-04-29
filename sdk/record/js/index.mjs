import {record} from 'rrweb';

// Buffer to store events before sending in batches. Used for onError event sending (last N events)
var eventsMatrix = [[]];
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
  var d = new Date();
  d.setTime(d.getTime() + (1 * 60 * 60 * 1000)); // 1 hour expiration
  var expires = "expires=" + d.toUTCString();
  document.cookie = "aware.session-record-tracking-id" + "=" + sessionId + ";expires=" + expires + ";path=/";
}

// Function to send events to the backend and reset the events array
function sendEvents(endpoint, config, sessionId, events) {
  if (events.length === 0 || !config.projectId || !config.apiKey) return;

  const sessionRecordEvents = events.map(event => {
    return {
      payload: JSON.stringify(event),
    };
  });

  // Clear the event buffer. While sendEvents is used in both onError and normal recording, the eventBuffer is utilized only in normal recording.
  eventBuffer = [];

  const body = JSON.stringify({
    tracking_id: sessionId,
    aware_project_id: config.projectId,
    aware_session_tracking_api_key: config.apiKey,
    event_list:{
        events: sessionRecordEvents
    }
  });

  let sessionSendEnabled=true;
  if(sessionSendEnabled){
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors',
      body: body,
    }).catch(function (error) {
      console.error('Error sending events:', error);
    });
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
  setInterval(function () {
    var sessionDuration = (new Date().getTime() - sessionStartTime) / 1000;
    if (!config.maxSessionDurationSecs || (config.maxSessionDurationSecs && sessionDuration < config.maxSessionDurationSecs)) {
      sendEvents(endpoint, config, sessionId, eventBuffer);
    } else {
      stopFn();
      stopFn = null;
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

// Function to start recording user sessions
function startRecording(config) {
  console.log("Initializing recording for Aware Project: " + config.projectId);
  // Default endpoint if not provided
  var endpoint = config.endpoint || 'https://ingress.awarelabs.io/session_records';

  // Retrieve session ID from cookie
  var sessionId = getSessionIdFromCookie(config.sessionIdCookieKey);

  // If session ID doesn't exist in cookie, generate a new one
  if (!sessionId) {
    sessionId = generateSessionId();
  }

  // Record the session start time
  sessionStartTime = new Date().getTime();

  // Determine whether to record the session based on samplingProbability
  shouldRecordSession = config.samplingProbability && Math.random() <= config.samplingProbability;

  // Determine the sampling decision for error scenarios
  shouldRecordSessionOnError = config.samplingProbabilityOnError && Math.random() <= config.samplingProbabilityOnError;

  console.log("Should record session: " + shouldRecordSession + " should record on error: " + shouldRecordSessionOnError);
  // Intercept all outgoing requests and add additional HTTP header
  if (shouldRecordSession || shouldRecordSessionOnError) {
      console.log("Setting tracking cookie " + sessionId);
      setTrackingIdCookie(sessionId);
  }

  // Store endpoint, projectId, apiKey, samplingProbability, maxSessionDurationSecs, samplingProbabilityOnError, and maxDurationToSaveOnError in window.AwareSDKConfig
  window.AwareSDKConfig = {
    endpoint: endpoint,
    projectId: config.projectId,
    apiKey: config.apiKey,
    samplingProbability: config.samplingProbability,
    maxSessionDurationSecs: config.maxSessionDurationSecs,
    samplingProbabilityOnError: config.samplingProbabilityOnError,
    eventWindowToSaveOnError: config.eventWindowToSaveOnError,
    urlRegexToAddTracking:config.urlRegexToAddTracking
  };

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
  stopRecording: stopSendingEvents // Expose the stopRecording function
};

// Export AwareSDK
export { AwareSDK };
