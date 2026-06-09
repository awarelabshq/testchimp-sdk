import React, { useEffect, useState, useRef } from 'react';
import {
    Button,
    Select,
    Input,
    Tooltip,
} from 'antd';
import { LogoutOutlined, WarningOutlined, EditOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { ReleaseSelect } from './components/ReleaseSelect';
import { EnvironmentSelect } from './components/EnvironmentSelect';
import { ManualTestTab } from './ManualTestTab';
import { BASE_URL, UI_BASE_URL } from './config';

export interface ListUserProjectConfigsResponse {
    configs: ExtProjectConfig[];
}
export interface ExtProjectConfig {
    name?: string;
    urlRegexToCapture?: string;
    projectId?: string;
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
    const [manualTabRefreshKey, setManualTabRefreshKey] = useState(0);
    const [selectedEnvironment, setSelectedEnvironment] = useState<string>('QA');
    const [selectedRelease, setSelectedRelease] = useState<string | undefined>(undefined);
    const logoRef = useRef<HTMLImageElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

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
                (syncItems: { projectId?: string }) => {
                    const { projectId } = syncItems;
                    // Check for pending project from test planning "Record via extension" flow
                    chrome.storage.local.get(
                        ['pendingProjectId', 'pendingProjectIdReceivedAt'],
                        (localItems: { pendingProjectId?: string; pendingProjectIdReceivedAt?: number }) => {
                            const pendingId = localItems.pendingProjectId;
                            const pendingReceivedAt = localItems.pendingProjectIdReceivedAt;
                            const THREE_MINS_MS = 3 * 60 * 1000;
                            const pendingValid =
                                pendingId &&
                                typeof pendingReceivedAt === 'number' &&
                                (Date.now() - pendingReceivedAt) < THREE_MINS_MS &&
                                projects.some((p) => p.projectId === pendingId);
                            let selectedId: string | undefined;
                            if (pendingValid) {
                                selectedId = pendingId;
                                chrome.storage.local.remove(['pendingProjectId', 'pendingProjectIdReceivedAt'], () => {
                                    console.log('[Sidebar] Applied pending project from test planning:', selectedId);
                                });
                            } else {
                                selectedId =
                                    projectId && projects.some((p) => p.projectId === projectId)
                                        ? projectId
                                        : projects[0]?.projectId;
                            }
                            const selectedProject = projects.find((p) => p.projectId === selectedId);
                            if (selectedProject) {
                                updateSelectedProject(selectedProject.projectId!);
                            }
                        }
                    );
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
                projectId: newProjectId,
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
                                window.open(`${UI_BASE_URL}/signin?flow=ext_auth`)
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
                                options={[...projects]
                                    .sort((a, b) => {
                                        const nameA = (a.name ?? 'Unnamed Project').toLowerCase();
                                        const nameB = (b.name ?? 'Unnamed Project').toLowerCase();
                                        return nameA.localeCompare(nameB);
                                    })
                                    .map((p) => ({
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
                            <Tooltip title="Refresh projects, scenarios, branches, and test runs">
                                <Button
                                    className="fade-in"
                                    icon={<ReloadOutlined />}
                                    type="text"
                                    onClick={() => {
                                        fetchProjects();
                                        setManualTabRefreshKey((k) => k + 1);
                                    }}
                                />
                            </Tooltip>
                            <Tooltip title="Logout">
                                <Button className="fade-in" icon={<LogoutOutlined />} style={{ color: "#ff6b65" }} type="text" onClick={handleLogout} />
                            </Tooltip>
                        </div>
                        {/* Interception settings (shown by default if not set, or toggled by settings icon) */}
                        {selectedProjectId && projects.length > 0 && showInterceptSettings && (
                            <div className={"fade-in"} style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
                                {/* URL Regex Section - Hidden */}
                                {false && (
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
                                )}
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
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid #333' }}>
                            <ManualTestTab
                                selectedEnvironment={selectedEnvironment}
                                selectedRelease={selectedRelease}
                                refreshSignal={manualTabRefreshKey}
                            />
                        </div>
                    </div>
                )}
        </div>
    );
};