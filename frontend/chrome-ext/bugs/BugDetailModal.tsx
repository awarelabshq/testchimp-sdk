import React from 'react';
import { Modal, Button, Tag, Typography } from 'antd';
import { DislikeOutlined, CodeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { BugDetail, BugSeverity } from '../datas';

const { Text } = Typography;

const getCategoryColorWhiteFont = (category: string): string => {
  const categoryColors: Record<string, string> = {
    "UNKNOWN_BUG_CATEGORY": "#d45c57",
    "OTHER": "#ff836a",
    "ACCESSIBILITY": "#ff6b9a",
    "SECURITY": "#ff6bb4",
    "VISUAL": "#ff6bd5",
    "PERFORMANCE": "#d45c8b",
    "FUNCTIONAL": "#a94643",
    "NETWORK": "#d47d57",
    "USABILITY": "#ff9e6b",
    "COMPATIBILITY": "#ffa46b",
    "DATA_INTEGRITY": "#d49c57",
    "INTERACTION": "#c06bff",
    "LOCALIZATION": "#8e43a9",
    "RESPONSIVENESS": "#6b8dff",
    "LAYOUT": "#4d5a7a",
  };
  return categoryColors[category] ?? "#d45c57";
};

const getSeverityLabel = (severity: BugSeverity): string => {
  switch (severity) {
    case BugSeverity.Low: return 'S1';
    case BugSeverity.Medium: return 'S2';
    case BugSeverity.High: return 'S3';
    default: return 'S1';
  }
};

const formatCategoryLabel = (category: string): string => {
  return category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

interface BugDetailModalProps {
  bug: BugDetail | null;
  visible: boolean;
  onClose: () => void;
}

const BugDetailModal: React.FC<BugDetailModalProps> = ({ bug, visible, onClose }) => (
  <Modal
    title={bug?.bug?.title || 'Bug Details'}
    open={visible}
    onCancel={onClose}
    getContainer={() => document.body}
    footer={[
      <Button key="ignore" icon={<DislikeOutlined />} onClick={onClose}>
        Ignore
      </Button>,
      <Button key="fix" type="primary" icon={<CodeOutlined />} style={{ background: '#ff6b65', borderColor: '#ff6b65' }} onClick={onClose}>
        Fix in IDE
      </Button>,
      <Button key="fixed" icon={<CheckCircleOutlined />} onClick={onClose}>
        Mark as Fixed
      </Button>,
    ]}
    width={600}
    style={{ top: 20 }}
  >
    {bug && (
      <div>
        {/* Tags */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {bug.bug?.category && (
            <Tag color={getCategoryColorWhiteFont(bug.bug.category)}>
              {formatCategoryLabel(bug.bug.category)}
            </Tag>
          )}
          {bug.bug?.severity !== undefined && bug.bug?.severity !== null && (
            <Tag color="#1890ff">
              {getSeverityLabel(bug.bug.severity)}
            </Tag>
          )}
        </div>
        {/* Description */}
        {bug.bug?.description && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Description</Text>
            <Text>{bug.bug.description}</Text>
          </div>
        )}
        {/* Additional details */}
        {bug.bug?.location && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Location</Text>
            <Text code>{bug.bug.location}</Text>
          </div>
        )}
        {bug.bug?.evalCommand && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Evaluation Command</Text>
            <Text code style={{ fontSize: 12 }}>{bug.bug.evalCommand}</Text>
          </div>
        )}
        {bug.bug?.rule && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Rule</Text>
            <Text code style={{ fontSize: 12 }}>{bug.bug.rule}</Text>
          </div>
        )}
        {/* Metadata */}
        <div style={{
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: 6,
          marginTop: 16,
          fontSize: 12,
          color: '#666'
        }}>
          <div>Created: {bug.creationTimestampMillis ? new Date(bug.creationTimestampMillis).toLocaleString() : 'Unknown'}</div>
          <div>Environment: {bug.environment || 'Unknown'}</div>
          {bug.sessionLink && (
            <div>Session: <a href={bug.sessionLink} target="_blank" rel="noopener noreferrer">View Session</a></div>
          )}
        </div>
      </div>
    )}
  </Modal>
);

export default BugDetailModal; 