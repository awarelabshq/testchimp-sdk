import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, List, Space, Typography, message, Tooltip, Dropdown, MenuProps } from 'antd';
import { 
  EyeOutlined, 
  FontSizeOutlined, 
  FormOutlined, 
  CheckCircleOutlined, 
  NumberOutlined,
  PlayCircleOutlined,
  DownOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { StepItem } from './components/StepItem';
import { generateSmartTest } from './apiService';
import { getCapturedStepsWithContext, clearCapturedSteps, updateCapturedSteps } from './stepCaptureHandler';
import { AssertionMode, CapturedStep, getSelectedCommand } from './playwrightCodegen';
import { ensureStepsHaveAiSynthOption, hasUnfilledAiSteps } from './aiStepUtils';
import { UI_BASE_URL } from './config';

/** Ensure AI synth option on each step; persist once if storage was missing synth. */
function syncStepsFromStorage(raw: CapturedStep[]): CapturedStep[] {
  const ensured = ensureStepsHaveAiSynthOption(raw);
  const changed = ensured.some((s, i) => {
    const r = raw[i];
    if (!r) return true;
    return (s.commands?.length ?? 0) !== (r.commands?.length ?? 0);
  });
  if (changed) {
    updateCapturedSteps(ensured);
  }
  return ensured;
}

export const RecordTestTab: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [steps, setSteps] = useState<CapturedStep[]>([]);
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
    steps?: CapturedStep[];
  }>>([]);
  // Whether to ask backend/LLM to match existing code structure (POMs, env)
  const [enableReuse, setEnableReuse] = useState<boolean>(true);
  /** When set, pass to generateSmartTest to link the test to this scenario (from test planning "Record via extension") */
  const [scenarioIdForThisCapture, setScenarioIdForThisCapture] = useState<string | null>(null);

  // Assertion mode state
  const [assertionMode, setAssertionMode] = useState<AssertionMode>('normal');
  const [isAssertionSticky, setIsAssertionSticky] = useState<boolean>(true);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  // Hydrate scenario id from storage on mount: active (current capture) or pending (from web app "Record via extension")
  // Ensures scenario is used for all capture entry points: Start step capture, Continue from last test, Continue from prior test.
  useEffect(() => {
    chrome.storage.local.get(
      ['activeCaptureScenarioId', 'activeCaptureScenarioIdSetAt', 'pendingScenarioId', 'pendingScenarioIdReceivedAt'],
      (result) => {
        const activeId = result.activeCaptureScenarioId as string | undefined;
        const activeSetAt = result.activeCaptureScenarioIdSetAt as number | undefined;
        const MAX_AGE_ACTIVE_MS = 60 * 60 * 1000; // 1 hour
        if (activeId && typeof activeSetAt === 'number' && Date.now() - activeSetAt < MAX_AGE_ACTIVE_MS) {
          setScenarioIdForThisCapture(activeId);
          console.log('[RecordTestTab] Restored scenarioIdForThisCapture from activeCaptureScenarioId on mount:', activeId);
          return;
        }
        const pendingId = result.pendingScenarioId as string | undefined;
        const pendingReceivedAt = result.pendingScenarioIdReceivedAt as number | undefined;
        const THREE_MINS_MS = 3 * 60 * 1000;
        if (pendingId && typeof pendingReceivedAt === 'number' && Date.now() - pendingReceivedAt < THREE_MINS_MS) {
          setScenarioIdForThisCapture(pendingId);
          console.log('[RecordTestTab] Restored scenarioIdForThisCapture from pendingScenarioId on mount (will apply when capture starts):', pendingId);
        }
      }
    );
  }, []);

      useEffect(() => {
        const handler = (msg: any) => {
          if (msg?.type === 'captured_step') {
            // Handle captured step (though we load from storage now)
            console.log('[RecordTestTab] Captured step message received');
          } else if (msg?.type === 'tc-step-capture-restored') {
            // Load steps from storage (single source of truth) instead of from message
            chrome.storage.local.get(['capturedStepsWithContext'], (result) => {
              const capturedSteps = result.capturedStepsWithContext || [];
              setSteps(syncStepsFromStorage(capturedSteps));
            });
            setIsCapturing(true);
            setShowCreateForm(false);
            
            // Reset assertion mode to normal when restoring
            setAssertionMode('normal');
            setIsAssertionSticky(true);
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
          } else if (msg?.type === 'tc-assertion-mode-changed') {
            // Update sidebar UI when assertion mode changes in content script
            setAssertionMode(msg.mode);
            setIsAssertionSticky(msg.sticky);
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

  // Listen for assertion mode changes from content script
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'tc-assertion-mode-changed') {
        setAssertionMode(event.data.mode);
        setIsAssertionSticky(event.data.sticky);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  useEffect(() => {
    chrome.storage.sync.get(['projectId'], (items) => {
      setProjectId(items.projectId);
    });
    
    // Load persisted step capture state (only capture status, not steps)
    chrome.storage.local.get(['stepCaptureActive'], (result) => {
      console.log('[RecordTestTab] Loading sidebar state from storage:', result);
      if (result.stepCaptureActive) {
        setIsCapturing(true);
        setShowCreateForm(false);
        // Don't reset assertion mode here - let the restoration message handle it
        // Don't load steps here - let the storage change listener handle it
        console.log('[RecordTestTab] Capture is active, steps will be loaded by storage change listener');
      } else {
        // Ensure clean state
        setSteps([]);
        setIsCapturing(false);
        setShowCreateForm(false);
        setAssertionMode('normal');
        setIsAssertionSticky(true);
      }
    });
    
    // Load test history
    chrome.storage.local.get(['testHistory'], (result) => {
      setTestHistory(result.testHistory || []);
    });

    // Listen for storage changes to update sidebar when steps are modified
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.capturedStepsWithContext) {
        const capturedSteps = changes.capturedStepsWithContext.newValue || [];
        
        // Only update if the steps actually changed
        setSteps(prevSteps => {
          if (prevSteps.length !== capturedSteps.length || 
              !prevSteps.every((step, index) => 
                step.id === capturedSteps[index]?.id && 
                step.selectedCommandIndex === capturedSteps[index]?.selectedCommandIndex
              )) {
            return syncStepsFromStorage(capturedSteps);
          } else {
            return prevSteps;
          }
        });
      }
    };


    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Load initial steps when capture becomes active - but only if we don't have steps yet
  useEffect(() => {
    if (isCapturing && steps.length === 0) {
      chrome.storage.local.get(['capturedStepsWithContext'], (result) => {
        const capturedSteps = result.capturedStepsWithContext || [];
        setSteps(syncStepsFromStorage(capturedSteps));
      });
    }
  }, [isCapturing, steps.length]); // Only load if capturing AND no steps loaded yet

  // Applies pending scenario (from web app "Record via extension") and persists for generateSmartTest; used by "Start step capture" / "Start New Test".
  const startNewCapture = () => {
    chrome.storage.local.get(['pendingScenarioId', 'pendingScenarioIdReceivedAt'], (result) => {
      const pendingId = result.pendingScenarioId as string | undefined;
      const receivedAt = result.pendingScenarioIdReceivedAt as number | undefined;
      const THREE_MINS_MS = 3 * 60 * 1000;
      if (pendingId && typeof receivedAt === 'number' && (Date.now() - receivedAt) < THREE_MINS_MS) {
        setScenarioIdForThisCapture(pendingId);
        // Persist so we still have it if extension UI remounts (e.g. popup closed during recording)
        chrome.storage.local.set(
          { activeCaptureScenarioId: pendingId, activeCaptureScenarioIdSetAt: Date.now() },
          () => {
            chrome.storage.local.remove(['pendingScenarioId', 'pendingScenarioIdReceivedAt']);
          }
        );
        console.log('[RecordTestTab] Using scenario for this capture: scenarioId=', pendingId, ', clearing stored pending scenario.');
      } else {
        setScenarioIdForThisCapture(null);
        console.log('[RecordTestTab] No valid pending scenario for recording (expired or missing).');
      }
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
    });
  };

  // Same scenario check as startNewCapture; used by "Continue from Last Test" and continue button on prior test list.
  const continueCapture = (initialSteps: CapturedStep[]) => {
    if (!initialSteps || initialSteps.length === 0) {
      message.warning('No steps available to continue from.');
      return;
    }

    chrome.storage.local.get(['pendingScenarioId', 'pendingScenarioIdReceivedAt'], (result) => {
      const pendingId = result.pendingScenarioId as string | undefined;
      const receivedAt = result.pendingScenarioIdReceivedAt as number | undefined;
      const THREE_MINS_MS = 3 * 60 * 1000;
      if (pendingId && typeof receivedAt === 'number' && (Date.now() - receivedAt) < THREE_MINS_MS) {
        setScenarioIdForThisCapture(pendingId);
        chrome.storage.local.set(
          { activeCaptureScenarioId: pendingId, activeCaptureScenarioIdSetAt: Date.now() },
          () => {
            chrome.storage.local.remove(['pendingScenarioId', 'pendingScenarioIdReceivedAt']);
          }
        );
        console.log('[RecordTestTab] Using scenario for this capture (continue): scenarioId=', pendingId, ', clearing stored pending scenario.');
      } else {
        setScenarioIdForThisCapture(null);
        console.log('[RecordTestTab] No valid pending scenario for recording (expired or missing).');
      }
      chrome.runtime.sendMessage({
        type: 'start_step_capture_from_sidebar',
        initialSteps: initialSteps
      }, (resp) => {
        if (!chrome.runtime.lastError && resp?.success !== false) {
          setIsCapturing(true);
          setShowCreateForm(false);
          setCreatedTestId(null);
          // Steps will be loaded via storage listener/initial load
        } else {
          message.error('Failed to continue step capture: ' + (chrome.runtime.lastError?.message || 'Unknown error'));
        }
      });
    });
  };

  const onStart = () => {
    startNewCapture();
  };

  const startOptions: MenuProps['items'] = [
    {
      key: 'new',
      label: 'Start New Test',
      icon: <PlayCircleOutlined />,
      onClick: startNewCapture
    },
    {
      key: 'continue',
      label: 'Continue from Last Test',
      icon: <HistoryOutlined />,
      disabled: testHistory.length === 0 || !testHistory[0].steps || testHistory[0].steps.length === 0,
      onClick: () => {
        if (testHistory.length > 0 && testHistory[0].steps) {
          continueCapture(testHistory[0].steps);
        }
      }
    }
  ];


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

  const removeAt = async (idx: number) => {
    // Get current steps from single source of truth
    const currentSteps = ensureStepsHaveAiSynthOption(await getCapturedStepsWithContext());
    const updatedSteps = currentSteps.filter((_, i) => i !== idx);
    
    // Update single source of truth
    updateCapturedSteps(updatedSteps);
    
    // Update UI state
    setSteps(updatedSteps);
  };
  
  const editAt = async (idx: number, newSelectedIndex: number) => {
    // Get current steps from single source of truth
    const currentSteps = ensureStepsHaveAiSynthOption(await getCapturedStepsWithContext());
    const updatedSteps = currentSteps.map((step, i) => 
      i === idx ? { ...step, selectedCommandIndex: newSelectedIndex } : step
    );
    
    // Update single source of truth
    updateCapturedSteps(updatedSteps);
    
    // Update UI state
    setSteps(updatedSteps);
  };
  
  const editCommandText = async (idx: number, newCommand: string) => {
    // Get current steps from single source of truth
    const currentSteps = ensureStepsHaveAiSynthOption(await getCapturedStepsWithContext());
    const updatedSteps = currentSteps.map((step, i) => {
      if (i === idx) {
        // Update the command at the selected index
        const newCommands = [...step.commands];
        newCommands[step.selectedCommandIndex] = newCommand;
        return { ...step, commands: newCommands };
      }
      return step;
    });
    
    // Update single source of truth
    updateCapturedSteps(updatedSteps);
    
    // Update UI state
    setSteps(updatedSteps);
  };

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

  // Assertion mode control functions
  const handleAssertionModeClick = (mode: AssertionMode) => {
    const now = Date.now();
    const isDoubleClick = now - lastClickTime < 300; // 300ms double-click threshold
    
    setLastClickTime(now);
    
    if (mode === 'normal') {
      // Normal mode is always sticky
      setAssertionMode('normal');
      setIsAssertionSticky(true);
    } else {
      if (isDoubleClick) {
        // Double click: sticky mode
        setAssertionMode(mode);
        setIsAssertionSticky(true);
      } else {
        // Single click: one-shot mode
        setAssertionMode(mode);
        setIsAssertionSticky(false);
      }
    }
    
    // Send mode change to content script
    chrome.runtime.sendMessage({ 
      type: 'set_assertion_mode', 
      mode, 
      sticky: mode === 'normal' ? true : isDoubleClick 
    });
  };

  // Assertion mode button configuration
  const assertionButtons = [
    { 
      mode: 'normal' as AssertionMode, 
      icon: <PlayCircleOutlined />, 
      tooltip: 'Normal Mode (Actions)',
      color: assertionMode === 'normal' ? '#1890ff' : undefined
    },
    { 
      mode: 'assertVisible' as AssertionMode, 
      icon: <EyeOutlined />, 
      tooltip: 'Assert Visible',
      color: assertionMode === 'assertVisible' ? '#52c41a' : undefined
    },
    { 
      mode: 'assertText' as AssertionMode, 
      icon: <FontSizeOutlined />, 
      tooltip: 'Assert Text',
      color: assertionMode === 'assertText' ? '#52c41a' : undefined
    },
    { 
      mode: 'assertValue' as AssertionMode, 
      icon: <FormOutlined />, 
      tooltip: 'Assert Value',
      color: assertionMode === 'assertValue' ? '#52c41a' : undefined
    },
    { 
      mode: 'assertEnabled' as AssertionMode, 
      icon: <CheckCircleOutlined />, 
      tooltip: 'Assert Enabled/Disabled',
      color: assertionMode === 'assertEnabled' ? '#52c41a' : undefined
    },
    { 
      mode: 'assertCount' as AssertionMode, 
      icon: <NumberOutlined />, 
      tooltip: 'Assert Count',
      color: assertionMode === 'assertCount' ? '#52c41a' : undefined
    }
  ];

  const onCreateSmartTest = async () => {
    if (!testName.trim() || !projectId) return;
    const stepsForCreate = ensureStepsHaveAiSynthOption(await getCapturedStepsWithContext());
    if (hasUnfilledAiSteps(stepsForCreate)) return;
    
    setIsCreating(true);
    try {
      // Resolve scenario id from state or storage (storage survives popup close/reopen)
      let scenarioIdToUse = scenarioIdForThisCapture;
      if (scenarioIdToUse == null) {
        scenarioIdToUse = await new Promise<string | null>((resolve) => {
          chrome.storage.local.get(['activeCaptureScenarioId', 'activeCaptureScenarioIdSetAt'], (r) => {
            const id = r.activeCaptureScenarioId as string | undefined;
            const setAt = r.activeCaptureScenarioIdSetAt as number | undefined;
            const MAX_AGE_MS = 60 * 60 * 1000;
            if (id && typeof setAt === 'number' && (Date.now() - setAt) < MAX_AGE_MS) {
              resolve(id);
            } else {
              resolve(null);
            }
          });
        });
        if (scenarioIdToUse) {
          console.log('[RecordTestTab] Using scenarioId from storage for generateSmartTest:', scenarioIdToUse);
        }
      }
      if (scenarioIdToUse) {
        console.log('[RecordTestTab] Passing scenarioId to generateSmartTest:', scenarioIdToUse);
      }
      // Get captured steps with context for new async path (ensure synth options applied)
      const capturedStepsWithContext = ensureStepsHaveAiSynthOption(await getCapturedStepsWithContext());
      console.log('[RecordTestTab] Captured steps count:', capturedStepsWithContext.length);
      console.log('[RecordTestTab] Captured steps:', capturedStepsWithContext);
      
      const response = await generateSmartTest({
        testName: testName.trim(),
        capturedSteps: capturedStepsWithContext.map(step => ({
          id: step.id,
          command: getSelectedCommand(step),  // Use selected command from array
          kind: step.kind,
          timestampMillis: step.timestamp,  // Map timestamp to timestampMillis
          domContext: step.context?.domContext,
          pageUrl: step.context?.pageUrl,
          pageTitle: step.context?.pageTitle,
          element: step.context?.element,
        })),  // Rich context for LLM processing
        projectId: projectId,
        enableReuse: enableReuse,
        ...(scenarioIdToUse ? { scenarioId: scenarioIdToUse } : {}),
      });
      setCreatedTestId(response.testId);
      if (scenarioIdToUse) {
        console.log('[RecordTestTab] Smart test created and linked to scenario; clearing scenarioIdForThisCapture and storage.');
        setScenarioIdForThisCapture(null);
        chrome.storage.local.remove(['activeCaptureScenarioId', 'activeCaptureScenarioIdSetAt']);
      }
      message.success('Smart test created successfully!');
      
      // Store test in history
      const testHistory = {
        testId: response.testId,
        testName: testName.trim(),
        projectId: projectId,
        createdAt: new Date().toISOString(),
        steps: capturedStepsWithContext // Store captured steps in history
      };
      
      // Get existing history and add new test
      chrome.storage.local.get(['testHistory'], (result) => {
        const existingHistory = result.testHistory || [];
        const updatedHistory = [testHistory, ...existingHistory].slice(0, 10); // Keep only last 10
        chrome.storage.local.set({ testHistory: updatedHistory });
      });
      
      // Clear steps and captured steps immediately after test creation
      setSteps([]);
      clearCapturedSteps();
      
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      {/* Control Area - Always at the top */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        {!isCapturing && !showCreateForm ? (
          <>
            {/* Start Step Capture Button - Centered Split Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <Button 
                type="primary" 
                size="small" 
                onClick={startNewCapture}
                style={{ 
                  backgroundColor: '#72BDA3', 
                  borderColor: '#72BDA3', 
                  color: '#fff', 
                  borderTopRightRadius: 0, 
                  borderBottomRightRadius: 0,
                  marginRight: '1px'
                }}
              >
                Start Step Capture
              </Button>
              <Dropdown menu={{ items: startOptions }} trigger={['click']}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<DownOutlined />}
                  style={{ 
                    backgroundColor: '#72BDA3', 
                    borderColor: '#72BDA3', 
                    color: '#fff', 
                    borderTopLeftRadius: 0, 
                    borderBottomLeftRadius: 0,
                    width: '24px',
                    padding: 0
                  }}
                />
              </Dropdown>
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
                    <div key={test.testId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
                      <a
                        href={`${UI_BASE_URL}/smarttests?test_id=${test.testId}&project_id=${test.projectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#fff',
                          fontSize: '12px',
                          textDecoration: 'underline',
                          padding: '2px 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
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
                      
                      {/* Continue from this test button */}
                      {test.steps && test.steps.length > 0 && (
                        <Tooltip title="Continue from this test">
                          <Button
                            type="text"
                            size="small"
                            icon={<HistoryOutlined style={{ fontSize: '12px' }} />}
                            onClick={() => continueCapture(test.steps!)}
                            style={{ 
                              color: '#aaa', 
                              width: '24px', 
                              height: '24px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#72BDA3'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                          />
                        </Tooltip>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : isCapturing ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
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

        {/* Assertion Mode Control Panel - Only show when capturing */}
        {isCapturing && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8, 
            marginBottom: 12,
            padding: '8px 0',
            borderBottom: '1px solid #333',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography.Text style={{ color: '#aaa', fontSize: '12px', minWidth: 'fit-content' }}>
                Mode:
              </Typography.Text>
              {assertionButtons.map((button) => (
                <Tooltip key={button.mode} title={button.tooltip}>
                  <Button
                    size="small"
                    icon={button.icon}
                    onClick={() => handleAssertionModeClick(button.mode)}
                    style={{
                      backgroundColor: button.color || 'transparent',
                      borderColor: button.color || '#555',
                      color: button.color ? '#fff' : '#aaa',
                      minWidth: '32px',
                      height: '28px'
                    }}
                  />
                </Tooltip>
              ))}
            </div>
            
            {/* Info label */}
            <div style={{ 
              fontSize: '11px', 
              color: '#888', 
              lineHeight: '1.3',
              marginTop: '4px',
              textAlign: 'center'
            }}>
              Single click: one-shot mode • Double click: sticky mode • Click Normal to return to actions
            </div>
          </div>
        )}

        {showCreateForm && !isCapturing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input placeholder="Name your test" value={testName} onChange={e => setTestName(e.target.value)} size="small" />
            {/* Match existing code structure toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                id="tc-match-structure"
                checked={enableReuse}
                onChange={e => setEnableReuse(e.target.checked)}
                style={{ margin: 0 }}
              />
              <label
                htmlFor="tc-match-structure"
                style={{ fontSize: 12, color: '#ddd', cursor: 'pointer' }}
              >
                Match existing code structure
              </label>
              <Tooltip
                title="When checked, the generated Smart Test will try to use your existing page objects and environment variables instead of standalone code."
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '1px solid #555',
                    fontSize: 10,
                    color: '#aaa',
                  }}
                >
                  i
                </span>
              </Tooltip>
            </div>
            <Space>
              <Tooltip
                title={hasUnfilledAiSteps(steps) ? 'There are AI steps that need descriptions set.' : undefined}
              >
                <span>
                  <Button 
                    type="primary" 
                    size="small"
                    disabled={!testName.trim() || isCreating || hasUnfilledAiSteps(steps)} 
                    loading={isCreating}
                    onClick={onCreateSmartTest}
                    style={{ 
                      backgroundColor: (!testName.trim() || isCreating || hasUnfilledAiSteps(steps)) ? undefined : '#72BDA3', 
                      borderColor: (!testName.trim() || isCreating || hasUnfilledAiSteps(steps)) ? undefined : '#72BDA3',
                      color: '#fff'
                    }}
                  >
                    Create Smart Test
                  </Button>
                </span>
              </Tooltip>
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
              href={`${UI_BASE_URL}/smarttests?test_id=${createdTestId}&project_id=${projectId}`}
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
                  <StepItem 
                    key={idx} 
                    index={idx} 
                    commands={item.commands} 
                    selectedIndex={item.selectedCommandIndex} 
                    onChange={nextIndex => editAt(idx, nextIndex)}
                    onEdit={newCommand => editCommandText(idx, newCommand)}
                    onRemove={() => removeAt(idx)} 
                  />
                </List.Item>
              )}
              style={{ backgroundColor: 'transparent', padding: 0 }}
            />
          ) : null}
        </div>
      )}
      {/* Status bar: always at the bottom */}
      <div className={"fade-in-slide-up"} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', background: '#181818', padding: '8px 4px 4px 4px', borderRadius: 0, borderTop: '1px solid #222', minHeight: 22, fontSize: 12, marginTop: 'auto', flexShrink: 0 }}>
        <a href="https://testchimp.io/documentation-chrome-extension/" target="_blank" rel="noopener noreferrer" style={{ color: '#aaa', fontSize: 12, textDecoration: 'none' }}>v1.0.19</a>
      </div>
    </div>
  );
};


