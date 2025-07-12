// background-websockets.js
// Uses global mcpConnected and notifyStatus from background.js

const MCP_WS_URL = "ws://localhost:43449/ws";
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
async function handleGetLLMFriendlyDOM(ws, message) {
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
                        resolve({ error: chrome.runtime.lastError.message });
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
    console.log("[MCP] connectMCP called");
    console.log("[MCP] Attempting to connect to MCP server at ws://localhost:43449/ws");
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
        setTimeout(connectMCP, 3000);
    };

    mcpSocket.onerror = (e) => {
        self.mcpConnected = false;
        console.error("[MCP] MCP WebSocket error", e);
        self.notifyStatus();
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
                if (response && mcpSocket.readyState === WebSocket.OPEN) {
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
        const reqHeadersObj = reqHeadersArr.length ? Object.fromEntries(reqHeadersArr.map(h => [h.name, h.value])) : {};
        const pair = {
            url: details.url,
            method: details.method,
            requestHeaders: reqHeadersObj,
            responseHeaders: details.responseHeaders ? Object.fromEntries(details.responseHeaders.map(h => [h.name, h.value])) : {},
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