import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidebarApp } from './sidebar';
import sidebarCss from './sidebar.css';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider, theme } from 'antd';

const containerId = 'testchimp-sidebar';
const toggleButtonId = 'testchimp-sidebar-toggle';
const sidebarWidth = 350;

let isVisible = false;

function createSidebar(initiallyExpanded: boolean) {
  let host = document.getElementById(containerId);

  if (host) {
    host.setAttribute('data-rrweb-ignore', 'true');
    host.style.transform = initiallyExpanded ? 'translateX(0)' : `translateX(${sidebarWidth}px)`;
    isVisible = initiallyExpanded;
    return;
  }

  host = document.createElement('div');
  host.id = containerId;
  host.setAttribute('data-rrweb-ignore', 'true');

  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: `${sidebarWidth}px`,
    height: '100vh',
    zIndex: '999999',
    overflow: 'visible',
    transform: initiallyExpanded ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease',
    pointerEvents: 'auto', // make sure interactions work
  });

  document.body.appendChild(host);
  isVisible = initiallyExpanded;

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const shadowContainer = document.createElement('div');
  shadowRoot.appendChild(shadowContainer);

  const styleTag = document.createElement('style');
  styleTag.textContent = sidebarCss;
  shadowRoot.host.setAttribute('data-rrweb-ignore', 'true');
  shadowContainer.setAttribute('data-rrweb-ignore', 'true');
  shadowRoot.appendChild(styleTag);

  const antdReset = document.createElement('link');
  antdReset.rel = 'stylesheet';
  antdReset.href = 'https://cdnjs.cloudflare.com/ajax/libs/antd/5.23.3/reset.css';
  shadowRoot.appendChild(antdReset);

  const root = ReactDOM.createRoot(shadowContainer);
  root.render(
    <StyleProvider container={shadowRoot}>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: { colorPrimary: '#ff6b65' },
        }}
        getPopupContainer={() => shadowRoot as unknown as HTMLElement}
      >
        <SidebarApp />
      </ConfigProvider>
    </StyleProvider>
  );
}

function createToggleButton(initialVisible: boolean) {
  const existingBtn = document.getElementById(toggleButtonId) as HTMLButtonElement | null;
  const arrowText = (visible: boolean) => (visible ? '→' : '←');
  const rightPosition = (visible: boolean) => (visible ? `${sidebarWidth + 10}px` : '5px');

  const updateButtonVisuals = (btn: HTMLButtonElement, visible: boolean) => {
    btn.style.right = rightPosition(visible);
    btn.innerHTML = '';
    const arrowSpan = document.createElement('span');
    arrowSpan.textContent = arrowText(visible);
    arrowSpan.style.fontSize = '16px';
    btn.appendChild(arrowSpan);
    btn.dataset.visible = String(visible);
  };

  if (existingBtn) {
    const visible = initialVisible;
    updateButtonVisuals(existingBtn, visible);
    return;
  }

  const btn = document.createElement('button');
  btn.id = toggleButtonId;
  btn.setAttribute('data-rrweb-ignore', 'true');
  btn.dataset.visible = String(initialVisible);

  Object.assign(btn.style, {
    position: 'fixed',
    top: '50%',
    right: rightPosition(initialVisible),
    transform: 'translateY(-50%)',
    zIndex: '1000000',
    backgroundColor: '#ff6b65',
    color: '#fff',
    border: 'none',
    borderRadius: '4px 0 0 4px',
    padding: '4px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'right 0.3s ease',
  });

  updateButtonVisuals(btn, initialVisible);

  btn.onclick = () => {
    const host = document.getElementById(containerId);
    if (!host) return;

    const currentlyVisible = btn.dataset.visible === 'true';
    const newVisible = !currentlyVisible;

    host.style.transform = newVisible ? 'translateX(0)' : 'translateX(100%)';
    updateButtonVisuals(btn, newVisible);
  };

  document.body.appendChild(btn);
}

// Listen for sidebar show/hide messages from the page
window.addEventListener('message', (event) => {
  if (!event.data || typeof event.data.type !== 'string') return;
  const host = document.getElementById(containerId);
  if (!host) return;
  const btn = document.getElementById(toggleButtonId) as HTMLButtonElement | null;
  if (event.data.type === 'tc-hide-sidebar') {
    host.style.transform = `translateX(100%)`;
    isVisible = false;
    // Move toggle button to the edge of the hidden sidebar
    if (btn) {
      btn.dataset.visible = 'false';
      btn.style.right = '5px'; // Button at screen edge when sidebar is hidden
    }
  }
  if (event.data.type === 'tc-show-sidebar') {
    host.style.transform = `translateX(0)`;
    isVisible = true;
    // Move toggle button to the edge of the visible sidebar
    if (btn) {
      btn.dataset.visible = 'true';
      btn.style.right = `${sidebarWidth + 10}px`;
    }

  }
  if (event.data.type === 'tc-hide-toggle-button') {
    if (btn) {
      btn.style.display = 'none';
    }
  }
  if (event.data.type === 'tc-show-toggle-button') {
    if (btn) {
      btn.style.display = 'block';
    }
  }
});

