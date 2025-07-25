// background-websockets.js
// Uses global mcpConnected and notifyStatus from background.js

let mcpSocket = null;
// Do NOT declare mcpConnected or notifyStatus here

// --- Global connection status (attach to self/globalThis) ---
self.vscodeConnected = false;
self.mcpConnected = false;

// --- Handler registry ---
const mcpHandlers = {
    "get_recent_console_logs": handleGetRecentConsoleLogs,
    "fetch_extra_info_for_context_item": handleFetchExtraInfoForContextItem,
    "get_recent_request_response_pairs": handleGetRecentRequestResponsePairs,
    "get_dom_snapshot": handleGetLLMFriendlyDOM,
    // Add more handlers here as needed
};

// --- Handler implementations ---


// Handler for fetch_extra_info_for_context_item
async function handleFetchExtraInfoForContextItem(ws, message) {
    let req=message;
    const extraInfo = getExtraInfo(req.id) || {};
    console.log("Found extra info",extraInfo);
    return { extraInfo };
}

// Handler for get_recent_console_logs
async function handleGetRecentConsoleLogs(ws, message) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['recentConsoleLogs'], (data) => {
            let logs = Array.isArray(data.recentConsoleLogs) ? data.recentConsoleLogs : [];
            if (typeof message.sinceTimestamp === 'number') {
                logs = logs.filter(log => log.timestamp > message.sinceTimestamp);
            }
            const count = typeof message.count === 'number' && message.count > 0 ? message.count : MAX_CONSOLE_LOGS;
            resolve({ logs: logs.slice(-count) });
        });
    });
}

// Handler to get recent request/response pairs
async function handleGetRecentRequestResponsePairs(ws, message) {
    const count = typeof message.count === 'number' && message.count > 0 ? message.count : 20;
    return new Promise((resolve) => {
        chrome.storage.local.get(['recentRequestResponsePairs'], (result) => {
            const allPairs = result.recentRequestResponsePairs || [];
            resolve({ pairs: allPairs.slice(0, count) });
        });
    });
}

// Handler to get LLM-friendly DOM
async function handleGetLLMFriendlyDOM(ws, message, attempt = 1) {
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 500;
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) {
                resolve({ error: 'No active tab' });
                return;
            }
            chrome.tabs.sendMessage(
                tabs[0].id,
                { type: 'get_dom_snapshot' },
                (response) => {
                    if (chrome.runtime.lastError) {
                        const errMsg = chrome.runtime.lastError.message || '';
                        if (
                            /message port closed/i.test(errMsg) &&
                            attempt < MAX_ATTEMPTS
                        ) {
                            console.warn(`[handleGetLLMFriendlyDOM] Attempt ${attempt}: Message port closed. Re-injecting injectSidebar.js and index.js, then retrying in ${RETRY_DELAY_MS}ms...`);
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                files: ['injectSidebar.js', 'index.js']
                            }, () => {
                                console.log('[handleGetLLMFriendlyDOM] injectSidebar.js and index.js injected for retry.');
                                setTimeout(() => {
                                    handleGetLLMFriendlyDOM(ws, message, attempt + 1).then(resolve);
                                }, RETRY_DELAY_MS);
                            });
                        } else {
                            if (attempt >= MAX_ATTEMPTS) {
                                console.error(`[handleGetLLMFriendlyDOM] Max attempts reached (${MAX_ATTEMPTS}). Giving up. Last error:`, errMsg);
                            }
                            resolve({ error: errMsg });
                        }
                    } else if (response?.error) {
                        resolve({ error: response.error });
                    } else {
                        resolve({ dom: response?.dom });
                    }
                }
            );
        });
    });
}

// --- WebSocket connection logic ---

