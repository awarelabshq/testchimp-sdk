import { connectMCP } from './background-websockets.js';

chrome.runtime.onInstalled.addListener(() => {
    console.log('TestChimp Chrome Extension installed.');

    // Set default value for enableRunLocallyForTcRuns
    chrome.storage.sync.set({ "enableRunLocallyForTcRuns": true }, () => {
        console.log("Enabled run locally for test studio runs.");
    });

    // Check if currentUserId is empty, and set a default value if so
    chrome.storage.sync.get(["currentUserId", "uriRegexToIntercept", "vscodeWebsocketPort", "mcpWebsocketPort"], (result) => {
        if (!result.currentUserId) {
            chrome.storage.sync.set({ "currentUserId": "default_tester@example.com" }, () => {
                console.log("Set default currentUserId to 'default_tester@example.com'.");
            });
        }
        if (!result.uriRegexToIntercept) {
            chrome.storage.sync.set({ "uriRegexToIntercept": ".*" }, () => {
                console.log("Set default uriRegexToIntercept to '.*'.");
            });
        }
        if (!result.vscodeWebsocketPort) {
            chrome.storage.sync.set({ vscodeWebsocketPort: 53333 }, () => {
                console.log("Set default vscodeWebsocketPort to 53333.");
            });
        }
        if (!result.mcpWebsocketPort) {
            chrome.storage.sync.set({ mcpWebsocketPort: 43449 }, () => {
                console.log("Set default mcpWebsocketPort to 43449.");
            });
        }
    });

  chrome.tabs.query({}, (tabs) => {
    for (let tab of tabs) {
      // Check if the tab's URL matches the desired patterns
      if (tab.url && (tab.url.includes('testchimp'))) {
        // Inject contentScript.js into tabs matching the patterns
        console.log("Injecting script to ",tab.url);
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['index.js']
        });
      }
    }
  });
});

chrome.action.onClicked.addListener((tab) => {
    if (!tab.id) return;
  
    chrome.storage.local.set({ forceExpandSidebar: true }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['injectSidebar.js'],
      });
    });
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      chrome.storage.local.get(['recordingInProgress'], (data) => {
        if (data.recordingInProgress) {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['injectSidebar.js', 'index.js'],
          });
          
          // Also start recording on the updated tab
          chrome.storage.sync.get([
            'projectId',
            'sessionRecordingApiKey',
            'endpoint',
            'maxSessionDurationSecs',
            'eventWindowToSaveOnError',
            'uriRegexToIntercept',
            'currentUserId'
          ], (items) => {
            if (!chrome.runtime.lastError && items.projectId) {
              chrome.tabs.sendMessage(tabId, {
                action: 'startTCRecording',
                data: {
                  projectId: items.projectId,
                  sessionRecordingApiKey: items.sessionRecordingApiKey,
                  endpoint: items.endpoint,
                  samplingProbabilityOnError: 0.0,
                  samplingProbability: 1.0,
                  maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
                  eventWindowToSaveOnError: items.eventWindowToSaveOnError || 200,
                  currentUserId: items.currentUserId,
                  untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
                }
              });
            }
          });
        }
      });
    }
  });
  
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.storage.local.get(['recordingInProgress'], (data) => {
      if (data.recordingInProgress) {
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['injectSidebar.js', 'index.js'],
        });
        
        // Also start recording on the newly activated tab
        chrome.storage.sync.get([
          'projectId',
          'sessionRecordingApiKey',
          'endpoint',
          'maxSessionDurationSecs',
          'eventWindowToSaveOnError',
          'uriRegexToIntercept',
          'currentUserId'
        ], (items) => {
          if (!chrome.runtime.lastError && items.projectId) {
            chrome.tabs.sendMessage(tabId, {
              action: 'startTCRecording',
              data: {
                projectId: items.projectId,
                sessionRecordingApiKey: items.sessionRecordingApiKey,
                endpoint: items.endpoint,
                samplingProbabilityOnError: 0.0,
                samplingProbability: 1.0,
                maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
                eventWindowToSaveOnError: items.eventWindowToSaveOnError || 200,
                currentUserId: items.currentUserId,
                untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
              }
            });
          }
        });
      }
    });
  });

// List of streaming content types to exclude from interception
const streamingContentTypes = [
    'text/event-stream',
    'application/x-ndjson',
    'application/json-seq',
    'multipart/x-mixed-replace'
];

const requestPayloads = {};
const responsePayloads = {};
const requestIdToSpanIdMap = new Map();
const requestUrls = new Map();
const requestDetailsMap = new Map();
const urlToRequestIdMap = new Map();
const urlToResponsePayloadMap = new Map();
const urlToRequestPayloadMap = new Map();
const requestCompletedMap = new Map();
const captureResponseComplete=new Map();

