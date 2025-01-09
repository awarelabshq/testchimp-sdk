chrome.runtime.onInstalled.addListener(() => {
    console.log('TestChimp Chrome Extension installed.');

    // Set default value for enableRunLocallyForTcRuns
    chrome.storage.sync.set({ "enableRunLocallyForTcRuns": true }, () => {
        console.log("Enabled run locally for test studio runs.");
    });

    // Check if currentUserId is empty, and set a default value if so
    chrome.storage.sync.get(["currentUserId", "uriRegexToIntercept"], (result) => {
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
    });

  chrome.tabs.query({}, (tabs) => {
    for (let tab of tabs) {
      // Check if the tab's URL matches the desired patterns
      if (tab.url && (tab.url.includes('testchimp.'))) {
        // Inject contentScript.js into tabs matching the patterns
        console.log("Injecting script to ",tab.url);
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['testchimp-sdk-ext.js']
        });
      }
    }
  });
});

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
        delete requestPayloads[requestId];
        delete responsePayloads[requestId];
        delete requestCompletedMap[requestId];
        delete captureResponseComplete[requestId];
        deleteEntriesByRequestId(urlToRequestIdMap, requestId);
    }
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

async function checkUrl(url) {
    if (!url) {
        return false;
    }
    const config = await getConfig();
    try {
        const validExcludedUriRegexList = config.excludedUriRegexList.filter(Boolean);
        const matchedTracedUri = config.tracedUriRegexListToTrack.some(regex => url.match(regex));
        const matchedUntracedUri = config.untracedUriRegexListToTrack.some(regex => url.match(regex));
        const matchedExcludedUri = validExcludedUriRegexList.some(regex => url.match(regex));
        if (!matchedExcludedUri) {
            if (matchedTracedUri || matchedUntracedUri) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.log("Error during parsing ", url);
        return false;
    }
}

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

  if (message.type === "run_tests_request") {

   let parsedBody;
    try {
      parsedBody = message.raw;
    } catch (error) {
      console.log("Error parsing",error);
      sendResponse({ error: "Invalid request body" });
      return;
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
          }
        })(); // Immediately invoke the async function
    }
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
            return;
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

    }

     if (message.type === "tc_open_options_page_in_bg") {
        console.log("Received open options message in bg");
        chrome.runtime.openOptionsPage();
    }

});

// Import the contextMenu.js logic
importScripts('contextMenu.js');
importScripts('localRun.js');

// Call the function to load the context menu
loadContextMenu();