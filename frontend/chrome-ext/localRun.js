

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

    // Process the body based on content type
    if (contentType.includes("application/json")) {
        let jsonBody = await response.json();
        rawResponse.body.jsonBody=JSON.stringify(jsonBody);
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

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

