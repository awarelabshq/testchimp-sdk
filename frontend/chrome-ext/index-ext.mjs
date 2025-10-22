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
import { processAndConvertEvent } from './eventProcessor.js';

// Buffer to store events for continuous send (when normal recording is enabled)
var eventBuffer = [];
var stopFn;
var sessionManager;
var sessionStartTime;
var shouldRecordSession = false;
var shouldRecordSessionOnError = false;

// Cross-origin iframe recording support
var iframeEvents = new Map(); // Store events from different iframes
var iframeStopFunctions = new Map(); // Store stop functions for each iframe
var iframeObserver = null; // MutationObserver for iframe detection

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

// Function to inject rrweb into iframes
function injectRrwebIntoIframe(iframe) {
  console.log(`[INJECTION] Attempting to inject rrweb into iframe:`, {
    src: iframe.src,
    id: iframe.id,
    className: iframe.className
  });
  
  // Check if iframe is from a different origin
  const iframeOrigin = new URL(iframe.src).origin;
  const currentOrigin = window.location.origin;
  const isCrossOrigin = iframeOrigin !== currentOrigin;
  
  console.log(`[INJECTION] Origin check:`, {
    iframeOrigin: iframeOrigin,
    currentOrigin: currentOrigin,
    isCrossOrigin: isCrossOrigin
  });
  
  try {
    if (!isCrossOrigin) {
      // Same-origin iframe, inject directly
      console.log(`[INJECTION] Same-origin iframe detected, injecting directly`);
      
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('iframe-rrweb-injector.js');
      script.onload = function() {
        this.remove();
        console.log(`[INJECTION] Same-origin iframe script loaded, sending rrweb URL`);
        // Send the rrweb URL to the injector
        iframe.contentWindow.postMessage({
          type: 'rrweb-inject',
          rrwebUrl: chrome.runtime.getURL('rrweb.js')
        }, '*');
      };
      script.onerror = function() {
        console.error('[INJECTION] Failed to inject rrweb into same-origin iframe');
        this.remove();
      };
      iframe.contentDocument.head.appendChild(script);
      return;
    } else {
      // Cross-origin iframe, use postMessage approach
      console.log(`[INJECTION] Cross-origin iframe detected, using postMessage injection`);
      
      // For cross-origin iframes, we need to inject via the content script
      // This requires the iframe to have a content script that can receive our message
      console.log(`[INJECTION] Sending injection message to cross-origin iframe`);
      iframe.contentWindow.postMessage({
        type: 'inject-rrweb',
        scriptUrl: chrome.runtime.getURL('iframe-rrweb-injector.js'),
        rrwebUrl: chrome.runtime.getURL('rrweb.js')
      }, '*');
    }
    
  } catch (error) {
    console.error('[INJECTION] Error injecting rrweb into iframe:', error);
  }
}

// Function to detect and inject rrweb into existing iframes
function detectAndInjectIntoIframes() {
  const iframes = document.querySelectorAll('iframe');
  console.log(`[DETECTION] Found ${iframes.length} iframes on page`);
  iframes.forEach((iframe, index) => {
    console.log(`[DETECTION] Processing iframe ${index + 1}/${iframes.length}`);
    injectRrwebIntoIframe(iframe);
  });
}

