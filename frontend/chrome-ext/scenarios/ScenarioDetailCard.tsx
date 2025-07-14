import React, { useState } from 'react';
import { Card, Input, Button, Tooltip, Popover, Menu, Dropdown, Tag, Skeleton, Select } from 'antd';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, PlusOutlined, MoreOutlined, SaveOutlined, ExclamationCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, StopOutlined, BulbOutlined } from '@ant-design/icons';
import { AgentTestScenarioWithStatus, AgentCodeUnit, ScenarioTestResult, TestPriority } from '../datas';
import { ScenarioActionPanel } from './ScenarioActionPanel';
import { upsertAgentTestScenario, listAgentTestScenarios } from '../apiService';
import { TestScenarioStatus } from '../datas';
import { suggestTestScenarioDescription } from '../apiService';

interface ScenarioDetailCardProps {
  scenario: AgentTestScenarioWithStatus;
  onClose: () => void;
  cardWidth?: string;
  onUpdated?: (updatedScenario?: AgentTestScenarioWithStatus) => void;
  suggestLoading?: boolean;
  selectedScreen?: string;
  selectedState?: string;
  updateLoading?: boolean; // NEW
}

export const ScenarioDetailCard: React.FC<ScenarioDetailCardProps> = ({ scenario, onClose, cardWidth = '100%', onUpdated, selectedScreen, selectedState, updateLoading }) => {
  // Always use local state
  const [id, setId] = useState(scenario.id);
  const [title, setTitle] = useState(scenario.scenario?.title || '');
  const [expected, setExpected] = useState(scenario.scenario?.expectedBehaviour || '');
  const [steps, setSteps] = useState(scenario.scenario?.steps ? [...scenario.scenario.steps] : []);
  const [updating, setUpdating] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [priority, setPriority] = useState(scenario.scenario?.priority ?? TestPriority.MEDIUM_PRIORITY);
  const [localSuggestLoading, setLocalSuggestLoading] = useState(false);
  const [localScenario, setLocalScenario] = useState(scenario);

  // Test result icon logic
  const lastResult = localScenario.resultHistory && localScenario.resultHistory.length > 0 ? localScenario.resultHistory[localScenario.resultHistory.length - 1].result : undefined;
  let testResultIcon = <ExclamationCircleOutlined style={{ color: '#888', fontSize: 16 }} />;
  if (lastResult === ScenarioTestResult.TESTED_WORKING) testResultIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
  else if (lastResult === ScenarioTestResult.TESTED_NOT_WORKING) testResultIcon = <CloseOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;



  // Update handler
  async function handleUpdate() {
    setUpdating(true);
    try {
      const isAdd = !id;
      const res = await upsertAgentTestScenario({
        id,
        status: scenario.status || TestScenarioStatus.ACTIVE_TEST_SCENARIO,
        screenName: isAdd ? selectedScreen : scenario.screenName,
        screenState: isAdd ? selectedState : scenario.screenState,
        testCaseId: scenario.testCaseId,
        scenario: {
          ...scenario.scenario,
          title,
          expectedBehaviour: expected,
          steps,
          priority: priority ?? TestPriority.MEDIUM_PRIORITY,
        },
      });
      if (res && res.id) setId(res.id);
      if (typeof onUpdated === 'function') {
        onUpdated({
          ...scenario,
          id: res && res.id ? res.id : id,
          scenario: {
            ...scenario.scenario,
            title,
            expectedBehaviour: expected,
            steps,
            priority: priority ?? TestPriority.MEDIUM_PRIORITY,
          },
          screenName: isAdd ? selectedScreen : scenario.screenName,
          screenState: isAdd ? selectedState : scenario.screenState,
        });
      }
    } finally {
      setUpdating(false);
    }
  }

  // Handlers
  function handleTitleChange(e: any) { setTitle(e.target.value); }
  function handleExpectedChange(e: any) { setExpected(e.target.value); }
  function handleStepsChange(idx: number, value: string) {
    setSteps((prev: any[]) => prev.map((step, i) => i === idx ? { ...step, description: value } : step));
  }
  function handleAddStep() { setSteps((prev: any[]) => [...prev, { description: '' }]); }
  function handleDeleteStep(idx: number) { setSteps((prev: any[]) => prev.filter((_, i) => i !== idx)); }
  function handlePriorityChange(val: TestPriority) { setPriority(val); }
  function moveStep(idx: number, direction: 'up' | 'down') {
    setSteps((prev: any[]) => {
      const newSteps = [...prev];
      if (direction === 'up' && idx > 0) {
        [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
      } else if (direction === 'down' && idx < newSteps.length - 1) {
        [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]];
      }
      return newSteps;
    });
  }

  // Show Write for me if steps is empty
  const showWriteForMe = steps.length === 0;
  const writeForMeDisabled = title.length < 20;
  const saveDisabled = title.length < 20;

  // Write for me handler (always local)
  async function handleWriteForMe() {
    if (writeForMeDisabled) return;
    setLocalSuggestLoading(true);
    try {
      const res = await suggestTestScenarioDescription({
        screenState: { name: selectedScreen, state: selectedState },
        scenarioTitle: title,
      });
      setExpected(res.expectedBehaviour || '');
      setSteps(res.steps || []);
    } finally {
      setLocalSuggestLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <Card
        style={{
          border: '1px solid #333',
          borderRadius: 8,
          background: '#222',
          color: '#fff',
          position: 'relative',
          minWidth: 0,
          width: cardWidth,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '80vh',
        }}
        bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        {/* Action buttons overlay */}
        <ScenarioActionPanel
          scenario={localScenario}
          showClose={true}
          onClose={onClose}
          hovered={true}
          hideActions={!localScenario.id}
          onAction={action => {
            if (action.type === 'delete') {
              if (typeof onUpdated === 'function') onUpdated(undefined);
              if (typeof onClose === 'function') onClose();
            } else if (action.type === 'markTested') {
              // Update the local scenario state to reflect the new test result
              const updatedScenario = {
                ...localScenario,
                id,
                scenario: {
                  ...localScenario.scenario,
                  title,
                  expectedBehaviour: expected,
                  steps,
                  priority: priority ?? TestPriority.MEDIUM_PRIORITY,
                },
                resultHistory: action.resultHistory,
                screenName: localScenario.screenName,
                screenState: localScenario.screenState,
              };
              
              // Update the local scenario state to trigger re-render
              setLocalScenario(updatedScenario);
              
              if (typeof onUpdated === 'function') {
                onUpdated(updatedScenario);
              }
            }
          }}
        />
        {/* Editable title */}
        <Input.TextArea
          value={title}
          onChange={handleTitleChange}
          placeholder="Scenario title"
          style={{ fontWeight: 400, fontSize: 14, color: '#fff', background: '#222', border: 'none', marginBottom: 8, resize: 'none', overflowY: 'hidden' }}
          bordered={false}
          autoSize={{ minRows: 1, maxRows: 6 }}
          autoFocus
        />
        {/* Priority and Write for me row */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4 }}>Priority</div>
          <Select
            style={{ width: 120, marginLeft: 8 }}
            value={priority ?? TestPriority.MEDIUM_PRIORITY}
            onChange={(val) => handlePriorityChange(Number(val))}
            options={[
              { label: 'P0', value: TestPriority.HIGHEST_PRIORITY },
              { label: 'P1', value: TestPriority.HIGH_PRIORITY },
              { label: 'P2', value: TestPriority.MEDIUM_PRIORITY },
              { label: 'P3', value: TestPriority.LOW_PRIORITY },
              { label: 'P4', value: TestPriority.LOWEST_PRIORITY },
            ]}
            optionLabelProp="label"
          />
          {showWriteForMe && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title={writeForMeDisabled ? 'Title must be at least 10 characters' : ''}>
                <Button
                  type="primary"
                  size="small"
                  icon={<BulbOutlined style={{ color: '#FFD600' }} />} // yellow
                  style={{ marginRight: "8px", marginLeft: "8px" }}
                  loading={localSuggestLoading}
                  onClick={handleWriteForMe}
                  disabled={writeForMeDisabled}
                  className="secondary-button"
                >
                  Write for me
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
        {/* Editable expected behaviour */}
        <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4 }}>Expected behaviour</div>
        {localSuggestLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ marginBottom: 12 }} />
        ) : (
          <Input.TextArea
            value={expected}
            onChange={handleExpectedChange}
            placeholder="Expected behaviour"
            style={{ fontSize: 14, color: '#fff', background: 'var(--tc-panel-bg)', border: '1px solid #333', marginBottom: 12 }}
            autoSize={{ minRows: 2, maxRows: 5 }}
          />
        )}
        {/* Steps list with up/down/delete */}
        <div style={{ marginBottom: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4, marginLeft: 8 }}>Steps</div>
          <div style={{ overflowY: 'auto', maxHeight: 220, minHeight: 0 }}>
            {localSuggestLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} title={false} style={{ marginBottom: 12 }} />
            ) : (
              steps.map((step: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                    background: '#232323',
                    borderRadius: 4,
                    padding: '4px 8px',
                    position: 'relative',
                    flexWrap: 'wrap',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={() => setHoveredStep(idx)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  {hoveredStep === idx && (
                    <Tooltip title="Delete step">
                      <Button
                        type="text"
                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                        size="small"
                        style={{ color: '#ff6b65', marginRight: 2, padding: '0 4px', height: 20, minWidth: 20 }}
                        onClick={() => handleDeleteStep(idx)}
                      />
                    </Tooltip>
                  )}
                  {hoveredStep === idx && (
                    <>
                      <Button
                        type="text"
                        icon={<ArrowUpOutlined style={{ fontSize: 12 }} />}
                        size="small"
                        style={{ color: idx === 0 ? '#888' : '#ff6b65', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '0 4px', height: 20, minWidth: 20 }}
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, 'up')}
                      />
                      <Button
                        type="text"
                        icon={<ArrowDownOutlined style={{ fontSize: 12 }} />}
                        size="small"
                        style={{ color: idx === (steps.length - 1) ? '#888' : '#ff6b65', cursor: idx === (steps.length - 1) ? 'not-allowed' : 'pointer', padding: '0 4px', height: 20, minWidth: 20 }}
                        disabled={idx === (steps.length - 1)}
                        onClick={() => moveStep(idx, 'down')}
                      />
                    </>
                  )}
                  <Input
                    value={step.description || ''}
                    onChange={e => handleStepsChange(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}`}
                    style={{ flex: 1, background: 'transparent', color: '#fff', border: 'none', borderBottom: '1px solid #444', minWidth: 0, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-line' }}
                    bordered={false}
                  />
                </div>
              ))
            )}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddStep}
              style={{ width: '100%', marginTop: 6, color: '#fff', borderColor: '#fff', background: 'transparent', borderStyle: 'dashed', fontWeight: 500 }}
            >
              Add Step
            </Button>
          </div>
        </div>
        {/* Save button with tooltip if disabled */}
        <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: '#222', zIndex: 10, paddingTop: 8 }}>
          <Tooltip title={saveDisabled ? 'Title must be at least 20 characters' : ''}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1.5px solid #fff',
                color: '#fff',
                fontWeight: 600,
              }}
              loading={updating || updateLoading}
              onClick={handleUpdate}
              disabled={saveDisabled}
            >
              Save
            </Button>
          </Tooltip>
        </div>
      </Card>
    </div>
  );
}; 