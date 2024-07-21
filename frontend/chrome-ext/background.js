chrome.runtime.onInstalled.addListener(() => {
    console.log('TestChimp Chrome Extension installed.');
});

const requestPayloads = {};
const responsePayloads = {};
const requestIdToSpanIdMap = new Map();
const requestUrls = new Map();
const requestDetailsMap = new Map();
const urlToRequestIdMap=new Map();
const urlToResponsePayloadMap=new Map();

async function checkCurrentTabUrl() {
    try {
        const tabs = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(tabs);
            });
        });

        if (tabs.length === 0) return false;

        const currentUrl = tabs[0].url;
        const items = await new Promise((resolve, reject) => {
            chrome.storage.sync.get('pluginEnabledUrls', (items) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(items);
            });
        });

        const pluginEnabledUrls = items.pluginEnabledUrls;
        if (!pluginEnabledUrls) return false;

        const patterns = pluginEnabledUrls.split(/\s*,\s*/); // Assume patterns are comma-separated
        let isMatching = false;

        patterns.forEach((pattern) => {
            try {
                const regex = new RegExp(pattern);
                if (regex.test(currentUrl)) {
                    isMatching = true;
                }
            } catch (e) {
                console.error('Invalid regex pattern:', pattern, e);
            }
        });

        return isMatching;
    } catch (error) {
        return false;
    }
}


