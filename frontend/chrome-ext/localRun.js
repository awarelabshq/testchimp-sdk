

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

async function makeSUTRequest(endpointConfig,method,rawRequest) {
    let endpoint = getEndpoint(endpointConfig); // Resolve any endpoint template params
   if (rawRequest.queryParams && Object.keys(rawRequest.queryParams).length > 0) {
       // Create an array of query parameters
       const queryParams = new URLSearchParams(rawRequest.queryParams).toString();

       // Step 3: Append query parameters to the endpoint
       endpoint += (endpoint.includes('?') ? '&' : '?') + queryParams;
   }
    const headers = new Headers(rawRequest.headers); // Works directly for plain objects

    // Handle the body based on its type
    let requestBody;
    const body = rawRequest.body;
    console.log("RAW body to send",body);

    const response = await fetch(endpoint, {
        method,
        headers,
        body: body,
    });

    return handleResponse(response);
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

    return {rawResponse:rawResponse};
}

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