// Function to set up iframe observer for dynamically added iframes
function setupIframeObserver() {
  if (iframeObserver) {
    iframeObserver.disconnect();
  }

  iframeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'IFRAME') {
            console.log(`[OBSERVER] New iframe detected dynamically:`, {
              src: node.src,
              id: node.id
            });
            // Wait for iframe to load before injecting
            node.addEventListener('load', () => {
              console.log(`[OBSERVER] Iframe loaded, attempting injection`);
              injectRrwebIntoIframe(node);
            });
            // Also try immediately in case load event already fired
            if (node.contentDocument) {
              console.log(`[OBSERVER] Iframe already loaded, injecting immediately`);
              injectRrwebIntoIframe(node);
            }
          }
          // Check for iframes within added nodes
          const iframes = node.querySelectorAll && node.querySelectorAll('iframe');
          if (iframes && iframes.length > 0) {
            console.log(`[OBSERVER] Found ${iframes.length} iframes within added node`);
            iframes.forEach(iframe => {
              iframe.addEventListener('load', () => {
                console.log(`[OBSERVER] Nested iframe loaded, attempting injection`);
                injectRrwebIntoIframe(iframe);
              });
              // Also try immediately
              if (iframe.contentDocument) {
                console.log(`[OBSERVER] Nested iframe already loaded, injecting immediately`);
                injectRrwebIntoIframe(iframe);
              }
            });
          }
        }
      });
    });
  });

  iframeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Function to handle iframe events with proper replay integration
function handleIframeEvent(event) {
  if (event.data && event.data.type === 'rrweb-iframe-event') {
    const { iframeId, payload, timestamp } = event.data;
    
    console.log(`[PARENT] Received iframe event from ${iframeId}:`, {
      eventType: payload.type,
      timestamp: timestamp,
      eventData: payload
    });
    
    // Initialize storage for this iframe
    if (!iframeEvents.has(iframeId)) {
      iframeEvents.set(iframeId, []);
      console.log(`[PARENT] Created new event storage for iframe ${iframeId}`);
    }
    
    // Add iframe context to the event
    const eventWithIframeContext = {
      ...payload,
      iframeId: iframeId,
      iframeTimestamp: timestamp
    };
    
    // Convert document nodes to spans in iframe events to avoid DOM conflicts
    const processedPayload = convertDocumentNodesToSpans(payload);
    
    // Store iframe events separately but prepare them for proper replay
    iframeEvents.get(iframeId).push({
      ...eventWithIframeContext,
      payload: processedPayload
    });
    
    // Integrate actual iframe content into main page replay
    if (processedPayload.type === 2) { // FullSnapshot - iframe is ready
      // Find the actual iframe element in the main page DOM
      const actualIframe = document.querySelector(`iframe[data-iframe-id="${iframeId}"]`) || 
                          document.querySelector(`iframe[id*="${iframeId}"]`) ||
                          document.querySelector(`iframe[src*="${iframeId}"]`);
      
      if (actualIframe) {
        // Create an actual iframe element that will be embedded in the main page
        // Use the processed payload to get the converted iframe content
        const iframeContent = processedPayload.data.node;
        
        const iframeElement = {
          type: 1, // Element
          id: `iframe_${iframeId}`,
          tagName: 'iframe',
          attributes: {
            id: `iframe_${iframeId}`,
            src: actualIframe.src || 'about:blank',
            'data-iframe-id': iframeId,
            'data-iframe-recording': 'true',
            width: actualIframe.width || '100%',
            height: actualIframe.height || '300px',
            frameborder: actualIframe.frameBorder || '0',
            scrolling: actualIframe.scrolling || 'auto',
            style: actualIframe.style.cssText || ''
          },
          childNodes: iframeContent ? [iframeContent] : []
        };
        
        // Create iframe attachment event with safe parent context
        const iframeAttachmentEvent = {
          type: 3, // IncrementalSnapshot
          timestamp: timestamp,
          data: {
            source: 0, // Mutation
            adds: [{
              parentId: 1, // Use document root to avoid parent-child conflicts
              nextId: null,
              node: iframeElement
            }],
            removes: [],
            texts: [],
            attributes: []
          }
        };
        
        // Add to main event buffer
        eventBuffer.push(iframeAttachmentEvent);
        console.log(`[PARENT] Added iframe attachment event to main buffer for ${iframeId}`);
        
      } else {
        console.warn(`[PARENT] Could not find actual iframe element for ${iframeId}`);
      }
      
    } else if (payload.type === 3 && iframeEvents.get(iframeId).length > 0) { // IncrementalSnapshot
      // For incremental events, we need to be careful not to cause DOM conflicts
      // We'll create simplified events that represent iframe activity without mixing DOM structures
      const iframeUpdateEvent = {
        type: 3, // IncrementalSnapshot
        timestamp: timestamp,
        data: {
          source: 0, // Mutation
          adds: [],
          removes: [],
          texts: [],
          attributes: [{
            id: `iframe_${iframeId}`,
            attributes: {
              'data-iframe-status': 'active',
              'data-iframe-event-count': iframeEvents.get(iframeId).length.toString(),
              'data-iframe-last-update': timestamp.toString()
            }
          }]
        }
      };
      
      // Add iframe update events to show activity
      eventBuffer.push(iframeUpdateEvent);
      console.log(`[PARENT] Added iframe activity update to main buffer for ${iframeId}`);
    }
    
    console.log(`[PARENT] Stored iframe event separately for ${iframeId}: ${payload.type}. Total events: ${iframeEvents.get(iframeId).length}`);
    
  } else if (event.data && event.data.type === 'rrweb-iframe-ready') {
    const { iframeId, url, eventCount } = event.data;
    console.log(`[PARENT] Iframe recording ready: ${iframeId} (${url}) with ${eventCount} events recorded locally`);
    
    // Note: Iframe events are stored separately and will be available for analysis
    // but not mixed with main page events to prevent DOM conflicts during replay
  }
}

