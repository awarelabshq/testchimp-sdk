import React from 'react';
import { Card, Tag, Button, Tooltip, Typography, Popconfirm } from 'antd';
import { DislikeOutlined, CodeOutlined, CheckCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { getCategoryColorWhiteFont, formatCategoryLabel, getSeverityLabel, truncateText, formatMessageToAiIde, generateUuid } from './bugUtils';
import { getFilePathsFromDOM } from '../domUtils';
import { BugSeverity, BugStatus } from '../datas';

const { Text } = Typography;

export interface BugCardProps {
  bug: any;
  expanded: boolean;
  onExpand: () => void;
  onRemove: () => void;
  actionLoading: boolean;
  removing: boolean;
  index: number;
  setExpandedBugId: (id: string | null) => void;
  updateBugs: any;
  setBugs: any;
  setRemovingBugIds: any;
  setActionLoading: any;
  filteredBugs: any[];
  vscodeConnected: boolean;
  currentScreenName?: string;
  currentRelativeUrl?: string;
  onUpdated?: () => void;
  newlyAdded?: boolean;
}

export const BugCard: React.FC<BugCardProps> = ({
  bug,
  expanded,
  onExpand,
  onRemove,
  actionLoading,
  removing,
  index,
  setExpandedBugId,
  updateBugs,
  setBugs,
  setRemovingBugIds,
  setActionLoading,
  filteredBugs,
  vscodeConnected,
  currentScreenName,
  currentRelativeUrl,
  onUpdated,
  newlyAdded,
}) => {
  const bugId = bug.bug?.bugHash || String(index);
  
  // Debug logging
  if (newlyAdded) {
    console.log('BugCard newlyAdded=true for bug:', bugId, 'bugHash:', bug.bug?.bugHash);
  }
  
  return (
    <Card
      key={bugId}
      size="small"
      className={newlyAdded ? 'newly-added-bug fade-in-item' : 'fade-in-item'}
      style={{
        border: '1px solid #333',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease, opacity 0.4s',
        cursor: 'pointer',
        position: 'relative',
        margin: '0 2px',
        opacity: removing ? 0 : 1,
        pointerEvents: actionLoading ? 'none' : undefined,
        filter: actionLoading ? 'grayscale(0.7) opacity(0.7)' : undefined,
      }}
      bodyStyle={{ padding: 12 }}
      hoverable
      onClick={() => {
        if (!expanded) setExpandedBugId(bugId);
      }}
    >
      {/* Title with action buttons overlay on hover */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
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
          }}
        >
          {bug.bug?.title || '(Untitled bug)'}
        </Text>
        {/* Action buttons overlay - visible on hover or always in expanded */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            display: 'flex',
            gap: 2,
            opacity: expanded ? 1 : 0,
            transition: 'opacity 0.2s ease',
            background: 'linear-gradient(90deg, transparent, #1a1a1a 20%)',
            paddingLeft: 20,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
            zIndex: 2,
          }}
          className="action-buttons-overlay"
          onClick={e => e.stopPropagation()}
        >
          <Tooltip title="Ignore">
            <Popconfirm
              title="Ignore bug"
              description="Sure you want to ignore?"
              okText="Ignore"
              okType="danger"
              cancelText="Cancel"
              onConfirm={async (e) => {
                e?.stopPropagation();
                setActionLoading(true);
                try {
                  await updateBugs({
                    updatedBugs: [{ bugHash: bug.bug?.bugHash }],
                    newStatus: BugStatus.IGNORED,
                  });
                  setRemovingBugIds((ids: string[]) => [...ids, bugId]);
                  setTimeout(() => {
                    setBugs((prev: any[]) => prev.filter(b => (b.bug?.bugHash || String(index)) !== bugId));
                    setRemovingBugIds((ids: string[]) => ids.filter(id => id !== bugId));
                  }, 400);
                  if (typeof onUpdated === 'function') onUpdated();
                } catch (e) {
                  // Optionally show error
                }
                setActionLoading(false);
              }}
              onCancel={e => e?.stopPropagation()}
              placement="left"
              getPopupContainer={trigger => trigger.parentElement || document.body}
            >
              <Button
                type="text"
                size="small"
                icon={<DislikeOutlined />}
                style={{ color: '#888', padding: '2px 4px', fontSize: 12 }}
                loading={actionLoading}
                disabled={actionLoading}
                onClick={e => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Fix in IDE">
            <Tooltip title={!vscodeConnected ? 'VSCode extension must be installed and started.' : ''} placement="top">
              <span style={{ display: 'inline-block' }}>
                <Button
                  type="text"
                  size="small"
                  icon={<CodeOutlined />}
                  style={{ color: '#ff6b65', padding: '2px 4px', fontSize: 12 }}
                  disabled={!vscodeConnected}
                  onClick={() => {
                    if (!vscodeConnected) return;
                    const filePaths: string[] = getFilePathsFromDOM();
                    const message = formatMessageToAiIde(bug.bug, currentScreenName, filePaths, currentRelativeUrl);
                    chrome.runtime.sendMessage({
                      type: 'send_to_vscode',
                      payload: {
                        type: 'user_instruction',
                        prompt: message,
                        messageId: generateUuid()
                      }
                    });
                  }}
                />
              </span>
            </Tooltip>
          </Tooltip>
          <Tooltip title="Mark as fixed">
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a', padding: '2px 4px', fontSize: 12 }}
              loading={actionLoading}
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await updateBugs({
                    updatedBugs: [{ bugHash: bug.bug?.bugHash }],
                    newStatus: BugStatus.FIXED,
                  });
                  setRemovingBugIds((ids: string[]) => [...ids, bugId]);
                  setTimeout(() => {
                    setBugs((prev: any[]) => prev.filter(b => (b.bug?.bugHash || String(index)) !== bugId));
                    setRemovingBugIds((ids: string[]) => ids.filter(id => id !== bugId));
                  }, 400);
                  if (typeof onUpdated === 'function') onUpdated();
                } catch (e) {
                  // Optionally show error
                }
                setActionLoading(false);
              }}
            />
          </Tooltip>
          {expanded && (
            <Tooltip title="Close">
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                style={{ color: '#888', padding: '2px 4px', fontSize: 12 }}
                onClick={() => setExpandedBugId(null)}
              />
            </Tooltip>
          )}
        </div>
      </div>
      {/* Tags row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {bug.bug?.category && (
          <Tag
            color={getCategoryColorWhiteFont(bug.bug.category)}
            style={{ color: '#fff', border: 'none', fontSize: 9, padding: '1px 4px', height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {formatCategoryLabel(bug.bug.category)}
          </Tag>
        )}
        {bug.bug?.severity !== undefined && bug.bug?.severity !== null && (
          <Tag
            color="#1890ff"
            style={{ color: '#fff', border: 'none', fontSize: 9, padding: '1px 4px', height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {getSeverityLabel(bug.bug.severity as BugSeverity)}
          </Tag>
        )}
      </div>
      {/* Description or expanded details */}
      {expanded ? (
        <>
          {bug.bug?.description && (
            <Text
              type="secondary"
              style={{ fontSize: 12, lineHeight: '16px', display: 'block', marginBottom: 12 }}
            >
              {bug.bug.description}
            </Text>
          )}
        </>
      ) : (
        bug.bug?.description && (
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              lineHeight: '14px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {truncateText(bug.bug.description, 150)}
          </Text>
        )
      )}
    </Card>
  );
}; 