import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, List, Space, Typography, message } from 'antd';
import { StepItem } from './components/StepItem';
import { generateSmartTest } from './apiService';

export const RecordTestTab: React.FC = () => {
  console.log('[RecordTestTab] ===== COMPONENT RENDERED =====');
  const [isCapturing, setIsCapturing] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [testName, setTestName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>();

  useEffect(() => {
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
      } else if (msg?.type === 'tc-navigation-detected') {
        console.log('[RecordTestTab] ===== NAVIGATION DETECTED VIA MESSAGE =====');
        // Check if we should restore capture state after navigation
        chrome.storage.local.get(['stepCaptureActive'], (result) => {
          if (result.stepCaptureActive) {
            console.log('[RecordTestTab] Active capture detected after navigation, triggering restoration');
            // Trigger restoration in content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const tabId = tabs[0]?.id;
              if (tabId) {
                console.log('[RecordTestTab] Sending restore_step_capture after navigation');
                chrome.tabs.sendMessage(tabId, { action: 'restore_step_capture' });
              }
            });
          }
        });
      }
    };
    
    console.log('[RecordTestTab] Setting up message listener');
    chrome.runtime.onMessage.addListener(handler);
    
    return () => {
      console.log('[RecordTestTab] Removing message listener');
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, []);

  // Add navigation listener to trigger restoration after page changes
  useEffect(() => {
    const handleNavigation = () => {
      console.log('[RecordTestTab] ===== NAVIGATION DETECTED =====');
      // Check if we should restore capture state after navigation
      chrome.storage.local.get(['stepCaptureActive'], (result) => {
        if (result.stepCaptureActive) {
          console.log('[RecordTestTab] Active capture detected after navigation, triggering restoration');
          // Trigger restoration in content script
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
              console.log('[RecordTestTab] Sending restore_step_capture after navigation');
              chrome.tabs.sendMessage(tabId, { action: 'restore_step_capture' });
            }
          });
        }
      });
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('pushstate', handleNavigation);
    window.addEventListener('replacestate', handleNavigation);
    
    // Also listen for hash changes
    window.addEventListener('hashchange', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('pushstate', handleNavigation);
      window.removeEventListener('replacestate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  useEffect(() => {
    console.log('[RecordTestTab] ===== USEEFFECT RUNNING =====');
    chrome.storage.sync.get(['projectId'], (items) => {
      setProjectId(items.projectId);
    });
    
    // Load persisted step capture state
    console.log('[RecordTestTab] ===== LOADING PERSISTED STATE =====');
    chrome.storage.local.get(['stepCaptureActive', 'capturedSteps'], (result) => {
      console.log('[RecordTestTab] Checking persisted state:', result);
      console.log('[RecordTestTab] stepCaptureActive:', result.stepCaptureActive);
      console.log('[RecordTestTab] capturedSteps:', result.capturedSteps);
      if (result.stepCaptureActive) {
        console.log('[RecordTestTab] Active capture state found, restoring...');
        // Restore steps if they exist, otherwise start with empty array
        const steps = result.capturedSteps || [];
        setSteps(steps);
        setIsCapturing(true);
        setShowCreateForm(false);
        
        // Trigger restoration via background script
        console.log('[RecordTestTab] Sending restore_step_capture via background script');
        chrome.runtime.sendMessage({ type: 'restore_step_capture_from_sidebar' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[RecordTestTab] Error sending restore message:', chrome.runtime.lastError.message);
          } else {
            console.log('[RecordTestTab] Restore message sent successfully:', response);
          }
        });
      } else {
        console.log('[RecordTestTab] No active capture state found, starting fresh');
        // Ensure clean state
        setSteps([]);
        setIsCapturing(false);
        setShowCreateForm(false);
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

  // Test function to manually trigger restoration
  const onTestRestore = () => {
    console.log('[RecordTestTab] ===== MANUAL RESTORE TEST =====');
    chrome.runtime.sendMessage({ type: 'restore_step_capture_from_sidebar' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[RecordTestTab] Error sending restore message:', chrome.runtime.lastError.message);
      } else {
        console.log('[RecordTestTab] Restore message sent successfully:', response);
      }
    });
  };

  // Test function to check storage directly
  const onTestStorage = () => {
    console.log('[RecordTestTab] ===== STORAGE TEST =====');
    chrome.storage.local.get(['stepCaptureActive', 'capturedSteps'], (result) => {
      console.log('[RecordTestTab] Direct storage check:', result);
    });
  };

  const onStop = () => {
    console.log('[RecordTestTab] Stopping step capture');
    chrome.runtime.sendMessage({ type: 'stop_step_capture_from_sidebar' }, (resp) => {
      if (!chrome.runtime.lastError && resp?.success !== false) {
        console.log('[RecordTestTab] Step capture stopped successfully');
        setIsCapturing(false);
        setShowCreateForm(true);
        // Don't clear steps here - user might want to see them before creating test
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
    
    // Clear local storage explicitly
    chrome.storage.local.remove(['stepCaptureActive', 'capturedSteps', 'currentCaptureUrl'], () => {
      console.log('[RecordTestTab] Cleared storage during reset');
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
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                onClick={onStart}
                style={{ backgroundColor: '#72BDA3', borderColor: '#72BDA3', color: '#fff', marginTop: '20px' }}
              >
                Start Step Capture
              </Button>
              <Button 
                size="small" 
                onClick={onTestRestore}
                style={{ marginTop: '20px' }}
              >
                Test Restore
              </Button>
              <Button 
                size="small" 
                onClick={onTestStorage}
                style={{ marginTop: '20px' }}
              >
                Test Storage
              </Button>
            </div>
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


