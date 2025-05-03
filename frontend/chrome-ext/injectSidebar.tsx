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

function createToggleButton() {
  if (document.getElementById(toggleButtonId)) return;

  const btn = document.createElement('button');
  btn.id = toggleButtonId;
  btn.innerText = isVisible ? '⮜' : '⮞';
  btn.setAttribute('data-rrweb-ignore', 'true');

  Object.assign(btn.style, {
    position: 'fixed',
    top: '50%',
    right: isVisible ? `${sidebarWidth + 10}px` : '10px',
    transform: 'translateY(-50%)',
    zIndex: '1000000',
    backgroundColor: '#ff6b65',
    color: '#fff',
    border: 'none',
    borderRadius: '4px 0 0 4px',
    padding: '4px 8px',
    cursor: 'pointer',
    transition: 'right 0.3s ease',
  });

  btn.style.right = isVisible ? `${sidebarWidth + 10}px` : '10px';

  btn.onclick = () => {
    const host = document.getElementById(containerId);
    if (!host) return;
  
    if (isVisible) {
      host.style.transform = 'translateX(100%)';
      btn.innerText = '⮞';
      btn.style.right = '10px';
    } else {
      host.style.transform = 'translateX(0)';
      btn.innerText = '⮜';
      btn.style.right = `${sidebarWidth + 10}px`;
    }
  
    isVisible = !isVisible;
  };

  document.body.appendChild(btn);
}


chrome.storage.local.get(['recordingInProgress', 'forceExpandSidebar'], (result) => {
  console.log("FORCE EXPAND RECV", result.forceExpandSidebar);
  const initiallyExpanded = !!result.forceExpandSidebar || !result.recordingInProgress;

  // Clear the flag so it only affects the first open
  if (result.forceExpandSidebar) {
    chrome.storage.local.remove('forceExpandSidebar');
  }

  createSidebar(initiallyExpanded);
  createToggleButton();
});