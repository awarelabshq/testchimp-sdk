import React, { useState } from 'react';
import { Tag, Card, Typography, Tooltip, Dropdown, Menu, Button } from 'antd';
import { TestPriority, AgentTestScenarioWithStatus } from '../datas';
import { ScenarioDetailCard } from './ScenarioDetailCard';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, MoreOutlined, BugOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ScenarioActionPanel } from './ScenarioActionPanel';

const { Text } = Typography;

const PRIORITY_LABELS: Record<TestPriority, string> = {
  [TestPriority.HIGHEST_PRIORITY]: 'P0',
  [TestPriority.HIGH_PRIORITY]: 'P1',
  [TestPriority.MEDIUM_PRIORITY]: 'P2',
  [TestPriority.LOW_PRIORITY]: 'P3',
  [TestPriority.LOWEST_PRIORITY]: 'P4',
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

export const ScenarioCard = ({ scenario, onUpdated, onAction, titleWrap, onClick, isSuggestion, selectedScreen, selectedState, onScenarioChange, className }: {
  scenario: AgentTestScenarioWithStatus,
  onUpdated?: (updatedScenario?: AgentTestScenarioWithStatus) => void,
  onAction?: (action: any) => void,
  titleWrap?: boolean,
  onClick?: () => void,
  isSuggestion?: boolean,
  selectedScreen?: string,
  selectedState?: string,
  onScenarioChange?: (updated: AgentTestScenarioWithStatus) => void,
  className?: string,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [genMenuVisible, setGenMenuVisible] = useState(false);
  const [testMenuVisible, setTestMenuVisible] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const priority = scenario.scenario?.priority ?? TestPriority.MEDIUM_PRIORITY;
  const showPriority = [TestPriority.HIGHEST_PRIORITY, TestPriority.HIGH_PRIORITY, TestPriority.MEDIUM_PRIORITY].includes(priority);
  const tagColor = PRIORITY_COLORS[priority] || '#888';
  const tagLabel = PRIORITY_LABELS[priority] || '';
  const expected = scenario.scenario?.expectedBehaviour || '';

  // Debug logging for newly added scenarios
  if (className && className.includes('newly-added-scenario')) {
    console.log('ScenarioCard newlyAdded=true for scenario:', scenario.id, 'className:', className);
  }

  // Test result icon logic (robust to string/enum)
  const lastResult = scenario.resultHistory && scenario.resultHistory.length > 0 ? scenario.resultHistory[scenario.resultHistory.length - 1].result : undefined;
  let testResultIcon = <ExclamationCircleOutlined style={{ color: '#888', fontSize: 16 }} />;
  if ((typeof lastResult === 'number' && lastResult === 2) || (typeof lastResult === 'string' && lastResult === 'TESTED_WORKING')) {
    testResultIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
  } else if ((typeof lastResult === 'number' && lastResult === 3) || (typeof lastResult === 'string' && lastResult === 'TESTED_NOT_WORKING')) {
    testResultIcon = <CloseOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
  }

  if (expanded) {
    return (
      <div style={{ position: 'relative' }}>
        {showSuccess && (
          <div className="scenario-notification" style={{
            position: 'absolute',
            top: -32,
            left: 0,
            right: 0,
            zIndex: 10,
          }}>
            Successfully updated
          </div>
        )}
        <ScenarioDetailCard
          scenario={scenario}
          onClose={() => {
            setExpanded(false);
            if (onScenarioChange) {
              // Compose the latest scenario data from ScenarioDetailCard's local state
              // We'll need to get the latest state from ScenarioDetailCard, so pass a callback to ScenarioDetailCard for this purpose
              // For now, we assume ScenarioDetailCard calls onUpdated with the latest scenario data (see next edit)
            }
          }}
          cardWidth="100%"
          onUpdated={async (updatedScenario?: AgentTestScenarioWithStatus) => {
            setUpdateLoading(true);
            if (onUpdated) await onUpdated(updatedScenario);
            setUpdateLoading(false);
            setShowSuccess(true);
            if (onScenarioChange && updatedScenario) {
              onScenarioChange(updatedScenario);
            }
            setTimeout(() => {
              setShowSuccess(false);
              setExpanded(false);
            }, 1200);
          }}
          updateLoading={updateLoading}
          selectedScreen={selectedScreen}
          selectedState={selectedState}
        />
      </div>
    );
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
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : () => setExpanded(true)}
      hoverable
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setGenMenuVisible(false); setTestMenuVisible(false); }}
      className={`fade-in-item ${className || ''}`}
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
              display: titleWrap ? 'block' : '-webkit-box',
              WebkitLineClamp: titleWrap ? undefined : 2,
              WebkitBoxOrient: titleWrap ? undefined : 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '16px',
              width: '100%',
              minWidth: 0,
              flex: 1,
              whiteSpace: titleWrap ? 'pre-line' : 'nowrap',
              maxWidth: 'calc(100% - 28px)', // leave space for icon
              wordBreak: titleWrap ? 'break-word' : undefined,
              overflowWrap: titleWrap ? 'break-word' : undefined,
            }}
          >
            {scenario.scenario?.title}
          </Text>
          {!isSuggestion &&
          <span style={{ marginLeft: 8, flexShrink: 0 }}>{testResultIcon}</span>
}
        </div>
        {/* Action buttons overlay - only on hover, shared component */}
        <ScenarioActionPanel
          scenario={scenario}
          hovered={hovered}
          showClose={false}
          onAction={action => {
            if (onUpdated) onUpdated();
            if (onAction) onAction(action);
          }}
          isSuggestion={isSuggestion}
          hideActions={!scenario.id}
        />
      </div>
      <div style={{ marginTop: 0, color: '#aaa', whiteSpace: 'pre-line', fontSize: 13, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
        {expected}
      </div>
    </Card>
  );
}; 