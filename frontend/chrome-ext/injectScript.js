(function() {
  if (window.__requestInterceptionInjected) {
    return;
  }
  window.__requestInterceptionInjected = true;

  const requestIdMap = new Map();

  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    let url, options;

    if (args.length === 1) {
      options = args[0];
      url = options.url || ''; // Default to empty if no URL is provided
    } else if (args.length === 2 && typeof args[0] === 'string') {
      url = args[0];
      options = args[1];
    }  else if (args.length === 2 && typeof args[0] != 'string') {
        options = args[0];
        url = options.url || ''; // Default to empty if no URL is provided
     }

      // Check if the URL should be intercepted
      let shouldIntercept = false;
      const checkUrlPromise = new Promise((resolve) => {
        const listener = (event) => {
          if (event.source === window && event.data?.type === "checkUrlResponse") {
            window.removeEventListener("message", listener);
            resolve(event.data.shouldIntercept);
          }
        };

        window.addEventListener("message", listener);

        window.postMessage(
          { type: "checkUrl", url },
          "*"
        );
      });

      try {
        shouldIntercept = await checkUrlPromise;
      } catch (error) {
        console.error("Error checking URL:", error);
      }

      if (!shouldIntercept) {
        return originalFetch.apply(this, args);
      }

    let requestBody = '';
    let requestHeaders = {};
    let httpMethod = 'GET'; // Default method

    if (options instanceof Request) {
        let clonedOptions = options.clone();

        // Extract the HTTP method from the Request object
        httpMethod = clonedOptions.method || 'GET';

        // Attempt to read the body of the cloned request
        try {
            if (clonedOptions.body instanceof URLSearchParams) {
                requestBody = clonedOptions.body.toString();
            } else {
                requestBody = await clonedOptions.text();
            }
        } catch (error) {
            console.error("Failed to read request body:", error);
        }

        // Capture headers from the cloned request
        try {
            const rawHeaders = [];
            clonedOptions.headers.forEach((value, name) => {
                rawHeaders.push(`${name}: ${value}`);
            });

            requestHeaders = rawHeaders.map(header => {
                const [name, value] = header.split(': ');
                return { name, value };
            });

        } catch (error) {
            console.error("Failed to read request headers:", error);
        }
      } else if (options) {
            // Extract the HTTP method from options
            httpMethod = options.method || 'GET';

            // Handle headers if available directly in options
            if (options.headers) {
                try {
                    const rawHeaders = [];

                    if (options.headers instanceof Headers) {
                        options.headers.forEach((value, name) => {
                            rawHeaders.push(`${name}: ${value}`);
                        });
                    } else if (typeof options.headers === 'object') {
                        for (const [name, value] of Object.entries(options.headers)) {
                            rawHeaders.push(`${name}: ${value}`);
                        }
                    }

                    requestHeaders = rawHeaders.map(header => {
                        const [name, value] = header.split(': ');
                        return { name, value };
                    });

                } catch (error) {
                    console.error("Failed to read request headers:", error);
                }
            }

            // Read request body if directly present in options
            try {
                if (options.body instanceof URLSearchParams) {
                    requestBody = options.body.toString(); // Convert to string to avoid cloning issues
                } else {
                    requestBody = options.body || '';
                }
            } catch (error) {
                console.error("Failed to read request body from options:", error);
            }
    }

    const response = await originalFetch.apply(this, args);
    const clone = response.clone();

    const contentType = clone.headers.get('content-type') || '';
   // Skip interception if the request is a streaming type
    if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
      return response;
    }

    // Collect response headers and format them like in XHR
    const rawHeaders = [];
    clone.headers.forEach((value, name) => {
        rawHeaders.push(`${name}: ${value}`);
    });

    const responseHeaders = rawHeaders.map(header => {
        const [name, value] = header.split(': ');
        return { name, value };
    });

    // Read response body based on content type
    let body;

    if (contentType.includes('application/json')) {
      body = await clone.json().catch(() => ''); // Default to empty if JSON parsing fails
      body=JSON.stringify(body);
    } else if (contentType.includes('text/')) {
      body = await clone.text();
    } else {
      body = await clone.blob().then(blob => blob.text()); // Fallback for other types
    }
    const contentLength = responseHeaders.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
    const key = `${url}|${contentLength}`;
    const requestId = requestIdMap.get(key);
    if (requestBody) {
        // Send fallback request body to background.js
        window.postMessage({
            type: 'fallbackRequestBody',
            detail: {
            url,
            method: httpMethod,
            responseHeaders,
            requestId,
            requestHeaders,
            requestBody
            }
        }, '*');
    }
    // Dispatch interceptedResponse event
  const serializedUrl = url?.toString() || '';
  window.postMessage(
    {
      type: 'interceptedResponse',
      detail: {
        responseHeaders,
        responseBody: body,
        statusCode: clone.status,
        url: serializedUrl, // Serialize URL
        requestId,
      },
    },
    '*'
  );

    if (requestId) {
      requestIdMap.delete(key);
    }

    return response;
  };

const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(...args) {
  const method = args[0];
  let url = args[1];

  const isAsync = args.length > 2 ? args[2] : false;

  // Check if the URL is relative
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Construct the full URL by combining origin and current path
      let baseUrl;
      if(isAsync){
       baseUrl = `${window.location.origin}${window.location.pathname}`;
       const lastSlashIndex = baseUrl.lastIndexOf('/');
       baseUrl = baseUrl.substring(0, lastSlashIndex + 1);
      }else{
       baseUrl = `${window.location.origin}`;
      }
      url = `${baseUrl}${url}`;
    }

  this.addEventListener('load', function() {
    const rawHeaders = this.getAllResponseHeaders().trim().split(/[\r\n]+/);
    const responseHeaders = rawHeaders.map(header => {
      const [name, value] = header.split(': ');
      return { name, value };
    });

    const contentType = responseHeaders?.find(header => header.name.toLowerCase() === 'content-type')?.value || '';
    // Skip interception if it's a streaming response
    if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
      return;
    }

    const contentLength = responseHeaders?.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
    const key = `${url}|${contentLength}`;
    const requestId = requestIdMap.get(key);

    // Get the response body based on responseType
    let responseBody;
    try {
      if (this.responseType === '' || this.responseType === 'text') {
        responseBody = this.responseText;
      } else if (this.responseType === 'json') {
        responseBody = JSON.stringify(this.response);
      } else {
        // For other types (arraybuffer, blob, document), we may need different handling
        // For now, just stringify the response or use a placeholder
        responseBody = this.response ? JSON.stringify(this.response) : '[Binary Data]';
      }
    } catch (error) {
      responseBody = `[Error accessing response: ${error.message}]`;
    }

    window.postMessage(
      {
        type: 'interceptedResponse',
        detail: {
          responseHeaders: responseHeaders,
          responseBody: responseBody,
          statusCode: this.status,
          url: url,
          requestId: requestId
        },
      },
      '*'
    );

    if (requestId) {
      requestIdMap.delete(key);
    }
  });

  return originalXhrOpen.apply(this, args);
};

  window.addEventListener('interceptResponseBody', (event) => {
    const { requestId, url, statusCode, responseHeaders } = event.detail;
    const contentLength = responseHeaders?.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
    const key = `${url}|${contentLength}`;
    requestIdMap.set(key, requestId);
  });
})();