function connectMCP() {
    // Close any existing socket before creating a new one
    if (mcpSocket && mcpSocket.readyState !== WebSocket.CLOSED && mcpSocket.readyState !== WebSocket.CLOSING) {
        try {
            mcpSocket.onopen = null;
            mcpSocket.onclose = null;
            mcpSocket.onerror = null;
            mcpSocket.onmessage = null;
            mcpSocket.close();
        } catch (e) {
            console.warn('[MCP] Error closing previous mcpSocket:', e);
        }
    }
    mcpSocket = null;

    chrome.storage.sync.get(['mcpWebsocketPort'], function(items) {
        const port = items.mcpWebsocketPort || 43449;
        const MCP_WS_URL = `ws://localhost:${port}/ws`;
        console.log(`[MCP] Attempting to connect to MCP server at ${MCP_WS_URL}`);
        mcpSocket = new WebSocket(MCP_WS_URL);

        mcpSocket.onopen = () => {
            self.mcpConnected = true;
            console.log("[MCP] Connected to MCP server, mcpConnected now:", self.mcpConnected);
            self.notifyStatus();
        };

        mcpSocket.onclose = (event) => {
            self.mcpConnected = false;
            console.warn("[MCP] Disconnected from MCP server", event);
            self.notifyStatus();
            // Clean up reference
            mcpSocket = null;
            setTimeout(connectMCP, 3000);
        };

        mcpSocket.onerror = (e) => {
            self.mcpConnected = false;
            console.error("[MCP] MCP WebSocket error", e);
            self.notifyStatus();
            // Clean up reference
            mcpSocket = null;
        };

        mcpSocket.onmessage = async (event) => {
            console.log("[MCP] Message received from MCP server:", event.data);
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                console.error("[MCP] Invalid JSON from MCP:", event.data);
                return;
            }
            if (!msg.type || !msg.request_id) {
                console.error("[MCP] Invalid message format", msg);
                return;
            }
            const handler = mcpHandlers[msg.type];
            if (handler) {
                try {
                    console.log(`[MCP] Dispatching handler for type: ${msg.type}`);
                    const response = await handler(mcpSocket, msg);
                    if (response && mcpSocket && mcpSocket.readyState === WebSocket.OPEN) {
                        // Always include type and request_id in the response
                        const responseWithMeta = {
                            ...response,
                            type: msg.type,
                            request_id: msg.request_id
                        };
                        mcpSocket.send(JSON.stringify(responseWithMeta));
                        console.log(`[MCP] Sent response for type: ${msg.type}, request_id: ${msg.request_id}`);
                    } else {
                        console.warn(`[MCP] No response sent for type: ${msg.type}, request_id: ${msg.request_id}`);
                    }
                } catch (err) {
                    console.error(`[MCP] Handler error for type: ${msg.type}`, err);
                }
            } else {
                console.warn("[MCP] No handler for MCP message type:", msg.type);
            }
        };
    });
}

// Do NOT call connectMCP() here. It is called from background.js after importScripts. 

console.log("[background.js] connectMCP() called from background.js"); 

// Store sidebar ports for real-time updates
self.sidebarPorts = [];

chrome.runtime.onConnect.addListener(function(port) {
    console.log('[background] onConnect:', port.name);
    if (port.name === 'sidebar-status-port') {
        port.onMessage.addListener((msg) => {
            console.log('[background] Port message from sidebar:', msg);
            if (msg.type === 'get_connection_status') {
                port.postMessage({
                    type: 'connection_status',
                    vscodeConnected: self.vscodeConnected,
                    mcpConnected: self.mcpConnected
                });
            }
        });
        self.sidebarPorts.push(port);
        port.onDisconnect.addListener(() => {
            self.sidebarPorts = self.sidebarPorts.filter(p => p !== port);
        });
    }
});

function notifyStatus() {
    console.log("[notifyStatus] vscodeConnected:", self.vscodeConnected, "mcpConnected:", self.mcpConnected);
    chrome.runtime.sendMessage({
        type: 'connection_status',
        vscodeConnected: self.vscodeConnected,
        mcpConnected: self.mcpConnected
    });
}
self.notifyStatus = notifyStatus;

// Export for use in background.js
export { connectMCP, notifyStatus };

// Add a global extraInfoStore for background access
const extraInfoStore = {};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'get_connection_status') {
        sendResponse({
            type: 'connection_status',
            vscodeConnected: self.vscodeConnected,
            mcpConnected: self.mcpConnected
        });
    } else if (msg.type === 'add_extra_info' && msg.id) {
        extraInfoStore[msg.id] = msg.extraInfo;
        // Optionally log for debug
        console.log('[background] Stored extra info for id', msg.id, msg.extraInfo);
    } else if (msg.type === 'get_extra_info' && msg.id) {
        sendResponse({ extraInfo: extraInfoStore[msg.id] });
    } else if (msg.type === 'remove_extra_info' && msg.id) {
        delete extraInfoStore[msg.id];
        console.log('[background] Removed extra info for id', msg.id);
    }
}); 

// Update getExtraInfo to use the background's extraInfoStore
function getExtraInfo(id) {
    return extraInfoStore[id];
} 

// --- Request/Response Pair Tracking ---
let recentRequestResponsePairs = [];
let requestHeadersMap = {};
let uriRegexToIntercept = '.*'; // Default: match all
let uriRegexObj = new RegExp(uriRegexToIntercept);

// List of sensitive headers to redact (case-insensitive)
const SENSITIVE_HEADERS = [
    'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization', 'www-authenticate'
];
const MAX_HEADER_VALUE_LENGTH = 200;

