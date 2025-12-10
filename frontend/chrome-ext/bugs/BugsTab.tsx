import React, { useEffect, useState } from 'react';
import { Select, Input, Spin, Row, Col, Typography, List, Card, Tag, Button, Tooltip, Modal, Alert, Checkbox } from 'antd';
import { PlusOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  getScreenStates,
  getScreenForPage,
  listBugs,
  updateBugs,
  getDomAnalysis, getConsoleAnalysis, getScreenshotAnalysis, getNetworkAnalysis, captureCurrentTabScreenshotBase64, GetScreenForPageResponse, ListBugsRequest, fetchRecentConsoleLogs, fetchRecentRequestResponsePairs,
  getTeamDetails,
  listScreenshots,
  getCurrentEnvironmentAndRelease,
} from '../apiService';
import { useElementSelector } from '../elementSelector';
import { simplifyDOMForLLM } from '../html_utils';
import { OrgTier, ScreenState } from '../datas';
import { AddBugPanel } from './AddBugPanel';
import { BugCard } from './BugCard';
import { SEVERITY_OPTIONS } from './bugUtils';
import { getTestChimpIcon } from '../components/getTestChimpIcon';
import { useConnectionManager } from '../connectionManager';
import { BugSeverity, BugStatus, ScreenStates, BugDetail } from '../datas';
import { ScreenStateSelector } from '../components/ScreenStateSelector';
import { MindMapUpdate } from '../components/MindMapUpdate';
import { MindMapBuilder } from '../components/MindMapBuilder';
import { UI_BASE_URL } from '../config';

const { Text } = Typography;

interface BugsTabProps {
  setIsMindMapBuilding: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BugsTab: React.FC<BugsTabProps> = ({ setIsMindMapBuilding }) => {
  const [loading, setLoading] = useState(true);
  const [screenStates, setScreenStates] = useState<ScreenStates[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<string | undefined>();
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<BugSeverity | undefined>();
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [bugs, setBugs] = useState<BugDetail[]>([]);
  const [filteredBugs, setFilteredBugs] = useState<BugDetail[]>([]);
  const [screenForPageLoading, setScreenForPageLoading] = useState(false);
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [removingBugIds, setRemovingBugIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<{ [bugId: string]: boolean }>({});
  const [addingBug, setAddingBug] = useState(false);
  const [addBugElement, setAddBugElement] = useState<{ element: HTMLElement, querySelector: string } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showAnalyzePanel, setShowAnalyzePanel] = useState(false);
  const [analyzeSources, setAnalyzeSources] = useState({ dom: true, console: true, network: true, screenshot: false });
  const [compareAgainstBaseImage, setCompareAgainstBaseImage] = useState(false);
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [baseImageDataUrl, setBaseImageDataUrl] = useState<string | null>(null);
  const [baseImageSource, setBaseImageSource] = useState<'upload' | 'mindmap'>('upload');
  const [mindmapScreenshots, setMindmapScreenshots] = useState<any[]>([]);
  const [selectedMindmapImageIndex, setSelectedMindmapImageIndex] = useState<number>(0);
  const [mindmapImagesLoading, setMindmapImagesLoading] = useState(false);
  const [teamTier, setTeamTier] = useState(undefined);
  const [showScreenshotUpgrade, setShowScreenshotUpgrade] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<string | null>(null); // 'dom' | 'console' | 'network' | 'screenshot' | null
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [showMindMapUpdate, setShowMindMapUpdate] = useState<{
    show: boolean;
    initialScreen?: string;
    initialState?: string;
  }>({ show: false });
  const [showMindMapBuilder, setShowMindMapBuilder] = useState(false);
  const [newlyAddedBugs, setNewlyAddedBugs] = useState<Set<string>>(new Set());

  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    setAddBugElement({ element, querySelector });
  });

  const { vscodeConnected } = useConnectionManager();

  // Get current user email from chrome storage
  useEffect(() => {
    chrome.storage.sync.get(['currentUserId'], (items) => {
      if (items.currentUserId) {
        setCurrentUserEmail(items.currentUserId);
      }
    });
  }, []);

