// contentRelay.js
// Handles ONLY connection status and sidebar comms relay between background and page/sidebar

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