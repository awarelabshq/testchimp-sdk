import React, { useEffect, useState, useRef } from 'react';
import {
    Button,
    Select,
    Input,
    Tooltip,
    Tabs,
} from 'antd';
import { LogoutOutlined, BugOutlined, WarningOutlined, EditOutlined, ReloadOutlined, SettingOutlined, AppstoreOutlined, VideoCameraOutlined, ExperimentOutlined } from '@ant-design/icons';
import { ReleaseSelect } from './components/ReleaseSelect';
import { EnvironmentSelect } from './components/EnvironmentSelect';
import { RecordTab } from './RecordTab';
import { BugsTab } from './bugs/BugsTab';
import { ScenariosTab } from './scenarios/ScenariosTab';
import { DevTab } from './dev';
import { simplifyDOMForLLM } from './html_utils';
import { getMindMapStatus, MindMapStatus } from './apiService';

const BASE_URL = 'https://featureservice.testchimp.io';

export interface ListUserProjectConfigsResponse {
    configs: ExtProjectConfig[];
}
export interface ExtProjectConfig {
    name?: string;
    urlRegexToCapture?: string;
    projectId?: string;
    sessionRecordApiKey?: string;
}

export const SidebarApp = () => {
    const [userAuthKey, setUserAuthKey] = useState<string | undefined>();
    const [projects, setProjects] = useState<ExtProjectConfig[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
    const [selectedProject, setSelectedProject] = useState<ExtProjectConfig | undefined>(undefined);
    const [editingIntercept, setEditingIntercept] = useState(false);
    const [interceptInput, setInterceptInput] = useState(selectedProject?.urlRegexToCapture || '');
    const [isUpdatingConfig, setUpdatingConfig] = useState<boolean>(false);
    const [urlRegexToCapture, setUrlRegexToCapture] = useState<string | undefined>(undefined);
    const [activeTabKey, setActiveTabKey] = useState('dev');
    const [tabRefreshKey, setTabRefreshKey] = useState(0);
    const [isMindMapBuilding, setIsMindMapBuilding] = useState(false);
    const [selectedEnvironment, setSelectedEnvironment] = useState<string>('QA');
    const [selectedRelease, setSelectedRelease] = useState<string | undefined>(undefined);
    const logoRef = useRef<HTMLImageElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [mindMapStatus, setMindMapStatus] = useState<MindMapStatus | undefined>(undefined);
    const [showMindMapPanel, setShowMindMapPanel] = useState(true);

    // Save environment and release to chrome storage when they change
    useEffect(() => {
        chrome.storage.local.set({ selectedEnvironment, selectedRelease });
    }, [selectedEnvironment, selectedRelease]);
    // --- Project selection and settings row ---
    const [showInterceptSettings, setShowInterceptSettings] = useState<boolean>(false);
    useEffect(() => {
        // Show interception settings by default if not set
        setShowInterceptSettings(!selectedProject?.urlRegexToCapture);
    }, [selectedProject]);

    useEffect(() => {
        const loadInitialState = async () => {
            // Get user/project info from sync
            await fetchProjects();
        };

        loadInitialState();

        const handleStorageChange = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName === 'sync' && changes.userAuthKey) {
                console.log("Received userAuthKey update");
                setUserAuthKey(changes.userAuthKey.newValue); // Update state with the new value
                loadInitialState();
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    useEffect(() => {
        chrome.storage.local.get(['recordingInProgress'], (localItems) => {
            if (localItems.recordingInProgress) {
                setActiveTabKey('record');
            }
        });
    }, []);

    const fetchProjects = async (): Promise<void> => {
        chrome.storage.sync.get(
            ['userAuthKey', 'currentUserId', 'projectId'],
            async (syncItems: { userAuthKey?: string; currentUserId?: string; projectId?: string }) => {
                const { userAuthKey, currentUserId, projectId } = syncItems;

                if (userAuthKey && currentUserId) {
                    setUserAuthKey(userAuthKey);

                    try {
                        const res = await fetch(`${BASE_URL}/ext/list_user_project_configs`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'USER_MAIL': currentUserId,
                                'USER_AUTH_KEY': userAuthKey,
                            },
                            body: JSON.stringify({}),
                        });

                        const data: ListUserProjectConfigsResponse = await res.json();
                        const configs = data.configs || [];
                        setProjects(configs);
                    } catch (err) {
                        console.error("Failed to load projects", err);
                    }
                }
            }
        );
    }

    useEffect(() => {
        if (projects && projects.length > 0) {
            chrome.storage.sync.get(
                ['projectId'],
                async (syncItems: { projectId?: string }) => {
                    const { projectId } = syncItems;
                    const selectedId = projectId && projects.some(p => p.projectId === projectId)
                        ? projectId
                        : projects[0]?.projectId;

                    const selectedProject = projects.find(p => p.projectId === selectedId);
                    if (selectedProject) {
                        await updateSelectedProject(selectedProject.projectId!);
                    }
                }
            );
        }
    }, [projects]);

    const updateSelectedProject = async (newProjectId: string): Promise<void> => {
        setSelectedProjectId(newProjectId);
        const selectedProject = projects.find((p) => p.projectId === newProjectId);
        setSelectedProject(selectedProject);
        console.log("Setting url regex", selectedProject?.urlRegexToCapture);
        setUrlRegexToCapture(selectedProject?.urlRegexToCapture);
        if (!selectedProject) {
            console.log("Project configuration not found");
            return;
        }
        chrome.storage.sync.set(
            {
                "projectId": newProjectId,
                "sessionRecordingApiKey": selectedProject.sessionRecordApiKey,
                "uriRegexToIntercept": selectedProject.urlRegexToCapture,
            },
            () => {
                console.log("Set current project in chrome to: ", newProjectId);
            }
        );

    };

    const configureProjectIntercept = async (urlRegex: string): Promise<void> => {
        setUpdatingConfig(true);
        chrome.storage.sync.get(
            ['userAuthKey', 'currentUserId'],
            async (syncItems: { userAuthKey?: string; currentUserId?: string; projectId?: string }) => {
                const { userAuthKey, currentUserId } = syncItems;

                const res = await fetch(`${BASE_URL}/ext/configure_project_intercept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'USER_MAIL': currentUserId!,
                        'USER_AUTH_KEY': userAuthKey!,
                    },
                    body: JSON.stringify({
                        "projectId": selectedProjectId,
                        "urlRegexToCapture": urlRegex
                    }),
                });
                await fetchProjects();
                setUpdatingConfig(false);
                setTimeout(() => {
                    let updatedProject = {
                        ...selectedProject,
                        urlRegexToCapture: urlRegex
                    };
                    setSelectedProject(updatedProject);
                    setEditingIntercept(false);
                }, 1000);
            }
        );
    }

    const handleLogout = () => {
        chrome.storage.sync.set({ userAuthKey: '', currentUserId: '' }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error signing out:', chrome.runtime.lastError);
            } else {
                setUserAuthKey(undefined);
            }
        });
    }

    // Listen for window URL changes and refresh bugs/scenarios tab if active
    useEffect(() => {
        let lastUrl = window.location.href;
        const checkUrl = (forcedUrl?: string) => {
            const currentUrl = forcedUrl || window.location.href;
            console.log('[Sidebar] checkUrl called. lastUrl:', lastUrl, 'currentUrl:', currentUrl);
            if (currentUrl !== lastUrl) {
                console.log('[Sidebar] URL changed! lastUrl:', lastUrl, '-> currentUrl:', currentUrl);
                lastUrl = currentUrl;
                if (activeTabKey === 'bugs' || activeTabKey === 'scenarios' || activeTabKey === 'dev') {
                    if (isMindMapBuilding) {
                        console.log('[Sidebar] URL changed but MindMap building is in progress. Skipping tab refresh. activeTabKey:', activeTabKey);
                    } else {
                        console.log('[Sidebar] Refreshing tab due to URL change. activeTabKey:', activeTabKey);
                        setTabRefreshKey(k => k + 1);
                    }
                } else {
                    console.log('[Sidebar] URL changed but not on bugs/scenarios/dev tab. No refresh. activeTabKey:', activeTabKey);
                }
            } else {
                console.log('[Sidebar] checkUrl: URL did not change.');
            }
        };
        const onPopState = () => {
            console.log('[Sidebar] popstate event detected');
            checkUrl();
        };
        const onHashChange = () => {
            console.log('[Sidebar] hashchange event detected');
            checkUrl();
        };
        window.addEventListener('popstate', onPopState);
        window.addEventListener('hashchange', onHashChange);
        // Listen for SPA navigation CustomEvent from injectSidebar
        const host = document.getElementById('testchimp-sidebar');
        const onSpaUrlChanged = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail && customEvent.detail.type === 'tc-spa-url-changed') {
                console.log('[Sidebar] Received tc-spa-url-changed CustomEvent:', customEvent.detail);
                checkUrl(customEvent.detail.href);
            }
        };
        if (host) {
            host.addEventListener('tc-spa-url-changed', onSpaUrlChanged);
        } else {
            console.warn('[Sidebar] Sidebar host element not found for tc-spa-url-changed event');
        }
        // Monkey-patch pushState/replaceState
        const origPushState = window.history.pushState;
        const origReplaceState = window.history.replaceState;
        window.history.pushState = function (...args) {
            console.log('[Sidebar] pushState called', args);
            origPushState.apply(window.history, args);
            checkUrl();
        };
        window.history.replaceState = function (...args) {
            console.log('[Sidebar] replaceState called', args);
            origReplaceState.apply(window.history, args);
            checkUrl();
        };
        return () => {
            window.removeEventListener('popstate', onPopState);
            window.removeEventListener('hashchange', onHashChange);
            if (host) host.removeEventListener('tc-spa-url-changed', onSpaUrlChanged);
            window.history.pushState = origPushState;
            window.history.replaceState = origReplaceState;
        };
    }, [activeTabKey]);

    // Check mindmap status after login
    useEffect(() => {
        if (userAuthKey) {
            getMindMapStatus().then((resp) => {
                setMindMapStatus(resp.status);
                // Only show the panel if NOT_BUILT or BUILD_IN_PROGRESS
                if (resp.status === MindMapStatus.MINDMAP_NOT_BUILT || resp.status === MindMapStatus.MINDMAP_BUILD_IN_PROGRESS) {
                    setShowMindMapPanel(true);
                } else {
                    setShowMindMapPanel(false);
                }
            }).catch(() => {
                setMindMapStatus(undefined);
                setShowMindMapPanel(false);
            });
        } else {
            setMindMapStatus(undefined);
            setShowMindMapPanel(false);
        }
    }, [userAuthKey]);

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'get_dom_snapshot') {
            try {
                // @ts-ignore: simplifyDOMForLLM may be imported or defined elsewhere
                const dom = simplifyDOMForLLM(document.body, { includeStyles: true });
                sendResponse({ dom });
            } catch (e) {
                sendResponse({ error: e?.message || 'Failed to simplify DOM' });
            }
            return true; // Keep the message channel open for async response
        }
    });

    return (
        <div className="tc-sidebar" data-testid="tc-ext-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 8 }}>
            {!userAuthKey ? (
                <div
                    style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <img
                            ref={logoRef}
                            src={chrome.runtime.getURL('images/icon-128.png')}
                            alt="TestChimp Logo"
                            style={{ width: 48, height: 48, marginBottom: 12 }}
                        />
                        <Button
                            type="primary"
                            style={{ width: 200, display: 'flex', justifyContent: 'center' }}
                            onClick={() =>
                                window.open('https://prod.testchimp.io/signin?flow=ext_auth')
                            }
                        >
                            <span className="fade-in">Login</span>
                        </Button>
                        <div
                            ref={textRef}
                            style={{
                                marginTop: 14,
                                textAlign: 'center',
                                color: '#aaa',
                                fontSize: 14,
                                fontWeight: 500,
                                lineHeight: '18px'
                            }}
                        >
                            The AI Co-Pilot for QA teams
                        </div>
                    </div>
                </div>
            ) : (
                // MindMap status panel logic
                mindMapStatus === MindMapStatus.MINDMAP_NOT_BUILT && showMindMapPanel ? (
                    <div className='fade-in-slide-up' style={{
                        background: '#232323',
                        borderRadius: 12,
                        padding: 24,
                        margin: 'auto',
                        maxWidth: 420,
                        color: '#fff',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 320,
                    }}>
                        <img
                            src={chrome.runtime.getURL('images/icon-128.png')}
                            alt="TestChimp Logo"
                            style={{ width: 48, height: 48, marginBottom: 18 }}
                        />
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
                            It seems TestChimp has not run an exploration on your project yet.
                        </div>
                        <div style={{ fontSize: 15, color: '#aaa', marginBottom: 24, textAlign: 'center' }}>
                            Login to <a href="https://prod.testchimp.io/" target="_blank" rel="noopener noreferrer" style={{ color: '#e6c200', textDecoration: 'underline' }}>testchimp</a>, and run an exploration during which it will build a MindMap about your app, identify bugs, and generate test scenarios for each screen.
                        </div>
                        <div style={{ fontSize: 15, color: '#aaa', marginBottom: 24, textAlign: 'center' }}>
                            The Chrome extension will then display bugs / scenarios identified for the current screen, and provide AI assistance collaborating with your AI enabled IDEs for a seamless QA experience.
                        </div>
                        <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center' }}>
                            <Button
                                type="default"
                                style={{ fontWeight: 500, flex: 1 }}
                                onClick={() => setShowMindMapPanel(false)}
                            >
                                Skip for now
                            </Button>
                            <Button
                                type="primary"
                                style={{ fontWeight: 500, flex: 1 }}
                                onClick={() => window.open('https://prod.testchimp.io/signin?flow=run_first_exploration', '_blank')}
                            >
                                Run Exploration
                            </Button>
                        </div>
                    </div>
                ) : mindMapStatus === MindMapStatus.MINDMAP_BUILD_IN_PROGRESS && showMindMapPanel ? (
                    <div className='fade-in-slide-up' style={{
                        background: '#232323',
                        borderRadius: 12,
                        padding: 24,
                        margin: 'auto',
                        maxWidth: 420,
                        color: '#fff',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 220,
                    }}>
                        <img
                            src={chrome.runtime.getURL('images/icon-128.png')}
                            alt="TestChimp Logo"
                            style={{ width: 48, height: 48, marginBottom: 18 }}
                        />
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 18, textAlign: 'center' }}>
                            TestChimp is still exploring your webapp to identify different screens, bugs and generate test scenarios.
                        </div>
                        <Button
                            type="primary"
                            style={{ fontWeight: 500, width: '100%' }}
                            onClick={() => setShowMindMapPanel(false)}
                        >
                            Continue Anyway
                        </Button>
                    </div>
                ) : (
                    <div className="tc-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: 0 }}>
                        {/* Project selection row (no Collapse) */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                            marginBottom: 8,
                            padding: '8px 8px',
                            border: '1.5px solid #333',
                            borderRadius: 8,
                            background: '#202124',
                        }}>
                            <Select
                                style={{ flex: 1, minWidth: 0 }}
                                value={selectedProjectId}
                                onChange={(id) => {
                                    updateSelectedProject(id);
                                    setEditingIntercept(false);
                                }}
                                options={projects.map((p) => ({
                                    label: p.name ?? 'Unnamed Project',
                                    value: p.projectId!,
                                }))}
                                dropdownStyle={{ zIndex: 9999 }}
                                getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                            />
                            <Tooltip title="Project Settings">
                                <Button
                                    className="fade-in"
                                    icon={<SettingOutlined />}
                                    type={showInterceptSettings ? 'primary' : 'default'}
                                    onClick={() => setShowInterceptSettings(v => !v)}
                                    style={{ padding: '0 8px' }}
                                />
                            </Tooltip>
                            <Tooltip title="Refresh Projects">
                                <Button className="fade-in" icon={<ReloadOutlined />} type="text" onClick={fetchProjects} />
                            </Tooltip>
                            <Tooltip title="Logout">
                                <Button className="fade-in" icon={<LogoutOutlined />} style={{ color: "#ff6b65" }} type="text" onClick={handleLogout} />
                            </Tooltip>
                        </div>
                        {/* Interception settings (shown by default if not set, or toggled by settings icon) */}
                        {selectedProjectId && projects.length > 0 && showInterceptSettings && (
                            <div className={"fade-in"} style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
                                {/* URL Regex Section */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    {editingIntercept ? (
                                        <>
                                            <Input
                                                placeholder="Enter URL regex to intercept"
                                                value={interceptInput}
                                                onChange={(e) => setInterceptInput(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <Button
                                                loading={isUpdatingConfig}
                                                size="small"
                                                type="primary"
                                                onClick={() => configureProjectIntercept(interceptInput)}
                                            >
                                                OK
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={() => setEditingIntercept(false)}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    ) : urlRegexToCapture ? (
                                        <>
                                            <span style={{ color: '#aaa', minWidth: 70, fontSize: 12, lineHeight: '32px' }}>Intercepts:</span>
                                            <span style={{ color: '#e6c200', fontWeight: 500 }}>{urlRegexToCapture}</span>
                                            <Button
                                                size="small"
                                                type="text"
                                                icon={<EditOutlined />}
                                                onClick={() => {
                                                    setInterceptInput(selectedProject?.urlRegexToCapture || '');
                                                    setEditingIntercept(true);
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <WarningOutlined style={{ color: '#faad14' }} />
                                            <span style={{ color: '#faad14' }}>Interception not set</span>
                                            <Button size="small" onClick={() => setEditingIntercept(true)} icon={<EditOutlined />} />
                                        </>
                                    )}
                                </div>
                                {/* Environment Section */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ color: '#aaa', minWidth: 70, fontSize: 12, lineHeight: '32px' }}>Environment:</span>
                                    <EnvironmentSelect
                                        value={selectedEnvironment}
                                        onChange={(val) => setSelectedEnvironment(val || 'QA')}
                                        placement="topLeft"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                {/* Release Section */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: '#aaa', minWidth: 70, fontSize: 12, lineHeight: '32px' }}>Release:</span>
                                    <ReleaseSelect
                                        value={selectedRelease}
                                        onChange={setSelectedRelease}
                                        label=""
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </div>
                        )}
                        {/* Tabs for Dev, Record, Bugs, Scenarios */}
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <Tabs
                                activeKey={activeTabKey}
                                onChange={setActiveTabKey}
                                style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                                tabBarStyle={{ marginBottom: 0 }}
                                tabPosition="top"
                            >
                                <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><AppstoreOutlined style={{ marginRight: 6 }} />Dev</span>} key="dev" style={{ height: '100%' }}>
                                    <DevTab key={activeTabKey === 'dev' ? tabRefreshKey : undefined} />
                                </Tabs.TabPane>
                                <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><BugOutlined style={{ marginRight: 6 }} />Bugs</span>} key="bugs" style={{ height: '100%' }}>
                                    <BugsTab key={activeTabKey === 'bugs' ? tabRefreshKey : undefined} setIsMindMapBuilding={setIsMindMapBuilding} />
                                </Tabs.TabPane>
                                <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><ExperimentOutlined style={{ marginRight: 6 }} />Scenarios</span>} key="scenarios" style={{ height: '100%' }}>
                                    <ScenariosTab key={activeTabKey === 'scenarios' ? tabRefreshKey : undefined} setIsMindMapBuilding={setIsMindMapBuilding} />
                                </Tabs.TabPane>
                                <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><VideoCameraOutlined style={{ marginRight: 6 }} />Rec</span>} key="record" style={{ height: '100%' }}>
                                    <RecordTab active={activeTabKey === 'record'} />
                                </Tabs.TabPane>
                            </Tabs>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};