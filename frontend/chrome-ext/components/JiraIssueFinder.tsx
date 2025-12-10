import React, { useState } from 'react';
import { Input, Select, Checkbox, Button, Spin, Empty, Alert } from 'antd';
import { fetchJiraIssuesFreetext } from '../apiService';
import JiraIssueCard from './JiraIssueCard';
import { JiraIssue, JiraIssueType } from '../datas';
import { UI_BASE_URL } from '../config';

const ISSUE_TYPE_OPTIONS = [
  { label: 'Bug', value: JiraIssueType.BUG_JIRA_TYPE },
  { label: 'Task', value: JiraIssueType.TASK_JIRA_TYPE },
  { label: 'SubTask', value: JiraIssueType.SUBTASK_JIRA_TYPE },
  { label: 'User Story', value: JiraIssueType.STORY_JIRA_TYPE },
];

interface JiraIssueFinderProps {
  onSelect: (title: string) => void;
  onCancel: () => void;
  style?: React.CSSProperties;
}

const JiraIssueFinder = ({ onSelect, onCancel, style }: JiraIssueFinderProps) => {
  const [query, setQuery] = useState('');
  const [issueType, setIssueType] = useState<JiraIssueType | undefined>();
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<JiraIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jiraNotConnected, setJiraNotConnected] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setJiraNotConnected(false);
    let assignee: string | undefined = undefined;
    if (assignedToMe) {
      assignee = await new Promise<string | undefined>(resolve => {
        chrome.storage.sync.get(['currentUserId'], items => resolve(items.currentUserId));
      });
    }
    try {
      const resp = await fetchJiraIssuesFreetext({
        query,
        issueType,
        assignee,
      });
      setResults(resp.issues || []);
    } catch (e: any) {
      // If 400 Bad Request, show Jira not connected panel
      if (e && e.response && e.response.status === 400) {
        setJiraNotConnected(true);
      } else if (e && e.status === 400) {
        setJiraNotConnected(true);
      } else {
        setError('Failed to fetch Jira issues');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', ...style }}>
      <div className="fade-in" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Input
          placeholder="Search Jira issues..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ marginTop: 24, marginBottom: 12 }}
          onPressEnter={handleSearch}
        />
        <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Select
            placeholder="Issue type"
            value={issueType}
            onChange={setIssueType}
            options={ISSUE_TYPE_OPTIONS}
            style={{ flex: 1 }}
            allowClear
          />
          <Checkbox className="fade-in" checked={assignedToMe} onChange={e => setAssignedToMe(e.target.checked)}>
            Assigned to me
          </Checkbox>
        </div>
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button type="primary" onClick={handleSearch} loading={loading}>
            Search
          </Button>
        </div>
        {jiraNotConnected && (
          <div style={{ background: '#232323', border: '1.5px solid #ffb300', borderRadius: 8, padding: 24, textAlign: 'center', color: '#fff', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
              Connect your Jira account with TestChimp at <a href={`${UI_BASE_URL}/integrations`} target="_blank" rel="noopener noreferrer" style={{ color: '#ffb300', textDecoration: 'underline' }}>{UI_BASE_URL}/integrations</a>
            </div>
            <Button type="primary" style={{ background: '#ff6b65', border: 'none', fontWeight: 600, marginRight: 8 }} onClick={() => window.open(`${UI_BASE_URL}/integration_guide`, '_blank')}>Connect Jira</Button>
            <Button onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</Button>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {loading ? (
            <Spin style={{ display: 'block', margin: '24px auto' }} />
          ) : error ? (
            <div style={{ color: '#ff7875', marginBottom: 12 }}>{error}</div>
          ) : results.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="No Jira issues found" />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 12 }}>
              {results.map(issue => (
                <JiraIssueCard key={issue.issueId} issue={issue} onSelect={() => onSelect(issue.summary)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Button className="fade-in" onClick={onCancel} style={{ width: '100%', marginTop: 12 }}>
        Cancel
      </Button>
    </div>
  );
};

export default JiraIssueFinder; 