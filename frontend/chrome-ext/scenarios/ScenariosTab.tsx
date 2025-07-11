import React, { useEffect, useState, useCallback } from 'react';
import { Select, Input, Spin, Row, Col, Typography, Button, Modal, Skeleton, message } from 'antd';
import { PlusOutlined, BulbOutlined } from '@ant-design/icons';
import { getScreenStates, getScreenForPage, listAgentTestScenarios, suggestTestScenarioDescription, upsertAgentTestScenario } from '../apiService';
import { ScreenState } from '../datas';
import { ScreenStates } from '../datas';
import { ScreenStateSelector } from '../components/ScreenStateSelector';
import { ScenarioCard } from './ScenarioCard';
import { TestPriority, AgentTestScenarioWithStatus } from '../datas';
import { getTestChimpIcon } from '../components/getTestChimpIcon';
import { ScenarioDetailCard } from './ScenarioDetailCard';
import { SuggestScenariosPanel } from './SuggestScenariosPanel';

const { Text } = Typography;

export const ScenariosTab = () => {
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

  // Fetch screen states on mount
  useEffect(() => {
    setInitLoading(true);
    getScreenStates()
      .then((data) => {
        setScreenStates(data.screenStates || []);
        setInitLoading(false);
        fetchScreenForCurrentPage();
      })
      .catch(() => setInitLoading(false));
  }, []);

  // Fetch screen for current page
  const fetchScreenForCurrentPage = useCallback(() => {
    const url = window.location.href;
    setScreenForPageLoading(true);
    getScreenForPage({ url })
      .then((data) => {
        if (data.screenName) {
          setSelectedScreen(data.screenName);
        } else if (screenStates.length > 0) {
          setSelectedScreen(screenStates[0].screen);
        } else {
          setSelectedScreen(undefined);
        }
        setScreenForPageLoading(false);
      })
      .catch(() => {
        if (screenStates.length > 0) setSelectedScreen(screenStates[0].screen);
        else setSelectedScreen(undefined);
        setScreenForPageLoading(false);
      });
    // eslint-disable-next-line
  }, [screenStates]);

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
      // Upsert each scenario (in parallel)
      await Promise.all(suggested.map(s => upsertAgentTestScenario({
        id: s.id,
        status: s.status,
        screenName: selectedScreen,
        screenState: selectedState,
        testCaseId: s.testCaseId,
        scenario: s.scenario,
      })));
      // Refresh scenario list
      if (selectedScreen) {
        refreshScenarioList();
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
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
  }, []);

  return (
    <div style={{ padding: '8px 0', color: '#aaa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .ant-card:hover .action-buttons-overlay { opacity: 1 !important; }
        .ant-card:hover { transform: translateY(-4px); box-shadow: 0 6px 24px rgba(0,0,0,0.18); transition: box-shadow 0.2s, transform 0.2s; }
      `}</style>
      {(initLoading || screenForPageLoading) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
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
          <ScenarioDetailCard
            scenario={expandedScenario}
            onClose={() => setExpandedScenario(null)}
            cardWidth="100%"
            selectedScreen={selectedScreen}
            selectedState={selectedState}
            onUpdated={handleScenarioLocallyUpdated}
          />
        </div>
      ) : (
        <>
          {/* Row 1: Screen and State dropdowns (shared component) */}
          <ScreenStateSelector
            screenStates={screenStates}
            selectedScreen={selectedScreen}
            setSelectedScreen={setSelectedScreen}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
          />
          {/* Row 2: Search and Priority on same row */}
          <Row gutter={8} style={{ marginBottom: 12 }}>
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
                  type="default"
                  size="small"
                  className="secondary-button"
                  style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginLeft: 8, marginRight: 4 }}
                  onClick={handleAddScenario}
                >
                  <PlusOutlined style={{ fontSize: 16 }} />
                  Add Scenario
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  type="primary"
                  size="small"
                  className="primary-button"
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