async function getTrackingIdCookie() {
    try {
        const tabs = await new Promise((resolve, reject) => {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(tabs);
            });
        });

        if (tabs.length === 0) return '';
        if (!tabs[0].url) {
            return '';
        }

        // Retrieve the session ID from chrome.storage.local
        return new Promise((resolve, reject) => {
            chrome.storage.local.get("testchimp.ext-session-record-tracking-id", (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(data["testchimp.ext-session-record-tracking-id"] || '');
                }
            });
        });
    } catch (error) {
        console.error('Error checking current tab cookie:', error);
        return '';
    }
}


function generateSpanId() {
    let spanId = '';
    for (let i = 0; i < 8; i++) {
        // Generate a random byte and convert it to a 2-character hexadecimal string
        const byte = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        spanId += byte;
    }
    return spanId;
}


const getConfig = async () => {
    return new Promise((resolve) => {
        chrome.storage.sync.get([
            'uriRegexToIntercept',
            'excludedUriRegexList',
            'enableOptionsCallTracking',
            'projectId',
            'sessionRecordingApiKey',
            'endpoint',
            'environment',
            'currentUserId',
            'enableRunLocallyForTcRuns'
        ], (result) => {

            const untracedUriRegexListToTrack = Array.isArray(result.uriRegexToIntercept)
                ? result.uriRegexToIntercept
                : typeof result.uriRegexToIntercept === 'string'
                ? result.uriRegexToIntercept.split(',').map(item => item.trim())
                : [];

            const excludedUriRegexList = Array.isArray(result.excludedUriRegexList)
                ? result.excludedUriRegexList
                : typeof result.excludedUriRegexList === 'string'
                ? result.excludedUriRegexList.split(',').map(item => item.trim())
                : [];

            resolve({
                tracedUriRegexListToTrack: [],
                untracedUriRegexListToTrack: untracedUriRegexListToTrack,
                excludedUriRegexList: excludedUriRegexList,
                enableOptionsCallTracking: result.enableOptionsCallTracking || false,
                projectId: result.projectId || '',
                sessionRecordingApiKey: result.sessionRecordingApiKey || '',
                endpoint: result.endpoint || 'https://ingress.testchimp.io',
                environment: result.environment || 'QA',
                currentUserId: result.currentUserId || "DEFAULT_TESTER",
                enableRunLocallyForTcRuns:result.enableRunLocallyForTcRuns,
            });
        });
    });
};

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

function log(config, log) {
    if (config.enableLogging) {
        console.log(log);
    }
}


function sendPayloadToEndpoint(payload, endpoint) {
    const body = JSON.stringify(payload);
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        mode: 'no-cors',
        body: body,
    }).catch(function(error) {
        console.error('Error sending payload:', error);
    });
}

function deleteEntriesByRequestId(map, requestIdToDelete) {
    for (let [k, v] of map) {
        if (v === requestIdToDelete) {
            map.delete(k);
        }
    }
}

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

async function sendPayloadForRequestId(requestId) {
    const config = await getConfig();
    const sessionId = await getTrackingIdCookie();
    if (!sessionId) {
        return;
    }
    const spanId = requestIdToSpanIdMap.get(requestId);
    const requestPayload = requestPayloads[requestId];
    const responsePayload = responsePayloads[requestId];
    const requestUrl = requestUrls.get(requestId);

    if (requestPayload && responsePayload && requestUrl && spanId && requestCompletedMap.get(requestId) && captureResponseComplete.get(requestId)) {
        const requestPayloadStrLen = requestPayload ? JSON.stringify(requestPayload).length : 0;
        const responsePayloadStrLen = responsePayload ? JSON.stringify(responsePayload).length : 0;

        if (requestPayloadStrLen > MAX_PAYLOAD_SIZE || responsePayloadStrLen > MAX_PAYLOAD_SIZE) {
            console.warn("Skipping payload interception due to large size for " + requestUrl);
            cleanupRequestData(requestId);
            return;
        }

        // Construct payload
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
            current_user_id: config.currentUserId,
            url: requestUrl, // Use the stored request.url
            tracking_id: sessionId,
            environment: config.environment,
            request_timestamp: new Date().getTime(),
            response_timestamp: new Date().getTime()
        };

        sendPayloadToEndpoint(insertPayloadRequest, config.endpoint + '/insert_client_recorded_payloads');
        cleanupRequestData(requestId);
    }
}

