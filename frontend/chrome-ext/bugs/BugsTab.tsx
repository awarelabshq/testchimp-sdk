import React, { useEffect, useState } from 'react';
import { Select, Input, Spin, Row, Col, Typography, List, Card, Tag, Button, Tooltip, Modal, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  getScreenStates,
  getScreenForPage,
  listBugs,
  updateBugs,
  getDomAnalysis, getConsoleAnalysis, getScreenshotAnalysis, getNetworkAnalysis, captureCurrentTabScreenshotBase64, GetScreenForPageResponse, ListBugsRequest, fetchRecentConsoleLogs, fetchRecentRequestResponsePairs
} from '../apiService';
import { useElementSelector } from '../elementSelector';
import { simplifyDOMForLLM } from '../html_utils';
import { ScreenState } from '../datas';
import { AddBugPanel } from './AddBugPanel';
import { BugCard } from './BugCard';
import { SEVERITY_OPTIONS } from './bugUtils';
import { getTestChimpIcon } from '../components/getTestChimpIcon';
import { useConnectionManager } from '../connectionManager';
import { BugSeverity, BugStatus, ScreenStates, BugDetail } from '../datas';

const { Text } = Typography;

export const BugsTab = () => {
  const [loading, setLoading] = useState(true);
  const [screenStates, setScreenStates] = useState<ScreenStates[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<string | undefined>();
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<BugSeverity | undefined>();
  const [bugs, setBugs] = useState<BugDetail[]>([]);
  const [filteredBugs, setFilteredBugs] = useState<BugDetail[]>([]);
  const [screenForPageLoading, setScreenForPageLoading] = useState(false);
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [removingBugIds, setRemovingBugIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<{ [bugId: string]: boolean }>({});
  const [addingBug, setAddingBug] = useState(false);
  const [addBugElement, setAddBugElement] = useState<{ element: HTMLElement, querySelector: string } | null>(null);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showAnalyzePanel, setShowAnalyzePanel] = useState(false);
  const [analyzeSources, setAnalyzeSources] = useState({ dom: true, console: true, network: true, screenshot: true });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<string | null>(null); // 'dom' | 'console' | 'network' | 'screenshot' | null
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    setAddBugElement({ element, querySelector });
  });

  const { vscodeConnected } = useConnectionManager();

  // Fetch screen states on mount
  useEffect(() => {
    console.log('Fetching screen states...');
    setLoading(true);
    getScreenStates()
      .then((data) => {
        console.log('Screen states received:', data);
        setScreenStates(data.screenStates || []);
        setLoading(false);
        // After screen states are loaded, fetch screen for current page and set selected screen
        fetchScreenForCurrentPage();
      })
      .catch((error) => {
        console.error('Error fetching screen states:', error);
        setLoading(false);
      });
  }, []);

  // Function to fetch screen for current page
  const fetchScreenForCurrentPage = () => {
    console.log('Fetching screen for page...');
    const url = window.location.href;
    console.log('Current URL:', url);
    setScreenForPageLoading(true);
    getScreenForPage({ url })
      .then((data) => {
        console.log('Screen for page received:', data);
        if (data.screenName) {
          setSelectedScreen(data.screenName);
        } else if (screenStates.length > 0) {
          setSelectedScreen(screenStates[0].screen);
        } else {
          setSelectedScreen(undefined);
        }
        setScreenForPageLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching screen for page:', error);
        if (screenStates.length > 0) setSelectedScreen(screenStates[0].screen);
        else setSelectedScreen(undefined);
        setScreenForPageLoading(false);
      });
  };

  // Listen for tab updates (page changes)
  useEffect(() => {
    if (!chrome.tabs || !chrome.tabs.onUpdated) return;

    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // Only respond to URL changes and when the tab is active
      if (changeInfo.url && tab.active) {
        console.log('Tab URL changed:', changeInfo.url);
        // Add a small delay to ensure the page has fully loaded
        setTimeout(() => {
          fetchScreenForCurrentPage();
        }, 500);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, [loading, screenStates]);

  // When selectedScreen changes, clear selectedState
  useEffect(() => {
    setSelectedState(undefined);
  }, [selectedScreen]);

  // Fetch bugs when screen or state changes (server-side filtering)
  useEffect(() => {
    if (!selectedScreen) return;
    console.log('Fetching bugs for screen:', selectedScreen, 'state:', selectedState);
    const screenObj = screenStates.find((s) => s.screen === selectedScreen);
    let screenStatesReq: ScreenState[] = [];

    if (selectedState) {
      // Find the selected state in the string array
      const stateExists = screenObj?.states?.includes(selectedState);
      if (stateExists) {
        screenStatesReq = [{ name: screenObj?.screen, state: selectedState }];
      }
    } else if (selectedScreen) {
      // When only screen is selected (no state), include just the screen name
      screenStatesReq = [{ name: screenObj?.screen }];
    }

    const req: ListBugsRequest = {
      severities: [], // Don't filter by severity on server-side
      screenStates: screenStatesReq,
      title: undefined, // Don't filter by title on server-side
      statuses: [BugStatus.ACTIVE]
    };
    console.log('Bug request:', req);
    listBugs(req).then((data) => {
      console.log('Bugs received:', data);
      setBugs(data.bugs || []);
    }).catch((error) => {
      console.error('Error fetching bugs:', error);
    });
  }, [selectedScreen, selectedState, screenStates]);

  // Client-side filtering for search text and severity
  useEffect(() => {
    let filtered = [...bugs];
    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(bug =>
        bug.bug?.title?.toLowerCase().includes(searchLower) ||
        bug.bug?.description?.toLowerCase().includes(searchLower)
      );
    }
    // Filter by severity (robust)
    if (selectedSeverity !== undefined && selectedSeverity !== null) {
      filtered = filtered.filter(bug => {
        const sev = bug.bug?.severity;
        return sev !== undefined && sev !== null && sev === selectedSeverity;
      });
    }
    setFilteredBugs(filtered);
  }, [bugs, searchText, selectedSeverity]);

  // Listen for ack messages from the IDE
  useEffect(() => {
    function handleAck(event: MessageEvent) {
      if (event.data && event.data.type === 'ack_message') {
        setShowCopiedNotification(true);
        setTimeout(() => setShowCopiedNotification(false), 3000);
      }
    }
    window.addEventListener('message', handleAck);
    return () => window.removeEventListener('message', handleAck);
  }, []);

  // Handler to show notification
  const handleBugUpdated = () => {
    setNotification('Bug updated successfully');
    setTimeout(() => setNotification(null), 2500);
  };

  // Handler for Find Bugs button
  const handleShowAnalyzePanel = () => {
    setShowAnalyzePanel(true);
  };

  // Handler for Cancel in analyze panel
  const handleCancelAnalyze = () => {
    setShowAnalyzePanel(false);
  };

  // Handler for Analyze in analyze panel
  const handleAnalyze = async () => {
    setShowAnalyzePanel(false);
    setAnalyzing(true);
    setAnalyzeLoading(true);
    const selectedSources = Object.entries(analyzeSources).filter(([k, v]) => v).map(([k]) => k);
    const newBugs: BugDetail[] = [];
    for (const source of selectedSources) {
      setAnalyzeStep(source);
      let response;
      try {
        if (source === 'dom') {
          // Capture the DOM and get LLM-friendly version
          const domSnapshot = JSON.stringify(simplifyDOMForLLM(document.body));
          response = await getDomAnalysis({
            screen: selectedScreen,
            state: selectedState,
            domSnapshot,
            relativeUrl: window.location.pathname + window.location.search + window.location.hash,
          });
        } else if (source === 'console') {
          // Fetch recent console logs from background
          const logs = await fetchRecentConsoleLogs();
          response = await getConsoleAnalysis({
            screen: selectedScreen,
            state: selectedState,
            relativeUrl: window.location.pathname + window.location.search + window.location.hash,
            logs,
          });
        } else if (source === 'network') {
          const requestResponsePairs = await fetchRecentRequestResponsePairs(20);
          response = await getNetworkAnalysis({
            screen: selectedScreen,
            state: selectedState,
            relativeUrl: window.location.pathname + window.location.search + window.location.hash,
            requestResponsePairs,
          });
        } else if (source === 'screenshot') {
          const screenshot = await captureCurrentTabScreenshotBase64();
          response = await getScreenshotAnalysis({
            screen: selectedScreen,
            state: selectedState,
            relativeUrl: window.location.pathname + window.location.search + window.location.hash,
            screenshot,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          });
        }
        if (response && response.bugs && response.bugs.length > 0) {
          // Prepend new bugs to the list
          setBugs(prev => [...response.bugs, ...prev]);
        }
      } catch (e) {
        setNotification(`Failed to analyze ${source}`);
      }
    }
    setAnalyzeStep(null);
    setAnalyzeLoading(false);
    setAnalyzing(false);
  };

  // Get states for selected screen
  const stateOptions = screenStates.find((s) => s.screen === selectedScreen)?.states || [];

  // Notification for analysis step
  const getAnalyzeNotification = () => {
    if (!analyzeStep) return null;
    let msg = '';
    if (analyzeStep === 'dom') msg = 'Analyzing DOM...';
    if (analyzeStep === 'console') msg = 'Analyzing console logs...';
    if (analyzeStep === 'network') msg = 'Analyzing network...';
    if (analyzeStep === 'screenshot') msg = 'Analyzing screenshot...';
    return (
      <div className="scenario-notification">{msg}</div>
    );
  };

  return (
    <div style={{ padding: '8px 0', color: '#aaa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>
        {`
          .ant-card:hover .action-buttons-overlay {
            opacity: 1 !important;
          }
          .ant-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 24px rgba(0,0,0,0.18);
            transition: box-shadow 0.2s, transform 0.2s;
          }
          .add-bug-panel {
            animation: fadeIn 0.3s;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: none; }
          }
        `}
      </style>
      {(loading || screenForPageLoading) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      ) : addingBug ? (
        <AddBugPanel
          screen={selectedScreen}
          state={selectedState}
          onCancel={() => setAddingBug(false)}
          onSuccess={() => {
            setAddingBug(false);
            setLoading(true);
            listBugs({
              severities: [],
              screenStates: selectedScreen ? (selectedState ? [{ name: selectedScreen, state: selectedState }] : [{ name: selectedScreen }]) : [],
              title: undefined,
            }).then((data) => {
              setBugs(data.bugs || []);
              setLoading(false);
            }).catch((error) => {
              setLoading(false);
            });
          }}
        />
      ) : showAnalyzePanel ? (
        <>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }} />
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            width: '100%',
            background: '#232323',
            boxShadow: '0 -2px 12px rgba(0,0,0,0.18)',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            padding: 24,
            maxWidth: 420,
            margin: '0 auto',
            animation: 'slideUp 0.25s',
          }}>
            <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 16, color: '#fff' }}>Sources to analyze</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={analyzeSources.dom} onChange={e => setAnalyzeSources(s => ({ ...s, dom: e.target.checked }))} /> DOM</label>
              <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={analyzeSources.console} onChange={e => setAnalyzeSources(s => ({ ...s, console: e.target.checked }))} /> Console</label>
              <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={analyzeSources.network} onChange={e => setAnalyzeSources(s => ({ ...s, network: e.target.checked }))} /> Network</label>
              <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={analyzeSources.screenshot} onChange={e => setAnalyzeSources(s => ({ ...s, screenshot: e.target.checked }))} /> Screenshot</label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={handleCancelAnalyze} size="small">Cancel</Button>
              <Button type="primary" onClick={handleAnalyze} size="small">
                <img
                  src={getTestChimpIcon()}
                  alt="logo"
                  style={{ width: 18, height: 18, verticalAlign: 'middle', objectFit: 'cover', display: 'inline-block' }}
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<span style=\'font-size:16px;margin-right:4px;\'>🐞</span>'); }}
                />
                Analyze</Button>
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: none; opacity: 1; }
            }
          `}</style>
        </>
      ) : (
        <>
          {/* Row 1: Screen and State dropdowns */}
          <Row gutter={8} style={{ marginBottom: 12 }}>
            <Col flex="auto">
              <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>Screen</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Select screen"
                value={selectedScreen}
                onChange={val => setSelectedScreen(val)}
                options={screenStates.map(s => ({ label: s.screen, value: s.screen }))}
              />
            </Col>
            <Col flex="auto">
              <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>State</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Select state"
                value={selectedState}
                onChange={val => setSelectedState(val)}
                options={stateOptions.map((s) => ({ label: s, value: s }))}
                allowClear
                disabled={stateOptions.length === 0}
              />
            </Col>
          </Row>
          {/* Row 2: Search and Severity on same row */}
          <Row gutter={8} style={{ marginBottom: 12 }}>
            <Col span={18}>
              <Input
                placeholder="Search bug titles..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="S"
                value={selectedSeverity}
                onChange={val => setSelectedSeverity(val)}
                options={SEVERITY_OPTIONS}
                allowClear
              />
            </Col>
          </Row>
          {/* Notification row */}
          {notification && (
            <div className="scenario-notification">
              {notification}
            </div>
          )}
          {showCopiedNotification && (
            <div className="scenario-notification">
              Prompt copied to IDE
            </div>
          )}
          {getAnalyzeNotification()}
          {analyzeLoading && (
            <div style={{ marginBottom: 12 }}>
              <Card loading style={{ marginBottom: 8, borderRadius: 8 }} />
            </div>
          )}
          {/* Bug results panel */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 2px' }}>
            {filteredBugs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <Text type="secondary">
                  {bugs.length === 0 ? 'No bugs found.' : 'No bugs match your filters.'}
                </Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredBugs.map((bug, index) => (
                  <BugCard
                    key={bug.bug?.bugHash || String(index)}
                    bug={bug}
                    expanded={expandedBugId === (bug.bug?.bugHash || String(index))}
                    onExpand={() => setExpandedBugId(bug.bug?.bugHash || String(index))}
                    onRemove={() => { }}
                    actionLoading={actionLoading[bug.bug?.bugHash || String(index)]}
                    removing={removingBugIds.includes(bug.bug?.bugHash || String(index))}
                    index={index}
                    setExpandedBugId={setExpandedBugId}
                    updateBugs={updateBugs}
                    setBugs={setBugs}
                    setRemovingBugIds={setRemovingBugIds}
                    setActionLoading={al => setActionLoading(al)}
                    filteredBugs={filteredBugs}
                    vscodeConnected={vscodeConnected}
                    currentScreenName={selectedScreen}
                    currentRelativeUrl={window.location.pathname + window.location.search + window.location.hash}
                    onUpdated={handleBugUpdated}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sticky bottom buttons */}
          <div style={{
            padding: '8px 0',
            borderTop: '1px solid #333',
            background: '#1a1a1a',
            marginTop: 'auto',
            width: '100%',
          }}>
            <Row gutter={8} style={{ margin: 0 }}>
              <Col span={12}>
                <Button
                  type="default"
                  size="small"
                  className="secondary-button"
                  style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setAddingBug(true)}
                >
                  <PlusOutlined style={{ fontSize: 16 }} />
                  Add Bug
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  type="primary"
                  size="small"
                  className="primary-button"
                  style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={handleShowAnalyzePanel}
                >
                  <img
                    src={getTestChimpIcon()}
                    alt="logo"
                    style={{ width: 18, height: 18, marginRight: 4, verticalAlign: 'middle', objectFit: 'cover', display: 'inline-block' }}
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<span style=\'font-size:16px;margin-right:4px;\'>🐞</span>'); }}
                  />
                  Find Bugs
                </Button>
              </Col>
            </Row>
          </div>
        </>
      )}
    </div>
  );
}; 