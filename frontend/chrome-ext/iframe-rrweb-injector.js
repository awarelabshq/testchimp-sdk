// iframe-rrweb-injector.js
// This script is injected into iframes to initialize rrweb recording

console.log('[IFRAME] Iframe injector loaded, waiting for rrweb URL from parent');

// Generate unique iframe ID
const iframeId = 'iframe_' + Math.random().toString(36).substr(2, 9);

// Listen for rrweb URL from parent
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'rrweb-inject') {
    const { rrwebUrl } = event.data;
    
    console.log('[IFRAME] Iframe injector received rrweb URL:', rrwebUrl);
    
    if (!rrwebUrl) {
      console.error('[IFRAME] rrweb URL not provided');
      return;
    }
    
    // Load rrweb script
    loadRrweb(rrwebUrl);
  }
});

async function loadRrweb(rrwebUrl) {
  try {
    console.log('[IFRAME] Loading rrweb from:', rrwebUrl);
    
    // Check if rrweb is already loaded
    if (window.rrweb) {
      console.log('[IFRAME] rrweb already loaded');
      await initializeIframeRecording();
      return;
    }
    
    // Load rrweb script
    const script = document.createElement('script');
    script.src = rrwebUrl;
    script.onload = async function() {
      this.remove();
      console.log('[IFRAME] rrweb script loaded successfully');
      
      // Wait a bit for rrweb to be available
      setTimeout(async () => {
        if (window.rrweb) {
          console.log('[IFRAME] rrweb object available');
          await initializeIframeRecording();
        } else {
          console.error('[IFRAME] rrweb script loaded but rrweb object not available');
        }
      }, 100);
    };
    script.onerror = function() {
      console.error('[IFRAME] Failed to load rrweb script:', this.src);
      this.remove();
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('[IFRAME] Error loading rrweb:', error);
  }
}

async function initializeIframeRecording() {
  try {
    if (!window.rrweb) {
      throw new Error('rrweb not available in iframe');
    }
    
    console.log('[IFRAME] Initializing rrweb recording in iframe:', iframeId);
    
    // Configure rrweb for iframe recording
    const recordOptions = {
      emit: function(event) {
        try {
          console.log(`[IFRAME ${iframeId}] Sending event to parent:`, {
            type: event.type,
            timestamp: Date.now(),
            eventData: event
          });
          
          // Send event to parent frame
          window.parent.postMessage({
            type: 'rrweb-iframe-event',
            iframeId: iframeId,
            payload: event,
            timestamp: Date.now()
          }, '*');
          
          console.log(`[IFRAME ${iframeId}] Event sent successfully to parent`);
        } catch (error) {
          console.error(`[IFRAME ${iframeId}] Failed to send event to parent:`, error);
        }
      },
      blockSelector: '.data-rrweb-ignore, #testchimp-sidebar, #testchimp-sidebar-toggle, #testchimp-sidebar *',
      recordCanvas: false,
      recordCrossOriginIframes: true  // Enable cross-origin iframe recording in iframe
    };
    
    // Start recording
    const stopRecording = window.rrweb.record(recordOptions);
    
    console.log(`[IFRAME] RRWeb recording started in iframe ${iframeId}`);
    
    // Store stop function globally for cleanup
    window.__rrwebStopRecording = stopRecording;
    
    // Notify parent that iframe recording is ready
    window.parent.postMessage({
      type: 'rrweb-iframe-ready',
      iframeId: iframeId,
      url: window.location.href
    }, '*');
    
  } catch (error) {
    console.error('[IFRAME] Failed to initialize iframe recording:', error);
  }
}

// Cleanup function
window.addEventListener('beforeunload', () => {
  if (window.__rrwebStopRecording) {
    try {
      window.__rrwebStopRecording();
      console.log(`[IFRAME ${iframeId}] Recording stopped on iframe unload`);
    } catch (error) {
      console.error(`[IFRAME ${iframeId}] Error stopping recording:`, error);
    }
  }
});
