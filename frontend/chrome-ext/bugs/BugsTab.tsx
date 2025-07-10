import React, { useEffect, useState } from 'react';
import { Select, Input, Spin, Row, Col, Typography, List, Card, Tag, Button, Tooltip, Modal, Alert } from 'antd';
import { DislikeOutlined, CodeOutlined, CheckCircleOutlined, PlusOutlined, CloseOutlined, SelectOutlined } from '@ant-design/icons';
import {
  getScreenStates,
  getScreenForPage,
  listBugs,
  BugSeverity,
  ScreenState,
  ScreenStates,
  BugDetail,
  GetScreenStatesResponse,
  GetScreenForPageResponse,
  ListBugsRequest,
  BugStatus,
  updateBugs,
} from '../apiService';
import { useElementSelector } from '../elementSelector';
import { getUniqueSelector } from '../html_utils';
import { BugCategory } from '../datas';
import { AddBugPanel } from './AddBugPanel';
import { BugCard } from './BugCard';
import { getCategoryColorWhiteFont, formatCategoryLabel, getSeverityLabel, truncateText, CATEGORY_COLORS, BUG_CATEGORY_OPTIONS, SEVERITY_OPTIONS } from './bugUtils';
import { getTestChimpIcon } from '../components/getTestChimpIcon';
import { useConnectionManager } from '../connectionManager';

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
  const [addBugTitle, setAddBugTitle] = useState('');
  const [addBugDescription, setAddBugDescription] = useState('');
  const [addBugSeverity, setAddBugSeverity] = useState<BugSeverity | undefined>(undefined);
  const [addBugCategory, setAddBugCategory] = useState<string | undefined>(undefined);
  const [addBugElement, setAddBugElement] = useState<{ element: HTMLElement, querySelector: string } | null>(null);
  const [addBugLoading, setAddBugLoading] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

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
      .then((data: GetScreenForPageResponse) => {
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

  // Get states for selected screen
  const stateOptions = screenStates.find((s) => s.screen === selectedScreen)?.states || [];

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
              screenStates: selectedScreen ? [{ name: selectedScreen, state: selectedState }] : [],
              title: undefined,
            }).then((data) => {
              setBugs(data.bugs || []);
              setLoading(false);
            }).catch((error) => {
              setLoading(false);
            });
          }}
        />
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
            <div style={{
              background: '#232323',
              color: '#bbb',
              textAlign: 'center',
              fontSize: 12,
              padding: '2px 0',
              marginBottom: 8,
              borderRadius: 4,
              minHeight: 18,
              letterSpacing: 0.1,
              fontWeight: 400,
              opacity: notification ? 1 : 0,
              transition: 'opacity 0.5s',
              boxShadow: 'none',
              userSelect: 'none',
            }}>
              {notification}
            </div>
          )}
          {showCopiedNotification && (
            <div style={{
              background: '#232323',
              color: '#bbb',
              textAlign: 'center',
              fontSize: 12,
              padding: '2px 0',
              marginBottom: 8,
              borderRadius: 4,
              minHeight: 18,
              letterSpacing: 0.1,
              fontWeight: 400,
              opacity: showCopiedNotification ? 1 : 0,
              transition: 'opacity 0.5s',
              boxShadow: 'none',
              userSelect: 'none',
            }}>
              Prompt copied to IDE
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