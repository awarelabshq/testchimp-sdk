import React, { useEffect, useState } from 'react';
import {
    Button,
    Checkbox,
    ConfigProvider,
    Modal,
    Select,
    Input,
    Tooltip,
    Typography,
    theme,
    message as antdMessage
} from 'antd';
import { LogoutOutlined, BugOutlined, PartitionOutlined, PlusCircleOutlined, MessageOutlined, WarningOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
const { Text } = Typography;

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

export interface ExtMessage {
    text?: string;
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // difference in seconds

    if (diff < 60) {
        return `${diff} seconds ago`;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} minutes ago`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} hours ago`;
    } else {
        const days = Math.floor(diff / 86400);
        return `${days} days ago`;
    }
}

const MAX_RECENT_SESSIONS = 5;

export const SidebarApp = () => {
    const [userAuthKey, setUserAuthKey] = useState<string | undefined>();
    const [projects, setProjects] = useState<ExtProjectConfig[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
    const [selectedProject, setSelectedProject] = useState<ExtProjectConfig | undefined>(undefined);
    const [enableMindmap, setEnableMindmap] = useState<boolean>(false);
    const [enableBugCapture, setEnableBugCapture] = useState<boolean>(false);
    const [messages, setMessages] = useState<ExtMessage[]>([]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [bugTitle, setBugTitle] = useState<string>('');
    const [bugDescription, setBugDescription] = useState<string>('');
    const [bugSeverity, setBugSeverity] = useState('Low');
    const [extProjectId, setExtProjectId] = useState<string | undefined>();
    const [isRecording, setIsRecording] = useState(false);
    const [lastSessionLink, setLastSessionLink] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>();
    const [editingIntercept, setEditingIntercept] = useState(false);
    const [interceptInput, setInterceptInput] = useState(selectedProject?.urlRegexToCapture || '');
    const [isUpdatingConfig, setUpdatingConfig] = useState<boolean>(false);
    const [urlRegexToCapture, setUrlRegexToCapture] = useState<string | undefined>(undefined);
    const [recentSessions, setRecentSessions] = useState<{ url: string; timestamp: number }[]>([]);
    const [startingRecording, setStartingRecording] = useState<boolean>(false);
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        chrome.storage.sync.get(['currentUserId'], ({ currentUserId }) => {
            setCurrentUserId(currentUserId);
            chrome.storage.local.get(['recordingInProgress'], (localItems) => {
                setIsRecording(!!localItems.recordingInProgress);
            });
        });
    }, []);

    useEffect(() => {
        const loadInitialState = async () => {
            // Get user/project info from sync
            await fetchProjects();
            fetchRecentSessions();
        };

        loadInitialState();

        const handleStorageChange = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            console.log("Received storage change", changes);
            if (areaName === 'local' && changes.recordingInProgress) {
                setIsRecording(!!changes.recordingInProgress.newValue);
            }
            if (areaName === 'sync' && changes.userAuthKey) {
                console.log("Received userAuthKey update");
                setUserAuthKey(changes.userAuthKey.newValue); // Update state with the new value
                loadInitialState();
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const fetchRecentSessions = (): void => {
        chrome.storage.local.get(['recentSessions'], (localItems) => {
            const sessions = localItems.recentSessions || [];
            sessions.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setRecentSessions(sessions);
        });
    }

    const fetchProjects = async (): Promise<void> => {
        chrome.storage.sync.get(
            ['userAuthKey', 'currentUserId', 'projectId'],
            async (syncItems: { userAuthKey?: string; currentUserId?: string; projectId?: string }) => {
                const { userAuthKey, currentUserId, projectId } = syncItems;

                if (userAuthKey && currentUserId) {
                    setUserAuthKey(userAuthKey);
                    setExtProjectId(projectId);

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

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isRecording) {
            const start = Date.now();
            setRecordingStartTime(start);
            setElapsedSeconds(0);

            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            setRecordingStartTime(null);
            setElapsedSeconds(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

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

    const startRecording = async () => {
        setStartingRecording(true);
        chrome.runtime.sendMessage({ type: 'start_recording_from_sidebar' }, (response) => {
            if (response?.success) {
                chrome.storage.local.set({ recordingInProgress: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error setting recording flag:', chrome.runtime.lastError);
                    } else {
                        setIsRecording(true);
                    }
                });
            } else {
                console.error('Failed to start recording:', response?.error);
                alert('Failed to start recording. Please refresh the page and try again.');
            }
        });
        setStartingRecording(false);
    };

    const stopRecording = () => {
        chrome.runtime.sendMessage({ type: 'stop_recording_from_sidebar' }, (response) => {
            if (response?.success) {
                setIsRecording(false);
                setLastSessionLink(response.sessionLink);

                // Clear link after 5 seconds
                setTimeout(() => {
                    setLastSessionLink(null);
                    fetchRecentSessions();
                }, 5000);
            } else {
                console.error('Failed to stop recording:', response?.error);
                alert('Failed to stop recording. Please refresh the page and try again.');
            }
        });
    };
    const captureBugs = () => {
        // TODO impl
    }

    const captureMindmapSnapshot = () => {
        // TODO impl
    }

    const addManualBug = (title, description, severity) => {
        // TODO impl
    };

    const openFeedbackModal = () => {
        // TODO impl
    }

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
                setIsRecording(false);
                setUserAuthKey(undefined);
            }
        });
    }

    const isFooterEnabled = false;
    const enableAgent = false;

    return (
        <div className="tc-sidebar">
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
                            src={chrome.runtime.getURL('images/icon-128.png')}
                            alt="TestChimp Logo"
                            className="fade-in-logo"
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
                    </div>
                </div>
            ) : (
                <div className="tc-panel">
                    {/* Project Select Panel */}
                    <div className="tc-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600' }}>Select Project</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Tooltip title="Refresh Projects">
                                    <Button icon={<ReloadOutlined />} type="text" onClick={fetchProjects} />
                                </Tooltip>
                                <Tooltip title="Logout">
                                    <Button icon={<LogoutOutlined />} style={{ color: "#ff6b65" }} type="text" onClick={handleLogout} />
                                </Tooltip>
                            </div>
                        </div>
                        {selectedProjectId && projects.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Select
                                    style={{ width: '100%', margin: '0 2px' }}
                                    value={selectedProjectId}
                                    onChange={(id) => {
                                        updateSelectedProject(id);
                                        setEditingIntercept(false); // reset on project change
                                    }}
                                    options={projects.map((p) => ({
                                        label: p.name ?? 'Unnamed Project',
                                        value: p.projectId!,
                                    }))}
                                    dropdownStyle={{ zIndex: 9999 }}
                                    getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                                />

                                <div style={{ marginTop: 10, marginLeft: 4, marginRight: 4 }}>
                                    {editingIntercept ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <Input
                                                size="small"
                                                placeholder="Enter URL regex to intercept"
                                                value={interceptInput}
                                                onChange={(e) => setInterceptInput(e.target.value)}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                <Button
                                                    loading={isUpdatingConfig}
                                                    size="small"
                                                    type="primary"
                                                    onClick={() => {
                                                        configureProjectIntercept(interceptInput);
                                                    }}
                                                >
                                                    OK
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => {
                                                        setEditingIntercept(false);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : urlRegexToCapture ? (
                                        <Tooltip title={urlRegexToCapture}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Text type="secondary" style={{ fontSize: 12, margin: 0 }} ellipsis>
                                                    Intercepts: {urlRegexToCapture}
                                                </Text>
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<EditOutlined />}
                                                    onClick={() => {
                                                        setInterceptInput(selectedProject?.urlRegexToCapture || '');
                                                        setEditingIntercept(true)
                                                    }}
                                                />
                                            </div>
                                        </Tooltip>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <WarningOutlined style={{ color: '#faad14' }} />
                                            <Text type="warning" style={{ fontSize: 12 }}>
                                                Interception not set
                                            </Text>
                                            <Button size="small" onClick={() => setEditingIntercept(true)} icon={<EditOutlined />} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Session Controls */}
                    <div className="tc-section">
                        {enableAgent && (
                            <>
                                <Checkbox checked={enableMindmap} onChange={(e) => setEnableMindmap(e.target.checked)}>
                                    Enable Mindmap Builder
                                </Checkbox>
                                <Checkbox checked={enableBugCapture} onChange={(e) => setEnableBugCapture(e.target.checked)}>
                                    Enable Bug Capture
                                </Checkbox>
                            </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                            {isRecording ? (
                                <><Button
                                    onClick={stopRecording}
                                    style={{
                                        backgroundColor: '#ff6b65',
                                        borderColor: '#ff6b65',
                                        color: 'black',
                                        width: 180,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff3f38')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff6b65')}
                                >
                                    Stop Session
                                </Button>
                                    <span style={{ marginLeft: 8, fontSize: 14, color: '#888' }}>
                                        {formatDuration(elapsedSeconds)}
                                    </span>
                                </>
                            ) : (
                                <Button
                                    loading={startingRecording}
                                    onClick={() => startRecording()}
                                    style={{
                                        backgroundColor: '#72BDA3',
                                        borderColor: '#72BDA3',
                                        color: 'black',
                                        width: 180,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5cae91')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#72BDA3')}
                                >
                                    Start Session
                                </Button>
                            )}
                            {lastSessionLink && (
                                <a
                                    href={lastSessionLink}
                                    target="_blank"
                                    style={{
                                    }}
                                    rel="noopener noreferrer"
                                    className="tc-session-link"
                                >
                                    View Session
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Message Panel */}
                    <div className="tc-messages" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold' }}>Recent Sessions</div>
                            <button
                                onClick={fetchRecentSessions}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#72BDA3',
                                    cursor: 'pointer',
                                    fontSize: 16,
                                }}
                                title="Refresh"
                            >
                                ⟳
                            </button>
                        </div>

                        <div style={{ marginTop: 6 }}>
                            {recentSessions.length === 0 ? (
                                <div style={{ color: '#aaa' }}>No recent sessions</div>
                            ) : (
                                recentSessions.map((session, i) => (
                                    <a
                                        key={i}
                                        href={session.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ display: 'block', color: '#72BDA3', marginBottom: 4 }}
                                    >
                                        {formatTimeAgo(session.timestamp)}
                                    </a>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer Panel */}
                    {isFooterEnabled && <div className="tc-sticky-bottom">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Tooltip title="Send Feedback">
                                <Button
                                    className="tc-action-btn"
                                    icon={<MessageOutlined />}
                                    onClick={() => { /* handle feedback */ }}
                                />
                            </Tooltip>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Tooltip title="Capture Bugs">
                                    <Button
                                        className="tc-action-btn"
                                        icon={<BugOutlined />}
                                        onClick={captureBugs}
                                    />
                                </Tooltip>
                                <Tooltip title="Capture Mindmap Snapshot">
                                    <Button
                                        className="tc-action-btn"
                                        icon={<PartitionOutlined />}
                                        onClick={captureMindmapSnapshot}
                                    />
                                </Tooltip>
                                <Tooltip title="Add Manual Bug">
                                    <Button
                                        className="tc-action-btn"
                                        icon={<PlusCircleOutlined />}
                                        onClick={() => setModalVisible(true)}
                                    />
                                </Tooltip>
                            </div>
                        </div>
                    </div>}
                </div>
            )}
        </div>
    );
};