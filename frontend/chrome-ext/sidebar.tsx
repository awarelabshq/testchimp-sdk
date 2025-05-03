import React, { useEffect, useState } from 'react';
import {
    Button,
    Checkbox,
    ConfigProvider,
    Modal,
    Select,
    Input,
    Tooltip,
    theme,
    message as antdMessage
} from 'antd';
import { LogoutOutlined, BugOutlined, PartitionOutlined, PlusCircleOutlined, MessageOutlined } from '@ant-design/icons';

const BASE_URL = 'https://featureservice-staging.testchimp.io';

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

const MAX_RECENT_SESSIONS = 5;

export const SidebarApp = () => {
    const [userAuthKey, setUserAuthKey] = useState<string | undefined>();
    const [projects, setProjects] = useState<ExtProjectConfig[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
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

    useEffect(() => {
        const loadInitialState = async () => {
            // Get user/project info from sync
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
    
                            const selectedId = projectId && configs.some(p => p.projectId === projectId)
                                ? projectId
                                : configs[0]?.projectId;
    
                            const selectedProject = configs.find(p => p.projectId === selectedId);
                            if (selectedProject) {
                                await updateSelectedProject(selectedProject.projectId!);
                            }
                        } catch (err) {
                            console.error("Failed to load projects", err);
                        }
                    }
                }
            );
    
            // Get recording flag from local
            chrome.storage.local.get(['recordingInProgress'], (localItems) => {
                setIsRecording(!!localItems.recordingInProgress);
            });
        };
    
        loadInitialState();
    
        const handleStorageChange = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName === 'local' && changes.recordingInProgress) {
                setIsRecording(!!changes.recordingInProgress.newValue);
            }
        };
    
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const updateSelectedProject = async (newProjectId: string): Promise<void> => {
        setSelectedProjectId(newProjectId);
        const selectedProject = projects.find((p) => p.projectId === newProjectId);
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
    };

    const stopRecording = () => {
        chrome.runtime.sendMessage({ type: 'stop_recording_from_sidebar' }, (response) => {
            if (response?.success) {
                setIsRecording(false);
                setLastSessionLink(response.sessionLink);

                // Clear link after 5 seconds
                setTimeout(() => {
                    setLastSessionLink(null);
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

    const handleLogout = () => {
        chrome.storage.local.set({ userAuthKey: '', currentUserId: '' }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error signing out:', chrome.runtime.lastError);
            } else {
                setIsRecording(false);
                setUserAuthKey(undefined);
            }
        });
    }

    console.log("All Projects:", projects);
    console.log("Selected Project ID:", selectedProjectId);
    console.log(
        "Project exists in options:",
        projects.some(p => p.projectId === selectedProjectId)
    );
    return (
        <div className="tc-sidebar">
            {!userAuthKey ? (
                <div className="tc-centered">
                    <Button
                        type="primary"
                        style={{ width: 200 }}
                        onClick={() => window.open('https://prod.testchimp.io/signin?flow=ext_auth')}
                    >
                        Login
                    </Button>
                </div>
            ) : (
                <div className="tc-panel">
                    {/* Project Select Panel */}
                    <div className="tc-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600' }}>Select Project</span>
                            <Tooltip title="Logout">
                                <Button icon={<LogoutOutlined />} type="text" onClick={handleLogout} />
                            </Tooltip>
                        </div>
                        {selectedProjectId && projects.length > 0 && (
                            <Select
                                value={selectedProjectId}
                                onChange={updateSelectedProject}
                                options={projects.map(p => ({
                                    label: p.name ?? 'Unnamed Project',
                                    value: p.projectId!,
                                }))}
                                dropdownStyle={{ zIndex: 9999 }}
                                getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                            />
                        )}
                    </div>

                    {/* Session Controls */}
                    <div className="tc-section">
                        <Checkbox checked={enableMindmap} onChange={(e) => setEnableMindmap(e.target.checked)}>
                            Enable Mindmap Builder
                        </Checkbox>
                        <Checkbox checked={enableBugCapture} onChange={(e) => setEnableBugCapture(e.target.checked)}>
                            Enable Bug Capture
                        </Checkbox>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                            {lastSessionLink && (
                                <a
                                    href={lastSessionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tc-session-link"
                                >
                                    View Session
                                </a>
                            )}
                            {isRecording ? (
                                <Button
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
                            ) : (
                                <Button
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
                        </div>
                    </div>

                    {/* Message Panel */}
                    <div className="tc-messages">
                        {messages.length === 0 ? (
                            <div style={{ color: '#aaa' }}>No messages yet</div>
                        ) : (
                            messages.map((msg, i) => <div key={i} style={{ marginBottom: 4 }}>{msg.text}</div>)
                        )}
                    </div>

                    {/* Footer Panel */}
                    <div className="tc-sticky-bottom">
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
                    </div>
                </div>
            )}

            <Modal
                title="Add Manual Bug"
                open={modalVisible}
                onOk={() => {
                    addManualBug(bugTitle, bugDescription, bugSeverity);
                    setModalVisible(false);
                    setBugTitle('');
                    setBugDescription('');
                }}
                onCancel={() => setModalVisible(false)}
            >
                <Input
                    placeholder="Title"
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    className="tc-input-margin"
                />
                <Input.TextArea
                    placeholder="Description"
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    className="tc-input-margin"
                />
                <Select
                    value={bugSeverity}
                    onChange={setBugSeverity}
                    className="tc-full-width"
                    options={[
                        { value: 'Low', label: 'Low' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'High', label: 'High' },
                    ]}
                />
            </Modal>
        </div>
    );
};