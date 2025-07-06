import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Tooltip, Typography, Dropdown, Menu } from 'antd';
import { PlusOutlined, AppstoreOutlined, BorderOutlined, DragOutlined } from '@ant-design/icons';
import { UserInstructionMessage, ContextElementType, ContextElement, UIElementContext, BoundingBoxContext } from './datas';
import { addOrUpdateContextElements, removeContextElementById } from './contextStore';

const { Text } = Typography;
const { TextArea } = Input;

type ContextTag = {
    id?: string;
    type: ContextElementType;
    value: string | { xPct: number; yPct: number; wPct: number; hPct: number };
    role?: string;
    text?: string;
    tagName?: string;
};

function hashContextTag(tag: ContextTag): string {
    const str = JSON.stringify({
        type: tag.type,
        value: tag.value,
        role: tag.role,
        text: tag.text,
        tagName: tag.tagName
    });
    let hash = 0, i, chr;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return 'ctx_' + Math.abs(hash);
}

function hashMessage(text: string, contextTags: ContextTag[]): string {
    return (
        'msg_' +
        Math.abs(
            (text + JSON.stringify(contextTags.map(hashContextTag))).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
        ) +
        '_' + Date.now()
    );
}

// Helper to get best label for element tag (Playwright-style preference)
function getElementLabel(tag: ContextTag) {
    if (!tag || typeof tag !== 'object') return '';
    let label = '';
    if (tag.text) label = `"${tag.text}"`;
    else if (tag.role) label = `[${tag.role}]`;
    else if (tag.id) label = `[id=${tag.id}]`;
    else if (tag.tagName) label = `<${tag.tagName}>`;
    else if (tag.value) label = tag.value as string;
    // Truncate to 15 chars with ellipsis
    if (label.length > 15) label = label.slice(0, 15) + '…';
    return label;
}

// Helper to format bounding box as percentages
function formatBoundingBoxValue(value: { xPct: number; yPct: number; wPct: number; hPct: number }): string {
    return `(${Math.round(value.xPct)}vw, ${Math.round(value.yPct)}vh, ${Math.round(value.wPct)}vw, ${Math.round(value.hPct)}vh)`;
}

// Add the formatMessageForAI function
function formatMessageForAI(msg: UserInstructionMessage): string {
    let result = 'Implement the following user requirement:\n' + msg.userInstruction + '\n';
    if (msg.infoContext) {
        result += '\nFollowing are the related components / areas referred in the screen by the user for this requirement:\n';
        result += JSON.stringify(msg.infoContext.contextElements, null, 2) + '\n';
        if (msg.infoContext.screenInfo) {
            const { relativeUrl, filePaths } = msg.infoContext.screenInfo;
            if (relativeUrl) {
                result += `\nThe screen's relative URL is: ${relativeUrl}\n`;
            }
            if (filePaths && filePaths.length > 0) {
                result += `\nHere are some potential file paths related to the screen:\n`;
                result += filePaths.map(f => `- ${f}`).join('\n') + '\n';
            }
        }
    }
    result += '\nIf you need access to the current screenshot of the screen, invoke grab_screenshot mcp tool.';
    result += '\nIf you need extra information about a particular context item (for better reasoning and targeting), invoke fetch_exta_info_for_context_item passing the id of the context item (For elements, extra info contains outerhtml, and for bounding boxes, extra info contains screenshot of the screen.).';
    return result;
}

