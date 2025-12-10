import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Tooltip } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, ArrowDownOutlined, PlusCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { upsertMindMapScreenState } from '../apiService';
import { ScreenStateInputPanel } from './ScreenStateInputPanel';
import { startMindMapMutationObserver, stopMindMapMutationObserver } from './mindmapMutationObserver';
import { UI_BASE_URL } from '../config';

interface JourneyItem {
  type: 'screen' | 'action';
  screen?: string;
  state?: string;
  actionText?: string;
  id: string;
}

interface MindMapBuilderProps {
  onDone: () => void;
}

export const MindMapBuilder: React.FC<MindMapBuilderProps> = ({ onDone }) => {
  const [screenState, setScreenState] = useState<{ screen: string; state: string }>({ screen: '', state: '' });
  const [snapLoading, setSnapLoading] = useState(false);
  const [journey, setJourney] = useState<JourneyItem[]>([]);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [addActionAt, setAddActionAt] = useState<number | null>(null); // index to insert at
  const [newActionText, setNewActionText] = useState('');
  const [draftAction, setDraftAction] = useState<string>('');
  const [shouldSnap, setShouldSnap] = useState(false);
  const lastAutoAction = useRef<string | null>(null);
  const lastAutoActionTime = useRef<number>(0);
  const lastUrl = useRef<string>(window.location.href);

  // Insert at index (0 = top, journey.length = bottom)
  const handleAddAction = (idx: number) => {
    if (!newActionText.trim()) return;
    const newItem: JourneyItem = {
      type: 'action',
      actionText: newActionText.trim(),
      id: `action-${Date.now()}-${Math.random()}`,
    };
    setJourney(j => {
      const arr = j.slice();
      arr.splice(idx, 0, newItem);
      return arr;
    });
    setNewActionText('');
    setAddActionAt(null);
  };

  // Finalize the current draft action
  const handleFinalizeDraft = () => {
    if (!draftAction.trim()) return;
    const newItem: JourneyItem = {
      type: 'action',
      actionText: draftAction.trim(),
      id: `action-${Date.now()}-${Math.random()}`,
    };
    setJourney(j => [...j, newItem]);
    setDraftAction('');
  };

  const handleSnap = async () => {
    if (!screenState.screen || !screenState.state) return;
    setSnapLoading(true);
    setShouldSnap(false); // Clear the snap suggestion
    try {
      await upsertMindMapScreenState({
        screenState: { name: screenState.screen, state: screenState.state },
        domSnapshot: JSON.stringify(document.body.innerHTML), // Simplified for now
        url: window.location.pathname + window.location.search + window.location.hash,
        relatedFilePaths: [],
      });
      setJourney(journey => [
        {
          type: 'screen',
          screen: screenState.screen,
          state: screenState.state,
          id: `screen-${Date.now()}-${Math.random()}`,
        },
        ...journey,
      ]);
    } finally {
      setSnapLoading(false);
    }
  };

  const handleEditAction = (id: string, text: string) => {
    setJourney(journey => journey.map(item => item.id === id ? { ...item, actionText: text } : item));
    setEditingActionId(null);
  };

  const handleRemoveAction = (id: string) => {
    setJourney(journey => journey.filter(item => item.id !== id));
  };

  // Render journey in chronological order (oldest at top)
  const journeyChronological = journey;

  // Monitor URL changes and suggest snapping
  useEffect(() => {
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl.current) {
        console.log('[MindMapBuilder] URL changed, suggesting snap:', currentUrl);
        setShouldSnap(true);
        lastUrl.current = currentUrl;
      }
    };

    // Check for URL changes periodically
    const interval = setInterval(checkUrlChange, 1000);
    
    // Also listen for navigation events
    const handlePopState = () => checkUrlChange();
    const handleHashChange = () => checkUrlChange();
    
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    // Start mutation observer on mount
    startMindMapMutationObserver((action) => {
      // Update draft action instead of adding new steps
      setDraftAction(action);
    });
    return () => {
      stopMindMapMutationObserver();
    };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', background: '#232323', borderRadius: 12, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginTop: 32 }} />
      <ScreenStateInputPanel
        value={screenState}
        onChange={setScreenState}
      />
      <div style={{ 
        position: 'relative',
        transition: 'all 0.3s ease',
        transform: shouldSnap ? 'scale(1.02)' : 'scale(1)',
        boxShadow: shouldSnap ? '0 0 20px rgba(255, 107, 101, 0.3)' : 'none',
        borderRadius: 8,
        padding: shouldSnap ? 4 : 0,
        margin: shouldSnap ? -4 : 0,
      }}>
        <Button
          type="primary"
          style={{ 
            background: shouldSnap ? '#ff6b65' : '#ff6b65', 
            border: shouldSnap ? '2px solid #fff' : 'none',
            fontWeight: 600, 
            marginTop: 16, 
            marginBottom: 16,
            animation: shouldSnap ? 'pulse 2s 3' : 'none',
          }}
          block
          loading={snapLoading}
          onClick={handleSnap}
          disabled={!screenState.screen || !screenState.state}
        >
        </Button>
        {shouldSnap && (
          <div style={{ 
            position: 'absolute', 
            top: -8, 
            right: -8, 
            background: '#ff6b65', 
            color: '#fff', 
            borderRadius: '50%', 
            width: 20, 
            height: 20, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            animation: 'bounce 1s 3',
          }}>
            !
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#181818', borderRadius: 8, padding: 16, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {journeyChronological.length === 0 && !draftAction ? (
          <div style={{ color: '#888', textAlign: 'center' }}>No journey steps yet. Snap a screen or add an action.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Add step at the very top */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Button
                icon={<PlusCircleOutlined style={{ color: '#fff', fontSize: 18 }} />}
                shape="default"
                size="small"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none', marginBottom: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setAddActionAt(0)}
              />
              {addActionAt === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <Input
                    placeholder="Enter user action"
                    value={newActionText}
                    onChange={e => setNewActionText(e.target.value)}
                    onPressEnter={() => handleAddAction(0)}
                    style={{ width: 220, marginRight: 8 }}
                    autoFocus
                  />
                  <Button icon={<CheckOutlined />} type="primary" size="small" onClick={() => handleAddAction(0)} disabled={!newActionText.trim()} />
                  <Button icon={<CloseOutlined />} size="small" onClick={() => { setAddActionAt(null); setNewActionText(''); }} />
                </div>
              )}
            </div>
            {journeyChronological.map((item, idx) => (
              <React.Fragment key={item.id}>
                {/* Arrow from previous step to this one */}
                {idx > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 0 4px 0' }}>
                    <ArrowDownOutlined style={{ color: '#aaa', fontSize: 20 }} />
                    <Button
                      icon={<PlusCircleOutlined style={{ color: '#fff', fontSize: 18 }} />}
                      shape="default"
                      size="small"
                      style={{ background: 'transparent', border: 'none', boxShadow: 'none', margin: '4px 0', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => setAddActionAt(idx)}
                    />
                    {addActionAt === idx && (
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <Input
                          placeholder="Enter user action"
                          value={newActionText}
                          onChange={e => setNewActionText(e.target.value)}
                          onPressEnter={() => handleAddAction(idx)}
                          style={{ width: 220, marginRight: 8 }}
                          autoFocus
                        />
                        <Button icon={<CheckOutlined />} type="primary" size="small" onClick={() => handleAddAction(idx)} disabled={!newActionText.trim()} />
                        <Button icon={<CloseOutlined />} size="small" onClick={() => { setAddActionAt(null); setNewActionText(''); }} />
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {item.type === 'screen' ? (
                    <span style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 4, padding: '4px 12px', fontWeight: 600, fontSize: 15, border: '1.5px dashed #aaa', fontStyle: 'italic' }}>
                      {item.screen} / {item.state}
                    </span>
                  ) : (
                    <>
                      {editingActionId === item.id ? (
                        <Input
                          value={item.actionText}
                          onChange={e => handleEditAction(item.id, e.target.value)}
                          onBlur={() => setEditingActionId(null)}
                          onPressEnter={e => handleEditAction(item.id, (e.target as HTMLInputElement).value)}
                          style={{ width: 220, marginRight: 8 }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ background: '#333', color: '#fff', borderRadius: 4, padding: '4px 12px', fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item.actionText}
                          <Tooltip title="Edit">
                            <EditOutlined style={{ marginLeft: 8, cursor: 'pointer' }} onClick={() => setEditingActionId(item.id)} />
                          </Tooltip>
                          <Tooltip title="Remove">
                            <DeleteOutlined style={{ marginLeft: 4, cursor: 'pointer' }} onClick={() => handleRemoveAction(item.id)} />
                          </Tooltip>
                        </span>
                      )}
                    </>
                  )}
                </div>
              </React.Fragment>
            ))}
            
            {/* Draft action at the bottom */}
            {draftAction && (
              <>
                {/* Arrow to draft */}
                {journeyChronological.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 0 4px 0' }}>
                    <ArrowDownOutlined style={{ color: '#aaa', fontSize: 20 }} />
                  </div>
                )}
                {/* Draft action with check mark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ background: '#555', color: '#fff', borderRadius: 4, padding: '4px 12px', fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 4, border: '1px dashed #888' }}>
                    {draftAction}
                    <Tooltip title="Add as step">
                      <CheckOutlined 
                        style={{ marginLeft: 8, cursor: 'pointer', color: '#aaa' }} 
                        onClick={handleFinalizeDraft}
                      />
                    </Tooltip>
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Sticky Done and View Mind Map buttons */}
      <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: '#232323', padding: 16, zIndex: 10, borderTop: '1px solid #444', margin: '-24px -24px 0 -24px', display: 'flex', gap: 12 }}>
        <Button 
          className="secondary-button"
          block
          style={{ fontWeight: 600 }}
          onClick={onDone}
        >
          Done
        </Button>
        <Button 
          className="primary-button"
          type="primary"
          block
          style={{ background: '#ff6b65', border: 'none', fontWeight: 600 }}
          onClick={() => window.open(`${UI_BASE_URL}/signin?flow=mindmap`, '_blank')}
        >
          View Mind Map
        </Button>
      </div>
      
      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 107, 101, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 107, 101, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 107, 101, 0); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          60% { transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
}; 