// Helper function to clean up stored request data
function cleanupRequestData(requestId) {
    delete requestPayloads[requestId];
    delete responsePayloads[requestId];
    delete requestCompletedMap[requestId];
    delete captureResponseComplete[requestId];
    deleteEntriesByRequestId(urlToRequestIdMap, requestId);
}

async function populateHttpPayload(config, details) {
    const {
        method,
        url,
        statusCode,
        requestHeaders,
        responseHeaders,
        requestBody,
        responseBody
    } = details;

    const httpPayload = {
        headerMap: {},
        queryParamMap: {},
        httpMethod: method || "",
    };

    // Determine if we're dealing with a request or a response
    const isRequest = requestHeaders !== undefined;

    // Convert headers to a plain object
    const headers = isRequest ? requestHeaders : responseHeaders;
    if (headers && Array.isArray(headers)) {
        headers.forEach((header) => {
            httpPayload.headerMap[header.name.toLowerCase()] = header.value;
        });
    }

    if (!isRequest && statusCode) {
        httpPayload.responseCode = statusCode;
    }

    // Extract query parameters from the URL
    if (url) {
        try {
            const urlParams = new URLSearchParams(new URL(url).search);
            urlParams.forEach((value, key) => {
                httpPayload.queryParamMap[key] = value;
            });
        } catch (error) {
            console.error("Error parsing url ", url);
        }
    }

    let contentType = "";
    try {
        contentType = (headers && headers.find && headers.find(header => header.name.toLowerCase() === 'content-type'))?.value || '';
    } catch (error) {
        console.error("error reading headers. isRequest: " + isRequest, error);
    }

    // Handling body if present
    const bodyText = isRequest ? requestBody : responseBody;
    if (bodyText) {
        try {
            if (contentType.includes('application') && contentType.includes('json')) {
                httpPayload.jsonBody = JSON.stringify(JSON.parse(bodyText));
            } else if (contentType.includes('multipart/form-data')) {
                const formData = new URLSearchParams(bodyText);
                const keyValueMap = {};
                formData.forEach((value, key) => {
                    keyValueMap[key] = value;
                });
                httpPayload.httpFormDataBody = {
                    keyValueMap
                };
            } else if (contentType.includes('application/octet-stream')) {
                const buffer = new Uint8Array(bodyText).buffer;
                if (buffer.byteLength <= 10 * 1024 * 1024) {
                    httpPayload.binaryDataBody = {
                        data: buffer
                    };
                } else {
                    log(config, "Binary data exceeds 10MB. Dropping data.");
                }
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                const formData = new URLSearchParams(bodyText);
                const keyValueMap = {};
                formData.forEach((value, key) => {
                    keyValueMap[key] = value;
                });
                httpPayload.httpFormUrlencodedBody = {
                    keyValueMap
                };
            } else {
                if (contentType.includes('text/plain')) {
                    httpPayload.textBody = bodyText;
                } else if (contentType.includes('text/html')) {
                    httpPayload.htmlBody = bodyText;
                } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
                    httpPayload.xmlBody = bodyText;
                } else {
                    httpPayload.textBody = bodyText;
                }
            }
        } catch (error) {
            console.error('Error reading payload:' + isRequest + " " + (isRequest ? requestBody : responseBody), error);
        }
    }

    return httpPayload;
}

function isBroadRegex(regexList) {
  return regexList.some(regex => regex.toString() === ".*" || regex.toString() === "^.*$");
}

function isExcludedApiCall(url) {
  return url.includes('/insert_client_recorded_payloads') || url.includes('/session_records');
}

async function checkUrl(url) {
    if (!url || isExcludedApiCall(url)) {
        return false;
    }

    // First, check if recording is in progress
    const recordingStatus = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['recordingInProgress'], function (items) {
            if (chrome.runtime.lastError) {
                console.error('Error retrieving recording flag:', chrome.runtime.lastError);
                reject('Error retrieving recording flag');
            }
            resolve(items.recordingInProgress);
        });
    });

    // If recording is not in progress, return false immediately
    if (!recordingStatus) {
        return false;
    }

    // Fetch the configuration settings if recording is in progress
    const config = await getConfig();
    try {
        const { tracedUriRegexListToTrack, untracedUriRegexListToTrack, excludedUriRegexList } = config;

        // Ensure valid regex lists
        const validExcludedUriRegexList = excludedUriRegexList.filter(Boolean);

        // Check if any regex lists contain overly broad patterns
        if (isBroadRegex(tracedUriRegexListToTrack) || isBroadRegex(untracedUriRegexListToTrack)) {
            console.warn("Skipping interception due to broad regex patterns");
            return false;
        }

        // Check for matches
        const matchedTracedUri = tracedUriRegexListToTrack.some(regex => url.match(regex));
        const matchedUntracedUri = untracedUriRegexListToTrack.some(regex => url.match(regex));
        const matchedExcludedUri = validExcludedUriRegexList.some(regex => url.match(regex));
        // Allow only if it's not an excluded URI and matches a specific pattern
        return !matchedExcludedUri && (matchedTracedUri || matchedUntracedUri);
    } catch (error) {
        console.error("Error during URL check:", error);
        return false;
    }
}

