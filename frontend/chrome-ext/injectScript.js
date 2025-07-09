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

// --- Element Selection and Bounding Box Drawing ---
(function() {
  if (window.__tcElementSelectInjected) return;
  window.__tcElementSelectInjected = true;

  let highlightEl = null;
  let boxOverlay = null;
  let startX = 0, startY = 0, endX = 0, endY = 0;
  let drawing = false;

  // Returns a valid CSS selector for use with document.querySelector
  function getQuerySelector(el) {
    if (!el) return '';
    if (el.id) return `#${el.id}`;
    const testAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-id'];
    for (const attr of testAttrs) {
      const val = el.getAttribute && el.getAttribute(attr);
      if (val) return `[${attr}="${val}"]`;
    }
    let selector = el.tagName ? el.tagName.toLowerCase() : '';
    if (el.className && typeof el.className === 'string') {
      const classPart = el.className.trim().replace(/\s+/g, '.');
      if (classPart) selector += `.${classPart}`;
    }
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(
        (sib) => sib.tagName === el.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    return selector;
  }

  function cleanupElementSelect() {
    document.removeEventListener('mousemove', onHover);
    document.removeEventListener('click', onClick, true);
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl = null;
    }
  }

  function onHover(e) {
    if (highlightEl) highlightEl.style.outline = '';
    highlightEl = e.target;
    if (highlightEl) highlightEl.style.outline = '2px solid #72BDA3';
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    cleanupElementSelect();
    if (highlightEl) highlightEl.style.outline = '';
    const querySelector = getQuerySelector(e.target);
    const id = e.target.id || '';
    const role = e.target.getAttribute ? e.target.getAttribute('role') : '';
    let text = '';
    if (e.target.innerText) text = e.target.innerText.trim();
    else if (e.target.textContent) text = e.target.textContent.trim();
    const tagName = e.target.tagName ? e.target.tagName.toLowerCase() : '';
    window.postMessage({ type: 'elementSelected', querySelector, id, role, text, tagName }, '*');
  }

  function startElementSelect() {
    document.addEventListener('mousemove', onHover);
    document.addEventListener('click', onClick, true);
  }

  function cleanupBoxDraw() {
    document.removeEventListener('mousedown', onBoxDown, true);
    document.removeEventListener('mousemove', onBoxMove, true);
    document.removeEventListener('mouseup', onBoxUp, true);
    if (boxOverlay && boxOverlay.parentNode) boxOverlay.parentNode.removeChild(boxOverlay);
    boxOverlay = null;
    drawing = false;
  }

  function onBoxDown(e) {
    if (e.button !== 0) return;
    if (drawing) return; // Prevent multiple draws
    drawing = true;
    startX = e.clientX;
    startY = e.clientY;
    if (!boxOverlay) {
      boxOverlay = document.createElement('div');
      Object.assign(boxOverlay.style, {
        position: 'fixed',
        zIndex: 9999999,
        border: '2px dashed #ff6b65',
        background: 'rgba(255,107,101,0.1)',
        pointerEvents: 'none',
        left: `${startX}px`,
        top: `${startY}px`,
        width: '0px',
        height: '0px',
      });
      document.body.appendChild(boxOverlay);
    }
    document.addEventListener('mousemove', onBoxMove, true);
    document.addEventListener('mouseup', onBoxUp, true);
    e.preventDefault();
    e.stopPropagation();
  }

  function onBoxMove(e) {
    if (!drawing || !boxOverlay) return;
    endX = e.clientX;
    endY = e.clientY;
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    Object.assign(boxOverlay.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  function onBoxUp(e) {
    if (!drawing) return;
    drawing = false;
    document.removeEventListener('mousemove', onBoxMove, true);
    document.removeEventListener('mouseup', onBoxUp, true);
    if (boxOverlay) {
      const rect = boxOverlay.getBoundingClientRect();
      window.postMessage({ type: 'boxDrawn', coords: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } }, '*');
      boxOverlay.parentNode.removeChild(boxOverlay);
      boxOverlay = null;
    }
    // Remove mousedown listener to prevent sticky mode
    document.removeEventListener('mousedown', onBoxDown, true);
  }

  function startBoxDraw() {
    cleanupBoxDraw(); // Ensure no duplicate listeners
    document.addEventListener('mousedown', onBoxDown, true);
  }

  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data.type !== 'string') return;
    if (event.data.type === 'startElementSelect') {
      cleanupElementSelect();
      startElementSelect();
    }
    if (event.data.type === 'startBoxDraw') {
      cleanupBoxDraw();
      startBoxDraw();
    }
  });
})();
