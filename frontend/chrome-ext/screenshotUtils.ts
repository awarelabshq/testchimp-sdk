/**
 * Shared screenshot capture utility that hides sidebar and toggle button
 * @param {Function} captureFunction - Function that actually captures the screenshot
 * @param {Function} hideSidebar - Function to hide sidebar
 * @param {Function} showSidebar - Function to show sidebar
 * @param {Function} hideToggleButton - Function to hide toggle button
 * @param {Function} showToggleButton - Function to show toggle button
 * @returns {Promise<string|undefined>} - Base64 screenshot data
 */
/** Reliable viewport capture via background service worker port (avoids dropped sendResponse). */
export function captureViewportViaPort(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const port = chrome.runtime.connect({ name: 'tc_capture' });
    const onMessage = (response: { dataUrl?: string; error?: string }) => {
      try {
        if (response?.error) {
          console.warn('[capture] background error:', response.error);
          resolve(undefined);
        } else if (response?.dataUrl) {
          resolve(response.dataUrl);
        } else {
          console.warn('[capture] no screenshot data in response', response);
          resolve(undefined);
        }
      } finally {
        port.onMessage.removeListener(onMessage);
        try {
          port.disconnect();
        } catch {
          // ignore
        }
      }
    };
    port.onMessage.addListener(onMessage);
    port.postMessage({ type: 'capture_viewport_screenshot' });
  });
}

export function captureVisibleTabJpeg(): Promise<string | undefined> {
  return captureViewportViaPort();
}

export async function captureScreenshotWithSidebarHiding(
  captureFunction: () => Promise<string | undefined>,
  hideSidebar: () => void,
  showSidebar: () => void,
  hideToggleButton: () => void,
  showToggleButton: () => void,
  options?: { showCaptureBanner?: boolean }
): Promise<string | undefined> {
  const showCaptureBanner = options?.showCaptureBanner ?? true;
  return new Promise((resolve) => {
    try {
      let modal: HTMLDivElement | null = null;
      if (showCaptureBanner) {
        modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff6b65;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
        modal.textContent = 'Taking screenshot...';
        document.body.appendChild(modal);
      }

      hideSidebar();

      const sidebarWaitMs = showCaptureBanner ? 500 : 300;
      setTimeout(() => {
        hideToggleButton();

        if (modal?.parentNode) {
          modal.parentNode.removeChild(modal);
        }

        setTimeout(async () => {
          const result = await captureFunction();
          showSidebar();
          showToggleButton();
          resolve(result);
        }, 100);
      }, sidebarWaitMs);
    } catch (e) {
      console.error('Screenshot capture exception:', e);
      resolve(undefined);
    }
  });
} 

/**
 * Manual step screenshot: hide sidebar + toggle during capture.
 * When keepSidebarHidden is true (active manual capture), do not re-show the sidebar after.
 */
export async function captureManualTestStepScreenshot(options?: {
  keepSidebarHidden?: boolean;
  showCaptureBanner?: boolean;
}): Promise<string | undefined> {
  const keepSidebarHidden = options?.keepSidebarHidden ?? false;
  const showCaptureBanner = options?.showCaptureBanner ?? false;
  return captureScreenshotWithSidebarHiding(
    () => captureViewportViaPort(),
    () => window.postMessage({ type: 'tc-hide-sidebar' }, '*'),
    () => {
      if (!keepSidebarHidden) {
        window.postMessage({ type: 'tc-show-sidebar' }, '*');
      }
    },
    () => {
      const toggleButton = document.getElementById('testchimp-sidebar-toggle');
      if (toggleButton) toggleButton.style.display = 'none';
    },
    () => {
      // Always restore the expand toggle so the user can open the sidebar for notes.
      const toggleButton = document.getElementById('testchimp-sidebar-toggle');
      if (toggleButton) toggleButton.style.display = 'block';
    },
    { showCaptureBanner }
  );
}