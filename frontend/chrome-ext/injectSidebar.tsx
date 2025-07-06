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
    document.body.style.marginRight = initiallyExpanded ? `${sidebarWidth}px` : '0';
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
  //document.body.style.marginRight = initiallyExpanded ? `${sidebarWidth}px` : '0';
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
});

chrome.storage.local.get(['recordingInProgress', 'forceExpandSidebar'], (result) => {
  const initiallyExpanded = !!result.forceExpandSidebar || !result.recordingInProgress;

  // Clear the flag so it only affects the first open
  if (result.forceExpandSidebar) {
    chrome.storage.local.remove('forceExpandSidebar');
  }

  createSidebar(initiallyExpanded);
  createToggleButton(initiallyExpanded);
});