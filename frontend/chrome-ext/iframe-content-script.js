// iframe-content-script.js
// This content script runs in all iframes and handles cross-origin injection

console.log('[CONTENT SCRIPT] Iframe content script loaded in:', window.location.href);

// Listen for injection messages from parent frame
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'inject-rrweb') {
    const { scriptUrl, rrwebUrl } = event.data;
    
    console.log('[CONTENT SCRIPT] Received injection message from parent:', {
      scriptUrl,
      rrwebUrl,
      iframeUrl: window.location.href
    });
    
    // Inject the iframe rrweb injector script
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onload = function() {
      this.remove();
      console.log('[CONTENT SCRIPT] Iframe injector script loaded, sending rrweb URL');
      
      // Send the rrweb URL to the injector
      setTimeout(() => {
        window.postMessage({
          type: 'rrweb-inject',
          rrwebUrl: rrwebUrl
        }, '*');
      }, 100);
    };
    script.onerror = function() {
      console.error('[CONTENT SCRIPT] Failed to load iframe rrweb injector');
      this.remove();
    };
    
    document.head.appendChild(script);
  }
});
