import React, { useEffect, useState, useRef } from 'react';
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
    message as antdMessage,
    Dropdown,
    Menu,
    Tabs
} from 'antd';
import { LogoutOutlined, BugOutlined, PartitionOutlined, PlusCircleOutlined, MessageOutlined, WarningOutlined, EditOutlined, ReloadOutlined, SendOutlined, AimOutlined, DragOutlined, BorderOutlined, InfoCircleOutlined, PlusOutlined, AppstoreOutlined, VideoCameraOutlined, ExperimentOutlined } from '@ant-design/icons';
import { UserInstructionMessage, ContextElementType, ContextElement } from './datas';
import { DevTab } from './DevTab';
import { RecordTab } from './RecordTab';
import { BugsTab } from './BugsTab';
import { ScenariosTab } from './ScenariosTab';
import { formatTimeAgo } from './time_utils';

const { Text } = Typography;
const { TextArea } = Input;

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



const MAX_RECENT_SESSIONS = 5;

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

    return (
        <div className="tc-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 8 }}>
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
                <div className="tc-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: 0 }}>
                    {/* Project Select Panel */}
                    <div className="tc-section" style={{ marginTop: 4, marginBottom: 4, padding: 8 }}>
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
                                <div style={{ marginTop: 6, marginLeft: 4, marginRight: 4 }}>
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
                                <DevTab />
                            </Tabs.TabPane>
                            <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><BugOutlined style={{ marginRight: 6 }} />Bugs</span>} key="bugs" style={{ height: '100%' }}>
                                <BugsTab />
                            </Tabs.TabPane>
                            <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><ExperimentOutlined style={{ marginRight: 6 }} />Scenarios</span>} key="scenarios" style={{ height: '100%' }}>
                                <ScenariosTab />
                            </Tabs.TabPane>
                            <Tabs.TabPane tab={<span style={{ fontSize: 14 }}><VideoCameraOutlined style={{ marginRight: 6 }} />Rec</span>} key="record" style={{ height: '100%' }}>
                                <RecordTab active={activeTabKey === 'record'} />
                            </Tabs.TabPane>
                        </Tabs>
                    </div>
                </div>
            )}
        </div>
    );
};