// Helper functions for iframe integration
function getNodeId(node) {
  if (!node) return 1; // Default to document root
  
  // Try to find existing rrweb node ID
  if (node.__rrwebId) {
    return node.__rrwebId;
  }
  
  // Generate a unique ID if none exists
  const id = Math.random().toString(36).substr(2, 9);
  node.__rrwebId = id;
  return id;
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
    
    // Also clear iframe events that have been processed
    iframeEvents.clear();

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
  // Set up iframe detection and injection
  detectAndInjectIntoIframes();
  setupIframeObserver();
  
  // Set up iframe event listener
  window.addEventListener('message', handleIframeEvent);

  const recordOptions = {
        emit: function (event) {
          // Process the event before adding it to the buffer
          const processedEvent = processAndConvertEvent(event, 'MAIN');
          if (processedEvent) {
            eventBuffer.push(processedEvent);
          }
        },
    sampling: samplingConfig,
    blockSelector: '.data-rrweb-ignore, #testchimp-sidebar, #testchimp-sidebar-toggle, #testchimp-sidebar *',
    recordCanvas: false,
    recordCrossOriginIframes: true,  // Enable for proper iframe integration
    slimDOMOptions: {
      script: true,
      comment: true,
      headFavicon: true,
      headWhitespace: true,
      headMetaDescKeywords: false,
      headMetaSocial: false,
      headMetaRobots: false,
      headMetaHttpEquiv: false,
      headMetaAuthorship: false,
      headMetaVerification: false
    },
  };

function processEvent(event) {
  // Skip iframe events completely to avoid replay conflicts
  if (event.iframeId) {
    return null;
  }

  // Use the shared processing function
  return processAndConvertEvent(event, 'MAIN');
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

    // Check if we're in a state where we can safely send data
    if (document.readyState === 'unloading') {
      console.log('[MAIN] Page unloading, skipping event flush');
      return;
    }

    const payload = JSON.stringify({
      sessionId,
      events: eventBuffer,
      config
    });

    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(endpoint, blob);

      if (!success) {
        // Only try fetch if the page is still active
        if (document.readyState !== 'unloading') {
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            keepalive: true,
            body: payload
          }).catch((err) => {
            console.log('[MAIN] Fetch fallback failed (this is normal during page transitions):', err.message);
          });
        }
      }
    } catch (err) {
      console.log('[MAIN] Failed to flush events (this is normal during page transitions):', err.message);
    }

    eventBuffer.length = 0;
  }

  function cleanup() {
    stopSendingEvents(endpoint, config, sessionId);
    window.removeEventListener("beforeunload", flushBufferedEventsBeforeExit);
    window.removeEventListener("pagehide", flushBufferedEventsBeforeExit);
    document.removeEventListener("visibilitychange", visibilityHandler);
    
    // Clean up iframe recording
    if (iframeObserver) {
      iframeObserver.disconnect();
      iframeObserver = null;
    }
    
    // Stop all iframe recordings
    iframeStopFunctions.forEach((stopFn, iframeId) => {
      try {
        stopFn();
      } catch (error) {
        console.error(`Error stopping iframe recording for ${iframeId}:`, error);
      }
    });
    iframeStopFunctions.clear();
    iframeEvents.clear();
    
    // Remove iframe event listener
    window.removeEventListener('message', handleIframeEvent);
  }

  function visibilityHandler() {
    if (document.visibilityState === "hidden") {
      // Add a small delay to avoid flushing events when just opening a new tab
      // Only flush if the page is actually being unloaded
      setTimeout(() => {
        if (document.visibilityState === "hidden") {
          // Check if the page is actually being unloaded by testing if we can still access the document
          try {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              flushBufferedEventsBeforeExit();
            }
          } catch (e) {
            // Page is being unloaded, don't try to flush
            console.log('[MAIN] Page being unloaded, skipping event flush');
          }
        }
      }, 100);
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
  try {
    if (message.action === 'startTCRecording') {
      startRecording(message.data);
      if (sendResponse) sendResponse({ success: true });
    } else if (message.action === 'endTCRecording') {
      endTrackedSession();
      if (sendResponse) sendResponse({ success: true });
    } else if (message.action === "open_extension_popup") {
      chrome.runtime.sendMessage({ type: "trigger_popup" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error triggering popup:', chrome.runtime.lastError.message);
        }
        // Always call sendResponse to prevent port closure
        if (sendResponse) sendResponse({ success: true });
      });
    } else {
      // Forward the message back to the webpage
      window.postMessage(message, "*");
      if (sendResponse) sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
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
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending captured response:', chrome.runtime.lastError.message);
      }
    });
    return true;
  } else if (event.data.type === "checkUrl") {
    chrome.runtime.sendMessage({ type: "checkUrl", url: event.data.url }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking URL:', chrome.runtime.lastError);
        window.postMessage(
          {
            type: "checkUrlResponse",
            shouldIntercept: false,
          },
          "*"
        );
        return;
      }
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
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending intercepted request:', chrome.runtime.lastError.message);
      }
    });
    return true;
  } else if (event.data?.type === "get_tc_ext_config") {
    // Fetch currentUserId and userAuthKey from chrome.storage.sync
    chrome.storage.sync.get(["currentUserId", "userAuthKey"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting config:", chrome.runtime.lastError.message);
        window.postMessage(
          {
            type: "get_tc_ext_config_response",
            payload: {
              currentUserId: null,
              userAuthKey: null,
            },
            error: chrome.runtime.lastError.message,
          },
          "*"
        );
        return;
      }
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
    chrome.runtime.sendMessage({ type: "tc_open_options_page_in_bg" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error opening options page:", chrome.runtime.lastError.message);
      }
    });
    return true;
  } else if (event.data.type === "show_testchimp_ext_popup") {
    chrome.runtime.sendMessage({ type: "trigger_popup" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error triggering popup:", chrome.runtime.lastError.message);
      }
    });
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
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending console log to background:', chrome.runtime.lastError.message);
      }
    });
    return true;
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
      if (chrome.runtime.lastError) {
        console.error('Error getting user auth info:', chrome.runtime.lastError.message);
        return;
      }
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
      if (chrome.runtime.lastError) {
        console.error('Error getting user auth info on change:', chrome.runtime.lastError.message);
        return;
      }
      window.postMessage({
        type: 'userAuthInfo',
        userAuthKey: result.userAuthKey,
        currentUserId: result.currentUserId,
        projectId: result.projectId,
      }, '*');
    });
  }
});