export const DevTab = () => {
    const [contextTags, setContextTags] = useState<ContextTag[]>([]);
    const [userMessage, setUserMessage] = useState('');
    const [notification, setNotification] = useState('');
    const [sending, setSending] = useState(false);
    const [currentMode, setCurrentMode] = useState<'normal' | 'select' | 'box'>('normal');
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const lastMessageId = useRef<string | null>(null);
    const [vscodeConnected, setVSCodeConnected] = useState(false);
    const [mcpConnected, setMCPConnected] = useState(false);
    const sendingRef = useRef(sending);

    useEffect(() => { sendingRef.current = sending; }, [sending]);

    // Overlay for select/draw mode
    useEffect(() => {
        let overlayDiv: HTMLDivElement | null = null;
        if (currentMode === 'select' || currentMode === 'box') {
            overlayDiv = document.createElement('div');
            overlayDiv.id = 'tc-mode-overlay';
            Object.assign(overlayDiv.style, {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(30,30,30,0.15)',
                zIndex: 9999998,
                pointerEvents: 'none',
            });
            document.body.appendChild(overlayDiv);
            // Hide sidebar
            window.postMessage({ type: 'tc-hide-sidebar' }, '*');
        }
        return () => {
            if (overlayDiv && overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
            const old = document.getElementById('tc-mode-overlay');
            if (old && old.parentNode) old.parentNode.removeChild(old);
        };
    }, [currentMode]);

    // Listen for selection/drawing results from the page
    useEffect(() => {
        function onPageMessage(event: MessageEvent) {
            if (!event.data || typeof event.data.type !== 'string') return;
            if (event.data.type === 'elementSelected' && event.data.selector) {
                const newTag = {
                    type: ContextElementType.UIElement,
                    value: event.data.selector,
                    id: event.data.id,
                    role: event.data.role,
                    text: event.data.text,
                    tagName: event.data.tagName
                };
                setContextTags(tags => {
                    const updated = [...tags, newTag];
                    // Add to contextStore
                    addOrUpdateContextElements([
                        {
                            id: newTag.id || hashContextTag(newTag),
                            type: ContextElementType.UIElement,
                            selector: newTag.value as string,
                            role: newTag.role,
                            text: newTag.text,
                            tagName: newTag.tagName
                        }
                    ]);
                    return updated;
                });
                setCurrentMode('normal');
                // Show sidebar
                window.postMessage({ type: 'tc-show-sidebar' }, '*');
            }
            if (event.data.type === 'boxDrawn' && event.data.coords) {
                const { left, top, width, height } = event.data.coords;
                const vw = window.innerWidth || 1;
                const vh = window.innerHeight || 1;
                // Store as percentages
                const xPct = (parseFloat(left) / vw) * 100;
                const yPct = (parseFloat(top) / vh) * 100;
                const wPct = (parseFloat(width) / vw) * 100;
                const hPct = (parseFloat(height) / vh) * 100;
                const newTag = {
                    type: ContextElementType.BoundingBox,
                    value: { xPct, yPct, wPct, hPct },
                    id: undefined
                };
                setContextTags(tags => {
                    const id = hashContextTag(newTag);
                    const updated = [...tags, { ...newTag, id }];
                    // Add to contextStore
                    addOrUpdateContextElements([
                        {
                            id,
                            type: ContextElementType.BoundingBox,
                            value: newTag.value as { xPct: number; yPct: number; wPct: number; hPct: number }
                        }
                    ]);
                    return updated;
                });
                setCurrentMode('normal');
                // Show sidebar
                window.postMessage({ type: 'tc-show-sidebar' }, '*');
            }
        }
        window.addEventListener('message', onPageMessage);
        // Defensive: always revert to normal if mode is box and user clicks anywhere
        function onAnyClick() {
            if (currentMode === 'box') setCurrentMode('normal');
        }
        if (currentMode === 'box') {
            window.addEventListener('mousedown', onAnyClick, true);
        }
        return () => {
            window.removeEventListener('message', onPageMessage);
            window.removeEventListener('mousedown', onAnyClick, true);
        };
    }, [currentMode]);

    // Trigger selection/drawing in page when mode changes
    useEffect(() => {
        if (currentMode === 'select') {
            window.postMessage({ type: 'startElementSelect' }, '*');
        } else if (currentMode === 'box') {
            window.postMessage({ type: 'startBoxDraw' }, '*');
        }
    }, [currentMode]);

    // Listen for connection_status via window.postMessage and request initial status
    useEffect(() => {
        function handleStatusEvent(event: MessageEvent) {
            if (event.data && event.data.type === 'connection_status') {
                console.log('[DevTab] Received connection_status via window.postMessage:', event.data);
                if (typeof event.data.vscodeConnected !== 'undefined') setVSCodeConnected(!!event.data.vscodeConnected);
                if (typeof event.data.mcpConnected !== 'undefined') setMCPConnected(!!event.data.mcpConnected);
            }
        }
        window.addEventListener('message', handleStatusEvent);
        // Request initial status
        window.postMessage({ type: 'get_connection_status' }, '*');
        return () => window.removeEventListener('message', handleStatusEvent);
    }, []);

    // Dropdown menu for context add
    const contextMenu = (
        <Menu
            onClick={({ key }) => {
                if (key === 'select') setCurrentMode('select');
                if (key === 'box') setCurrentMode('box');
                setContextMenuOpen(false);
            }}
            items={[
                {
                    key: 'select',
                    icon: <DragOutlined style={{ fontSize: 16 }} />, label: 'Select element',
                },
                {
                    key: 'box',
                    icon: <BorderOutlined style={{ fontSize: 16 }} />, label: 'Select area',
                },
            ]}
        />
    );

    const handleSend = () => {
        if (!userMessage.trim()) return;
        setSending(true);
        const message_id = hashMessage(userMessage, contextTags);
        lastMessageId.current = message_id;
        // Get the current resource part of the URL
        let relativeUrl = '';
        try {
            const loc = window.location;
            if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
                // Drop the origin for localhost
                relativeUrl = loc.pathname + loc.search + loc.hash;
            } else {
                // For other sites, just the path after the domain
                relativeUrl = loc.pathname + loc.search + loc.hash;
            }
        } catch (e) {
            relativeUrl = '';
        }
        // Extract file paths from DOM
        let filePaths: string[] = [];
        try {
            const nodes = document.querySelectorAll('[data-filepath]');
            const paths = Array.from(nodes)
                .map(node => (node as HTMLElement).getAttribute('data-filepath'))
                .filter((v): v is string => !!v);
            filePaths = Array.from(new Set(paths)); // deduplicate
        } catch (e) {
            filePaths = [];
        }
        // Prepare infoContext for prompt formatting
        const contextElements: ContextElement[] = contextTags.map(tag => {
            const id = tag.id || hashContextTag(tag);
            if (tag.type === ContextElementType.UIElement) {
                return {
                    id,
                    type: ContextElementType.UIElement,
                    selector: tag.value as string,
                    role: tag.role,
                    text: tag.text,
                    tagName: tag.tagName
                } as UIElementContext;
            } else {
                // BoundingBoxContext expects value as BoundingBoxValue
                return {
                    id,
                    type: ContextElementType.BoundingBox,
                    value: tag.value as { xPct: number; yPct: number; wPct: number; hPct: number }
                } as BoundingBoxContext;
            }
        });
        const infoContext = {
            screenInfo: { relativeUrl, filePaths },
            contextElements
        };
        // Compose the message
        const messageToSend = {
            type: 'user_instruction',
            prompt: formatMessageForAI({
                type: 'user_instruction',
                userInstruction: userMessage.trim(),
                infoContext,
                messageId: message_id
            }),
            messageId: message_id
        } as UserInstructionMessage & { prompt: string };
        chrome.runtime.sendMessage({ type: 'send_to_vscode', payload: messageToSend });
        // Set a timeout to handle failure to receive ack
        setTimeout(() => {
            if (lastMessageId.current === message_id && sendingRef.current) {
                setSending(false);
                setNotification('Had an issue sending the message');
                setTimeout(() => setNotification(''), 3000);
            }
        }, 3000);
    };

    // Layout: context window at top, then message box, then notification, then sticky button at bottom
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
            {/* Status row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#888' }}>
                    VSCode: {vscodeConnected ? (
                        <span style={{ color: '#52c41a', fontSize: 12 }}>Connected</span>
                    ) : (
                        <Tooltip title="VSCode extension is not connected. (Update this text)">
                            <span style={{ color: '#ffb300', fontSize: 12, textDecoration: 'underline dotted' }}>Disconnected</span>
                        </Tooltip>
                    )}
                </span>
                <span style={{ fontSize: 12, color: '#888' }}>
                    MCP: {mcpConnected ? (
                        <span style={{ color: '#52c41a', fontSize: 12 }}>Connected</span>
                    ) : (
                        <Tooltip title="MCP server is not connected. (Update this text)">
                            <span style={{ color: '#ffb300', fontSize: 12, textDecoration: 'underline dotted' }}>Disconnected</span>
                        </Tooltip>
                    )}
                </span>
            </div>
            {/* Main content: context window, message box, notification */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                {/* Context window (fills remaining space, scrollable if needed) */}
                <div className="tc-section" style={{ flex: 1, minHeight: 120, overflowY: 'auto', marginTop: 0, marginBottom: 4, padding: 16, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                            <div className="tc-context-title">Add Context</div>
                            {contextTags.length === 0 && (
                                <div className="tc-context-subheading">Elements or areas to help the IDE understand your intent</div>
                            )}
                        </div>
                        {contextTags.length > 0 && (
                            <button
                                onClick={() => {
                                    // Remove all from contextStore
                                    contextTags.forEach(tag => { if (tag.id) removeContextElementById(tag.id); });
                                    setContextTags([]);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#888',
                                    fontSize: 12,
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    padding: 0,
                                    margin: 0,
                                    fontWeight: 400
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        {contextTags.map((tag, idx) => (
                            <Tooltip key={idx} title={tag.type === ContextElementType.UIElement ? 'Element Selector' : 'Bounding Box'}>
                                <Button
                                    type="default"
                                    size="small"
                                    style={{ padding: '0 8px', borderRadius: 4, height: 24, display: 'flex', alignItems: 'center', gap: 4 }}
                                    onClick={() => {
                                        // Remove from contextStore
                                        if (tag.id) removeContextElementById(tag.id);
                                        setContextTags(tags => tags.filter((_, i) => i !== idx));
                                    }}
                                >
                                    {tag.type === ContextElementType.UIElement ? (
                                        <>
                                            <AppstoreOutlined style={{ fontSize: 14, marginRight: 2 }} />
                                            {getElementLabel(tag)}
                                        </>
                                    ) : (
                                        <>
                                            <BorderOutlined style={{ fontSize: 14, marginRight: 2 }} />
                                            {formatBoundingBoxValue(tag.value as { xPct: number; yPct: number; wPct: number; hPct: number })}
                                        </>
                                    )}
                                    <span style={{ marginLeft: 4, color: '#ff4d4f' }}>×</span>
                                </Button>
                            </Tooltip>
                        ))}
                        <Dropdown overlay={contextMenu} trigger={['click']} open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
                            <Button
                                icon={<PlusOutlined style={{ fontSize: 16 }} />}
                                size="small"
                                style={{ borderRadius: 4, height: 24, padding: 0, width: 28, minWidth: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                        </Dropdown>
                    </div>
                </div>
                {/* Message box and notification */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '0 0 auto', background: '#232323' }}>
                    <Input.TextArea
                        value={userMessage}
                        onChange={e => setUserMessage(e.target.value)}
                        placeholder="Say the change you want to see..."
                        autoSize={{ minRows: 6, maxRows: 12 }}
                        style={{ backgroundColor: '#2a2a2a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', resize: 'none', marginBottom: 8 }}
                        disabled={sending}
                    />
                    {notification && (
                        <div
                            style={{
                                fontSize: 14,
                                color: notification === 'Had an issue sending the message' ? '#ffb300' : '#aaa',
                                fontWeight: 500,
                                marginBottom: 8,
                                textAlign: 'center'
                            }}
                        >
                            {notification}
                        </div>
                    )}
                </div>
            </div>
            {/* Send to IDE button (always at bottom) */}
            <div style={{ padding: 8, background: '#232323', borderTop: '1px solid #222', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    type="primary"
                    onClick={handleSend}
                    loading={sending}
                    style={{ backgroundColor: '#72BDA3', borderColor: '#72BDA3', color: '#000', height: 32, width: 140 }}
                    disabled={sending}
                >
                    Send to IDE
                </Button>
            </div>
        </div>
    );
}; 