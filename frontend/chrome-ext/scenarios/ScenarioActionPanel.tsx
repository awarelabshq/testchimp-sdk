import React, { useState } from 'react';
import { Button, Tooltip, Popover, Popconfirm } from 'antd';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, ExclamationCircleOutlined, StopOutlined, BugOutlined } from '@ant-design/icons';
import { AgentTestScenarioWithStatus, ScenarioTestResult } from '../datas';
import { getTestChimpIcon } from '../components/getTestChimpIcon';

interface ScenarioActionPanelProps {
  scenario: AgentTestScenarioWithStatus;
  onDelete?: () => void;
  onGenerate?: (type: 'quick' | 'agent') => void;
  onMarkTested?: (result: ScenarioTestResult) => void;
  onClose?: () => void;
  showClose?: boolean;
  style?: React.CSSProperties;
  hovered?: boolean;
}

export const ScenarioActionPanel: React.FC<ScenarioActionPanelProps> = ({
  scenario,
  onDelete,
  onGenerate,
  onMarkTested,
  onClose,
  showClose,
  style,
  hovered = true,
}) => {
  // Test result icon logic
  const lastResult = scenario.resultHistory && scenario.resultHistory.length > 0 ? scenario.resultHistory[scenario.resultHistory.length - 1].result : undefined;
  let testResultIcon = <ExclamationCircleOutlined style={{ color: '#888', fontSize: 16 }} />;
  if (lastResult === ScenarioTestResult.TESTED_WORKING) testResultIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
  else if (lastResult === ScenarioTestResult.TESTED_NOT_WORKING) testResultIcon = <CloseOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;

  // Helper to get the closest card container for popups
  function getCardContainer(trigger: HTMLElement) {
    let node: HTMLElement | null = trigger;
    while (node && !node.classList.contains('ant-card')) {
      node = node.parentElement;
    }
    return node || document.body;
  }

  // Popover content for generate
  const generateContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'stretch', justifyContent: 'flex-start', minWidth: 160, maxHeight: 180, overflowY: 'auto', overflowX: 'hidden' }}>
      <Button type="text" size="small" icon={<CodeOutlined />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); onGenerate && onGenerate('quick'); }}>Quick generate</Button>
      <Button type="text" size="small" icon={<img src={getTestChimpIcon()} alt="logo" style={{ width: 16, height: 16, marginRight: 2, verticalAlign: 'middle', objectFit: 'cover', display: 'inline-block' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<span style=\'font-size:16px;margin-right:2px;\'>🐞</span>'); }} />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); onGenerate && onGenerate('agent'); }}>Run with agent</Button>
    </div>
  );
  // Popover content for mark as tested
  const markTestedContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'stretch', justifyContent: 'flex-start', minWidth: 180, maxHeight: 220, overflowY: 'auto', overflowX: 'hidden' }}>
      <Button type="text" size="small" icon={<StopOutlined />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); onMarkTested && onMarkTested(ScenarioTestResult.UNTESTED); }}>Mark as untested</Button>
      <Button type="text" size="small" icon={<CloseOutlined style={{ color: '#ff4d4f' }} />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); onMarkTested && onMarkTested(ScenarioTestResult.TESTED_NOT_WORKING); }}>Mark as tested not working</Button>
      <Button type="text" size="small" icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); onMarkTested && onMarkTested(ScenarioTestResult.TESTED_WORKING); }}>Mark as tested working</Button>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'flex',
        gap: 2,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
        background: '#222',
        paddingLeft: 20,
        paddingRight: 4,
        paddingTop: 2,
        paddingBottom: 2,
        zIndex: 2,
        pointerEvents: hovered ? 'auto' : 'none',
        ...style,
      }}
      className="action-buttons-overlay"
      onClick={e => e.stopPropagation()}
    >
      <Tooltip title="Delete">
        <Popconfirm
          title="Delete scenario"
          description="Sure you want to delete?"
          okText="Delete"
          okType="danger"
          cancelText="Cancel"
          onConfirm={e => { e?.stopPropagation(); onDelete && onDelete(); }}
          onCancel={e => e?.stopPropagation()}
          placement="left"
          getPopupContainer={getCardContainer}
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            style={{ color: '#ff6b65', padding: '2px 4px', fontSize: 12 }}
            onClick={e => e.stopPropagation()}
          />
        </Popconfirm>
      </Tooltip>
      <Popover
        content={generateContent}
        trigger="click"
        placement="bottom"
        overlayStyle={{ minWidth: 160 }}
        getPopupContainer={getCardContainer}
      >
        <Button
          type="text"
          size="small"
          icon={<CodeOutlined />}
          style={{ color: '#72BDA3', padding: '2px 4px', fontSize: 12 }}
          onClick={e => e.stopPropagation()}
        />
      </Popover>
      <Popover
        content={markTestedContent}
        trigger="click"
        placement="bottom"
        overlayStyle={{ minWidth: 180 }}
        getPopupContainer={getCardContainer}
      >
        <Button
          type="text"
          size="small"
          icon={testResultIcon}
          style={{ color: '#aaa', padding: '2px 4px', fontSize: 12 }}
          onClick={e => e.stopPropagation()}
        />
      </Popover>
      {showClose && (
        <Tooltip title="Close">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            style={{ color: '#888', padding: '2px 4px', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); onClose && onClose(); }}
          />
        </Tooltip>
      )}
    </div>
  );
}; 