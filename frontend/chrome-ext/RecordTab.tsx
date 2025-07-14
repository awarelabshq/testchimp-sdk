import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { formatTimeAgo } from './time_utils';

export const RecordTab = ({ active }: { active?: boolean }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startingRecording, setStartingRecording] = useState(false);
    const [recentSessions, setRecentSessions] = useState<{ url: string; timestamp: number }[]>([]);

    useEffect(() => {
        chrome.storage.local.get(['recordingInProgress'], (localItems) => {
            console.log("Setting is recording to " + !!localItems.recordingInProgress);
            setIsRecording(!!localItems.recordingInProgress);
        });
    }, []);


    useEffect(() => {
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

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRecording) {
            const start = Date.now();
            setElapsedSeconds(0);
            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    useEffect(() => {
        fetchRecentSessions();
    }, []);

    const fetchRecentSessions = () => {
        chrome.storage.local.get(['recentSessions'], (localItems) => {
            const sessions = localItems.recentSessions || [];
            sessions.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setRecentSessions(sessions);
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const startRecording = async () => {
        setStartingRecording(true);
        console.log('[RecordTab] startRecording: sending start_recording_from_sidebar');
        chrome.runtime.sendMessage({ type: 'start_recording_from_sidebar' }, (response) => {
            console.log('[RecordTab] startRecording: response:', response);
            if (response?.success) {
                setIsRecording(true);
                setTimeout(fetchRecentSessions, 1000); // Refresh after a short delay
            } else {
                alert('Failed to start recording. Please refresh the page and try again.');
            }
            setStartingRecording(false);
        });
    };

    const stopRecording = () => {
        console.log('[RecordTab] stopRecording: sending stop_recording_from_sidebar');
        chrome.runtime.sendMessage({ type: 'stop_recording_from_sidebar' }, (response) => {
            console.log('[RecordTab] stopRecording: response:', response);
            if (response?.success) {
                setIsRecording(false);
                setTimeout(fetchRecentSessions, 1000); // Refresh after a short delay
            } else {
                alert('Failed to stop recording. Please refresh the page and try again.');
            }
        });
    };

    useEffect(() => {
        console.log('[RecordTab] isRecording state changed:', isRecording);
    }, [isRecording]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {isRecording ? `Recording: ${formatDuration(elapsedSeconds)}` : ''}
                </span>
                <div className={"fade-in"} style={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
                    {!isRecording ? (
                        <Button type="primary" onClick={startRecording} loading={startingRecording} style={{ backgroundColor: '#72BDA3', borderColor: '#72BDA3', color: '#fff', marginTop: "12px" }}>
                            Start Recording
                        </Button>
                    ) : (
                        <Button onClick={stopRecording} style={{ backgroundColor: '#ff6b65', borderColor: '#ff6b65', color: '#fff', marginTop: "12px" }}>
                            Stop Recording
                        </Button>
                    )}
                </div>
            </div>
            <div style={{ marginTop: 16, width: '100%' }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Recent Sessions</div>
                {recentSessions.length === 0 ? (
                    <div style={{ color: '#aaa' }}>No recent sessions</div>
                ) : (
                    recentSessions.map((session, i) => (
                        <a
                            key={i}
                            href={session.url}
                            target="_blank"
                            className={"fade-in-slide-down"}
                            rel="noopener noreferrer"
                            style={{ display: 'block', color: '#72BDA3', marginBottom: 4 }}
                        >
                            {formatTimeAgo(session.timestamp)}
                        </a>
                    ))
                )}
            </div>
        </div>
    );
}; 