function generateSpanId() {
    let spanId = '';
    for(let i = 0; i < 8; i++) {
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
            'currentUserId'
        ], (result) => {

            const untracedUriRegexListToTrack = Array.isArray(result.uriRegexToIntercept) ?
                result.uriRegexToIntercept :
                typeof result.uriRegexToIntercept === 'string' ? [result.uriRegexToIntercept] : [];

            const excludedUriRegexList = Array.isArray(result.excludedUriRegexList) ?
                result.excludedUriRegexList :
                typeof result.excludedUriRegexList === 'string' ? [result.excludedUriRegexList] : [];

            resolve({
                tracedUriRegexListToTrack: [],
                untracedUriRegexListToTrack: untracedUriRegexListToTrack,
                excludedUriRegexList: excludedUriRegexList,
                enableOptionsCallTracking: result.enableOptionsCallTracking || false,
                projectId: result.projectId || '',
                sessionRecordingApiKey: result.sessionRecordingApiKey || '',
                endpoint: result.endpoint || 'https://ingress.testchimp.io',
                environment: result.environment || 'QA',
                currentUserId: result.currentUserId || "DEFAULT_TESTER"
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
    if(config.enableLogging) {
        console.log(log);
    }
}

async function getTrackingIdCookie() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['testchimpSessionId'], (result) => {
            const sessionId = result.testchimpSessionId || null;
            if(sessionId) {
                console.log("Session tracking id found " + sessionId);
                resolve(sessionId);
            } else {
                reject("Session ID not found.");
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

async function sendPayloadForRequestId(requestId){
    const config = await getConfig();
    const sessionId = await getTrackingIdCookie();

    const spanId = requestIdToSpanIdMap.get(requestId);
    const requestPayload = requestPayloads[requestId];
    const requestUrl = requestUrls.get(requestId);

    if(requestPayload && requestUrl && spanId) {

        const responsePayload = responsePayloads[requestId];

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
        deleteEntriesByRequestId(urlToRequestIdMap,requestId);
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
    if(headers && Array.isArray(headers)) {
        headers.forEach((header) => {
            httpPayload.headerMap[header.name] = header.value;
        });
    }

    if(!isRequest && statusCode) {
        httpPayload.responseCode = statusCode;
    }

    // Extract query parameters from the URL
    if(url) {
        try{
            const urlParams = new URLSearchParams(new URL(url).search);
            urlParams.forEach((value, key) => {
                httpPayload.queryParamMap[key] = value;
            });
        }catch(error){
            console.error("Error parsing url ",url);
        }
    }

    let contentType="";
    try{
        contentType = (headers && headers.find && headers.find(header => header.name.toLowerCase() === 'content-type'))?.value || '';
    }catch(error){
        console.error("error reading headers. isRequest: " + isRequest,error);
    }

    // Handling body if present
    const bodyText = isRequest ? requestBody : responseBody;
    if(bodyText) {
        try {
            if(contentType.includes('application/json')) {
                httpPayload.jsonBody = JSON.stringify(JSON.parse(bodyText));
            } else if(contentType.includes('multipart/form-data')) {
                const formData = new URLSearchParams(bodyText);
                const keyValueMap = {};
                formData.forEach((value, key) => {
                    keyValueMap[key] = value;
                });
                httpPayload.httpFormDataBody = {
                    keyValueMap
                };
            } else if(contentType.includes('application/octet-stream')) {
                const buffer = new Uint8Array(bodyText).buffer;
                if(buffer.byteLength <= 10 * 1024 * 1024) {
                    httpPayload.binaryDataBody = {
                        data: buffer
                    };
                } else {
                    log(config, "Binary data exceeds 10MB. Dropping data.");
                }
            } else if(contentType.includes('application/x-www-form-urlencoded')) {
                const formData = new URLSearchParams(bodyText);
                const keyValueMap = {};
                formData.forEach((value, key) => {
                    keyValueMap[key] = value;
                });
                httpPayload.httpFormUrlencodedBody = {
                    keyValueMap
                };
            } else {
                if(contentType.includes('text/plain')) {
                    httpPayload.textBody = bodyText;
                } else if(contentType.includes('text/html')) {
                    httpPayload.htmlBody = bodyText;
                } else if(contentType.includes('application/xml') || contentType.includes('text/xml')) {
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


chrome.webRequest.onBeforeRequest.addListener(
    async (details) => {
            const {
                requestId,
                method,
                url,
                requestBody
            } = details;
            const isMatchingUrl= await checkCurrentTabUrl();
            if(!isMatchingUrl){
                return;
            }

            const config = await getConfig();
            const sessionId = await getTrackingIdCookie();

            if(!config.enableOptionsCallTracking && method === 'OPTIONS') {
                return;
            }

            const matchedTracedUri = config.tracedUriRegexListToTrack.some(regex => url.match(regex));
            const matchedUntracedUri = config.untracedUriRegexListToTrack.some(regex => url.match(regex));
            const matchedExcludedUri = config.excludedUriRegexList.some(regex => url.match(regex));

            if(!matchedExcludedUri) {
                if(matchedTracedUri || matchedUntracedUri) {
                    // Store the request body details in the map
                    requestDetailsMap.set(requestId, {
                        requestBody: requestBody
                    });
                }
            }
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
            const isMatchingUrl= await checkCurrentTabUrl();
            if(!isMatchingUrl){
                return requestHeaders;
            }

            const config = await getConfig();
            const sessionId = await getTrackingIdCookie();
            if(!config.enableOptionsCallTracking && method === 'OPTIONS') {
                return {
                    requestHeaders
                };
            }

            const matchedTracedUri = config.tracedUriRegexListToTrack.some(regex => url.match(regex));
            const matchedUntracedUri = config.untracedUriRegexListToTrack.some(regex => url.match(regex));
            const matchedExcludedUri = config.excludedUriRegexList.some(regex => url.match(regex));

            if(!matchedExcludedUri) {
                if(matchedTracedUri) {
                    // Add tracking headers
                    headers.set('testchimp-session-record-tracking-id', sessionId);
                    const currentUserId = config.currentUserId;
                    if(currentUserId) {
                        headers.set('testchimp-current-user-id', currentUserId);
                    }
                } else if(matchedUntracedUri) {
                    const headers = new Map(requestHeaders.map(header => [header.name, header.value]));
                    const requestBodyDetails = requestDetailsMap.get(requestId);

                    const parsedUrl = new URL(url);
                    const urlWithoutQueryParams = `${parsedUrl.origin}${parsedUrl.pathname}`;
                    requestUrls.set(requestId, urlWithoutQueryParams);

                    // Generate traceparent if not present
                    let traceparent = headers.get('traceparent');
                    if(!traceparent) {
                        traceparent = generateTraceparent(generateSpanId());
                    }
                    const parts = traceparent.split('-');
                    const spanId = parts[2];
                    requestIdToSpanIdMap.set(requestId, spanId);
                    // Process the request payload if body details are available
                    try {
                        const body=requestBodyDetails.requestBody;
                        const bodyText = body?.raw ? body.raw.map(part => new TextDecoder().decode(part.bytes)).join('') : '';
                        const requestPayload = await populateHttpPayload(config, {
                            method: details.method,
                            url:url,
                            requestHeaders:requestHeaders,
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
        ["requestHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  async (details) =>{
    const isMatchingUrl= await checkCurrentTabUrl();
    if(!isMatchingUrl){
        return;
    }
    const contentLength = details.responseHeaders.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
    const key = `${details.url}|${contentLength}`;
    urlToRequestIdMap.set(key, details.requestId);
    if(urlToResponsePayloadMap.has(key)){
        responsePayloads[details.requestId]=urlToResponsePayloadMap.get(key);
        await sendPayloadForRequestId(requestId);
   }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if(message.type === 'capturedResponse') {
        const {
            requestId,
            responseHeaders,
            responseBody,
            statusCode,
            url
        } = message;
    const isValidUrl=await checkCurrentTabUrl();
    if(!isValidUrl){
        return;
    }
    const config = await getConfig();

    const responsePayload=await populateHttpPayload(config, {
        url:url,
        responseHeaders: responseHeaders,
        responseBody: responseBody,
        statusCode: statusCode
    });
    const contentLength = responseHeaders && responseHeaders.find && responseHeaders.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
    const key = `${url}|${contentLength}`;
    if(requestId){
        responsePayloads[requestId]=responsePayload;
        await sendPayloadForRequestId(requestId);
    }else{
        if(urlToRequestIdMap.has(key)){
            const requestId=urlToRequestIdMap.get(key)
            responsePayloads[requestId]=responsePayload;
            await sendPayloadForRequestId(requestId);
        }else{
            urlToResponsePayloadMap.set(key,responsePayload);
        }
    }

   }
});