chrome.storage.local.get(['recordingInProgress', 'forceExpandSidebar'], (result) => {
  // Expand if forceExpandSidebar is set or recordingInProgress is true, otherwise default to hidden
  const initiallyExpanded = !!result.forceExpandSidebar || !!result.recordingInProgress;

  // Clear the flag so it only affects the first open
  if (result.forceExpandSidebar) {
    chrome.storage.local.remove('forceExpandSidebar');
  }

  createSidebar(initiallyExpanded);
  
  // Only create toggle button if recording is in progress or sidebar is forced to expand
  // This prevents the arrow from showing when extension action hasn't been clicked
  if (result.recordingInProgress || result.forceExpandSidebar) {
    createToggleButton(initiallyExpanded);
  }
});

// Relay connection_status and similar messages from background to page/sidebar
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  
    if (msg.type === 'connection_status') {
        window.postMessage({ type: 'connection_status', ...msg }, '*');
    }
});

// Listen for get_connection_status from the page/sidebar and relay to background
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'get_connection_status') {
        chrome.runtime.sendMessage({ type: 'get_connection_status' }, (resp) => {
            if (resp && typeof resp.vscodeConnected !== 'undefined' && typeof resp.mcpConnected !== 'undefined') {
                window.postMessage({ type: 'connection_status', ...resp }, '*');
            }
        });
    }
});

// Listen for screenshot capture requests from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'capture_screenshot_with_sidebar_hiding') {
        // Import the shared function dynamically
        import('./screenshotUtils').then(({ captureScreenshotWithSidebarHiding }) => {
            const captureFunction = () => new Promise<string | undefined>((resolve) => {
                // Use the windowId passed from the background script
                const windowId = message.windowId;
                if (windowId) {
                    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
                        if (chrome.runtime.lastError) {
                            console.error('Screenshot capture error:', chrome.runtime.lastError.message);
                            resolve(undefined);
                        } else {
                            resolve(dataUrl ? dataUrl : undefined);
                        }
                    });
                } else {
                    resolve(undefined);
                }
            });

            captureScreenshotWithSidebarHiding(
                captureFunction,
                () => window.postMessage({ type: 'tc-hide-sidebar' }, '*'),
                () => window.postMessage({ type: 'tc-show-sidebar' }, '*'),
                () => {
                    const toggleButton = document.getElementById('testchimp-sidebar-toggle');
                    if (toggleButton) {
                        toggleButton.style.display = 'none';
                    }
                },
                () => {
                    const toggleButton = document.getElementById('testchimp-sidebar-toggle');
                    if (toggleButton) {
                        toggleButton.style.display = 'block';
                    }
                }
            ).then((screenshotBase64) => {
                sendResponse({ screenshotBase64 });
            });
        });
        return true; // Keep the message channel open for async response
    }
});

// --- SPA navigation detection injection ---
(function() {
  let lastHref = location.href;
  function checkHref() {
    if (location.href !== lastHref) {
      console.log('[injectSidebar] Detected SPA navigation:', lastHref, '->', location.href);
      lastHref = location.href;
      window.postMessage({ type: 'tc-spa-url-changed', href: location.href }, '*');
    }
  }
  // Observe DOM mutations (React Router, etc.)
  if (document.body && document.body instanceof Node) {
    const observer = new MutationObserver(checkHref);
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    console.warn('[injectSidebar] document.body is not available or not a Node, skipping MutationObserver');
  }
  // Also patch pushState/replaceState
  const origPushState = history.pushState;
  const origReplaceState = history.replaceState;
  history.pushState = function(...args) {
    origPushState.apply(this, args);
    checkHref();
  };
  history.replaceState = function(...args) {
    origReplaceState.apply(this, args);
    checkHref();
  };
  window.addEventListener('popstate', checkHref);
  window.addEventListener('hashchange', checkHref);
  setInterval(checkHref, 1000); // fallback for edge cases
  console.log('[injectSidebar] SPA navigation observer injected');

  // Forward tc-spa-url-changed messages as CustomEvents on the sidebar host
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'tc-spa-url-changed') {
      var host = document.getElementById('testchimp-sidebar');
      if (host) {
        console.log('[injectSidebar] Forwarding tc-spa-url-changed as CustomEvent to sidebar host', event.data);
        host.dispatchEvent(new CustomEvent('tc-spa-url-changed', { detail: event.data }));
      } else {
        console.warn('[injectSidebar] Sidebar host not found for tc-spa-url-changed');
      }
    }
  });
})();