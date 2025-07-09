import React, { useState } from 'react';
import { Tag, Card, Typography, Tooltip, Dropdown, Menu } from 'antd';
import { getLastNSteps } from './scenarioUtils';
import { TestPriority, AgentTestScenarioWithStatus } from '../datas';
import { ScenarioDetailCard } from './ScenarioDetailCard';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, MoreOutlined, BugOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ScenarioActionPanel } from './ScenarioActionPanel';

const { Text } = Typography;

const PRIORITY_LABELS: Record<TestPriority, string> = {
  [TestPriority.HIGHEST_PRIORITY]: 'P0',
  [TestPriority.HIGH_PRIORITY]: 'P1',
  [TestPriority.MEDIUM_PRIORITY]: 'P2',
  [TestPriority.LOW_PRIORITY]: '',
  [TestPriority.LOWEST_PRIORITY]: '',
  [TestPriority.UNKNOWN_PRIORITY]: '',
};

const PRIORITY_COLORS: Record<TestPriority, string> = {
  [TestPriority.HIGHEST_PRIORITY]: '#ff6b65', // Brand reddish
  [TestPriority.HIGH_PRIORITY]: '#ff6b65',    // Brand reddish
  [TestPriority.MEDIUM_PRIORITY]: '#72BDA3',  // Brand greenish
  [TestPriority.LOW_PRIORITY]: '#7ed957',
  [TestPriority.LOWEST_PRIORITY]: '#7ed957',
  [TestPriority.UNKNOWN_PRIORITY]: '#888',
};

export const ScenarioCard = ({ scenario }: { scenario: AgentTestScenarioWithStatus }) => {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [genMenuVisible, setGenMenuVisible] = useState(false);
  const [testMenuVisible, setTestMenuVisible] = useState(false);
  const priority = scenario.scenario?.priority ?? TestPriority.MEDIUM_PRIORITY;
  const showPriority = [TestPriority.HIGHEST_PRIORITY, TestPriority.HIGH_PRIORITY, TestPriority.MEDIUM_PRIORITY].includes(priority);
  const tagColor = PRIORITY_COLORS[priority] || '#888';
  const tagLabel = PRIORITY_LABELS[priority] || '';
  const expected = scenario.scenario?.expectedBehaviour || '';

  // Test result icon logic (stub)
  const lastResult = scenario.resultHistory && scenario.resultHistory.length > 0 ? scenario.resultHistory[scenario.resultHistory.length - 1].result : undefined;
  let testResultIcon = <ExclamationCircleOutlined style={{ color: '#888', fontSize: 16 }} />;
  if (lastResult === 2) testResultIcon = <CheckCircleOutlined style={{ color: 'var(--tc-success)', fontSize: 16 }} />;
  else if (lastResult === 3) testResultIcon = <CloseOutlined style={{ color: 'var(--tc-error)', fontSize: 16 }} />;

  // Generate script menu
  const generateScriptMenu = (
    <Menu onClick={() => setGenMenuVisible(false)}>
      <Menu.Item key="quick">Generate script in IDE</Menu.Item>
      <Menu.Item key="agent">Run with agent</Menu.Item>
    </Menu>
  );

  // Mark as tested menu
  const markTestedMenu = (
    <Menu onClick={() => setTestMenuVisible(false)}>
      <Menu.Item key="untested" icon={<ExclamationCircleOutlined />}>Mark as untested</Menu.Item>
      <Menu.Item key="notworking" icon={<CloseOutlined style={{ color: 'var(--tc-error)' }} />}>Mark as tested not working</Menu.Item>
      <Menu.Item key="working" icon={<CheckCircleOutlined style={{ color: 'var(--tc-success)' }} />}>Mark as tested working</Menu.Item>
    </Menu>
  );

  if (expanded) {
    return <ScenarioDetailCard scenario={scenario} onClose={() => setExpanded(false)} cardWidth="100%" />;
  }

  return (
    <Card
      style={{
        border: '1px solid #333',
        borderRadius: 8,
        background: '#222',
        color: '#fff',
        cursor: 'pointer',
        position: 'relative',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      bodyStyle={{ padding: 14 }}
      onClick={() => setExpanded(true)}
      hoverable
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setGenMenuVisible(false); setTestMenuVisible(false); }}
    >
      {/* Title row with action buttons overlay */}
      <div style={{ position: 'relative', marginBottom: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {showPriority && (
            <Tag color={tagColor} style={{ minWidth: 28, height: 18, fontSize: 10, fontWeight: 700, padding: '0 6px', textAlign: 'center', display: 'flex', alignItems: 'center', border: 'none', lineHeight: '16px', color: '#fff' }}>{tagLabel}</Tag>
          )}
          <Text
            strong
            style={{
              color: '#fff',
              fontSize: 13,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '16px',
              width: '100%',
              minWidth: 0,
              flex: 1,
            }}
          >
            {scenario.scenario?.title}
          </Text>
        </div>
        {/* Action buttons overlay - only on hover, shared component */}
        <ScenarioActionPanel
          scenario={scenario}
          hovered={hovered}
          onDelete={() => { /* TODO: handle delete */ }}
          onGenerate={() => { /* TODO: handle generate */ }}
          onMarkTested={() => { /* TODO: handle mark tested */ }}
          showClose={false}
        />
      </div>
      <div style={{ marginTop: 0, color: '#aaa', whiteSpace: 'pre-line', fontSize: 13, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
        {expected}
      </div>
    </Card>
  );
}; 