async function handleTestChimpRequest(details) {
    const config = await getConfig();
    const enableRunLocallyForTcRuns=config.enableRunLocallyForTcRuns;

  if (!enableRunLocallyForTcRuns) {
    console.log("Run locally disabled");
    return;
  }

  const bodyText = details.requestBody?.raw
    ? details.requestBody.raw.map(part => new TextDecoder().decode(part.bytes)).join('')
    : '';
  const parsedBody = JSON.parse(bodyText);

  const requestBody = await parseRequestBody(parsedBody);
  const response = await makeSUTRequest(
    parsedBody.rawTestStepExecution,
    parsedBody.rawTestStepExecution.rawRequest.httpMethod,
    requestBody
  );

  const rawResponse = response.rawResponse;
  return rawResponse;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "check_extension") {
    // Use an async function to handle the await
    (async () => {
     const config = await getConfig();
       const enableRunLocallyForTcRuns=config.enableRunLocallyForTcRuns;
      if (enableRunLocallyForTcRuns) {
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    })(); // Immediately invoke the async function
    return true; // Indicate that the response will be sent asynchronously
  }

  if (message.type === "trigger_popup") {
    chrome.action.openPopup();
    sendResponse({ success: true });
    return  true;
  }

  if (message.type === "get_latest_session") {
    // Retrieve the latest session from local storage
    chrome.storage.local.get("recentSessions", (data) => {
      const recentSessions = data.recentSessions || [];
      const latestSession =
        recentSessions.length > 0
          ? recentSessions[recentSessions.length - 1]
          : null;
      // Send response back to index.mjs
      sendResponse({ latestSession }); // <-- fix: should match what index.mjs expects
    });
    return true;
  }

  if (message.type === "run_tests_request") {

   let parsedBody;
    try {
      parsedBody = message.raw;
    } catch (error) {
      console.log("Error parsing",error);
      sendResponse({ error: "Invalid request body" });
      return true;
    }

    (async () => {
      try {
        const requestBody = await parseRequestBody(parsedBody);
        const response = await makeSUTRequest(
          parsedBody.rawTestStepExecution,
          parsedBody.rawTestStepExecution.rawRequest.httpMethod,
          requestBody
        );
        sendResponse({ data: response });
      } catch (error) {
         console.log("Error during SUT call",error);
         sendResponse({ error: error.toString() });
      }
    })(); // Immediately invoke the async function
    return true; // Indicate that the response will be sent asynchronously
  }

   if (message.type === 'interceptedRequest') {
        const { url, method, responseHeaders, requestId, requestHeaders, requestBody } = message;

        (async () => {
          try {
            const isMatchingUrl = await checkUrl(url);
            if (!isMatchingUrl) {
              sendResponse({ success: false, reason: 'URL not matching' });
              return;
            }

            const config = await getConfig();
            const contentLength =
              (responseHeaders &&
                responseHeaders.find &&
                responseHeaders.find((header) => header.name.toLowerCase() === "content-length")?.value) || "";
            const key = `${url}|${contentLength}`;

            const requestPayload = await populateHttpPayload(config, {
              method: method,
              url: url,
              requestHeaders: requestHeaders,
              requestBody: requestBody,
            });

            if (requestId && !requestPayloads[requestId]) {
              requestPayloads[requestId] = requestPayload;
              await sendPayloadForRequestId(requestId);
            } else {
              if (urlToRequestIdMap.has(key)) {
                const requestId = urlToRequestIdMap.get(key);
                if(!requestPayloads[requestId]){
                    requestPayloads[requestId] = requestPayload;
                    await sendPayloadForRequestId(requestId);
                }
              } else {
                urlToRequestPayloadMap.set(key, requestPayload);
              }
            }
          } catch (error) {
            console.error("Error in fallbackRequestBody handling:", error);
            sendResponse({ success: false, error: error.message });
          }
        })(); // Immediately invoke the async function
        return true;
    }

  if (message.type === "checkUrl") {
    checkUrl(message.url).then((result) => {
      sendResponse({ shouldIntercept: result });
    });
    return true; // Indicate an async response
  }

  if (message.type === 'start_recording_from_sidebar') {
    chrome.storage.sync.get([
      'projectId',
      'sessionRecordingApiKey',
      'endpoint',
      'maxSessionDurationSecs',
      'eventWindowToSaveOnError',
      'uriRegexToIntercept',
      'currentUserId'
    ], (items) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          sendResponse({ success: false, error: 'No active tab' });
          return;
        }

        chrome.tabs.sendMessage(tabId, {
          action: 'startTCRecording',
          data: {
            projectId: items.projectId,
            sessionRecordingApiKey: items.sessionRecordingApiKey,
            endpoint: items.endpoint,
            samplingProbabilityOnError: 0.0,
            samplingProbability: 1.0,
            maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
            eventWindowToSaveOnError: items.eventWindowToSaveOnError || 200,
            currentUserId: items.currentUserId,
            untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
          }
        });

        sendResponse({ success: true });
      });
    });

    return true; // Keep the message channel open
  }
  // Start Playwright-style step capture from sidebar
  if (message.type === 'start_step_capture_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      chrome.storage.local.set({ stepCaptureInProgress: true });
      chrome.tabs.sendMessage(tabId, { action: 'start_step_capture' }, (resp) => {
        sendResponse && sendResponse({ success: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message });
      });
    });
    return true;
  }

  if (message.type === 'stop_step_capture_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      chrome.storage.local.set({ stepCaptureInProgress: false });
      chrome.tabs.sendMessage(tabId, { action: 'stop_step_capture' }, (resp) => {
        sendResponse && sendResponse({ success: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message });
      });
    });
    return true;
  }

  // Relay captured steps from content script to sidebar
  if (message.type === 'captured_step') {
    try {
      const tabId = sender?.tab?.id;
      if (tabId) {
        // Debounce mechanism to prevent duplicate messages
        const messageKey = `${message.cmd}_${message.kind}`;
        const now = Date.now();
        
        if (!global._lastStepMessage || global._lastStepMessage.key !== messageKey || now - global._lastStepMessage.time > 100) {
          global._lastStepMessage = { key: messageKey, time: now };
          console.log('[Background] Relaying step to sidebar:', message.cmd);
          chrome.tabs.sendMessage(tabId, { type: 'captured_step', cmd: message.cmd, kind: message.kind });
        } else {
          console.log('[Background] Ignoring duplicate step:', message.cmd);
        }
      }
    } catch (_) {}
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'stop_recording_from_sidebar') {
    chrome.storage.sync.get(['projectId'], (syncData) => {
      const projectId = syncData.projectId;
      if (!projectId) {
        sendResponse({ success: false, error: 'Missing projectId' });
        return;
      }

      chrome.storage.local.get("testchimp.ext-session-record-tracking-id", (data) => {
        const sessionId = data["testchimp.ext-session-record-tracking-id"];
        if (!sessionId) {
          sendResponse({ success: false, error: 'Missing session ID' });
          return;
        }

        const sessionLink = `https://prod.testchimp.io/replay?session_id=${sessionId}&project_id=${projectId}`;

        // Save to recentSessions
        chrome.storage.local.get('recentSessions', (history) => {
          const recentSessions = history.recentSessions || [];
          recentSessions.push({ url: sessionLink, timestamp: Date.now() });

          if (recentSessions.length > 5) recentSessions.shift();

          chrome.storage.local.set({ recentSessions });
        });

        // End recording in content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (!tabId) {
            sendResponse({ success: false, error: 'No active tab found' });
            return;
          }

          chrome.tabs.sendMessage(tabId, {
            action: 'endTCRecording',
            data: {}
          });

          chrome.storage.local.remove("testchimp.ext-session-record-tracking-id");
          chrome.storage.local.set({ recordingInProgress: false });

          sendResponse({ success: true, sessionLink });
        });
      });
    });

    return true; // Keep async channel open
  }

  if (message.type === 'send_to_vscode' && self.vscodeSocket && self.vscodeSocket.readyState === 1) {
    self.vscodeSocket.send(JSON.stringify(message.payload));
  }

  if (message.type === 'capture_viewport_screenshot') {
    console.log('[background] capture_viewport_screenshot received');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.windowId) {
        sendResponse({ error: 'No active tab found' });
        return;
      }
  
      // Inject a no-op script to "touch" the tab and activate capture permission
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          console.log('[scripting] activating tab before screenshot');
        }
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('executeScript error:', chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
  
        // Now safe to call captureVisibleTab
        chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error('captureVisibleTab error:', chrome.runtime.lastError.message);
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }
          console.log('[background] captureVisibleTab result:', !!dataUrl, dataUrl ? dataUrl.length : 0);
          sendResponse({ dataUrl });
        });
      });
    });
  
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'fetch_image_as_base64') {
    console.log('[background] fetch_image_as_base64 received for URL:', message.url);
    
    // Use fetch to get the image (background script has CORS permissions)
    fetch(message.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Convert blob to base64 data URL
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          console.log('[background] Successfully converted image to base64, length:', dataUrl.length);
          sendResponse({ success: true, dataUrl: dataUrl });
        };
        reader.onerror = () => {
          console.error('[background] FileReader error:', reader.error);
          sendResponse({ success: false, error: 'Failed to convert image to base64' });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('[background] Fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  }

  // Default case for unknown message types
  console.log('Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
  return true;
});

const cleanKey = (key) => {
    // Remove any boundary artifacts or extra characters
    return key
        .replace(/--.*$/g, '') // Remove any content after a boundary
        .replace(/Content-Disposition: form-data; name="(.+?)"/, '$1') // Extract key from header
        .trim(); // Trim any leading or trailing whitespace
};

const parseMultipartBody = (bodyText, boundary) => {
    const keyValueMap = {};
    const boundaryDelimiter = `--${boundary}`;
    const boundaryEnd = `${boundaryDelimiter}--`;

    // Split the body text into parts by the boundary delimiter
    const parts = bodyText.split(boundaryDelimiter).filter(part => part.trim() !== '');

    parts.forEach(part => {
        // Skip the final boundary end part
        if (part.endsWith(boundaryEnd)) {
            part = part.slice(0, -boundaryEnd.length);
        }

        // Extract the content disposition and body content
        const [header, ...bodyArray] = part.split('\r\n\r\n');
        const body = bodyArray.join('\r\n\r\n').trim();

        const match = header.match(/Content-Disposition: form-data; name="(.+?)"/);
        if (match) {
            const key = cleanKey(match[1]);
            // Extract the value, if present
            const value = body;
            keyValueMap[key] = value;
        }
    });

    return keyValueMap;
};

chrome.webRequest.onBeforeRequest.addListener(
    async (details) => {
            const {
                requestId,
                method,
                url,
                requestBody
            } = details;

            const isMatchingUrl = await checkUrl(url);
            if (!isMatchingUrl) {
                return;
            }

            const config = await getConfig();
            const sessionId = await getTrackingIdCookie();

            if (!sessionId) {
                return;
            }
            if (!config.enableOptionsCallTracking && method === 'OPTIONS') {
                return;
            }

            requestDetailsMap.set(requestId, {
                requestBody: requestBody
            });

        }, {
            urls: ["<all_urls>"]
        },
        ["requestBody"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
    async (details) => {
            const {
                requestId,
                requestHeaders,
                method,
                url
            } = details;

            const isMatchingUrl = await checkUrl(url);
            if (!isMatchingUrl) {
                return requestHeaders;
            }

            const config = await getConfig();
            const sessionId = await getTrackingIdCookie();
            if (!sessionId) {
                return;
            }
            if (!config.enableOptionsCallTracking && method === 'OPTIONS') {
                return {
                    requestHeaders
                };
            }

            const matchedTracedUri = config.tracedUriRegexListToTrack.some(regex => url.match(regex));
            const matchedUntracedUri = config.untracedUriRegexListToTrack.some(regex => url.match(regex));
            const validExcludedUriRegexList = config.excludedUriRegexList.filter(Boolean);
            const matchedExcludedUri = validExcludedUriRegexList.some(regex => url.match(regex));

            if (!matchedExcludedUri) {
                if (matchedTracedUri) {
                    // Add tracking headers
                    headers.set('testchimp-session-record-tracking-id', sessionId);
                    const currentUserId = config.currentUserId;
                    if (currentUserId) {
                        headers.set('testchimp-current-user-id', currentUserId);
                    }
                } else if (matchedUntracedUri) {
                    const headers = new Map(requestHeaders.map(header => [header.name, header.value]));
                    const requestBodyDetails = requestDetailsMap.get(requestId);
                    if(!requestBodyDetails){
                        console.log("Request body details not found for " + requestId);
                        return;
                    }
                    const parsedUrl = new URL(url);
                    const urlWithoutQueryParams = `${parsedUrl.origin}${parsedUrl.pathname}`;
                    requestUrls.set(requestId, urlWithoutQueryParams);

                    // Generate traceparent if not present
                    let traceparent = headers.get('traceparent');
                    if (!traceparent) {
                        traceparent = generateTraceparent(generateSpanId());
                    }
                    const parts = traceparent.split('-');
                    const spanId = parts[2];
                    requestIdToSpanIdMap.set(requestId, spanId);
                    // Process the request payload if body details are available
                    try {
                        const body = requestBodyDetails.requestBody;
                        // Extract the formData from requestBody if it exists
                        const formData = body?.formData;

                        // Prepare the body text based on formData or fallback to raw if formData is not available
                        let bodyText = '';
                        if (formData) {
                            // Convert formData object to a query string format
                            const keyValueMap = {};
                            Object.keys(formData).forEach(key => {
                                // Since the value is an array, extract the first element
                                const valueArray = formData[key];
                                const value = (Array.isArray(valueArray) && valueArray.length > 0) ? valueArray[0] : '';
                                keyValueMap[key] = value;
                            });
                            bodyText = new URLSearchParams(keyValueMap).toString();
                        } else {
                            // Fallback to raw body if formData is not available
                            bodyText = body?.raw ?
                                body.raw.map(part => new TextDecoder().decode(part.bytes)).join('') : '';
                            const contentTypeHeader = requestHeaders.find(header => header.name.toLowerCase() === 'content-type');
                            const contentType = contentTypeHeader ? contentTypeHeader.value : '';
                            const boundaryMatch = contentType.match(/boundary=([^;]+)/);
                            if (boundaryMatch) {
                                const boundary = boundaryMatch[1];
                                if (bodyText.includes(`--${boundary}`)) {
                                    const keyValueMap = parseMultipartBody(bodyText, boundary);
                                    bodyText = new URLSearchParams(keyValueMap).toString();
                                }
                            }
                        }
                        if(body?.error?.includes("Unknown error.")){
                            requestDetailsMap.delete(requestId);
                            return;
                        }
                        // Create the requestPayload object
                        const requestPayload = await populateHttpPayload(config, {
                            method: details.method,
                            url: url,
                            requestHeaders: requestHeaders,
                            requestBody: bodyText
                        });
                        requestPayloads[requestId] = requestPayload;
                    } catch (error) {
                        console.error('Error populating request payload:', error);
                    }
                    // Remove the processed request details from the map
                    requestDetailsMap.delete(requestId);
                }
            }

            return {
                requestHeaders
            };
        }, {
            urls: ["<all_urls>"]
        },
        ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onCompleted.addListener(
    async (details) => {
            const isMatchingUrl = await checkUrl(details.url);
            if (!isMatchingUrl) {
                return;
            }

        const contentTypeHeader = details.responseHeaders.find(header => header.name.toLowerCase() === 'content-type');
        const contentType = contentTypeHeader ? contentTypeHeader.value.toLowerCase() : '';

        // Skip processing if the response is a streaming type
        if (streamingContentTypes.some(type => contentType.includes(type))) {
            console.log(`Skipping streaming request: ${details.url}`);
            return;
        }


            const contentLength = details.responseHeaders.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
            const key = `${details.url}|${contentLength}`;
            if(details.requestId){
                urlToRequestIdMap.set(key, details.requestId);
                if (urlToRequestPayloadMap.has(key) && !requestPayloads[details.requestId]) {
                    requestPayloads[details.requestId] = urlToRequestPayloadMap.get(key);
                    urlToRequestPayloadMap.delete(key);
                }
                if (urlToResponsePayloadMap.has(key) && !responsePayloads[details.requestId]) {
                    responsePayloads[details.requestId] = urlToResponsePayloadMap.get(key);
                    captureResponseComplete.set(details.requestId,true);
                    urlToResponsePayloadMap.delete(key);
                }
                let responsePayload=responsePayloads[details.requestId];
                if(!responsePayload){
                    responsePayload={
                        headerMap:{}
                    };
                }
                if (details.responseHeaders && Array.isArray(details.responseHeaders)) {
                  details.responseHeaders.forEach(header => {
                    responsePayload.headerMap[header.name.toLowerCase()] = header.value;
                  });
                }
                responsePayloads[details.requestId] = responsePayload;
                requestCompletedMap.set(details.requestId,true);
                await sendPayloadForRequestId(details.requestId);
            }else{
                console.log("No request id found in details of response",details);
            }
        }, {
            urls: ["<all_urls>"]
        },
        ["responseHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'capturedResponse') {
        const {
            requestId,
            responseHeaders,
            responseBody,
            statusCode,
            url
        } = message;
        const isMatchingUrl = await checkUrl(url);
        if (!isMatchingUrl) {
            sendResponse({ success: false, reason: 'URL not matching' });
            return true;
        }
        const config = await getConfig();
        const contentLength = responseHeaders && responseHeaders.find && responseHeaders.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
        const key = `${url}|${contentLength}`;

        let updatedRequestId=requestId;
        if(!updatedRequestId && urlToRequestIdMap.has(key)){
            updatedRequestId = urlToRequestIdMap.get(key)
        }

        let mergedResponseHeaders = responseHeaders || [];
        if (updatedRequestId && responsePayloads[updatedRequestId]?.headerMap) {

            // Convert headerMap to an array of headers (name-value pairs)
            const headerMap = Object.entries(responsePayloads[updatedRequestId].headerMap).map(([name, value]) => ({ name, value }));

            // Create a map from received responseHeaders for easy merging
            const responseHeaderMap = new Map(mergedResponseHeaders.map(header => [header.name.toLowerCase(), header.value]));

            // Merge headers from headerMap, giving precedence to the map values
            for (const { name, value } of headerMap) {
                responseHeaderMap.set(name.toLowerCase(), value); // Overwrite if a collision occurs
            }

            // Convert the map back to an array
            mergedResponseHeaders = Array.from(responseHeaderMap.entries()).map(([name, value]) => ({ name, value }));
        }

        const responsePayload = await populateHttpPayload(config, {
            url: url,
            responseHeaders: mergedResponseHeaders,
            responseBody: responseBody,
            statusCode: statusCode
        });

        if (updatedRequestId) {
            responsePayloads[updatedRequestId] = responsePayload;
            captureResponseComplete.set(updatedRequestId, true);
            await sendPayloadForRequestId(updatedRequestId);
        } else {
            urlToResponsePayloadMap.set(key, responsePayload);
        }
        sendResponse({ success: true });
        return true;
    }

     if (message.type === "tc_open_options_page_in_bg") {
        console.log("Received open options message in bg");
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
        return true;
    }

});


// Import the contextMenu.js logic
importScripts('contextMenu.js');
importScripts('localRun.js');

// Call the function to load the context menu
loadContextMenu();

// --- Global connection status ---
var vscodeConnected = false;
var mcpConnected = false;

// Unified status notification
function notifyStatus() {
    console.log("[notifyStatus] vscodeConnected:", self.vscodeConnected, "mcpConnected:", self.mcpConnected);
    chrome.runtime.sendMessage({
        type: 'connection_status',
        vscodeConnected: self.vscodeConnected,
        mcpConnected: self.mcpConnected
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending connection status:', chrome.runtime.lastError.message);
        }
    });
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { 
                type: 'connection_status',
                vscodeConnected: self.vscodeConnected, 
                mcpConnected: self.mcpConnected 
            });
        }
    });
}
self.notifyStatus = notifyStatus;