  // Fetch screen states from server
  const fetchScreenStates = () => {
    setLoading(true);
    getScreenStates()
      .then((data) => {
        setScreenStates(data.screenStates || []);
        setLoading(false);
        fetchScreenForCurrentPage();
      })
      .catch((error) => {
        setLoading(false);
      });
  };

  // Fetch screen states on mount
  useEffect(() => {
    fetchScreenStates();
  }, []);

  // Fetch team details on mount
  useEffect(() => {
    getTeamDetails()
      .then((resp) => {
        chrome.storage.local.set({
          teamPlan: resp.plan,
          teamTier: resp.tier,
        }, () => {
        });
      })
      .catch((err) => {
        console.error('Failed to fetch team details (BugsTab):', err);
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

  // Fetch mindmap screenshots when source changes to mindmap
  useEffect(() => {
    if (baseImageSource === 'mindmap' && selectedScreen) {
      fetchMindmapScreenshots();
    }
  }, [baseImageSource, selectedScreen, selectedState]);

  // Debug: Monitor baseImageDataUrl state changes
  useEffect(() => {
    console.log('MindMap: baseImageDataUrl state changed to length:', baseImageDataUrl?.length);
  }, [baseImageDataUrl]);

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

  // Client-side filtering for search text, severity, and assigned to me
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
    // Filter by assigned to me
    if (assignedToMe && currentUserEmail) {
      filtered = filtered.filter(bug => {
        return bug.assignee === currentUserEmail;
      });
    }
    setFilteredBugs(filtered);
  }, [bugs, searchText, selectedSeverity, assignedToMe, currentUserEmail]);

  // Handler to show notification
  const handleBugUpdated = () => {
    setNotification('Bug updated successfully');
    setTimeout(() => setNotification(null), 2500);
  };

  // Handler for Find Bugs button
  const handleShowAnalyzePanel = () => {
    setShowAnalyzePanel(true);
    chrome.storage.local.get(['teamTier'], (data) => {
      setTeamTier(data.teamTier);
    });
  };

  // Handler for Cancel in analyze panel
  const handleCancelAnalyze = () => {
    setShowAnalyzePanel(false);
    // Clear base image when canceling
    setBaseImageFile(null);
    setBaseImageDataUrl(null);
    setCompareAgainstBaseImage(false);
    setBaseImageSource('upload');
    setMindmapScreenshots([]);
    setSelectedMindmapImageIndex(0);
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
          const domSnapshot = JSON.stringify(simplifyDOMForLLM(document.body,{includeStyles:true}));
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
          console.log('Screenshot analysis - compareAgainstBaseImage:', compareAgainstBaseImage);
          console.log('Screenshot analysis - baseImageSource:', baseImageSource);
          console.log('Screenshot analysis - baseImageDataUrl exists:', !!baseImageDataUrl);
          console.log('Screenshot analysis - baseImageDataUrl length:', baseImageDataUrl?.length);
          const baseImageToSend = compareAgainstBaseImage ? (baseImageDataUrl || undefined) : undefined;
          console.log('Screenshot analysis - baseImage will be sent:', !!baseImageToSend);
          response = await getScreenshotAnalysis({
            screen: selectedScreen,
            state: selectedState,
            relativeUrl: window.location.pathname + window.location.search + window.location.hash,
            screenshot,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            baseImage: baseImageToSend,
          });
        }
        if (response && response.bugs && response.bugs.length > 0) {
          // Debug: Log the structure of the first bug
          console.log('First bug structure:', response.bugs[0]);
          console.log('Bug properties:', Object.keys(response.bugs[0] || {}));
          
          // Prepend new bugs to the list
          setBugs(prev => [...response.bugs, ...prev]);
          
          // Mark newly added bugs for glow effect
          const newBugIds = response.bugs.map(bug => bug.bug?.bugHash).filter((id): id is string => Boolean(id));
          console.log('Newly added bug IDs:', newBugIds);
          setNewlyAddedBugs(prev => {
            const updated = new Set([...prev, ...newBugIds]);
            console.log('Updated newlyAddedBugs:', Array.from(updated));
            return updated;
          });
          
          // Show notification about how many bugs were added
          setNotification(`${response.bugs.length} bug${response.bugs.length === 1 ? '' : 's'} found from ${source} analysis`);
          
          // Auto-dismiss notification after 3 seconds
          setTimeout(() => {
            setNotification('');
          }, 3000);
          
          // Remove glow effect after 3 seconds
          setTimeout(() => {
            setNewlyAddedBugs(prev => {
              const updated = new Set(prev);
              newBugIds.forEach(id => updated.delete(id));
              console.log('Removed glow effect for bugs:', newBugIds);
              return updated;
            });
          }, 3000);
        }
      } catch (e) {
        setNotification(`Failed to analyze ${source}`);
      }
    }
    setAnalyzeStep(null);
    setAnalyzeLoading(false);
    setAnalyzing(false);
    // Clear base image after analysis is complete
    setBaseImageFile(null);
    setBaseImageDataUrl(null);
    setCompareAgainstBaseImage(false);
    setBaseImageSource('upload');
    setMindmapScreenshots([]);
    setSelectedMindmapImageIndex(0);
  };

    // Handler for screenshot checkbox
  const handleScreenshotCheckbox = (e) => {
    const checked = e.target.checked;
    setAnalyzeSources(s => ({ ...s, screenshot: checked }));
    if (checked) {
      chrome.storage.local.get(['teamTier'], (data) => {
        setTeamTier(data.teamTier);
        setShowScreenshotUpgrade(data.teamTier === OrgTier.FREE_TIER); 
      });
    } else {
      setShowScreenshotUpgrade(false);
      // Clear base image when screenshot is unchecked
      setBaseImageFile(null);
      setBaseImageDataUrl(null);
      setCompareAgainstBaseImage(false);
      setBaseImageSource('upload');
    }
  };

  // Handler for base image file selection
  const handleBaseImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseImageFile(file);
      // Convert file to data URL (same format as screenshot)
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Keep the complete data URL (same format as screenshot)
        setBaseImageDataUrl(result);
      };
      reader.readAsDataURL(file);
    } else {
      setBaseImageFile(null);
      setBaseImageDataUrl(null);
    }
  };

  // Fetch mindmap screenshots
  const fetchMindmapScreenshots = async () => {
    if (!selectedScreen) return;
    
    setMindmapImagesLoading(true);
    try {
      const { environment } = await getCurrentEnvironmentAndRelease();
      const response = await listScreenshots({
        screen: selectedScreen,
        state: selectedState,
        environment: environment
      });
      const screenshots = response.screenshots || [];
      setMindmapScreenshots(screenshots);
      setSelectedMindmapImageIndex(0);
      // Automatically select the first image if available
      if (screenshots.length > 0) {
        handleMindmapImageSelectWithScreenshots(0, screenshots);
      }
    } catch (error) {
      console.error('Failed to fetch mindmap screenshots:', error);
      setMindmapScreenshots([]);
    } finally {
      setMindmapImagesLoading(false);
    }
  };

  // Handle mindmap image selection with screenshots array
  const handleMindmapImageSelectWithScreenshots = async (index: number, screenshots: any[]) => {
    console.log('MindMap: Selecting image at index:', index, 'from screenshots array length:', screenshots.length);
    setSelectedMindmapImageIndex(index);
    const screenshot = screenshots[index];
    console.log('MindMap: Screenshot object:', screenshot);
    if (screenshot?.url) {
      try {
        console.log('MindMap: Requesting background script to fetch image from URL:', screenshot.url);
        
        // Use chrome.runtime.sendMessage to ask background script to fetch the image
        const response = await new Promise<{success: boolean, dataUrl?: string, error?: string}>((resolve) => {
          chrome.runtime.sendMessage({
            type: 'fetch_image_as_base64',
            url: screenshot.url
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Chrome runtime error:', chrome.runtime.lastError.message);
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response);
            }
          });
        });
        
        if (response.success && response.dataUrl) {
          console.log('MindMap: Successfully got base64 from background script, length:', response.dataUrl.length);
          console.log('MindMap: About to set baseImageDataUrl with length:', response.dataUrl.length);
          setBaseImageDataUrl(response.dataUrl);
          console.log('MindMap: setBaseImageDataUrl called, checking state in next tick...');
          // Check if state was actually updated in the next tick
          setTimeout(() => {
            console.log('MindMap: State check - baseImageDataUrl length after setState:', baseImageDataUrl?.length);
          }, 0);
        } else {
          console.error('MindMap: Failed to fetch image via background script:', response.error);
        }
        
      } catch (error) {
        console.error('Failed to process mindmap image:', error);
      }
    } else {
      console.log('MindMap: No URL found for screenshot');
    }
  };

  // Handle mindmap image selection (uses state)
  const handleMindmapImageSelect = async (index: number) => {
    handleMindmapImageSelectWithScreenshots(index, mindmapScreenshots);
  };

  // Navigate mindmap carousel
  const navigateMindmapImage = (direction: 'prev' | 'next') => {
    if (mindmapScreenshots.length === 0) return;
    
    let newIndex = selectedMindmapImageIndex;
    if (direction === 'prev') {
      newIndex = newIndex > 0 ? newIndex - 1 : mindmapScreenshots.length - 1;
    } else {
      newIndex = newIndex < mindmapScreenshots.length - 1 ? newIndex + 1 : 0;
    }
    handleMindmapImageSelect(newIndex);
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
      {(loading || screenForPageLoading) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      ) : showMindMapUpdate.show ? (
        <>
          {showMindMapBuilder ? (
            <MindMapBuilder onDone={() => { setShowMindMapUpdate({ show: false }); setShowMindMapBuilder(false); setIsMindMapBuilding(false); }} />
          ) : (
            <MindMapUpdate
              initialScreen={showMindMapUpdate.initialScreen}
              initialState={showMindMapUpdate.initialState}
              onBack={() => {
                setShowMindMapUpdate({ show: false });
                setShowMindMapBuilder(false);
                setIsMindMapBuilding(false);
                fetchScreenStates();
              }}
              onContinue={(screen, state) => {
                setShowMindMapUpdate({ show: false });
                setShowMindMapBuilder(false);
                setIsMindMapBuilding(false);
                setSelectedScreen(screen);
                setSelectedState(state);
                fetchScreenStates();
              }}
              onStartBuilder={() => {
                setShowMindMapBuilder(true);
                setIsMindMapBuilding(true);
              }}
            />
          )}
        </>
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
              
              // Mark newly created bugs for glow effect
              // Since we don't know which specific bug was created, we'll mark the first few bugs as newly added
              const newBugIds = (data.bugs || []).slice(0, 3).map(bug => bug.bug?.bugHash).filter((id): id is string => Boolean(id));
              console.log('Manually created bug IDs:', newBugIds);
              
              setNewlyAddedBugs(prev => {
                const updated = new Set([...prev, ...newBugIds]);
                console.log('Updated newlyAddedBugs (manual):', Array.from(updated));
                return updated;
              });
              
              // Show notification about how many bugs were added
              setNotification(`${newBugIds.length} bug${newBugIds.length === 1 ? '' : 's'} added successfully`);
              
              // Auto-dismiss notification after 3 seconds
              setTimeout(() => {
                setNotification('');
              }, 3000);
              
              // Remove glow effect after 3 seconds
              setTimeout(() => {
                setNewlyAddedBugs(prev => {
                  const updated = new Set(prev);
                  newBugIds.forEach(id => updated.delete(id));
                  console.log('Removed glow effect for manual bugs:', newBugIds);
                  return updated;
                });
              }, 3000);
              
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
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <input type="checkbox" checked={analyzeSources.screenshot} onChange={handleScreenshotCheckbox} />
                Screenshot
                <ThunderboltOutlined style={{ color: '#FFD600', fontSize: 16, marginLeft: 4 }} />
              </label>
              {analyzeSources.screenshot && (
                <>
                  <div style={{ marginLeft: 20, marginBottom: 8 }} className="fade-in">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={compareAgainstBaseImage} 
                        onChange={e => setCompareAgainstBaseImage(e.target.checked)} 
                      />
                      Compare against a base image (Optional)
                    </label>
                  </div>
                  {compareAgainstBaseImage && (
                    <div style={{ marginLeft: 20, marginBottom: 8 }} className="fade-in">
                      <Row gutter={8} style={{ marginBottom: 8 }}>
                        <Col span={12}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input 
                              type="radio" 
                              name="baseImageSource" 
                              value="upload" 
                              checked={baseImageSource === 'upload'} 
                              onChange={e => setBaseImageSource(e.target.value as 'upload' | 'mindmap')} 
                            />
                            Upload image
                          </label>
                        </Col>
                        <Col span={12}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input 
                              type="radio" 
                              name="baseImageSource" 
                              value="mindmap" 
                              checked={baseImageSource === 'mindmap'} 
                              onChange={e => setBaseImageSource(e.target.value as 'upload' | 'mindmap')}
                              disabled={!selectedScreen}
                            />
                            <span>
                              From MindMap
                              <Tooltip 
                                title="When ExploreChimp is run, it captures screenshots for each screen it visits, which can be loaded here for comparison as base image."
                                placement="top"
                              >
                                <InfoCircleOutlined 
                                  style={{ 
                                    color: '#666', 
                                    marginLeft: 6, 
                                    fontSize: 12,
                                    cursor: 'help'
                                  }} 
                                />
                              </Tooltip>
                            </span>
                            {!selectedScreen && (
                              <span style={{ fontSize: 10, color: '#666', marginLeft: 4 }}>
                                (Select a screen first)
                              </span>
                            )}
                          </label>
                        </Col>
                      </Row>
                      
                      {baseImageSource === 'upload' && (
                        <div className="fade-in">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBaseImageFileChange}
                            style={{
                              fontSize: 12,
                              color: '#ccc',
                              background: 'transparent',
                              border: '1px solid #444',
                              borderRadius: 4,
                              padding: '4px 8px',
                              width: '100%'
                            }}
                          />
                          {baseImageFile && (
                            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                              Selected: {baseImageFile.name}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {baseImageSource === 'mindmap' && (
                        <div className="fade-in">
                          {mindmapImagesLoading ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                              Loading screenshots...
                            </div>
                          ) : mindmapScreenshots.length > 0 ? (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ marginBottom: 8 }}>
                                <img
                                  src={mindmapScreenshots[selectedMindmapImageIndex]?.url}
                                  alt="Selected screenshot"
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '120px',
                                    border: '2px solid #1890ff',
                                    borderRadius: 4
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                                <button
                                  onClick={() => navigateMindmapImage('prev')}
                                  style={{
                                    background: '#333',
                                    border: '1px solid #555',
                                    color: '#ccc',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ←
                                </button>
                                <span style={{ fontSize: 12, color: '#888' }}>
                                  {selectedMindmapImageIndex + 1} of {mindmapScreenshots.length}
                                </span>
                                <button
                                  onClick={() => navigateMindmapImage('next')}
                                  style={{
                                    background: '#333',
                                    border: '1px solid #555',
                                    color: '#ccc',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                              No screenshots found for this screen/state
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {showScreenshotUpgrade && (
                <div style={{ background: '#ffebe6', color: '#d4380d', padding: '6px 12px', borderRadius: 6, marginTop: 4, fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>
                    Upgrade your TestChimp account for screenshot analysis and more premium features.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      style={{ background: '#ff6b65', color: '#fff', border: 'none', fontWeight: 600 }}
                      onClick={() => window.open(`${UI_BASE_URL}/signin?flow=upgrade`, '_blank')}
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              )}
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
          <ScreenStateSelector
            screenStates={screenStates}
            selectedScreen={selectedScreen}
            setSelectedScreen={setSelectedScreen}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            onAddScreen={() => setShowMindMapUpdate({ show: true })}
            onAddState={() => setShowMindMapUpdate({ show: true, initialScreen: selectedScreen })}
          />
          {/* Row 2: Search and Severity on same row */}
          <Row gutter={8} style={{ marginBottom: 12 }} className="fade-in">
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
          {/* Row 3: Assigned to me checkbox */}
          <Row style={{ marginBottom: 12 }} className="fade-in">
            <Col span={24}>
              <Checkbox
                checked={assignedToMe}
                onChange={e => setAssignedToMe(e.target.checked)}
                disabled={!currentUserEmail}
              >
                Assigned to me
              </Checkbox>
            </Col>
          </Row>
          {/* Notification row */}
          {notification && (
            <div className="scenario-notification">
              {notification}
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
                    newlyAdded={bug.bug?.bugHash ? newlyAddedBugs.has(bug.bug.bugHash) : false}
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
                  className="fade-in secondary-button"
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
                  className="fade-in primary-button"
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