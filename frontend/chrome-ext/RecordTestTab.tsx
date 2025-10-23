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
  const [testHistory, setTestHistory] = useState<Array<{
    testId: string;
    testName: string;
    projectId: string;
    createdAt: string;
  }>>([]);

      useEffect(() => {
        const handler = (msg: any) => {
          if (msg?.type === 'captured_step' && typeof msg.cmd === 'string') {
            setSteps(prev => [...prev, msg.cmd]);
          } else if (msg?.type === 'tc-step-capture-restored') {
            setSteps(msg.steps || []);
            setIsCapturing(true);
            setShowCreateForm(false);
          } else if (msg?.type === 'tc-navigation-detected') {
            // Check if we should restore capture state after navigation
            chrome.storage.local.get(['stepCaptureActive'], (result) => {
              if (result.stepCaptureActive) {
                // Trigger restoration in content script
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  const tabId = tabs[0]?.id;
                  if (tabId) {
                    chrome.tabs.sendMessage(tabId, { action: 'restore_step_capture' });
                  }
                });
              }
            });
          }
        };
        
        chrome.runtime.onMessage.addListener(handler);
        
        return () => {
          chrome.runtime.onMessage.removeListener(handler);
        };
      }, []);

  // Add navigation listener to trigger restoration after page changes
  useEffect(() => {
    const handleNavigation = () => {
      // Check if we should restore capture state after navigation
      chrome.storage.local.get(['stepCaptureActive'], (result) => {
        if (result.stepCaptureActive) {
          // Trigger restoration in content script
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
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
    chrome.storage.sync.get(['projectId'], (items) => {
      setProjectId(items.projectId);
    });
    
    // Load persisted step capture state
    chrome.storage.local.get(['stepCaptureActive', 'capturedSteps'], (result) => {
      if (result.stepCaptureActive) {
        // Restore steps if they exist, otherwise start with empty array
        const steps = result.capturedSteps || [];
        setSteps(steps);
        setIsCapturing(true);
        setShowCreateForm(false);
      } else {
        // Ensure clean state
        setSteps([]);
        setIsCapturing(false);
        setShowCreateForm(false);
      }
    });
    
    // Load test history
    chrome.storage.local.get(['testHistory'], (result) => {
      setTestHistory(result.testHistory || []);
    });
  }, []);

  const onStart = () => {
    chrome.runtime.sendMessage({ type: 'start_step_capture_from_sidebar' }, (resp) => {
      if (!chrome.runtime.lastError && resp?.success !== false) {
        setIsCapturing(true);
        setShowCreateForm(false);
        setCreatedTestId(null);
        setSteps([]);
      } else {
        message.error('Failed to start step capture. Ensure the extension has permissions.');
      }
    });
  };


  const onStop = () => {
    chrome.runtime.sendMessage({ type: 'stop_step_capture_from_sidebar' }, (resp) => {
      if (!chrome.runtime.lastError && resp?.success !== false) {
        setIsCapturing(false);
        setShowCreateForm(true);
        // Don't clear steps here - user might want to see them before creating test
      } else {
        message.error('Failed to stop step capture.');
      }
    });
  };

  const removeAt = (idx: number) => setSteps(prev => prev.filter((_, i) => i !== idx));
  const editAt = (idx: number, next: string) => setSteps(prev => prev.map((s, i) => (i === idx ? next : s)));

  const onCancel = () => {
    // Cancel: return to capturing state without losing history
    setIsCapturing(true);
    setShowCreateForm(false);
    setTestName('');
    setCreatedTestId(null);
    
    // Resume step capture in content script (without adding page.goto)
    chrome.runtime.sendMessage({ type: 'resume_step_capture_from_sidebar' }, (resp) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to resume step capture:', chrome.runtime.lastError);
        message.error('Failed to resume step capture.');
      }
    });
  };

  const onDiscard = () => {
    // Discard: forget the test and clear everything
    chrome.runtime.sendMessage({ type: 'stop_step_capture_from_sidebar' }, (resp) => {});
    
    // Clear local storage explicitly
    chrome.storage.local.remove(['stepCaptureActive', 'capturedSteps', 'currentCaptureUrl'], () => {});
    
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
      
      // Store test in history
      const testHistory = {
        testId: response.testId,
        testName: testName.trim(),
        projectId: projectId,
        createdAt: new Date().toISOString()
      };
      
      // Get existing history and add new test
      chrome.storage.local.get(['testHistory'], (result) => {
        const existingHistory = result.testHistory || [];
        const updatedHistory = [testHistory, ...existingHistory].slice(0, 10); // Keep only last 10
        chrome.storage.local.set({ testHistory: updatedHistory });
      });
      
      // Clear steps immediately after test creation
      setSteps([]);
      
      // Hide the form and show success message
      setShowCreateForm(false);
      
      // After 5 seconds, hide the success message and show start button
      setTimeout(() => {
        setCreatedTestId(null);
        setIsCapturing(false);
        setTestName('');
        
        // Reload test history to show the newly created test
        chrome.storage.local.get(['testHistory'], (result) => {
          setTestHistory(result.testHistory || []);
        });
      }, 5000);
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
        {!isCapturing && !showCreateForm ? (
          <>
            {/* Start Step Capture Button - Right aligned */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="primary" 
                size="small" 
                onClick={onStart}
                style={{ backgroundColor: '#72BDA3', borderColor: '#72BDA3', color: '#fff', marginTop: '20px' }}
              >
                Start Step Capture
              </Button>
            </div>
            
            {/* Test History - Left aligned in separate row */}
            {testHistory.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'left', paddingLeft: '8px' }}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text style={{ color: '#666', fontSize: '12px' }}>
                    Recent Tests:
                  </Typography.Text>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '200px', overflowY: 'auto' }}>
                  {testHistory.map((test, index) => (
                    <a
                      key={test.testId}
                      href={`https://prod.testchimp.io/smarttests?test_id=${test.testId}&project_id=${test.projectId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#fff',
                        fontSize: '12px',
                        textDecoration: 'underline',
                        padding: '2px 0',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ccc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#fff';
                      }}
                    >
                      {test.testName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : isCapturing ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              danger 
              size="small" 
              onClick={onStop}
              style={{ backgroundColor: '#ff6b65', borderColor: '#ff6b65', color: '#fff', marginTop: '20px' }}
            >
              End Step Capture
            </Button>
          </div>
        ) : null}

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
                style={{ 
                  backgroundColor: (!testName.trim() || isCreating) ? undefined : '#72BDA3', 
                  borderColor: (!testName.trim() || isCreating) ? undefined : '#72BDA3',
                  color: '#fff'
                }}
              >
                Create Smart Test
              </Button>
              <Button 
                size="small" 
                onClick={onDiscard}
                style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' }}
              >
                Discard
              </Button>
              <Button 
                size="small" 
                onClick={onCancel}
              >
                Cancel
              </Button>
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

      {/* Steps Display Area - Only show when there are steps or when capturing */}
      {(steps.length > 0 || isCapturing) && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', backgroundColor: '#2a2a2a', borderRadius: '6px', padding: '8px' }}>
          {steps.length === 0 && isCapturing ? (
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
      )}
    </div>
  );
};


