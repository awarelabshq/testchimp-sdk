import React, { useState } from 'react';
import { Card, Input, Button, Tooltip, Popover, Menu, Dropdown, Tag } from 'antd';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, PlusOutlined, MoreOutlined, BugOutlined, ExclamationCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, StopOutlined } from '@ant-design/icons';
import { AgentTestScenarioWithStatus, AgentCodeUnit, ScenarioTestResult } from '../datas';
import { ScenarioActionPanel } from './ScenarioActionPanel';

interface ScenarioDetailCardProps {
  scenario: AgentTestScenarioWithStatus;
  onClose: () => void;
  cardWidth?: string;
}

export const ScenarioDetailCard: React.FC<ScenarioDetailCardProps> = ({ scenario, onClose, cardWidth = '100%' }) => {
  const [title, setTitle] = useState(scenario.scenario?.title || '');
  const [expected, setExpected] = useState(scenario.scenario?.expectedBehaviour || '');
  const [steps, setSteps] = useState<AgentCodeUnit[]>(scenario.scenario?.steps ? [...scenario.scenario.steps] : []);
  const [updating, setUpdating] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

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

  function handleStepChange(idx: number, value: string) {
    setSteps(prev => prev.map((step, i) => i === idx ? { ...step, description: value } : step));
  }

  function handleDeleteStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }

  function handleAddStep() {
    setSteps(prev => [...prev, { description: '' }]);
  }

  function moveStep(idx: number, direction: 'up' | 'down') {
    setSteps(prev => {
      const newSteps = [...prev];
      if (direction === 'up' && idx > 0) {
        [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
      } else if (direction === 'down' && idx < newSteps.length - 1) {
        [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]];
      }
      return newSteps;
    });
  }

  // Update handler (stub)
  function handleUpdate() {
    setUpdating(true);
    // TODO: Call API to update scenario
    setTimeout(() => setUpdating(false), 1000);
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
      <ScenarioActionPanel
        scenario={scenario}
        showClose={true}
        onClose={onClose}
        onDelete={() => { /* TODO: handle delete */ }}
        onGenerate={() => { /* TODO: handle generate */ }}
        onMarkTested={() => { /* TODO: handle mark tested */ }}
        hovered={true}
      />
      {/* Editable title */}
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Scenario title"
        style={{ fontWeight: 600, fontSize: 16, color: '#fff', background: '#222', border: 'none', marginBottom: 8 }}
        bordered={false}
        autoFocus
      />
      {/* Editable expected behaviour */}
      <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4 }}>Expected behaviour</div>
      <Input.TextArea
        value={expected}
        onChange={e => setExpected(e.target.value)}
        placeholder="Expected behaviour"
        style={{ fontSize: 14, color: '#fff', background: 'var(--tc-panel-bg)', border: '1px solid #333', marginBottom: 12 }}
        autoSize={{ minRows: 2, maxRows: 5 }}
      />
      {/* Steps list with up/down/delete */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, color: '#aaa', marginBottom: 4, marginLeft: 8 }}>Steps</div>
        {steps.map((step, idx) => (
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
                  style={{ color: idx === steps.length - 1 ? '#888' : '#ff6b65', cursor: idx === steps.length - 1 ? 'not-allowed' : 'pointer', padding: '0 4px', height: 20, minWidth: 20 }}
                  disabled={idx === steps.length - 1}
                  onClick={() => moveStep(idx, 'down')}
                />
              </>
            )}
            <Input
              value={step.description || ''}
              onChange={e => handleStepChange(idx, e.target.value)}
              placeholder={`Step ${idx + 1}`}
              style={{ flex: 1, background: 'transparent', color: '#fff', border: 'none', borderBottom: '1px solid #444', minWidth: 0, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-line' }}
              bordered={false}
            />
          </div>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddStep}
          style={{ width: '100%', marginTop: 6, color: '#ff6b65', borderColor: '#ff6b65', background: 'var(--tc-panel-bg)' }}
        >
          Add Step
        </Button>
      </div>
      <Button
        type="primary"
        style={{ width: '100%', background: '#ff6b65', borderColor: '#ff6b65', fontWeight: 600 }}
        loading={updating}
        onClick={handleUpdate}
      >
        Update
      </Button>
    </Card>
  );
}; 