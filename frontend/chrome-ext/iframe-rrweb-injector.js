// iframe-rrweb-injector.js
// This script is injected into iframes to initialize rrweb recording

(function() {
  'use strict';
  
  // Prevent multiple executions
  if (window.__iframeRrwebInjectorLoaded) {
    console.log('[IFRAME] Iframe injector already loaded, skipping');
    return;
  }
  window.__iframeRrwebInjectorLoaded = true;

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
      
      // Configure rrweb for iframe recording with proper event transmission
      const iframeEventBuffer = [];
      let fullSnapshotSent = false;
      
      // Load event processor if not already available
      if (!window.TestChimpEventProcessor) {
        console.log('[IFRAME] Loading event processor...');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('eventProcessor.js');
        script.onload = function() {
          console.log('[IFRAME] Event processor loaded');
        };
        document.head.appendChild(script);
      }
      
      const recordOptions = {
        emit: function(event) {
          try {
            // Use shared event processor if available, otherwise fallback to basic processing
            let processedEvent;
            if (window.TestChimpEventProcessor) {
              processedEvent = window.TestChimpEventProcessor.processAndConvertEvent(event, `IFRAME ${iframeId}`);
            } else {
              // Fallback: basic processing without shared utilities
              processedEvent = event;
              console.log(`[IFRAME ${iframeId}] Using fallback processing (shared processor not available)`);
            }
            
            if (!processedEvent) {
              console.log(`[IFRAME ${iframeId}] Event filtered out by processEvent`);
              return;
            }
            
            // Store events locally for backup
            iframeEventBuffer.push({
              ...processedEvent,
              timestamp: Date.now(),
              iframeId: iframeId
            });
            
            // Send events to parent for proper iframe integration
            if (processedEvent.type === 2) { // FullSnapshot
              // Send FullSnapshot to establish iframe in parent's recording
              window.parent.postMessage({
                type: 'rrweb-iframe-event',
                iframeId: iframeId,
                payload: processedEvent,
                timestamp: Date.now()
              }, '*');
              
              fullSnapshotSent = true;
              console.log(`[IFRAME ${iframeId}] Sent FullSnapshot to parent`);
              
            } else if (processedEvent.type === 3 && fullSnapshotSent) { // IncrementalSnapshot after FullSnapshot
              // Send incremental events to parent with proper timing
              setTimeout(() => {
                window.parent.postMessage({
                  type: 'rrweb-iframe-event',
                  iframeId: iframeId,
                  payload: processedEvent,
                  timestamp: Date.now()
                }, '*');
                console.log(`[IFRAME ${iframeId}] Sent IncrementalSnapshot to parent`);
              }, 50); // Small delay to ensure proper ordering
              
            } else if (processedEvent.type === 3 && !fullSnapshotSent) {
              console.log(`[IFRAME ${iframeId}] Skipping IncrementalSnapshot - FullSnapshot not sent yet`);
            }
            
            console.log(`[IFRAME ${iframeId}] Recorded event:`, {
              type: processedEvent.type,
              bufferSize: iframeEventBuffer.length,
              fullSnapshotSent: fullSnapshotSent
            });
            
          } catch (error) {
            console.error(`[IFRAME ${iframeId}] Failed to record/send event:`, error);
          }
        },
        blockSelector: '.data-rrweb-ignore, #testchimp-sidebar, #testchimp-sidebar-toggle, #testchimp-sidebar *',
        recordCanvas: false,
        recordCrossOriginIframes: true,  // Enable cross-origin iframe recording
        slimDOMOptions: {
          script: true,
          comment: true,
          headFavicon: true,
          headWhitespace: true,
          headMetaDescKeywords: false,
          headMetaSocial: false,
          headMetaRobots: false,
          headMetaHttpEquiv: false,
          headMetaAuthorship: false,
          headMetaVerification: false
        }
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

})(); // End of IIFE
