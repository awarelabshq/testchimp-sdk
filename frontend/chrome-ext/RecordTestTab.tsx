import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, List, Space, Typography, message } from 'antd';
import { StepItem } from './components/StepItem';
import { generateSmartTest } from './apiService';

export const RecordTestTab: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [testName, setTestName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>();

  useEffect(() => {
    let messageListenerAdded = false;
    
    const handler = (msg: any) => {
      if (msg?.type === 'captured_step' && typeof msg.cmd === 'string') {
        console.log('[RecordTestTab] Received captured step:', msg.cmd, 'at', Date.now());
        setSteps(prev => {
          console.log('[RecordTestTab] Adding step, current count:', prev.length);
          return [...prev, msg.cmd];
        });
      } else if (msg?.type === 'tc-step-capture-restored') {
        console.log('[RecordTestTab] Step capture restored with steps:', msg.steps);
        setSteps(msg.steps || []);
        setIsCapturing(true);
        setShowCreateForm(false);
      }
    };
    
    if (!messageListenerAdded) {
      console.log('[RecordTestTab] Setting up message listener');
      chrome.runtime.onMessage.addListener(handler);
      messageListenerAdded = true;
    }
    
    return () => {
      console.log('[RecordTestTab] Removing message listener');
      chrome.runtime.onMessage.removeListener(handler);
      messageListenerAdded = false;
    };
  }, []);

  useEffect(() => {
    chrome.storage.sync.get(['projectId'], (items) => {
      setProjectId(items.projectId);
    });
    
    // Load persisted step capture state
    chrome.storage.local.get(['stepCaptureActive', 'capturedSteps'], (result) => {
      if (result.stepCaptureActive && result.capturedSteps) {
        console.log('[RecordTestTab] Restoring persisted state:', result.capturedSteps);
        setSteps(result.capturedSteps);
        setIsCapturing(true);
        setShowCreateForm(false);
        
        // Trigger restoration in content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: 'restore_step_capture' });
          }
        });
      }
    });
  }, []);

  const onStart = () => {
    console.log('[RecordTestTab] Starting step capture');
    chrome.runtime.sendMessage({ type: 'start_step_capture_from_sidebar' }, (resp) => {
      if (!chrome.runtime.lastError && resp?.success !== false) {
        console.log('[RecordTestTab] Step capture started successfully');
        setIsCapturing(true);
        setShowCreateForm(false);
        setCreatedTestId(null);
        setSteps([]);
      } else {
        console.error('[RecordTestTab] Failed to start step capture:', chrome.runtime.lastError);
        message.error('Failed to start step capture. Ensure the extension has permissions.');
      }
    });
  };

  const onStop = () => {
    console.log('[RecordTestTab] Stopping step capture');
    chrome.runtime.sendMessage({ type: 'stop_step_capture_from_sidebar' }, (resp) => {
      if (!chrome.runtime.lastError && resp?.success !== false) {
        console.log('[RecordTestTab] Step capture stopped successfully');
        setIsCapturing(false);
        setShowCreateForm(true);
      } else {
        console.error('[RecordTestTab] Failed to stop step capture:', chrome.runtime.lastError);
        message.error('Failed to stop step capture.');
      }
    });
  };

  const removeAt = (idx: number) => setSteps(prev => prev.filter((_, i) => i !== idx));
  const editAt = (idx: number, next: string) => setSteps(prev => prev.map((s, i) => (i === idx ? next : s)));

  const resetAll = () => {
    console.log('[RecordTestTab] Resetting all state');
    // Force stop step capture regardless of state
    chrome.runtime.sendMessage({ type: 'stop_step_capture_from_sidebar' }, (resp) => {
      console.log('[RecordTestTab] Stopped step capture during reset');
    });
    setSteps([]);
    setTestName('');
    setShowCreateForm(false);
    setIsCapturing(false);
    setCreatedTestId(null);
  };

  const onCreateSmartTest = async () => {
    if (!testName.trim() || !projectId) return;
    
    setIsCreating(true);
    try {
      const response = await generateSmartTest({
        testName: testName.trim(),
        playwrightSteps: steps,
        projectId: projectId,
      });
      setCreatedTestId(response.testId);
      message.success('Smart test created successfully!');
      // Reset to original state after successful creation
      setTimeout(() => resetAll(), 2000); // Show success message for 2 seconds then reset
    } catch (error) {
      message.error(`Failed to create smart test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Control Area - Always at the top */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {!isCapturing && !showCreateForm ? (
            <Button 
              type="primary" 
              size="small" 
              onClick={onStart}
              style={{ backgroundColor: '#72BDA3', borderColor: '#72BDA3', color: '#fff', marginTop: '20px', marginRight: '12px' }}
            >
              Start Step Capture
            </Button>
          ) : isCapturing ? (
            <Button 
              danger 
              size="small" 
              onClick={onStop}
              style={{ backgroundColor: '#ff6b65', borderColor: '#ff6b65', color: '#fff', marginTop: '20px', marginRight: '12px' }}
            >
              End Step Capture
            </Button>
          ) : null}
        </div>

        {showCreateForm && !isCapturing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input placeholder="Name your test" value={testName} onChange={e => setTestName(e.target.value)} size="small" />
            <Space>
              <Button 
                type="primary" 
                size="small"
                disabled={!testName.trim() || isCreating} 
                loading={isCreating}
                onClick={onCreateSmartTest}
              >
                Create Smart Test
              </Button>
              <Button size="small" onClick={resetAll}>Cancel</Button>
            </Space>
          </div>
        )}

        {createdTestId && projectId && (
          <div style={{ padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
            <Typography.Text strong style={{ color: '#52c41a' }}>Smart Test Created!</Typography.Text>
            <br />
            <a 
              href={`https://prod.testchimp.io/smarttests?test_id=${createdTestId}&project_id=${projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1890ff' }}
            >
              View Smart Test →
            </a>
          </div>
        )}
      </div>

      {/* Steps Display Area - Scrollable content below controls */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', backgroundColor: '#2a2a2a', borderRadius: '6px', padding: '8px' }}>
        {steps.length === 0 && !isCapturing && !showCreateForm ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>
            Click "Start Step Capture" to begin recording user actions.
          </div>
        ) : steps.length === 0 && isCapturing ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>
            Capturing steps... Perform actions on the page.
          </div>
        ) : steps.length > 0 ? (
          <List
            size="small"
            dataSource={steps}
            renderItem={(item, idx) => (
              <List.Item style={{ backgroundColor: 'transparent', border: 'none', padding: '4px 0' }}>
                <StepItem key={idx} index={idx} value={item} onChange={next => editAt(idx, next)} onRemove={() => removeAt(idx)} />
              </List.Item>
            )}
            style={{ backgroundColor: 'transparent', padding: 0 }}
          />
        ) : null}
      </div>
    </div>
  );
};


