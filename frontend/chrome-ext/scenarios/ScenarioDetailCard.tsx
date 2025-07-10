import React, { useState } from 'react';
import { Card, Input, Button, Tooltip, Popover, Menu, Dropdown, Tag, Skeleton, Select } from 'antd';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, PlusOutlined, MoreOutlined, BugOutlined, ExclamationCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, StopOutlined, BulbOutlined } from '@ant-design/icons';
import { AgentTestScenarioWithStatus, AgentCodeUnit, ScenarioTestResult, TestPriority } from '../datas';
import { ScenarioActionPanel } from './ScenarioActionPanel';
import { upsertAgentTestScenario } from '../apiService';
import { TestScenarioStatus } from '../datas';

interface ScenarioDetailCardProps {
  scenario: AgentTestScenarioWithStatus;
  onClose: () => void;
  cardWidth?: string;
  onUpdated?: () => void;
  addMode?: boolean;
  addDraft?: { title: string; expected: string; steps: any[]; priority: TestPriority };
  setAddDraft?: (draft: { title: string; expected: string; steps: any[]; priority: TestPriority }) => void;
  suggestLoading?: boolean;
  onWriteForMe?: (title: string) => void;
  selectedScreen?: string;
  selectedState?: string;
}

export const ScenarioDetailCard: React.FC<ScenarioDetailCardProps> = ({ scenario, onClose, cardWidth = '100%', onUpdated, addMode, addDraft, setAddDraft, suggestLoading, onWriteForMe, selectedScreen, selectedState }) => {
  // Only use local state if not in addMode
  const [title, setTitle] = !addMode ? useState(scenario.scenario?.title || '') : [undefined, undefined];
  const [expected, setExpected] = !addMode ? useState(scenario.scenario?.expectedBehaviour || '') : [undefined, undefined];
  const [steps, setSteps] = !addMode ? useState(scenario.scenario?.steps ? [...scenario.scenario.steps] : []) : [undefined, undefined];
  const [updating, setUpdating] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [priority, setPriority] = !addMode ? useState(scenario.scenario?.priority ?? TestPriority.MEDIUM_PRIORITY) : [undefined, undefined];

  // Test result icon logic
  const lastResult = scenario.resultHistory && scenario.resultHistory.length > 0 ? scenario.resultHistory[scenario.resultHistory.length - 1].result : undefined;
  let testResultIcon = <ExclamationCircleOutlined style={{ color: '#888', fontSize: 16 }} />;
  if (lastResult === ScenarioTestResult.TESTED_WORKING) testResultIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
  else if (lastResult === ScenarioTestResult.TESTED_NOT_WORKING) testResultIcon = <CloseOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;

  // Generate script menu
  const generateScriptMenu = (
    <Menu>
      <Menu.Item key="quick">Generate script in IDE</Menu.Item>
      <Menu.Item key="agent">Run with agent</Menu.Item>
    </Menu>
  );

  // Mark as tested menu
  const markTestedMenu = (
    <Menu>
      <Menu.Item key="untested" icon={<StopOutlined />}>Mark as untested</Menu.Item>
      <Menu.Item key="notworking" icon={<CloseOutlined style={{ color: '#ff4d4f' }} />}>Mark as tested not working</Menu.Item>
      <Menu.Item key="working" icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}>Mark as tested working</Menu.Item>
    </Menu>
  );

  // Update handler (stub)
  async function handleUpdate() {
    setUpdating(true);
    try {
      if (addMode && addDraft) {
        await upsertAgentTestScenario({
          screenName: selectedScreen,
          screenState: selectedState,
          scenario: {
            title: addDraft.title,
            expectedBehaviour: addDraft.expected,
            steps: addDraft.steps,
            priority: addDraft.priority ?? TestPriority.MEDIUM_PRIORITY,
          },
        });
      } else {
        await upsertAgentTestScenario({
          id: scenario.id,
          status: scenario.status || TestScenarioStatus.ACTIVE_TEST_SCENARIO,
          screenName: scenario.screenName,
          screenState: scenario.screenState,
          testCaseId: scenario.testCaseId,
          scenario: {
            ...scenario.scenario,
            title,
            expectedBehaviour: expected,
            steps,
            priority: priority ?? TestPriority.MEDIUM_PRIORITY,
          },
        });
      }
      if (typeof onUpdated === 'function') onUpdated();
    } finally {
      setUpdating(false);
    }
  }

  // In addMode, update draft state on change
  function handleTitleChange(e: any) {
    if (addMode && setAddDraft && addDraft) setAddDraft({ ...addDraft, title: e.target.value });
    else if (setTitle) setTitle(e.target.value);
  }
  function handleExpectedChange(e: any) {
    if (addMode && setAddDraft && addDraft) setAddDraft({ ...addDraft, expected: e.target.value });
    else if (setExpected) setExpected(e.target.value);
  }
  function handleStepsChange(idx: number, value: string) {
    if (addMode && setAddDraft && addDraft) {
      const newSteps = (addDraft.steps ?? []).map((step: any, i: number) => i === idx ? { ...step, description: value } : step);
      setAddDraft({ ...addDraft, steps: newSteps });
    } else if (setSteps) {
      setSteps((prev: any[]) => prev.map((step, i) => i === idx ? { ...step, description: value } : step));
    }
  }
  function handleAddStep() {
    if (addMode && setAddDraft && addDraft) {
      setAddDraft({ ...addDraft, steps: [...(addDraft.steps ?? []), { description: '' }] });
    } else if (setSteps) {
      setSteps((prev: any[]) => [...prev, { description: '' }]);
    }
  }
  function handleDeleteStep(idx: number) {
    if (addMode && setAddDraft && addDraft) {
      setAddDraft({ ...addDraft, steps: (addDraft.steps ?? []).filter((_: any, i: number) => i !== idx) });
    } else if (setSteps) {
      setSteps((prev: any[]) => prev.filter((_, i) => i !== idx));
    }
  }
  function handlePriorityChange(val: TestPriority) {
    if (addMode && setAddDraft && addDraft) setAddDraft({ ...addDraft, priority: val });
    else if (setPriority) setPriority(val);
  }
  function moveStep(idx: number, direction: 'up' | 'down') {
    if (addMode && setAddDraft && addDraft) {
      const newSteps = [...(addDraft.steps ?? [])];
      if (direction === 'up' && idx > 0) {
        [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
      } else if (direction === 'down' && idx < newSteps.length - 1) {
        [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]];
      }
      setAddDraft({ ...addDraft, steps: newSteps });
    } else if (setSteps) {
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
  }

  return (
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
      }}
      bodyStyle={{ padding: 16 }}
    >
      {/* Action buttons overlay */}
      {addMode ? (
        <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            style={{ color: '#888', padding: '2px 4px', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); onClose(); }}
          />
        </div>
      ) : (
        <ScenarioActionPanel
          scenario={scenario}
          showClose={true}
          onClose={onClose}
          onDelete={() => { /* TODO: handle delete */ }}
          onGenerate={() => { /* TODO: handle generate */ }}
          onMarkTested={() => { /* TODO: handle mark tested */ }}
          hovered={true}
        />
      )}
      {/* Editable title */}
      <Input.TextArea
        value={addMode && addDraft ? addDraft.title ?? '' : title ?? ''}
        onChange={handleTitleChange}
        placeholder="Scenario title"
        style={{ fontWeight: 600, fontSize: 16, color: '#fff', background: '#222', border: 'none', marginBottom: 8, resize: 'none' }}
        bordered={false}
        autoSize={{ minRows: 1, maxRows: 2 }}
        autoFocus
      />
      {/* Priority dropdown */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4 }}>Priority</div>
        <Select
          style={{ width: 120 }}
          value={addMode && addDraft ? (addDraft.priority ?? TestPriority.MEDIUM_PRIORITY) : priority ?? TestPriority.MEDIUM_PRIORITY}
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
      </div>
      {/* Write for me button row (only in add mode) */}
      {addMode && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ flex: 1 }} />
          <Tooltip title={addDraft && addDraft.title.length < 10 ? 'Title must be at least 10 characters' : ''}>
            <Button
              type="default"
              size="small"
              icon={<BulbOutlined style={{ color: '#fff' }} />}
              disabled={!addDraft || (addDraft.title ?? '').length < 10 || !!suggestLoading}
              loading={!!suggestLoading}
              onClick={() => onWriteForMe && addDraft && onWriteForMe(addDraft.title ?? '')}
              style={{
                marginLeft: 8,
                border: '1px solid #fff',
                background: 'transparent',
                color: '#fff',
                fontWeight: 500,
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Write for me
            </Button>
          </Tooltip>
        </div>
      )}
      {/* Editable expected behaviour */}
      <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4 }}>Expected behaviour</div>
      {suggestLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ marginBottom: 12 }} />
      ) : (
        <Input.TextArea
          value={addMode && addDraft ? addDraft.expected ?? '' : expected ?? ''}
          onChange={handleExpectedChange}
          placeholder="Expected behaviour"
          style={{ fontSize: 14, color: '#fff', background: 'var(--tc-panel-bg)', border: '1px solid #333', marginBottom: 12 }}
          autoSize={{ minRows: 2, maxRows: 5 }}
        />
      )}
      {/* Steps list with up/down/delete */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4, marginLeft: 8 }}>Steps</div>
        {suggestLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} style={{ marginBottom: 12 }} />
        ) : (
          (addMode && addDraft ? addDraft.steps ?? [] : steps ?? []).map((step: any, idx: number) => (
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
                    style={{ color: idx === (addMode && addDraft ? (addDraft.steps?.length ?? 0) - 1 : (steps?.length ?? 0) - 1) ? '#888' : '#ff6b65', cursor: idx === (addMode && addDraft ? (addDraft.steps?.length ?? 0) - 1 : (steps?.length ?? 0) - 1) ? 'not-allowed' : 'pointer', padding: '0 4px', height: 20, minWidth: 20 }}
                    disabled={idx === (addMode && addDraft ? (addDraft.steps?.length ?? 0) - 1 : (steps?.length ?? 0) - 1)}
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
      <Button
        type="primary"
        style={{
          width: '100%',
          background: 'transparent',
          border: '1.5px solid #fff',
          color: '#fff',
          fontWeight: 600,
        }}
        loading={updating}
        onClick={handleUpdate}
      >
        {addMode ? 'Save' : 'Update'}
      </Button>
    </Card>
  );
}; 