import React, { useState, useEffect } from 'react';
import { Input, Button, Alert, Typography } from 'antd';
import { InfoCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { upsertMindMapScreenState } from '../apiService';
import { ScreenState } from '../datas';
import { simplifyDOMForLLM } from '../html_utils';
import { getFilePathsFromDOM } from '../domUtils';
import { ScreenStateInputPanel } from './ScreenStateInputPanel';
import { UI_BASE_URL } from '../config';

const { Text } = Typography;

interface MindMapUpdateProps {
    initialScreen?: string;
    initialState?: string;
    onBack: () => void;
    onContinue: (screen: string, state: string) => void;
    onStartBuilder?: () => void;
}

export const MindMapUpdate: React.FC<MindMapUpdateProps> = ({
    initialScreen = '',
    initialState = '',
    onBack,
    onContinue,
    onStartBuilder,
}) => {
    console.log('MindMapUpdate props:', { initialScreen, initialState, onBack, onContinue, onStartBuilder });
    const [screen, setScreen] = useState(initialScreen);
    const [state, setState] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [notification, setNotification] = useState('');
    const [addedInfo, setAddedInfo] = useState<string | null>(null);

    const handleSnap = async () => {
        setLoading(true);
        setNotification('');
        try {
            const domSnapshot = JSON.stringify(simplifyDOMForLLM(document.body, { includeStyles: false }));
            const relatedFilePaths = getFilePathsFromDOM();
            const url = window.location.pathname + window.location.search + window.location.hash;
            const resp = await upsertMindMapScreenState({
                screenState: { name: screen, state },
                domSnapshot,
                url,
                relatedFilePaths,
            });
            setScreen(resp.screenState?.name || screen);
            setState(resp.screenState?.state || state);
            setSuccess(true);
            setDisabled(true);
            setNotification('Successfully added the screen state to the MindMap.');
            if (
                resp.testScenariosAdded !== undefined ||
                resp.elementGroupsAdded !== undefined ||
                resp.elementsAdded !== undefined
            ) {
                setAddedInfo(
                    `Test scenarios added: ${resp.testScenariosAdded ?? 0}, ` +
                    `Element groups added: ${resp.elementGroupsAdded ?? 0}, ` +
                    `Elements added: ${resp.elementsAdded ?? 0}`
                );
            } else {
                setAddedInfo(null);
            }
        } catch (e) {
            setNotification('Failed to add to MindMap. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (success && notification) {
            const timer = setTimeout(() => setNotification(''), 2500);
            return () => clearTimeout(timer);
        }
    }, [success, notification]);

    return (
        <div style={{ 
            padding: 24, 
            width: '100%',
            maxWidth: 420, 
            margin: '0 auto', 
            background: '#232323', 
            borderRadius: 12, 
            position: 'relative', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxSizing: 'border-box'
        }}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ position: 'absolute', left: 8, top: 8, padding: 0, color: '#fff', fontWeight: 500 }}>
                Back
            </Button>
            <div style={{ marginTop: 32 }} />
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
                <ScreenStateInputPanel
                    value={{ screen, state }}
                    onChange={({ screen: s, state: st }) => { setScreen(s); setState(st); }}
                    initialScreen={initialScreen}
                    initialState={initialState}
                    disabled={disabled}
                />
                {!success && (
                    <Alert
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        message={<span>TestChimp will capture the current screen information and add it to your app MindMap.</span>}
                        style={{ marginBottom: 12,marginTop: 12, background: '#232323', color: '#fff', border: '1px solid #444' }}
                    />
                )}
                {loading && (
                    <div className="loading-notification">
                        TestChimp is now analyzing the DOM structure to build a mental model about the current screen. This may take ~10-15 secs.
                    </div>
                )}
                <Button
                    type="primary"
                    block
                    className='secondary-button'
                    loading={loading}
                    style={{marginTop:"12px"}}
                    onClick={success ? undefined : handleSnap}
                    disabled={loading || !screen || !state || success}
                >
                    Snap to MindMap
                </Button>
                {notification && (
                    <div style={{ color: success ? '#52c41a' : '#ff7875', marginTop: 8, fontWeight: 500 }}>{notification}</div>
                )}
                {addedInfo && (
                    <div style={{ color: '#52c41a', marginTop: 4, fontWeight: 500 }}>{addedInfo}</div>
                )}
                {success && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, width: '100%' }}>
                        <Button
                            type="default"
                            style={{ fontWeight: 600, flex: 1 }}
                            onClick={() => onContinue(screen, state)}
                        >
                            Continue
                        </Button>
                        <Button
                            type="primary"
                            className='primary-button'
                            style={{ flex: 1 }}
                            onClick={() => window.open(`${UI_BASE_URL}/signin?flow=mindmap`, '_blank')}
                        >
                            View MindMap
                        </Button>
                    </div>
                )}
            </div>
            {/* Sticky MindMap Builder Panel */}
            {(() => {
                const showMindMapBuilderPanel = false; // Flag to control visibility
                if (!showMindMapBuilderPanel) return null;
                
                return (
                    <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: '#232323', padding: 16, zIndex: 10, borderTop: '1px solid #444', margin: '-24px -24px 0 -24px', borderRadius: '0 0 12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: 14 }}>
                            <InfoCircleOutlined />
                            <span>MindMap Builder allows you to capture your apps screen details along with navigation pathways</span>
                        </div>  <Button
                            type="primary"
                            className='primary-button'
                            style={{marginTop:"12px"}}
                            block
                            onClick={() => {
                                console.log('MindMapUpdate: Start MindMap Builder button clicked');
                                console.log('onStartBuilder prop:', onStartBuilder);
                                onStartBuilder?.();
                            }}
                        >
                            Start MindMap Builder
                        </Button>

                    </div>
                );
            })()}
        </div>
    );
}; 