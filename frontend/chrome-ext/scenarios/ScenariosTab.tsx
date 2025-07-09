import React, { useEffect, useState, useCallback } from 'react';
import { Select, Input, Spin, Row, Col, Typography, Button } from 'antd';
import { PlusOutlined, BulbOutlined } from '@ant-design/icons';
import { ScreenState, ScreenStates, getScreenStates, getScreenForPage, listAgentTestScenarios } from '../apiService';
import { ScreenStateSelector } from '../components/ScreenStateSelector';
import { ScenarioCard } from './ScenarioCard';
import { TestPriority, AgentTestScenarioWithStatus } from '../datas';
import { getTestChimpIcon } from '../components/getTestChimpIcon';

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

  // Fetch scenarios when screen/state changes
  useEffect(() => {
    if (!selectedScreen) return;
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
    setResultsLoading(true);
    listAgentTestScenarios({
      priorities: [],
      screenStates: screenStatesReq,
      title: undefined,
    })
      .then((data) => {
        setScenarios(data.scenarios || []);
        setResultsLoading(false);
      })
      .catch(() => setResultsLoading(false));
  }, [selectedScreen, selectedState, screenStates]);

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
          {/* Scenario results panel */}
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
                  style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                // TODO: Add onClick for Add Scenario
                >
                  <PlusOutlined style={{ fontSize: 16 }} />
                  Add Scenario
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  type="primary"
                  size="small"
                  style={{ width: '100%', height: 32, backgroundColor: '#72BDA3', borderColor: '#72BDA3', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                // TODO: Add onClick for Suggest Scenarios
                >
                  <img
                    src={getTestChimpIcon()}
                    alt="logo"
                    style={{ width: 18, height: 18, marginRight: 4, verticalAlign: 'middle', objectFit: 'cover', display: 'inline-block' }}
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<span style=\'font-size:16px;margin-right:4px;\'>🐞</span>'); }}
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