// VSCode WebSocket connection logic
let vscodeSocket = null;

function connectVSCode() {
    chrome.storage.sync.get(['vscodeWebsocketPort'], function(items) {
        const port = items.vscodeWebsocketPort || 53333;
        vscodeSocket = new WebSocket('ws://localhost:' + port);
        self.vscodeSocket = vscodeSocket; // Always update reference on (re)connect
        vscodeSocket.onopen = () => {
            self.vscodeConnected = true;
            console.log('WebSocket connected to VSCode extension on port', port);
            self.notifyStatus();
        };
        vscodeSocket.onclose = () => {
            self.vscodeConnected = false;
            console.log('WebSocket disconnected from VSCode extension');
            self.notifyStatus();
            setTimeout(connectVSCode, 3000);
        };
        vscodeSocket.onerror = (e) => {
            self.vscodeConnected = false;
            console.error('VSCode WebSocket error', e);
            self.notifyStatus();
        };
        vscodeSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && data.type === 'ack_message') {
                    console.log('[background] Received ack_message from VS Code:', data);
                    chrome.runtime.sendMessage(data, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending ack message:', chrome.runtime.lastError.message);
                        }
                    });
                    // Relay to all tabs (so sidebar receives it)
                    chrome.tabs.query({}, function(tabs) {
                        for (let tab of tabs) {
                            chrome.tabs.sendMessage(tab.id, data);
                        }
                    });
                }
                // handle other message types if needed
            } catch (e) {
                // handle parse error
            }
        };
    });
}

// ... after connectMCP() ...
connectVSCode();

// ... after vscodeSocket is created ...
self.vscodeSocket = vscodeSocket;

// Unified message handler for sidebar status requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'get_connection_status') {
        sendResponse({ 
            vscodeConnected: self.vscodeConnected, 
            mcpConnected: self.mcpConnected 
        });
        return true;
    }
});

// At the end of the main setup logic, after listeners and initialization:
connectMCP();