// Helper to redact sensitive headers and limit header value length
function redactHeaders(headersArr) {
    const result = {};
    for (const { name, value } of headersArr) {
        if (!name) continue;
        const lower = name.toLowerCase();
        if (SENSITIVE_HEADERS.includes(lower)) {
            result[name] = '<redacted>';
        } else if (typeof value === 'string' && value.length > MAX_HEADER_VALUE_LENGTH) {
            result[name] = '<redacted>';
        } else {
            result[name] = value;
        }
    }
    return result;
}

// Capture request headers by requestId
chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        requestHeadersMap[details.requestId] = details.requestHeaders || [];
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders", "extraHeaders"]
);

// On extension load, clear out any recentRequestResponsePairs older than 1 minute
chrome.storage.local.get(['recentRequestResponsePairs'], (result) => {
    const now = Date.now();
    const arr = (result.recentRequestResponsePairs || []).filter(pair => now - pair.timestamp <= 60000);
    chrome.storage.local.set({ recentRequestResponsePairs: arr });
    recentRequestResponsePairs = arr;
});

// Load recentRequestResponsePairs from storage on startup
chrome.storage.local.get(['recentRequestResponsePairs'], (result) => {
    recentRequestResponsePairs = result.recentRequestResponsePairs || [];
});

// Intercept and persist matching request/response pairs
chrome.webRequest.onCompleted.addListener(
    function(details) {
        if (!uriRegexObj.test(details.url)) return;
        const reqHeadersArr = requestHeadersMap[details.requestId] || [];
        const reqHeadersObj = redactHeaders(reqHeadersArr);
        const respHeadersArr = details.responseHeaders || [];
        const respHeadersObj = redactHeaders(respHeadersArr);
        const pair = {
            url: details.url,
            method: details.method,
            requestHeaders: reqHeadersObj,
            responseHeaders: respHeadersObj,
            status: details.statusCode,
            responseTimeMs: details.timeStamp,
            timestamp: Date.now(),
        };
        recentRequestResponsePairs.unshift(pair);
        if (recentRequestResponsePairs.length > 50) recentRequestResponsePairs = recentRequestResponsePairs.slice(0, 50);
        chrome.storage.local.set({ recentRequestResponsePairs });
        // Clean up to avoid memory leaks
        delete requestHeadersMap[details.requestId];
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders', 'extraHeaders']
); 

// --- Console Log Tracking ---
let recentConsoleLogs = [];
const MAX_CONSOLE_LOGS = 100;
const MAX_LOG_LENGTH = 5000;

// Load logs from chrome.storage.local on startup
chrome.storage.local.get(['recentConsoleLogs'], (data) => {
    if (Array.isArray(data.recentConsoleLogs)) {
        recentConsoleLogs = data.recentConsoleLogs;
        console.log('[background-websockets] Loaded console logs from storage:', recentConsoleLogs.length);
    }
});

// Listen for host_console_log messages and store logs
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'host_console_log') {
        const newLog = {
            logType: (msg.logType || '').toString(),
            log: (msg.log || '').toString().slice(0, MAX_LOG_LENGTH),
            timestamp: msg.timestamp
        };
        recentConsoleLogs.push(newLog);
        if (recentConsoleLogs.length > MAX_CONSOLE_LOGS) recentConsoleLogs = recentConsoleLogs.slice(-MAX_CONSOLE_LOGS);
        chrome.storage.local.set({ recentConsoleLogs });
        if (sendResponse) sendResponse({ success: true });
    }
}); 

// --- MCP WebSocket Reconnection Logic ---
let lastReconnectAttempt = 0;
const RECONNECT_DEBOUNCE_MS = 2000;
const MCP_POLL_INTERVAL_MS = 10000;

function isMcpSocketOpen() {
    return mcpSocket && mcpSocket.readyState === WebSocket.OPEN;
}

function ensureMCPConnection(reason = "") {
    const now = Date.now();
    if (!isMcpSocketOpen() && now - lastReconnectAttempt > RECONNECT_DEBOUNCE_MS) {
        lastReconnectAttempt = now;
        console.log(`[MCP] ensureMCPConnection: Reconnecting MCP WebSocket due to: ${reason}`);
        connectMCP();
    }
}

// Polling reconnect
setInterval(() => {
    ensureMCPConnection("poll");
}, MCP_POLL_INTERVAL_MS);

// Event-based reconnect on tab/window activation
chrome.tabs.onActivated.addListener(() => {
    ensureMCPConnection("tab activated");
});
chrome.windows.onFocusChanged.addListener(() => {
    ensureMCPConnection("window focus changed");
});
// Optionally, handle extension startup
chrome.runtime.onStartup && chrome.runtime.onStartup.addListener(() => {
    ensureMCPConnection("runtime startup");
}); 