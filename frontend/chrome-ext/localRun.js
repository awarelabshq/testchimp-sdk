

async function parseRequestBody(requestBody) {
    let parsedRequestBody = {};
    if (!requestBody) return parsedRequestBody;

    const testStepExec=requestBody.rawTestStepExecution;
    const rawBody = testStepExec.rawRequest.body??{};
    const headers = testStepExec.rawRequest.headers?? {};
    const queryParams = testStepExec.rawRequest.queryParams??{};
    const pathParams = testStepExec.rawRequest.pathParams??{};

    if(rawBody.jsonBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: rawBody.jsonBody
        };
    }else if(rawBody.textBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: rawBody.textBody
        };
    }else if(rawBody.htmlBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: rawBody.htmlBody
        };
    }else if(rawBody.xmlBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: rawBody.xmlBody
        };
    }else if(rawBody.httpFormDataBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: new FormData()
        };
        Object.entries(rawBody.httpFormDataBody.keyValueMap || {}).forEach(([key, value]) => {
            parsedRequestBody.body.append(key, value);
        });
    }else if(rawBody.httpFormUrlencodedBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: new URLSearchParams(rawBody.httpFormUrlencodedBody.keyValueMap || {}).toString()
        };
    }else if(rawBody.binaryDataBody){
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: new Blob([rawBody.binaryDataBody.data || ""], { type: headers["content-type"] || "application/octet-stream" })
        };
    }else{
        parsedRequestBody = {
            headers,
            queryParams,
            pathParams,
            body: null
        };
    }

    return parsedRequestBody;
}

function getEndpoint(endpointConfig){
    if(endpointConfig.externalEndpoint){
        return endpointConfig.externalEndpoint;
    }else{
        return endpointConfig.internalEndpointConfig.preferredEndpoint;
    }
}

async function makeSUTRequest(endpointConfig, method, rawRequest) {
    let endpoint = getEndpoint(endpointConfig); // Resolve any endpoint template params
    if (rawRequest.queryParams && Object.keys(rawRequest.queryParams).length > 0) {
        // Create an array of query parameters
        const queryParams = new URLSearchParams(rawRequest.queryParams).toString();

        // Append query parameters to the endpoint
        endpoint += (endpoint.includes('?') ? '&' : '?') + queryParams;
    }
    const headers = new Headers(rawRequest.headers); // Works directly for plain objects
    const traceparent = generateTraceparent();
    headers.set("traceparent", traceparent);

    // Handle the body based on its type, if method is not GET or HEAD
    const requestBody = (method === 'GET' || method === 'HEAD') ? undefined : rawRequest.body;

    console.log("making call to SUT", endpoint);

    const response = await fetch(endpoint, {
        method,
        headers,
        body: requestBody,
    });
    const rawResponse=await handleResponse(response);
    return {
        traceId: traceparent.split('-')[1], // Extract the trace ID from traceparent
        rawResponse:rawResponse,
    };
}

function generateTraceparent() {
    // Generate a valid traceparent header value
    const version = "00";
    const traceId = generateRandomHex(32); // 16 bytes as hex (32 characters)
    const parentId = generateRandomHex(16); // 8 bytes as hex (16 characters)
    const traceFlags = "01"; // Indicates tracing is enabled

    return `${version}-${traceId}-${parentId}-${traceFlags}`;
}

function generateRandomHex(length) {
    // Generate a random hexadecimal string of the given length
    const array = new Uint8Array(length / 2);
    crypto.getRandomValues(array);
    return Array.from(array).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function resolveEndpoint(rawRequest) {
    // Implement template parameter substitution for the endpoint
    let endpoint = rawRequest.endpoint;
    if (rawRequest.templatePathParams) {
        Object.keys(rawRequest.templatePathParams).forEach((param) => {
            endpoint = endpoint.replace(`{{${param}}}`, rawRequest.templatePathParams[param]);
        });
    }
    return endpoint;
}

async function handleResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const rawResponse = { responseCode: response.status, headers: {}, body: {} };
    // Process headers
    response.headers.forEach((value, key) => {
        rawResponse.headers[key.toLowerCase()] = value;
    });

    if (contentType.includes("text/event-stream")) {
        rawResponse.body.eventStreamBody = await handleEventStream(response.body);
    } else if (contentType.includes("application/json")) {
        let jsonBody = await response.json();
        rawResponse.body.jsonBody = JSON.stringify(jsonBody);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
        let text = await response.text();
        rawResponse.body.httpFormUrlencodedBody = parseUrlEncoded(text);
    } else if (contentType.includes("multipart/form-data")) {
        rawResponse.body.httpFormDataBody = await parseFormData(response);
    } else if (contentType.includes("text/plain")) {
        rawResponse.body.textBody = await response.text();
    } else if (contentType.includes("text/html")) {
        rawResponse.body.htmlBody = await response.text();
    } else if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
        rawResponse.body.xmlBody = await response.text();
    } else {
        rawResponse.body.textBody = await response.text();
    }
    return rawResponse;
}

function parseUrlEncoded(text) {
    const params = new URLSearchParams(text);
    let keyValueMap = {};
    params.forEach((value, key) => {
        keyValueMap[key] = value;
    });
    return keyValueMap;
}

async function parseFormData(response) {
    let formData = await response.formData();
    let keyValueMap = {};
    for (let [key, value] of formData.entries()) {
        keyValueMap[key] = value instanceof File ? await "__FILE" : value;
    }
    return keyValueMap;
}

async function handleEventStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let eventStreamBody = { events: [] };
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            console.log("Read chunk:", { done, value });

            if (done) {
                console.log("Stream ended.");
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            console.log("Current buffer:", buffer);

            let lines = buffer.split("\n");
            buffer = lines.pop(); // Keep the last incomplete line in buffer for next read

            let currentEvent = null; // Reset event for each new event block

            for (let line of lines) {
                line = line.trim();
                if (!line) {
                    // Empty line means the event is complete
                    if (currentEvent) {
                        eventStreamBody.events.push(currentEvent);
                        console.log("Pushed event:", currentEvent);
                    }
                    currentEvent = null; // Reset for the next event
                    continue;
                }

                if (!currentEvent) currentEvent = {}; // Initialize a new event object

                if (line.startsWith("data:")) {
                    if (!currentEvent.data) currentEvent.data = [];
                    currentEvent.data.push(line.substring(5).trim());
                } else if (line.startsWith("id:")) {
                    currentEvent.id = line.substring(3).trim();
                } else if (line.startsWith("event:")) {
                    currentEvent.event = line.substring(6).trim();
                } else if (line.startsWith("retry:")) {
                    currentEvent.retry = parseInt(line.substring(6).trim(), 10);
                }
            }

            // Ensure we push the last event in case it wasn't finalized
            if (currentEvent) {
                eventStreamBody.events.push(currentEvent);
                console.log("Pushed last remaining event:", currentEvent);
            }
        }
    } catch (error) {
        console.error("Error reading event stream:", error);
    }

    console.log("Final eventStreamBody:", eventStreamBody);
    return eventStreamBody;
}

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

