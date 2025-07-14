import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Select, Input, Spin, Row, Col, Typography, Button, Modal, Skeleton, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getScreenStates, getScreenForPage, listAgentTestScenarios, suggestTestScenarioDescription, upsertAgentTestScenario } from '../apiService';
import { ScreenState } from '../datas';
import { ScreenStates } from '../datas';
import { ScreenStateSelector } from '../components/ScreenStateSelector';
import { ScenarioCard } from './ScenarioCard';
import { TestPriority, AgentTestScenarioWithStatus } from '../datas';
import { getTestChimpIcon } from '../components/getTestChimpIcon';
import { ScenarioDetailCard } from './ScenarioDetailCard';
import { SuggestScenariosPanel } from './SuggestScenariosPanel';
import { MindMapUpdate } from '../components/MindMapUpdate';

import { MindMapBuilder } from '../components/MindMapBuilder';

const { Text } = Typography;

interface ScenariosTabProps {
  setIsMindMapBuilding: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ScenariosTab: React.FC<ScenariosTabProps> = ({ setIsMindMapBuilding }) => {
  const [initLoading, setInitLoading] = useState(true); // for initial screen states
  const [resultsLoading, setResultsLoading] = useState(false); // for scenario results
  const [screenStates, setScreenStates] = useState<ScreenStates[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<string | undefined>();
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TestPriority | undefined>();
  const [scenarios, setScenarios] = useState<AgentTestScenarioWithStatus[]>([]);
  const [filteredScenarios, setFilteredScenarios] = useState<AgentTestScenarioWithStatus[]>([]);
  const [screenForPageLoading, setScreenForPageLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<{ title: string; expected: string; steps: any[]; priority: TestPriority }>({ title: '', expected: '', steps: [], priority: TestPriority.MEDIUM_PRIORITY });
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestPanelOpen, setSuggestPanelOpen] = useState(false);
  const [addAllLoading, setAddAllLoading] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<AgentTestScenarioWithStatus | null>(null);
  const [showMindMapUpdate, setShowMindMapUpdate] = useState<{
    show: boolean;
    initialScreen?: string;
    initialState?: string;
  }>({ show: false });
  const [showMindMapBuilder, setShowMindMapBuilder] = useState(false);
  const [newlyAddedScenarios, setNewlyAddedScenarios] = useState<Set<string>>(new Set());

  const screenStatesRef = useRef<ScreenStates[]>([]);
  useEffect(() => { screenStatesRef.current = screenStates; }, [screenStates]);

  // Fetch screen for current page (no longer depends on screenStates)
  const fetchScreenForCurrentPage = useCallback(() => {
    const url = window.location.href;
    setScreenForPageLoading(true);
    getScreenForPage({ url })
      .then((data) => {
        if (data.screenName) {
          setSelectedScreen(data.screenName);
        } else if (screenStatesRef.current.length > 0) {
          setSelectedScreen(screenStatesRef.current[0].screen);
        } else {
          setSelectedScreen(undefined);
        }
        setScreenForPageLoading(false);
      })
      .catch(() => {
        if (screenStatesRef.current.length > 0) setSelectedScreen(screenStatesRef.current[0].screen);
        else setSelectedScreen(undefined);
        setScreenForPageLoading(false);
      });
  }, []);

  // Fetch screen states from server
  const fetchScreenStates = useCallback(() => {
    setInitLoading(true);
    getScreenStates()
      .then((data) => {
        setScreenStates(data.screenStates || []);
        setInitLoading(false);
        fetchScreenForCurrentPage();
      })
      .catch(() => setInitLoading(false));
  }, [fetchScreenForCurrentPage]);

  // Fetch screen states on mount
  useEffect(() => {
    fetchScreenStates();
  }, [fetchScreenStates]);

  // When selectedScreen changes, clear selectedState
  useEffect(() => {
    setSelectedState(undefined);
  }, [selectedScreen]);

  // Utility to refresh the scenario list for the current screen/state
  const refreshScenarioList = useCallback(() => {
    if (!selectedScreen) return;
    setResultsLoading(true);
    const screenObj = screenStates.find((s) => s.screen === selectedScreen);
    let screenStatesReq: ScreenState[] = [];
    if (selectedState) {
      const stateExists = screenObj?.states?.includes(selectedState);
      if (stateExists) {
        screenStatesReq = [{ name: screenObj?.screen, state: selectedState }];
      }
    } else if (selectedScreen) {
      screenStatesReq = [{ name: screenObj?.screen }];
    }
    listAgentTestScenarios({ priorities: [], screenStates: screenStatesReq, title: undefined })
      .then((data) => {
        setScenarios(data.scenarios || []);
        setResultsLoading(false);
      })
      .catch(() => setResultsLoading(false));
  }, [selectedScreen, selectedState, screenStates]);

  // Fetch scenarios when screen/state changes
  useEffect(() => {
    refreshScenarioList();
  }, [refreshScenarioList]);

  // Client-side filtering for search text and priority
  useEffect(() => {
    let filtered = [...scenarios];
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(scenario =>
        scenario.scenario?.title?.toLowerCase().includes(searchLower)
      );
    }
    if (selectedPriority !== undefined && selectedPriority !== null) {
      filtered = filtered.filter(scenario => scenario.scenario?.priority === selectedPriority);
    }
    setFilteredScenarios(filtered);
  }, [scenarios, searchText, selectedPriority]);

  // Handler to show notification
  const handleScenarioUpdated = useCallback(() => {
    setNotification('Scenario updated successfully');
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // Handler to show notification and mutate list
  const handleScenarioAction = useCallback((action: any) => {
    if (action.type === 'delete') {
      setScenarios(prev => prev.filter(s => s.id !== action.id));
      setNotification('Scenario deleted');
    } else if (action.type === 'markTested') {
      setScenarios(prev => prev.map(s =>
        s.id === action.id ? { ...s, resultHistory: action.resultHistory } : s
      ));
      setNotification('Scenario marked as tested');
    } else if (action.type === 'promptCopiedToIde') {
      setNotification('Prompt copied to IDE');
    }
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // Handler for Add Scenario button
  const handleAddScenario = () => {
    setAddDraft({ title: '', expected: '', steps: [], priority: TestPriority.MEDIUM_PRIORITY });
    setAddModalOpen(true);
  };

  // Handler for cancel add
  const handleAddCancel = () => {
    setAddModalOpen(false);
  };

  // Handler for Add All from SuggestScenariosPanel
  const handleAddAllScenarios = async (suggested) => {
    setAddAllLoading(true);
    try {
      // Debug: Log the structure of suggested scenarios
      console.log('Suggested scenarios structure:', suggested);
      console.log('First suggested scenario:', suggested[0]);
      
      // Upsert each scenario (in parallel)
      await Promise.all(suggested.map(s => upsertAgentTestScenario({
        id: s.id,
        status: s.status,
        screenName: selectedScreen,
        screenState: selectedState,
        testCaseId: s.testCaseId,
        scenario: s.scenario,
      })));
      
      // Refresh scenario list first
      if (selectedScreen) {
        await refreshScenarioList();
        
        // After refresh, mark the first few scenarios as newly added
        // Since we don't know which specific ones were added, we'll mark the first few
        const currentScenarioIds = scenarios.map(s => s.id).filter((id): id is string => Boolean(id));
        const newScenarioIds = currentScenarioIds.slice(0, suggested.length);
        console.log('Newly added scenario IDs (after refresh):', newScenarioIds);
        
        setNewlyAddedScenarios(prev => {
          const updated = new Set([...prev, ...newScenarioIds]);
          console.log('Updated newlyAddedScenarios:', Array.from(updated));
          return updated;
        });
        
        // Show notification about how many scenarios were added
        setNotification(`${suggested.length} scenario${suggested.length === 1 ? '' : 's'} added successfully`);
        
        // Auto-dismiss notification after 3 seconds
        setTimeout(() => {
          setNotification('');
        }, 3000);
        
        // Remove glow effect after 3 seconds
        setTimeout(() => {
          setNewlyAddedScenarios(prev => {
            const updated = new Set(prev);
            newScenarioIds.forEach(id => updated.delete(id));
            console.log('Removed glow effect for scenarios:', newScenarioIds);
            return updated;
          });
        }, 3000);
      }
      setSuggestPanelOpen(false);
      message.success('Scenarios added');
    } catch (e) {
      message.error('Failed to add scenarios');
    } finally {
      setAddAllLoading(false);
    }
  };

  // Handler to update a scenario in the local state after edit
  const handleScenarioLocallyUpdated = useCallback((updatedScenario) => {
    if (!updatedScenario || !updatedScenario.id) return;
    
    // Debug: Log the updated scenario
    console.log('Updated scenario:', updatedScenario);
    console.log('Current scenarios:', scenarios.map(s => ({ id: s.id, title: s.scenario?.title })));
    
    // Check if this is a newly created scenario (no previous ID)
    const isNewlyCreated = !scenarios.find(s => s.id === updatedScenario.id);
    console.log('Is newly created:', isNewlyCreated);
    
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
    
    // If it's newly created, add glow effect
    if (isNewlyCreated) {
      console.log('Adding glow effect for newly created scenario:', updatedScenario.id);
      setNewlyAddedScenarios(prev => {
        const updated = new Set([...prev, updatedScenario.id]);
        console.log('Updated newlyAddedScenarios (individual):', Array.from(updated));
        return updated;
      });
      
      // Show notification for individual scenario creation
      setNotification('Scenario created successfully');
      
      // Auto-dismiss notification after 3 seconds
      setTimeout(() => {
        setNotification('');
      }, 3000);
      
      // Remove glow effect after 3 seconds
      setTimeout(() => {
        setNewlyAddedScenarios(prev => {
          const updated = new Set(prev);
          updated.delete(updatedScenario.id);
          console.log('Removed glow effect for individual scenario:', updatedScenario.id);
          return updated;
        });
      }, 3000);
    }
  }, [scenarios]);

  return (
    <div style={{ padding: '8px 0', color: '#aaa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(initLoading || screenForPageLoading) ? (
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
                console.log('Start MindMap Builder clicked, setting showMindMapBuilder to true');
                setShowMindMapBuilder(true);
                setIsMindMapBuilding(true);
                console.log('showMindMapBuilder state should now be true');
              }}
            />
          )}
        </>
      ) : addModalOpen ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', background: 'var(--tc-bg-darker)', boxShadow: '0 -2px 12px rgba(0,0,0,0.12)' }}>
            <ScenarioDetailCard
              scenario={{ scenario: { title: addDraft.title, expectedBehaviour: addDraft.expected, steps: addDraft.steps, priority: addDraft.priority }, resultHistory: [] }}
              onClose={handleAddCancel}
              cardWidth="100%"
              suggestLoading={suggestLoading}
              selectedScreen={selectedScreen}
              selectedState={selectedState}
              onUpdated={(updatedScenario) => {
                setAddModalOpen(false);
                // Refresh scenario list after add
                if (updatedScenario && !updatedScenario.id) return; // Defensive: skip if no id
                refreshScenarioList();
              }}
            />
            <Button
              className="fade-in"
              style={{ marginTop: 8, marginBottom: 8, marginRight: 16, float: 'right' }}
              onClick={handleAddCancel}
              size="small"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : expandedScenario ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
          <div className="fade-in">
            <ScenarioDetailCard
              scenario={expandedScenario}
              onClose={() => setExpandedScenario(null)}
              cardWidth="100%"
              selectedScreen={selectedScreen}
              selectedState={selectedState}
              onUpdated={handleScenarioLocallyUpdated}
            />
          </div>
        </div>
      ) : (
        <>
          <ScreenStateSelector
            screenStates={screenStates}
            selectedScreen={selectedScreen}
            setSelectedScreen={setSelectedScreen}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            onAddScreen={() => setShowMindMapUpdate({ show: true })}
            onAddState={() => setShowMindMapUpdate({ show: true, initialScreen: selectedScreen })}
          />
          {/* Row 2: Search and Priority on same row */}
          <Row gutter={8} style={{ marginBottom: 12 }} className="fade-in">
            <Col span={18}>
              <Input
                placeholder="Search scenario titles..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="P"
                value={selectedPriority}
                onChange={val => setSelectedPriority(val)}
                options={[
                  { label: 'P0', value: TestPriority.HIGHEST_PRIORITY },
                  { label: 'P1', value: TestPriority.HIGH_PRIORITY },
                  { label: 'P2', value: TestPriority.MEDIUM_PRIORITY },
                ]}
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
          {!suggestPanelOpen && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 2px', position: 'relative' }}>
              {resultsLoading && (
                <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 2, background: 'rgba(30,30,30,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin size="large" />
                </div>
              )}
              {filteredScenarios.length === 0 && !resultsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                  <Text type="secondary">
                    {scenarios.length === 0 ? 'No scenarios found.' : 'No scenarios match your filters.'}
                  </Text>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: resultsLoading ? 0.5 : 1 }}>
                  {filteredScenarios.map((scenario, index) => (
                    <ScenarioCard
                      key={scenario.id || String(index)}
                      scenario={scenario}
                      onUpdated={handleScenarioLocallyUpdated}
                      onAction={handleScenarioAction}
                      onClick={() => setExpandedScenario(scenario)}
                      className={scenario.id ? (newlyAddedScenarios.has(scenario.id) ? 'newly-added-scenario fade-in-slide-down' : 'fade-in-slide-down') : 'fade-in-slide-down'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <SuggestScenariosPanel
            visible={suggestPanelOpen}
            onCancel={() => setSuggestPanelOpen(false)}
            onAddAll={handleAddAllScenarios}
            selectedScreen={selectedScreen}
            selectedState={selectedState}
          />
          {/* Sticky bottom buttons */}
          <div style={{
            padding: '8px 0',
            borderTop: '1px solid #333',
            background: 'var(--tc-bg-darker)',
            marginTop: 'auto',
            width: '100%',
          }}>
            <Row gutter={8} style={{ margin: 0 }}>
              <Col span={12}>
                <Button
                  className="fade-in secondary-button"
                  type="default"
                  size="small"
                  style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginLeft: 8, marginRight: 4 }}
                  onClick={handleAddScenario}
                >
                  <PlusOutlined style={{ fontSize: 16 }} />
                  Add Scenario
                </Button>
              </Col>
              <Col span={12}>
                <Button
                 className="fade-in primary-button"
                  type="primary"
                  size="small"
                  style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingLeft: 12, paddingRight: 12, marginLeft: 4, marginRight: 8 }}
                  onClick={() => setSuggestPanelOpen(true)}
                >
                  <img
                    src={getTestChimpIcon()}
                    alt="logo"
                    style={{ width: 18, height: 18, marginRight: 4, verticalAlign: 'middle', objectFit: 'cover', display: 'inline-block'}}
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', "<span style=\"font-size:16px;margin-right:4px;\">🐞</span>"); }}
                  />
                  Suggest Scenarios
                </Button>
              </Col>
            </Row>
          </div>
        </>
      )}
    </div>
  );
}; 