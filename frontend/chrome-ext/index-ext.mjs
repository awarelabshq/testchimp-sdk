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

// START OF CUSTOM PLUGIN

/**
 * Playwright Metadata Record Plugin for rrweb
 */
export function createPlaywrightMetadataPlugin() {
  // Utility function to extract metadata from an element
  function extractElementMetadata(element) {
    if (!(element instanceof Element)) return null;

    const metadata = {};

    // Attributes to extract
    const attributes = [
      'role',
      'data-testid',
      'aria-label',
      'placeholder',
      'name',
      'id',
      'class'
    ];

    attributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        metadata[attr.replace(/^data-/, '').replace(/-/g, '_')] = value;
      }
    });

    // Try to extract associated label
    try {
      const label = findAssociatedLabel(element);
      if (label) {
        metadata.associated_label = label.trim();
      }
    } catch (error) {
      console.error('Error extracting label:', error);
    }

    // Extract text content for buttons, links, etc.
    if (['BUTTON', 'A', 'LABEL'].includes(element.tagName)) {
      const text = element.textContent?.trim();
      if (text) {
        metadata.text_content = text;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  // Find associated label for form elements
  function findAssociatedLabel(element) {
    // Check if element has an id and there's a label with 'for' attribute
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) return labelElement.textContent;
    }

    // Check if element is inside a label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent;

    return null;
  }

  // Create a set to track processed nodes to avoid duplicate processing
  const processedNodes = new WeakSet();

  return {
    name: 'playwright-metadata-plugin',

    // Default options with a safe fallback
    defaultOptions: {
      includeElements: ['input', 'button', 'select', 'textarea', 'a', 'label']
    },

    // Observer function called by rrweb
    observer: (cb, options = {}) => {
      // Merge default options with provided options
      const mergedOptions = {
        ...createPlaywrightMetadataPlugin().defaultOptions,
        ...options
      };

      console.log('[Playwright Metadata Plugin] Observer initialized', mergedOptions);

      // Ensure includeElements is an array
      const includedSelectors = Array.isArray(mergedOptions.includeElements)
        ? mergedOptions.includeElements
        : createPlaywrightMetadataPlugin().defaultOptions.includeElements;

      // Create MutationObserver to track DOM changes
      const metadataObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          // Process added nodes
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              // Only process element nodes
              if (node.nodeType === Node.ELEMENT_NODE) {
                processNode(node, cb);

                // Process child elements recursively
                node.querySelectorAll('*').forEach(child => {
                  processNode(child, cb);
                });
              }
            });
          }
          // Process attribute changes
          else if (mutation.type === 'attributes') {
            processNode(mutation.target, cb);
          }
        });
      });

    function generateNodeId(node) {
      // Prioritize data-testid first
      if (node.getAttribute('data-testid')) {
        return node.getAttribute('data-testid');
      }

      // Fall back to native DOM id
      if (node.id) {
        return node.id;
      }

      // Return null if no useful identifier found
      return null;
    }


      // Function to process individual nodes
      function processNode(node, callback) {
        // Avoid processing the same node multiple times
        if (processedNodes.has(node)) return;

        // Check if node matches desired elements
        if (node.matches &&
            includedSelectors.some(selector => node.matches(selector))) {
          const metadata = extractElementMetadata(node);

          if (metadata) {
            console.log('[Playwright Metadata Plugin] Metadata extracted:', metadata);
            const nodeId = generateNodeId(node);

            // Use callback to send metadata to rrweb
            callback({
              type: 'playwright-metadata',
              data: {
                nodeId: nodeId,
                metadata: metadata,
                tagName: node.tagName,
              }
            });

            // Mark node as processed
            processedNodes.add(node);
          }
        }
      }

      // Utility function to generate XPath
      function getXPath(element) {
        if (!(element instanceof Element)) return null;
        try {
          let path = '';
          for ( ; element && element.nodeType == 1; element = element.parentNode ) {
            let idx = getElementIdx(element);
            let xname = element.tagName;
            if (idx > 1) xname += `[${idx}]`;
            path = '/' + xname + path;
          }
          return path;
        } catch (error) {
          console.error('XPath generation error:', error);
          return null;
        }
      }

      // Helper to get element index among siblings
      function getElementIdx(element) {
        let count = 1;
        for (let sib = element.previousSibling; sib; sib = sib.previousSibling) {
          if(sib.nodeType == 1 && sib.tagName == element.tagName) count++;
        }
        return count;
      }

      // Initial processing of existing elements
      document.querySelectorAll(includedSelectors.join(','))
        .forEach(el => processNode(el, cb));

      // Start observing the document
      metadataObserver.observe(document.body, {
        childList: true,
        attributes: true,
        subtree: true,
        attributeFilter: [
          'role',
          'data-testid',
          'aria-label',
          'placeholder',
          'name',
          'class',
          'id'
        ]
      });

      // Return cleanup function
      return () => {
        console.log('[Playwright Metadata Plugin] Stopping observer');
        metadataObserver.disconnect();
      };
    }
  };
}
// END OF CUSTOM PLUGIN

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

  stopFn = record({
    emit: function (event) {
      eventBuffer.push(event)
    },
    sampling: samplingConfig,
    plugins: [
      createPlaywrightMetadataPlugin()
    ]
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

window.addEventListener("message", (event) => {
  // Ensure the message is from the correct source
  if (event.source !== window) {
    return;
  }

  // Check for specific message types
  if (event.data.type === "check_extension" || event.data.type === "run_tests_request" || event.data.type === "update_tc_ext_config" || event.data.type === "tc_open_options_page") {
    // Forward messages to the background script
    if (event.data.type === "update_tc_ext_config") {
        console.log("Received extension configuration message:",event.data.payload);
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
    }else if (event.data.type === "tc_open_options_page") {
           console.log("Received message tc_open_options_page");
           // Open the options page
            chrome.runtime.sendMessage({ type: "tc_open_options_page_in_bg" });
    } else {
      // Handle check_extension and run_tests_request
      chrome.runtime.sendMessage(event.data, (response) => {
        if (chrome.runtime.lastError) {
          // Error communicating with the background script
          console.error("Error communicating with background script:", chrome.runtime.lastError.message);
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
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward the message back to the webpage
  window.postMessage(message, "*");
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
