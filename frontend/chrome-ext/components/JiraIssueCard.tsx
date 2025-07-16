import React from 'react';
import { Card, Tag, Typography } from 'antd';
import { JiraIssue } from '../datas';

const { Text } = Typography;

// Map Jira priority string/number to P0-P4
function getPriorityLabel(priority: string) {
  // You may need to adjust this mapping based on your Jira data
  const map: Record<string, string> = {
    'Highest': 'P0',
    'High': 'P1',
    'Medium': 'P2',
    'Low': 'P3',
    'Lowest': 'P4',
    '1': 'P0',
    '2': 'P1',
    '3': 'P2',
    '4': 'P3',
    '5': 'P4',
  };
  return map[priority] || priority || 'P?';
}

const JiraIssueCard = ({ issue, onSelect }: { issue: JiraIssue; onSelect: () => void }) => {
  // Truncate summary to a fixed length (e.g., 80 chars)
  const maxLen = 80;
  const summary = issue.summary || '';
  const truncated = summary.length > maxLen;
  const displaySummary = truncated ? summary.slice(0, maxLen) + '...' : summary;
  const displayText = displaySummary + ' [' + issue.issueKey + ']';
  return (
    <Card
      size="small"
      hoverable
      className="fade-in-slide-down"
      onClick={onSelect}
      style={{ marginBottom: 10, border: '1px solid #333', borderRadius: 8, cursor: 'pointer', background: '#232323' }}
      bodyStyle={{ padding: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
        <Tag color="#1890ff" style={{ fontSize: 11, padding: '1px 6px', height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '16px', marginTop: 2 }}>{getPriorityLabel(issue.priority)}</Tag>
        <span
          style={{
            color: '#fff',
            fontSize: 13,
            fontWeight: 400,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            minWidth: 0,
            flex: 1,
            lineHeight: 1.5,
          }}
        >
          {displayText}
        </span>
      </div>
    </Card>
  );
};

export default JiraIssueCard; 