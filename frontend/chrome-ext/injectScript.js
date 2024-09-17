(function() {
  if (window.__requestInterceptionInjected) {
    return;
  }
  window.__requestInterceptionInjected = true;

  const requestIdMap = new Map();

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const clone = response.clone();

    const responseHeaders = {};
    clone.headers.forEach((value, name) => {
      responseHeaders[name] = value;
    });

    clone.text().then(body => {
      const contentLength = responseHeaders['content-length'] || '';
      const key = `${args[1]}|${contentLength}`;
      const requestId = requestIdMap.get(key);

      const event = new CustomEvent('interceptedResponse', {
        detail: {
          responseHeaders: responseHeaders,
          responseBody: body,
          statusCode: clone.status,
          url:args[1],
          requestId: requestId
        }
      });
      window.dispatchEvent(event);
      if (requestId) {
        requestIdMap.delete(key);
      }
    });
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
      // Remove any trailing file name or query string to avoid incorrect URL concatenation

      // Prepend the base path to the relative URL
      url = `${baseUrl}${url}`;
    }

  this.addEventListener('load', function() {
    const rawHeaders = this.getAllResponseHeaders().trim().split(/[\r\n]+/);
    const responseHeaders = rawHeaders.map(header => {
      const [name, value] = header.split(': ');
      return { name, value };
    });

    const contentLength = responseHeaders?.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
    const key = `${url}|${contentLength}`;
    const requestId = requestIdMap.get(key);

    const event = new CustomEvent('interceptedResponse', {
      detail: {
        responseHeaders: responseHeaders,
        responseBody: this.responseText,
        statusCode: this.status,
        url: url,
        requestId: requestId
      }
    });
    window.dispatchEvent(event);
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
