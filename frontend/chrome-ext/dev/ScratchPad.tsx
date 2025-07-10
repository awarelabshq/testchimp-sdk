import React, { useEffect, useState } from 'react';
import { Card, Button, Tooltip, Empty } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { InfoContext } from '../datas';

export interface LocalTask {
  prompt?: string;
  context?: InfoContext;
  creationTimestampMillis: number;
  screenName?: string;
  relativeUrl?: string;
}

interface ScratchPadProps {
  onSelect: (task: LocalTask) => void;
  onDelete: (task: LocalTask) => void;
  tasks?: LocalTask[];
  setTasks?: (tasks: LocalTask[]) => void;
  currentScreenName?: string;
  currentRelativeUrl?: string;
}

const LOCAL_TASKS_KEY = 'localTasks';

export const ScratchPad: React.FC<ScratchPadProps> = ({ onSelect, onDelete, tasks, setTasks, currentScreenName, currentRelativeUrl }) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [internalTasks, setInternalTasks] = useState<LocalTask[]>([]);
  const taskList = tasks !== undefined ? tasks : internalTasks;
  const setTaskList = setTasks !== undefined ? setTasks : setInternalTasks;

  // Load tasks from chrome.storage.sync
  useEffect(() => {
    setLoading(true);
    chrome.storage.sync.get([LOCAL_TASKS_KEY], (result) => {
      const loaded: LocalTask[] = result[LOCAL_TASKS_KEY] || [];
      setTaskList(loaded.sort((a, b) => b.creationTimestampMillis - a.creationTimestampMillis));
      setLoading(false);
    });
  }, []);

  // Delete a task
  const handleDelete = (task: LocalTask) => {
    setDeleting(String(task.creationTimestampMillis));
    setTimeout(() => {
      const updated = taskList.filter(t => t.creationTimestampMillis !== task.creationTimestampMillis);
      chrome.storage.sync.set({ [LOCAL_TASKS_KEY]: updated }, () => {
        setTaskList(updated);
        setDeleting(null);
        onDelete(task);
      });
    }, 350); // match fade-out duration
  };

  // Filter tasks for current screen
  const filteredTasks = taskList.filter(task => {
    if (currentScreenName && task.screenName) {
      return task.screenName === currentScreenName;
    } else if (!task.screenName && currentRelativeUrl && task.relativeUrl) {
      return task.relativeUrl === currentRelativeUrl;
    }
    return false;
  });

  // Card hover state
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', padding: 0, margin: 0 }}>
      {loading ? (
        <div style={{ color: '#aaa', textAlign: 'center', marginTop: 32 }}>Loading…</div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ minHeight: 40 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0 }}>
          {filteredTasks.map((task, idx) => (
            <Card
              key={task.creationTimestampMillis}
              size="small"
              className="scratchpad-card"
              style={{
                border: '2px dashed #e6c200',
                borderRadius: 10,
                boxShadow: hovered === task.creationTimestampMillis
                  ? '0 4px 16px rgba(230, 194, 0, 0.18)'
                  : '0 2px 8px rgba(230, 194, 0, 0.10)',
                cursor: 'pointer',
                position: 'relative',
                margin: 0,
                width: '100%',
                opacity: deleting === String(task.creationTimestampMillis) ? 0 : 1,
                background: 'transparent',
                minHeight: 36,
                filter: deleting === String(task.creationTimestampMillis) ? 'grayscale(0.7) opacity(0.7)' : undefined,
                fontFamily: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", "Comic Neue", cursive',
                fontSize: 13,
                padding: 0,
                transition: 'box-shadow 0.18s, opacity 0.35s',
              }}
              bodyStyle={{ padding: '8px 12px', minHeight: 24, display: 'flex', alignItems: 'center', position: 'relative' }}
              onMouseEnter={() => setHovered(task.creationTimestampMillis)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(task)}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                width: '100%',
                position: 'relative',
              }}>
                <div style={{ flex: 1, color: '#bfa100', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-line', maxHeight: 48, fontFamily: 'inherit', fontWeight: 500 }}>
                  {task.prompt && task.prompt.length > 300 ? task.prompt.slice(0, 300) + '…' : task.prompt || '(No prompt)'}
                </div>
                {/* Action panel (delete) - top right corner */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    opacity: hovered === task.creationTimestampMillis ? 1 : 0,
                    transition: 'opacity 0.18s',
                    zIndex: 2,
                    background: 'none',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={e => { e.stopPropagation(); handleDelete(task); }}
                >
                  <Tooltip title="Delete">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      style={{ color: '#e6c200', padding: '2px 4px', fontSize: 14 }}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 