import React, { useState } from 'react';
import { Button, Tooltip, Popover, Popconfirm } from 'antd';
import { DeleteOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined, ExclamationCircleOutlined, StopOutlined, BugOutlined } from '@ant-design/icons';
import { AgentTestScenarioWithStatus, TestScenarioStatus, ScenarioTestResult } from '../datas';
import { getTestChimpIcon } from '../components/getTestChimpIcon';
import { upsertAgentTestScenario, insertTestScenarioResult } from '../apiService';
import { formatScenarioScriptForIde } from './scenarioUtils';
import { useConnectionManager } from '../connectionManager';

type ScenarioActionPanelAction =
  | { type: 'delete'; id: string }
  | { type: 'markTested'; id: string; result?: ScenarioTestResult; resultHistory?: any[] }
  | { type: 'promptCopiedToIde'; id: string; messageId?: string };

interface ScenarioActionPanelProps {
  scenario: AgentTestScenarioWithStatus;
  onClose?: () => void;
  showClose?: boolean;
  style?: React.CSSProperties;
  hovered?: boolean;
  onAction?: (action: ScenarioActionPanelAction) => void;
  isSuggestion?: boolean;
  hideActions?: boolean;
}

export const ScenarioActionPanel: React.FC<ScenarioActionPanelProps> = ({
  scenario,
  onClose,
  showClose,
  style,
  hovered = true,
  onAction,
  isSuggestion,
  hideActions = false,
}) => {
  // Internal loading states
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [markTestedLoading, setMarkTestedLoading] = useState(false);
  // Test result icon logic
  const lastResult = scenario.resultHistory && scenario.resultHistory.length > 0 ? scenario.resultHistory[scenario.resultHistory.length - 1].result : undefined;
  let testResultIcon = <ExclamationCircleOutlined style={{ color: '#888', fontSize: 16 }} />;
  if ((typeof lastResult === 'number' && lastResult === ScenarioTestResult.TESTED_WORKING) ||
      (typeof lastResult === 'string' && lastResult === 'TESTED_WORKING')) {
    testResultIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
  } else if ((typeof lastResult === 'number' && lastResult === ScenarioTestResult.TESTED_NOT_WORKING) ||
             (typeof lastResult === 'string' && lastResult === 'TESTED_NOT_WORKING')) {
    testResultIcon = <CloseOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
  }

  const [markTestedPopoverOpen, setMarkTestedPopoverOpen] = useState(false);
  const { vscodeConnected } = useConnectionManager();

  // Helper to get the closest card container for popups
  function getCardContainer(trigger: HTMLElement) {
    let node: HTMLElement | null = trigger;
    while (node && !node.classList.contains('ant-card')) {
      node = node.parentElement;
    }
    return node || document.body;
  }
  // Popover content for mark as tested
  const markTestedContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'stretch', justifyContent: 'flex-start', minWidth: 180, maxHeight: 220, overflowY: 'auto', overflowX: 'hidden' }}>
      <Button type="text" size="small" icon={<CloseOutlined style={{ color: '#ff4d4f' }} />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); handleMarkTested(ScenarioTestResult.TESTED_NOT_WORKING); setMarkTestedPopoverOpen(false); }}>Mark as tested not working</Button>
      <Button type="text" size="small" icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />} style={{ color: '#f5f5f5', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', whiteSpace: 'normal', overflowX: 'hidden' }} onClick={e => { e.stopPropagation(); handleMarkTested(ScenarioTestResult.TESTED_WORKING); setMarkTestedPopoverOpen(false); }}>Mark as tested working</Button>
    </div>
  );

  // Handler for delete
  async function handleDelete() {
    setDeleteLoading(true);
    try {
      // For new scenarios without ID, just call onAction
      if (!scenario.id) {
        if (onAction) onAction({ type: 'delete', id: '' });
        return;
      }
      
      await upsertAgentTestScenario({
        id: scenario.id,
        status: TestScenarioStatus.DELETED_TEST_SCENARIO,
      });
      if (onAction) onAction({ type: 'delete', id: scenario.id });
    } finally {
      setDeleteLoading(false);
    }
  }

  // Handler for mark as tested
  async function handleMarkTested(result: ScenarioTestResult) {
    setMarkTestedLoading(true);
    try {
      // For new scenarios without ID, just update local state
      if (!scenario.id) {
        const newResultHistory = [
          ...(scenario.resultHistory || []),
          { result, timestampMillis: Date.now() },
        ];
        if (onAction) onAction({ 
          type: 'markTested', 
          id: '', 
          result, 
          resultHistory: newResultHistory 
        });
        return;
      }
      
      await insertTestScenarioResult({
        testScenarioId: scenario.id,
        result,
      });
      const newResultHistory = [
        ...(scenario.resultHistory || []),
        { result, timestampMillis: Date.now() },
      ];
      if (onAction) onAction({ 
        type: 'markTested', 
        id: scenario.id, 
        result, 
        resultHistory: newResultHistory 
      });
    } finally {
      setMarkTestedLoading(false);
    }
  }

  // Handler for generate script in IDE
  function handleGenerateScript() {
    if (!scenario.scenario?.steps?.length) return;
    const prompt = formatScenarioScriptForIde(scenario);
    const messageId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    chrome.runtime.sendMessage({ type: 'send_to_vscode', payload: { prompt, messageId } });
    if (onAction) onAction({ type: 'promptCopiedToIde', id: scenario.id || '', messageId });
  }

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
      {!hideActions && (
        <>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete scenario"
              description="Sure you want to delete?"
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
              onConfirm={e => { e?.stopPropagation(); handleDelete(); }}
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
                loading={deleteLoading}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title={!vscodeConnected ? 'VSCode extension must be installed and started.' : (scenario.scenario?.steps?.length ? 'Generate Script in IDE' : 'Add steps to enable')} placement="top">
            <span style={{ display: 'inline-block' }}>
              <Button
                type="text"
                size="small"
                icon={<CodeOutlined />}
                style={{ color: '#72BDA3', padding: '2px 4px', fontSize: 12 }}
                onClick={e => { e.stopPropagation(); handleGenerateScript(); }}
                disabled={!vscodeConnected || !scenario.scenario?.steps?.length}
              />
            </span>
          </Tooltip>
          {/* Only show mark as tested if not a suggestion */}
          {!isSuggestion && (
            <Popover
              content={markTestedContent}
              trigger="click"
              placement="bottom"
              overlayStyle={{ minWidth: 180 }}
              getPopupContainer={getCardContainer}
              open={markTestedPopoverOpen}
              onOpenChange={setMarkTestedPopoverOpen}
            >
              <Button
                type="text"
                size="small"
                icon={testResultIcon}
                style={{ color: '#aaa', padding: '2px 4px', fontSize: 12 }}
                onClick={e => e.stopPropagation()}
                loading={markTestedLoading}
              />
            </Popover>
          )}
        </>
      )}
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