import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Tooltip, Typography, Dropdown, Menu, Select, Spin, Collapse } from 'antd';
import { PlusOutlined, SelectOutlined, BorderOutlined, DragOutlined, RightSquareOutlined, ReloadOutlined, ThunderboltOutlined, CopyOutlined } from '@ant-design/icons';
import { UserInstructionMessage, ContextElementType, ContextElement, UIElementContext, BoundingBoxContext, OrgTier, OrgPlan } from '../datas';
import { addOrUpdateContextElements, removeContextElementById, getBasicInfo, getBasicInfoForBoxElements } from '../contextStore';
import { ScratchPad, LocalTask } from './ScratchPad';
import { getFilePathsFromDOM } from '../domUtils';
import { getScreenForPage } from '../apiService';
import { getScreenStates } from '../apiService';
import { useConnectionManager } from '../connectionManager';
import JiraIssueFinder from '../components/JiraIssueFinder';
import { formatDevTaskForAi } from '../AiMessageUtils';
import { UI_BASE_URL } from '../config';
// Remove: import { useScreenInfoSync } from './useScreenInfoSync';

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
    const [showCopiedNotification, setShowCopiedNotification] = useState(false);
    const [copiedTimeoutRef, setCopiedTimeoutRef] = useState<NodeJS.Timeout | null>(null);
    const [sending, setSending] = useState(false);
    const [currentMode, setCurrentMode] = useState<'normal' | 'select' | 'box'>('normal');
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const lastMessageId = useRef<string | null>(null);
    const { vscodeConnected, mcpConnected } = useConnectionManager();
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
    const [collapseActiveKey, setCollapseActiveKey] = useState<string[]>([]);
    const scratchPadContainerRef = useRef<HTMLDivElement>(null);
    const [scratchPadMaxHeight, setScratchPadMaxHeight] = useState<string>('calc(100vh - 320px)');
    const stickyRef = useRef<HTMLDivElement>(null);
    const [scratchPadHeight, setScratchPadHeight] = useState(400);

    // Add state for Jira integration UI
    const [showJiraFinder, setShowJiraFinder] = useState(false);
    const [showJiraUpgrade, setShowJiraUpgrade] = useState(false);
    const [teamTier, setTeamTier] = useState<OrgTier>(OrgTier.UNKNOWN_ORG_TIER);
    const [teamPlan, setTeamPlan] = useState<OrgPlan>(OrgPlan.UNKNOWN_PLAN);

    // On mount, fetch teamTier and teamPlan from chrome.storage.local
    useEffect(() => {
      chrome.storage.local.get(['teamTier', 'teamPlan'], (data) => {
        setTeamTier(data.teamTier);
        setTeamPlan(data.teamPlan);
      });
    }, []);

    const updateScratchPadHeight = () => {
        const stickyHeight = stickyRef.current?.offsetHeight || 0;
        setScratchPadHeight(window.innerHeight - stickyHeight);
    };

    useEffect(() => {
        updateScratchPadHeight();
        window.addEventListener('resize', updateScratchPadHeight);
        return () => window.removeEventListener('resize', updateScratchPadHeight);
    }, []);

    // Fetch screen states and current screen on mount (replicate ScenariosTab logic)
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

    // Listen for navigation events (SPA and reload) to update current screen info
    useEffect(() => {
        function updateScreenInfo() {
            const url = window.location.href;
            getScreenForPage({ url }).then(res => {
                setCurrentScreenName(res.screenName);
                setCurrentRelativeUrl(res.normalizedUrl || url);
                setSelectedScreen(res.screenName || (screenStates && screenStates[0]?.screen) || undefined);
            });
        }
        window.addEventListener('popstate', updateScreenInfo);
        window.addEventListener('hashchange', updateScreenInfo);
        const origPushState = window.history.pushState;
        const origReplaceState = window.history.replaceState;
        window.history.pushState = function (...args) {
            origPushState.apply(this, args);
            updateScreenInfo();
        };
        window.history.replaceState = function (...args) {
            origReplaceState.apply(this, args);
            updateScreenInfo();
        };
        return () => {
            window.removeEventListener('popstate', updateScreenInfo);
            window.removeEventListener('hashchange', updateScreenInfo);
            window.history.pushState = origPushState;
            window.history.replaceState = origReplaceState;
        };
    }, [screenStates]);

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
        // This useEffect is now handled by useVSCodeConnectionStatus
    }, []);

    // Listen for ack_message from IDE to show copied notification and clear loading
    useEffect(() => {
        function handleAck(event: MessageEvent) {
            if (event.data && event.data.type === 'ack_message') {
                setShowCopiedNotification(true);
                setSending(false);
                setUserMessage('');
                if (copiedTimeoutRef) clearTimeout(copiedTimeoutRef);
                const timeout = setTimeout(() => setShowCopiedNotification(false), 2000);
                setCopiedTimeoutRef(timeout);
            }
        }
        window.addEventListener('message', handleAck);
        return () => {
            window.removeEventListener('message', handleAck);
            if (copiedTimeoutRef) clearTimeout(copiedTimeoutRef);
        };
    }, [copiedTimeoutRef]);

    // Dropdown menu for context add
    const contextMenu = (
        <Menu
            onClick={({ key }) => {
                if (key === 'select') {
                    setCurrentMode('select');
                    window.postMessage({ type: 'tc-hide-sidebar' }, '*');
                }
                if (key === 'box') {
                    setCurrentMode('box');
                    window.postMessage({ type: 'tc-hide-sidebar' }, '*');
                }
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

    // Helper to get formatted prompt and messageId
    const getFormattedPrompt = (forClipboard = false) => {
        // Get the current resource part of the URL
        let relativeUrl = '';
        try {
            const loc = window.location;
            if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
                relativeUrl = loc.pathname + loc.search + loc.hash;
            } else {
                relativeUrl = loc.pathname + loc.search + loc.hash;
            }
        } catch (e) {
            relativeUrl = '';
        }
        const filePaths: string[] = getFilePathsFromDOM();
        const contextElements: ContextElement[] = contextTags.map(tag => {
            const id = tag.id || hashContextTag(tag);
            return { ...tag, id, contextId: (tag as any).contextId || id } as ContextElement;
        });
        const infoContext = {
            screenInfo: { relativeUrl, filePaths },
            contextElements
        };
        const messageId = (forClipboard ? 'clipboard_' : 'msg_') + Date.now();
        const prompt = formatDevTaskForAi({
            type: 'user_instruction',
            userInstruction: userMessage.trim(),
            infoContext,
            messageId
        });
        return { prompt, messageId };
    };

    const handleSend = () => {
        if (!userMessage.trim()) return;
        setSending(true);
        const { prompt, messageId } = getFormattedPrompt(false);
        lastMessageId.current = messageId;
        const messageToSend = {
            type: 'user_instruction',
            prompt,
            messageId
        } as UserInstructionMessage & { prompt: string };
        chrome.runtime.sendMessage({ type: 'send_to_vscode', payload: messageToSend });
        // Set a timeout to handle failure to receive ack
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => {
            if (lastMessageId.current === messageId && sendingRef.current) {
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
        // Use already-tracked currentRelativeUrl and selectedScreen
        const relativeUrl = currentRelativeUrl || window.location.href;
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
            screenName: selectedScreen || undefined,
            relativeUrl: relativeUrl || undefined,
        };
        // Save to chrome.storage.sync
        chrome.storage.sync.get(['localTasks'], (result) => {
            const prev: LocalTask[] = result['localTasks'] || [];
            const updated = [newTask, ...prev].sort((a, b) => b.creationTimestampMillis - a.creationTimestampMillis);
            chrome.storage.sync.set({ localTasks: updated }, () => {
                setScratchPadTasks(updated);
                setCollapseActiveKey(['1']);
                setScratchPadOpen(true);
                setSaveLoading(false);
                setUserMessage('');
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

    // When a new item is added to the scratch pad, open the Collapse
    const handleScratchPadAdd = () => {
        setCollapseActiveKey(['1']);
        setScratchPadOpen(true);
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

    // Handler for Load from Jira button
    const handleLoadFromJira = () => {
        // Gating logic: block if not TEAM_TIER (2) or if plan is not TEAM_PLAN
        // Note: chrome.storage.local stores enums as numbers (for OrgTier) and strings (for OrgPlan)
        if (Number(teamTier) !== OrgTier.PRO_TIER || teamPlan !== OrgPlan.TEAM_PLAN) {
            setShowJiraUpgrade(true);
        } else {
            setShowJiraFinder(true);
        }
    };

    // Handler for Jira upgrade cancel
    const handleJiraUpgradeCancel = () => setShowJiraUpgrade(false);
    // Handler for Jira finder cancel
    const handleJiraFinderCancel = () => setShowJiraFinder(false);

    // Handler for Jira issue select
    const handleJiraIssueSelect = (title: string) => {
        setUserMessage(title);
        setShowJiraFinder(false);
    };

    // Handler for copying prompt to clipboard when VSCode is not connected
    const handleCopyPrompt = async () => {
        if (!userMessage.trim()) return;
        const { prompt } = getFormattedPrompt(true);
        try {
            await navigator.clipboard.writeText(prompt);
            setShowCopiedNotification(true);
            setTimeout(() => setShowCopiedNotification(false), 2000);
        } catch (err) {
            setNotification('Failed to copy prompt');
            setTimeout(() => setNotification(''), 2000);
        }
    };

    // Layout: Screen selector at top, ScratchPad grows to fill space, bottom sticky area contains status, button panel, prompt, context
    return (
        <div style={{ height: '100%', background: '#181818', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: 1, height:"100%", display: 'flex', flexDirection: 'column' }}>
                {showJiraFinder ? (
                    <JiraIssueFinder onSelect={handleJiraIssueSelect} onCancel={handleJiraFinderCancel} style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'auto' }} />
                ) : (
                    <>
                        {/* Collapse with ScratchPad */}
                        <Collapse
                            activeKey={collapseActiveKey}
                            onChange={keys => setCollapseActiveKey(keys as string[])}
                            style={{ height: 'calc(100% - 320px)', overflow: 'hidden', background: 'none', border: 'none' }}
                            expandIconPosition="start"
                        >
                            <Collapse.Panel
                                header={<span style={{ fontWeight: 500, color: '#aaa', fontSize: 13, letterSpacing: 0.01, padding: 0, margin: 0 }}>Scratch Pad</span>}
                                key="1"
                                style={{ height: '100%', background: '#181818', border: 'none', borderRadius: 8, marginBottom: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 0 }}
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
                                        onClick={() => {
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
                                        }}
                                        loading={screenLoading}
                                        style={{ marginLeft: 4, background: 'none', border: 'none', color: '#aaa', fontSize: 12, boxShadow: 'none', padding: 0, width: 20, height: 20, minWidth: 20 }}
                                    />
                                </div>
                                <div style={{ height: scratchPadHeight, overflowY: 'auto', paddingBottom: 330, background: '#181818', paddingLeft: 4, paddingRight: 4 }}>
                                    <ScratchPad
                                        onSelect={handleScratchPadSelect}
                                        onDelete={handleScratchPadDelete}
                                        tasks={scratchPadTasks}
                                        setTasks={setScratchPadTasks}
                                        currentScreenName={selectedScreen}
                                        currentRelativeUrl={currentRelativeUrl}
                                        onAdd={handleScratchPadAdd}
                                    />
                                </div>
                            </Collapse.Panel>
                        </Collapse>
                        {/* Sticky bottom area (no longer fixed) */}
                        <div ref={stickyRef} style={{
                            height: 320,
                            background: '#181818',
                            boxShadow: '0 -2px 12px rgba(0,0,0,0.12)',
                            padding: '0 4px 0 4px',
                            borderTop: '1px solid #222',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                        }}>
                            {/* Context window */}
                            <div className="tc-section fade-in" style={{ minHeight: 120, marginTop: 0, marginBottom: 4, padding: 8, display: 'flex', flexDirection: 'column', background: '#181818', border: '1.5px solid #333', borderRadius: 8 }}>
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
                            <div style={{ position: 'relative' }}>
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
                                />
                                {/* Copy icon overlay */}
                                <Tooltip title="Copy prompt to clipboard">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined style={{ fontSize: 16, color: '#aaa' }} />}
                                        onClick={handleCopyPrompt}
                                        className="tc-copy-prompt-icon"
                                        tabIndex={0}
                                        aria-label="Copy prompt to clipboard"
                                    />
                                </Tooltip>
                                {showCopiedNotification && (
                                    <div className="scenario-notification" style={{ position: 'absolute', top: 8, left: 16, right: 16, zIndex: 10, textAlign: 'center', pointerEvents: 'none' }}>
                                        Prompt copied to IDE
                                    </div>
                                )}
                                <Button
                                    type="link"
                                    className="jira-link-btn"
                                    icon={null}
                                    size="small"
                                    onClick={handleLoadFromJira}
                                >
                                    Load from Jira <ThunderboltOutlined />
                                </Button>
                            </div>
                            {showJiraUpgrade && (
                                <div className="fade-in-slide-up" style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 10, background: '#232323', border: '1.5px solid #ffb300', borderRadius: 8, padding: 24, textAlign: 'center', color: '#fff' }}>
                                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Upgrade to TestChimp Teams tier for Jira integration and more...</div>
                                    <Button type="primary" style={{ background: '#ff6b65', border: 'none', fontWeight: 600, marginRight: 8 }} onClick={() => window.open(`${UI_BASE_URL}/signin?flow=upgrade`, '_blank')}>Upgrade</Button>
                                    <Button onClick={handleJiraUpgradeCancel} style={{ marginLeft: 8 }}>Cancel</Button>
                                </div>
                            )}
                            {notification && (
                                <div className="scenario-notification">
                                    {notification}
                                </div>
                            )}
                            {/* Button panel */}
                            <div className={"fade-in"} style={{ width: '100%', background: '#181818', display: 'flex', gap: 8, padding: '8px 4px 4px 4px', borderTop: '1px solid #222', marginTop: 4 }}>
                                <div style={{ flex: 1 }}>
                                    <Tooltip title={!userMessage.trim() ? 'Prompt must be non-empty' : ''}>
                                        <Button
                                            onClick={handleSaveForLater}
                                            className="secondary-button"
                                            style={{ width: '100%', color: '#72BDA3', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            disabled={sending || saveLoading || !userMessage.trim()}
                                            loading={saveLoading}
                                        >
                                            Save for  later
                                        </Button>
                                    </Tooltip>
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
                                                onClick={vscodeConnected ? handleSend : handleCopyPrompt}
                                                className="primary-button"
                                                loading={vscodeConnected && sending}
                                                style={{ width: '100%', color: '#fff', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                disabled={(vscodeConnected && sending) || !userMessage.trim()}
                                            >
                                                {showCopiedNotification ? (
                                                    <>
                                                        Copied to {vscodeConnected ? 'IDE' : 'clipboard'}
                                                        <RightSquareOutlined style={{ fontSize: 14, marginLeft: 6 }} />
                                                    </>
                                                ) : (
                                                    <>
                                                        {vscodeConnected ? 'Send to IDE' : 'Copy Prompt'}
                                                        <RightSquareOutlined style={{ fontSize: 14, marginLeft: 6 }} />
                                                    </>
                                                )}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Status bar: always at the bottom */}
            <div className={"fade-in-slide-up"} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', background: '#181818', padding: '8px 4px 4px 4px', borderRadius: 0, borderTop: '1px solid #222', minHeight: 22, fontSize: 12, marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                        VSCode: {vscodeConnected ? (
                            <span style={{ color: '#52c41a', fontSize: 12 }}>Connected</span>
                        ) : (
                            <Tooltip title={
                                <div>
                                    VSCode extension is not connected.
                                    <br />
                                    <a
                                        href="https://testchimp.io/documentation-vscode-extension"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#72BDA3', textDecoration: 'underline' }}
                                    >
                                        Click here for setup instructions
                                    </a>
                                </div>
                            }>
                                <span style={{ color: '#ffb300', fontSize: 12, textDecoration: 'underline dotted' }}>Not Connected</span>
                            </Tooltip>
                        )}
                    </span>
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                        MCP: {mcpConnected ? (
                            <span style={{ color: '#52c41a', fontSize: 12 }}>Connected</span>
                        ) : (
                            <Tooltip title={
                                <div>
                                    MCP server is not connected (Optional)
                                    <br />
                                    <a
                                        href="https://testchimp.io/documentation-mcp/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#72BDA3', textDecoration: 'underline' }}
                                    >
                                        Click here for setup instructions
                                    </a>
                                </div>
                            }>
                                <span style={{ color: '#ffb300', fontSize: 12, textDecoration: 'underline dotted' }}>Not Connected</span>
                            </Tooltip>
                        )}
                    </span>
                </div>
                <a href="https://testchimp.io/documentation-chrome-extension/" target="_blank" rel="noopener noreferrer" style={{ color: '#aaa', fontSize: 12, textDecoration: 'none', marginLeft: 'auto' }}>v1.0.15</a>
            </div>
        </div>
    );
};   