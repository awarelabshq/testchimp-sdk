// background-websockets.js
// Uses global mcpConnected and notifyStatus from background.js

import { FetchExtraInfoForContextItemRequest, FetchExtraInfoForContextItemResponse, GrabScreenshotRequest, GrabScreenshotResponse, GetRecentConsoleLogsRequest, GetRecentConsoleLogsResponse } from './datas';
import { getExtraInfo } from './contextStore';

const MCP_WS_URL = "ws://localhost:43449/ws";
let mcpSocket = null;
// Do NOT declare mcpConnected or notifyStatus here

// --- Global connection status (attach to self/globalThis) ---
self.vscodeConnected = false;
self.mcpConnected = false;

// --- Handler registry ---
const mcpHandlers = {
    "grab_screenshot": handleGrabScreenshot,
    "get_recent_console_logs": handleGetRecentConsoleLogs,
    "fetch_extra_info_for_context_item": handleFetchExtraInfoForContextItem,
    // Add more handlers here as needed
};

// --- Handler implementations ---

async function handleGrabScreenshot(ws, message) {
    let req;
    try {
        req = JSON.parse(message);
    } catch (e) {
        return { error: 'Invalid request format' };
    }
    return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('[MCP] Error capturing screenshot:', chrome.runtime.lastError);
                resolve({ error: chrome.runtime.lastError.message });
            } else {
                console.log('[MCP] Screenshot captured successfully');
                const resp = { screenshotBase64: dataUrl ? dataUrl.split(',')[1] : '' };
                resolve(resp);
            }
        });
    });
}

// Handler for fetch_extra_info_for_context_item
async function handleFetchExtraInfoForContextItem(ws, message) {
    let req;
    try {
        req = JSON.parse(message);
    } catch (e) {
        return { error: 'Invalid request format' };
    }
    const extraInfo = getExtraInfo(req.id) || {};
    console.log(`[MCP] Request headers for type: fetch_extra_info_for_context_item, request_id: ${req.id}:`, req.headers);
    return { extraInfo };
}

// Handler for get_recent_console_logs
async function handleGetRecentConsoleLogs(ws, message) {
    let req;
    try {
        req = JSON.parse(message);
    } catch (e) {
        return { error: 'Invalid request format' };
    }
    // Get logs from background with filtering
    const logs = (typeof self.getRecentConsoleLogs === 'function') ? self.getRecentConsoleLogs(req) : [];
    return { logs };
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
                const response = await handler(mcpSocket, msg.data);
                if (response && mcpSocket.readyState === WebSocket.OPEN) {
                    mcpSocket.send(JSON.stringify(response));
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'get_connection_status') {
        sendResponse({
            type: 'connection_status',
            vscodeConnected: self.vscodeConnected,
            mcpConnected: self.mcpConnected
        });
    }
}); 