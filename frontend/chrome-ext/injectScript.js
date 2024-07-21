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
    this.addEventListener('load', function() {

      const rawHeaders = this.getAllResponseHeaders().trim().split(/[\r\n]+/);
      const responseHeaders = rawHeaders.map(header => {
        const [name, value] = header.split(': ');
        return { name, value };
      });

      const contentLength = responseHeaders?.find(header => header.name.toLowerCase() === 'content-length')?.value || '';
      const key = `${args[1]}|${contentLength}`;
      const requestId = requestIdMap.get(key);

      const event = new CustomEvent('interceptedResponse', {
        detail: {
          responseHeaders: responseHeaders,
          responseBody: this.responseText,
          statusCode: this.status,
          url:args[1],
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
