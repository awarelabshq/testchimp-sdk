import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Tooltip, Typography, Dropdown, Menu, Select, Spin, Collapse } from 'antd';
import { PlusOutlined, SelectOutlined, BorderOutlined, DragOutlined, RightSquareOutlined, ReloadOutlined } from '@ant-design/icons';
import { UserInstructionMessage, ContextElementType, ContextElement, UIElementContext, BoundingBoxContext } from '../datas';
import { addOrUpdateContextElements, removeContextElementById, getBasicInfo, getBasicInfoForBoxElements } from '../contextStore';
import { useElementSelector } from '../elementSelector';
import { ScratchPad, LocalTask } from './ScratchPad';
import { getScreenForPage } from '../apiService';
import { getScreenStates } from '../apiService';

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
    result += '\nIf you need extra information about a particular context item (for better reasoning and targeting), invoke fetch_exta_info_for_context_item passing the id of the context item (For elements, extra info contains computed styles, detailed attributes, and for bounding boxes, extra info contains screenshot of the screen.).';
    return result;
}

// Helper to convert ContextElement to ContextTag
function contextElementToContextTag(elem: ContextElement): ContextTag {
    if ((elem as any).type === ContextElementType.UIElement) {
        const ui = elem as UIElementContext;
        return {
            id: (ui as any).id,
            type: ui.type,
            value: (ui as any).querySelector || '',
            role: (ui as any).role,
            text: (ui as any).text,
            tagName: (ui as any).tagName,
        };
    } else if ((elem as any).type === ContextElementType.BoundingBox) {
        const box = elem as BoundingBoxContext;
        return {
            id: (box as any).id,
            type: box.type,
            value: box.value,
        };
    }
    return { type: (elem as any).type, value: '' };
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
    const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [scratchPadTasks, setScratchPadTasks] = useState<LocalTask[]>([]);
    const [currentScreenName, setCurrentScreenName] = useState<string | undefined>(undefined);
    const [currentRelativeUrl, setCurrentRelativeUrl] = useState<string | undefined>(undefined);
    const [saveLoading, setSaveLoading] = useState(false);
    const [screenStates, setScreenStates] = useState<{ screen: string; states?: string[] }[]>([]);
    const [selectedScreen, setSelectedScreen] = useState<string | undefined>(undefined);
    const [screenLoading, setScreenLoading] = useState(false);
    const [scratchPadOpen, setScratchPadOpen] = useState(false);

    // Fetch screen states and current screen on mount
    useEffect(() => {
        setScreenLoading(true);
        getScreenStates().then(data => {
            // Filter out undefined screens
            const validScreens = (data.screenStates || []).filter(s => !!s.screen) as { screen: string; states?: string[] }[];
            setScreenStates(validScreens);
            // After screen states, fetch current screen
            const url = window.location.href;
            getScreenForPage({ url }).then(res => {
                setCurrentScreenName(res.screenName);
                setCurrentRelativeUrl(res.normalizedUrl || url);
                setSelectedScreen(res.screenName || (validScreens && validScreens[0]?.screen) || undefined);
                setScreenLoading(false);
            }).catch(() => {
                setCurrentScreenName(undefined);
                setCurrentRelativeUrl(url);
                setSelectedScreen((validScreens && validScreens[0]?.screen) || undefined);
                setScreenLoading(false);
            });
        });
    }, []);

    // Refresh current screen (for refresh icon)
    const handleRefreshScreen = () => {
        setScreenLoading(true);
        const url = window.location.href;
        getScreenForPage({ url }).then(res => {
            setCurrentScreenName(res.screenName);
            setCurrentRelativeUrl(res.normalizedUrl || url);
            setSelectedScreen(res.screenName || (screenStates && screenStates[0]?.screen) || undefined);
            setScreenLoading(false);
        }).catch(() => {
            setScreenLoading(false);
        });
    };

    // Use selectedScreen for ScratchPad filtering
    const scratchPadScreenName = selectedScreen;

    useEffect(() => { sendingRef.current = sending; }, [sending]);

    // Listen for selection/drawing results from the page
    useEffect(() => {
        function onPageMessage(event: MessageEvent) {
            if (!event.data || typeof event.data.type !== 'string') return;
            if (event.data.type === 'elementSelected' && event.data.querySelector) {
                const querySelector = event.data.querySelector;
                const element = document.querySelector(querySelector) as HTMLElement | null;
                let uiElem: UIElementContext & { value: string } = {
                    contextId: hashContextTag(event.data),
                    type: ContextElementType.UIElement,
                    querySelector,
                    value: querySelector,
                    role: event.data.role,
                    text: event.data.text,
                    tagName: event.data.tagName,
                };
                if (element) {
                    // Use getBasicInfo for all fields
                    const basicInfo = getBasicInfo(element);
                    Object.assign(uiElem, basicInfo);
                }
                setContextTags(tags => {
                    const updated = [...tags, uiElem as ContextTag];
                    const { value, ...uiElemForStore } = uiElem;
                    addOrUpdateContextElements([uiElemForStore]);
                    return updated;
                });
                setCurrentMode('normal');
                window.postMessage({ type: 'tc-show-sidebar' }, '*');
            }
            if (event.data.type === 'boxDrawn' && event.data.coords) {
                const { left, top, width, height } = event.data.coords;
                const vw = window.innerWidth || 1;
                const vh = window.innerHeight || 1;
                const xPct = (parseFloat(left) / vw) * 100;
                const yPct = (parseFloat(top) / vh) * 100;
                const wPct = (parseFloat(width) / vw) * 100;
                const hPct = (parseFloat(height) / vh) * 100;
                const contextId = hashContextTag({ type: ContextElementType.BoundingBox, value: { xPct, yPct, wPct, hPct } });
                // Use getBasicInfoForBoxElements for uiElementsInBox
                const uiElementsInBox = getBasicInfoForBoxElements({ xPct, yPct, wPct, hPct }) as UIElementContext[];
                const boundingBoxContext: BoundingBoxContext = {
                    contextId,
                    type: ContextElementType.BoundingBox,
                    value: { xPct, yPct, wPct, hPct },
                    uiElementsInBox
                };
                setContextTags(tags => {
                    const updated = [...tags, boundingBoxContext];
                    addOrUpdateContextElements([boundingBoxContext]);
                    return updated;
                });
                setCurrentMode('normal');
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
                if (typeof event.data.vscodeConnected !== 'undefined') setVSCodeConnected(!!event.data.vscodeConnected);
                if (typeof event.data.mcpConnected !== 'undefined') setMCPConnected(!!event.data.mcpConnected);
            }
            if (event.data && event.data.type === 'ack_message') {
                if (errorTimeoutRef.current) {
                    clearTimeout(errorTimeoutRef.current);
                    errorTimeoutRef.current = null;
                }
                setSending(false);
                setNotification('Copied prompt to IDE AI Chat');
                setTimeout(() => setNotification(''), 3000);
            }
        }
        window.addEventListener('message', handleStatusEvent);
        // Request initial status
        window.postMessage({ type: 'get_connection_status' }, '*');
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
            // Ensure contextId is present for all types
            return { ...tag, id, contextId: (tag as any).contextId || id } as ContextElement;
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
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => {
            if (lastMessageId.current === message_id && sendingRef.current) {
                setSending(false);
                setNotification('Had an issue sending the message');
                setTimeout(() => setNotification(''), 3000);
            }
        }, 3000);
    };

    // Add Save for later handler
    const handleSaveForLater = async () => {
        if (!userMessage.trim()) return;
        setSaveLoading(true);
        let relativeUrl = '';
        let screenName = '';
        const url = window.location.href;
        try {
            const res = await getScreenForPage({ url });
            screenName = res.screenName || '';
            relativeUrl = res.normalizedUrl || url;
        } catch {
            screenName = '';
            relativeUrl = url;
        }
        // Prepare infoContext as in handleSend
        let filePaths: string[] = [];
        try {
            const nodes = document.querySelectorAll('[data-filepath]');
            const paths = Array.from(nodes)
                .map(node => (node as HTMLElement).getAttribute('data-filepath'))
                .filter((v): v is string => !!v);
            filePaths = Array.from(new Set(paths));
        } catch (e) { filePaths = []; }
        const contextElements: ContextElement[] = contextTags.map(tag => {
            const id = tag.id || hashContextTag(tag);
            return { ...tag, id, contextId: (tag as any).contextId || id } as ContextElement;
        });
        const infoContext = {
            screenInfo: { relativeUrl, filePaths },
            contextElements
        };
        const newTask: LocalTask = {
            prompt: userMessage.trim(),
            context: infoContext,
            creationTimestampMillis: Date.now(),
            screenName: screenName || undefined,
            relativeUrl: relativeUrl || undefined,
        };
        // Save to chrome.storage.sync
        chrome.storage.sync.get(['localTasks'], (result) => {
            const prev: LocalTask[] = result['localTasks'] || [];
            const updated = [newTask, ...prev].sort((a, b) => b.creationTimestampMillis - a.creationTimestampMillis);
            chrome.storage.sync.set({ localTasks: updated }, () => {
                setScratchPadTasks(updated);
                setScratchPadOpen(true);
                setSaveLoading(false);
            });
        });
    };

    // Populate context and prompt from ScratchPad
    const handleScratchPadSelect = (task: LocalTask) => {
        setUserMessage(task.prompt || '');
        setContextTags((task.context?.contextElements || []).map(contextElementToContextTag));
    };
    const handleScratchPadDelete = (task: LocalTask) => {
        setScratchPadTasks(tasks => tasks.filter(t => t.creationTimestampMillis !== task.creationTimestampMillis));
    };

    // Custom expand icon for Collapse
    const scratchPadExpandIcon = (panelProps: any) => (
        <PlusOutlined rotate={Boolean(panelProps.isActive) ? 45 : 0} style={{ fontSize: 14, color: '#aaa', marginRight: 6 }} />
    );

    // Load scratch pad tasks from chrome.storage.sync on mount
    useEffect(() => {
      chrome.storage.sync.get(['localTasks'], (result) => {
        const loaded = result['localTasks'] || [];
        setScratchPadTasks(loaded.sort((a, b) => b.creationTimestampMillis - a.creationTimestampMillis));
      });
    }, []);

    // Layout: Screen selector at top, ScratchPad grows to fill space, bottom sticky area contains status, button panel, prompt, context
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0, background: '#181818' }}>
            {/* ScratchPad as accordion, always displayed */}
            {(scratchPadTasks.length > 0) && (
                <div style={{ flex: 1, minHeight: 120, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 4px' }}>
                    <Collapse
                        activeKey={scratchPadOpen ? ['1'] : []}
                        onChange={keys => setScratchPadOpen(keys.length > 0)}
                        expandIcon={scratchPadExpandIcon}
                        expandIconPosition="start"
                        style={{ background: 'none', border: 'none', flex: 1, display: 'flex', flexDirection: 'column' }}
                    >
                        <Collapse.Panel
                            header={<span style={{ fontWeight: 500, color: '#aaa', fontSize: 13, letterSpacing: 0.01, padding: 0, margin: 0 }}>Scratch Pad</span>}
                            key="1"
                            style={{ background: '#181818', border: 'none', borderRadius: 8, marginBottom: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                        >
                            {/* Screen selector as thin row at top of ScratchPad */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 0', borderBottom: '1px solid #222', margin: 0 }}>
                                <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500, letterSpacing: 0.01, marginRight: 8 }}>Screen</span>
                                <Select
                                    style={{ minWidth: 140, flex: 1, fontSize: 12 }}
                                    placeholder="Select screen"
                                    value={selectedScreen}
                                    onChange={val => setSelectedScreen(val)}
                                    loading={screenLoading}
                                    options={screenStates.filter(s => !!s.screen).map(s => ({ label: String(s.screen), value: String(s.screen) }))}
                                    showSearch
                                    optionFilterProp="label"
                                    filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
                                    size="small"
                                />
                                <Button
                                    icon={<ReloadOutlined style={{ fontSize: 12 }} />}
                                    onClick={handleRefreshScreen}
                                    loading={screenLoading}
                                    style={{ marginLeft: 4, background: 'none', border: 'none', color: '#aaa', fontSize: 12, boxShadow: 'none', padding: 0, width: 20, height: 20, minWidth: 20 }}
                                />
                            </div>
                            {/* ScratchPad content, scrollable, no extra margin/padding */}
                            <div style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 0, margin: 0 }}>
                                <ScratchPad
                                    onSelect={handleScratchPadSelect}
                                    onDelete={handleScratchPadDelete}
                                    tasks={scratchPadTasks}
                                    setTasks={setScratchPadTasks}
                                    currentScreenName={scratchPadScreenName}
                                    currentRelativeUrl={currentRelativeUrl}
                                />
                            </div>
                        </Collapse.Panel>
                    </Collapse>
                </div>
            )}
            {/* Fixed bottom area: context, prompt, buttons, status */}
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100, background: '#181818', boxShadow: '0 -2px 12px rgba(0,0,0,0.12)', padding: '0 4px 0 4px', borderTop: '1px solid #222' }}>
                {/* Context window */}
                <div className="tc-section" style={{ minHeight: 120, marginTop: 0, marginBottom: 4, padding: 8, display: 'flex', flexDirection: 'column', background: '#181818', border: '1.5px solid #333', borderRadius: 8 }}>
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
                                    color: '#aaa',
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
                                            <SelectOutlined style={{ fontSize: 14, marginRight: 2 }} />
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
                {/* Prompt box */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#181818', marginBottom: 0, padding: '0 4px' }}>
                    <Input.TextArea
                        value={userMessage}
                        onChange={e => setUserMessage(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
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
                {/* Button panel */}
                <div style={{ width: '100%', background: '#181818', display: 'flex', gap: 8, padding: '8px 4px 4px 4px', borderTop: '1px solid #222' }}>
                    <div style={{ flex: 1 }}>
                        <Button
                            onClick={handleSaveForLater}
                            className="secondary-button"
                            style={{ width: '100%', color: '#72BDA3', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            disabled={sending || saveLoading || !userMessage.trim()}
                            loading={saveLoading}
                        >
                            Save for later
                        </Button>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Tooltip
                            title={!vscodeConnected ? 'VSCode extension must be installed and started.' : ''}
                            placement="top"
                            mouseEnterDelay={0.2}
                        >
                            <span style={{ display: 'block' }}>
                                <Button
                                    type="primary"
                                    onClick={handleSend}
                                    className="primary-button"
                                    loading={sending}
                                    style={{ width: '100%', color: '#fff', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    disabled={sending || !vscodeConnected}
                                >
                                    Send to IDE
                                    <RightSquareOutlined style={{ fontSize: 14, marginLeft: 6 }} />
                                </Button>
                            </span>
                        </Tooltip>
                    </div>
                </div>
                {/* Status bar: always at the bottom of this container */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', background: '#181818', padding: '8px 4px 4px 4px', borderRadius: 0, borderTop: '1px solid #222', minHeight: 22, fontSize: 12 }}>
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                        VSCode: {vscodeConnected ? (
                            <span style={{ color: '#52c41a', fontSize: 12 }}>Connected</span>
                        ) : (
                            <Tooltip title="VSCode extension is not connected. (Update this text)">
                                <span style={{ color: '#ffb300', fontSize: 12, textDecoration: 'underline dotted' }}>Disconnected</span>
                            </Tooltip>
                        )}
                    </span>
                    <span style={{ fontSize: 12, color: '#aaa', marginLeft: 16 }}>
                        MCP: {mcpConnected ? (
                            <span style={{ color: '#52c41a', fontSize: 12 }}>Connected</span>
                        ) : (
                            <Tooltip title="MCP server is not connected. (Update this text)">
                                <span style={{ color: '#ffb300', fontSize: 12, textDecoration: 'underline dotted' }}>Disconnected</span>
                            </Tooltip>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}; 