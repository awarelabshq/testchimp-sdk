import React, { useEffect, useState } from 'react';
import { Input, Select, Button, Modal, Spin, AutoComplete, Tooltip } from 'antd';
import { SelectOutlined, BorderOutlined } from '@ant-design/icons';
import { updateBugs, listReleases, createNewRelease, ReleaseInfo, ResourceType, listPossibleAssignees, SimpleUserInfo, captureCurrentTabScreenshotBase64 } from '../apiService';
import { BugSeverity, BugStatus, BugCategory, Bug, JourneyAgnotism, BoundingBox } from '../datas';
import { useElementSelector } from '../elementSelector';
import { getUniqueSelector } from '../html_utils';


interface AddBugPanelProps {
  screen?: string;
  state?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const SEVERITY_OPTIONS = [
  { label: 'S1', value: BugSeverity.High },
  { label: 'S2', value: BugSeverity.Medium },
  { label: 'S3', value: BugSeverity.Low },
];

const BUG_CATEGORY_OPTIONS = Object.values(BugCategory).map(cat => ({
  label: (cat as string).charAt(0) + (cat as string).slice(1).toLowerCase().replace(/_/g, ' '),
  value: cat as string
}));

// Store both element selections and area selections with their bounding boxes
interface BugSelection {
  type: 'element' | 'area';
  element?: HTMLElement;  // Only for element selections
  querySelector?: string; // Only for element selections
  boundingBox: BoundingBox; // Always present, captured immediately
}

export const AddBugPanel: React.FC<AddBugPanelProps> = ({ screen, state, onCancel, onSuccess }) => {
  const [addBugTitle, setAddBugTitle] = useState('');
  const [addBugDescription, setAddBugDescription] = useState('');
  const [addBugSeverity, setAddBugSeverity] = useState<BugSeverity | undefined>(undefined);
  const [addBugCategory, setAddBugCategory] = useState<string | undefined>(undefined);
  const [addBugAssignee, setAddBugAssignee] = useState<string>('');
  const [addBugSelections, setAddBugSelections] = useState<BugSelection[]>([]);
  const [addBugLoading, setAddBugLoading] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<{ value: string; label: string }[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'normal' | 'select' | 'box'>('normal');

  // Helper to calculate bounding box from element immediately
  const calculateBoundingBox = (element: HTMLElement): BoundingBox | null => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (viewportWidth <= 0 || viewportHeight <= 0) {
      console.warn('Invalid viewport dimensions for bounding box calculation');
      return null;
    }
    
    try {
      const rect = element.getBoundingClientRect();
      const xPct = (rect.left / viewportWidth) * 100;
      const yPct = (rect.top / viewportHeight) * 100;
      const widthPct = (rect.width / viewportWidth) * 100;
      const heightPct = (rect.height / viewportHeight) * 100;
      
      // Validate bounds
      if (xPct < 0 || yPct < 0 || widthPct <= 0 || heightPct <= 0 ||
          xPct > 100 || yPct > 100 || widthPct > 100 || heightPct > 100) {
        console.warn('Bounding box out of bounds:', { xPct, yPct, widthPct, heightPct });
        return null;
      }
      
      return {
        xPct: Math.max(0, Math.min(100, xPct)),
        yPct: Math.max(0, Math.min(100, yPct)),
        widthPct: Math.max(0, Math.min(100, widthPct)),
        heightPct: Math.max(0, Math.min(100, heightPct)),
      };
    } catch (error) {
      console.warn('Error calculating bounding box for element:', error);
      return null;
    }
  };

  // Element selector - capture bounding box immediately
  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    const boundingBox = calculateBoundingBox(element);
    if (boundingBox) {
      setAddBugSelections(prev => [...prev, {
        type: 'element',
        element,
        querySelector,
        boundingBox
      }]);
    }
    setCurrentMode('normal');
  });

  // Listen for area selection (box drawing) from injectScript
  useEffect(() => {
    function onPageMessage(event: MessageEvent) {
      if (!event.data || typeof event.data.type !== 'string') return;
      
      if (event.data.type === 'boxDrawn' && event.data.coords) {
        const { left, top, width, height } = event.data.coords;
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        const xPct = (parseFloat(left.toString()) / vw) * 100;
        const yPct = (parseFloat(top.toString()) / vh) * 100;
        const widthPct = (parseFloat(width.toString()) / vw) * 100;
        const heightPct = (parseFloat(height.toString()) / vh) * 100;
        
        const boundingBox: BoundingBox = {
          xPct: Math.max(0, Math.min(100, xPct)),
          yPct: Math.max(0, Math.min(100, yPct)),
          widthPct: Math.max(0, Math.min(100, widthPct)),
          heightPct: Math.max(0, Math.min(100, heightPct)),
        };
        
        setAddBugSelections(prev => [...prev, {
          type: 'area',
          boundingBox
        }]);
        setCurrentMode('normal');
        window.postMessage({ type: 'tc-show-sidebar' }, '*');
      }
    }
    
    window.addEventListener('message', onPageMessage);
    
    // Defensive: revert to normal if user clicks anywhere while in box mode
    function onAnyClick() {
      if (currentMode === 'box') setCurrentMode('normal');
    }
    if (currentMode === 'box') {
      window.addEventListener('mousedown', onAnyClick, true);
    }
    
    return () => {
      window.removeEventListener('message', onPageMessage);
      window.removeEventListener('mousedown', onAnyClick, true);
    };
  }, [currentMode]);

  // Trigger selection/drawing in page when mode changes
  useEffect(() => {
    if (currentMode === 'select') {
      window.postMessage({ type: 'startElementSelect' }, '*');
    } else if (currentMode === 'box') {
      window.postMessage({ type: 'startBoxDraw' }, '*');
      window.postMessage({ type: 'tc-hide-sidebar' }, '*');
    }
  }, [currentMode]);

  const removeSelection = (index: number) => {
    setAddBugSelections(prev => prev.filter((_, i) => i !== index));
  };

  const startAreaSelection = () => {
    setCurrentMode('box');
  };

  // Fetch possible assignees on component mount
  useEffect(() => {
    const fetchAssignees = async () => {
      setAssigneeLoading(true);
      try {
        const response = await listPossibleAssignees();
        const options = response.users
          .filter(user => user.email) // Only use users with email
          .map(user => ({
            value: user.email!,
            label: user.email!
          }));
        setAssigneeOptions(options);
      } catch (error) {
        console.error('Failed to fetch assignees:', error);
      } finally {
        setAssigneeLoading(false);
      }
    };

    fetchAssignees();
  }, []);

  useEffect(() => {
    // No longer fetching releases here, ReleaseSelect handles its own data fetching
  }, []);

  const handleAddRelease = async () => {
    // This function is no longer needed as ReleaseSelect handles its own add logic
  };

  return (
    <div className="add-bug-panel" style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      background: '#181818',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      boxShadow: '0 -2px 24px rgba(0,0,0,0.28)',
      padding: '24px 16px 16px 16px',
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
      minHeight: 0
    }}>
      <div style={{ marginBottom: 12 }}>
        <Input
          placeholder="Bug title"
          value={addBugTitle}
          onChange={e => setAddBugTitle(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
          disabled={addBugLoading}
        />
        <Input.TextArea
          placeholder="Description"
          value={addBugDescription}
          onChange={e => setAddBugDescription(e.target.value)}
          autoSize={{ minRows: 10, maxRows: 10 }}
          style={{ width: '100%', marginBottom: 8, resize: 'none' }}
          disabled={addBugLoading}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Select
            placeholder="Severity"
            value={addBugSeverity}
            onChange={val => setAddBugSeverity(val)}
            options={SEVERITY_OPTIONS}
            style={{ flex: 1 }}
            disabled={addBugLoading}
            placement="topLeft"
            getPopupContainer={trigger => trigger.parentNode}
          />
          <Select
            placeholder="Category"
            value={addBugCategory}
            onChange={val => setAddBugCategory(val)}
            options={BUG_CATEGORY_OPTIONS}
            style={{ flex: 2 }}
            disabled={addBugLoading}
            placement="topLeft"
            getPopupContainer={trigger => trigger.parentNode}
          />
        </div>

        <AutoComplete
          placeholder={assigneeLoading ? "Loading assignees..." : "Assignee (email)"}
          value={addBugAssignee}
          onChange={setAddBugAssignee}
          options={assigneeOptions}
          style={{ width: '100%', marginBottom: 8 }}
          disabled={addBugLoading}
          placement="topLeft"
          getPopupContainer={trigger => trigger.parentNode}
          allowClear
          showSearch
          filterOption={(inputValue, option) =>
            option?.label?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {addBugSelections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {addBugSelections.map((selection, index) => (
                <Button
                  key={index}
                  type="default"
                  size="small"
                  style={{ border: '1px solid #72BDA3', borderRadius: 4, background: '#181818', color: '#72BDA3', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}
                  disabled={addBugLoading}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    {selection.type === 'element' ? (
                      <SelectOutlined style={{ fontSize: 14 }} />
                    ) : (
                      <BorderOutlined style={{ fontSize: 14 }} />
                    )}
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      verticalAlign: 'middle',
                    }}>
                      {selection.type === 'element' 
                        ? selection.querySelector || 'Element'
                        : `Area (${selection.boundingBox.xPct?.toFixed(1)}%, ${selection.boundingBox.yPct?.toFixed(1)}%)`
                      }
                    </span>
                  </div>
                  <span 
                    style={{ marginLeft: 4, color: '#ff4d4f', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelection(index);
                    }}
                  >×</span>
                </Button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="dashed"
              size="small"
              style={{ borderStyle: 'dashed', borderRadius: 4, color: '#888', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}
              icon={<SelectOutlined style={{ fontSize: 14 }} />}
              onClick={() => {
                setCurrentMode('select');
                startSelecting();
              }}
              disabled={addBugLoading || selecting || currentMode === 'box'}
            >
              Add element
            </Button>
            <Button
              type="dashed"
              size="small"
              style={{ borderStyle: 'dashed', borderRadius: 4, color: '#888', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}
              icon={<BorderOutlined style={{ fontSize: 14 }} />}
              onClick={startAreaSelection}
              disabled={addBugLoading || currentMode === 'select' || selecting}
            >
              Add area
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button
            onClick={onCancel}
            disabled={addBugLoading}
          >
            Cancel
          </Button>
          <Tooltip title={(!screen || !state) ? "Please select both a screen and state before adding a bug so that we can attach the bug in the right place in the Atlas Site Map." : undefined}>
            <Button
              type="primary"
              loading={addBugLoading}
              disabled={addBugLoading || !addBugTitle.trim() || !addBugSeverity || !addBugCategory || !screen || !state}
              onClick={async () => {
                setAddBugLoading(true);
                try {
                  // Extract bounding boxes from stored selections (already captured immediately)
                  const boundingBoxes = addBugSelections.map(s => s.boundingBox);
                  
                  // Collapse sidebar and capture screenshot
                  let screenshotBase64: string | undefined;
                  
                  try {
                    // Capture screenshot (this function handles sidebar hiding internally)
                    screenshotBase64 = await captureCurrentTabScreenshotBase64();
                  } catch (screenshotError) {
                    console.error('Screenshot capture failed:', screenshotError);
                    // Fallback: continue without screenshot
                  }

                  // Build artifact reference if we have screenshot or bounding boxes
                  const artifactReference = (screenshotBase64 || boundingBoxes.length > 0) ? {
                    screenshotReference: {
                      boundingBoxes: boundingBoxes.length > 0 ? boundingBoxes : undefined
                    }
                  } : undefined;

                  // Get location from first element selection if available
                  const firstElementSelection = addBugSelections.find(s => s.type === 'element' && s.element);
                  const location = firstElementSelection?.element 
                    ? getUniqueSelector(firstElementSelection.element)
                    : firstElementSelection?.querySelector || undefined;

                  const bug: Bug = {
                    title: addBugTitle.trim(),
                    description: addBugDescription.trim(),
                    severity: addBugSeverity,
                    category: addBugCategory,
                    location: location,
                    screen: screen || undefined,
                    screenState: state || undefined,
                    artifactReference: artifactReference,
                  };
                  
                  await updateBugs({
                    updatedBugs: [bug],
                    newStatus: BugStatus.ACTIVE,
                    assignee: addBugAssignee.trim() || undefined,
                    screenshotBase64: screenshotBase64,
                  });
                  
                  setAddBugTitle('');
                  setAddBugDescription('');
                  setAddBugSeverity(undefined);
                  setAddBugCategory(undefined);
                  setAddBugAssignee('');
                  setAddBugSelections([]);

                  onSuccess();
                } catch (e) {
                  console.error('Failed to add bug:', e);
                  // Optionally show error
                }
                setAddBugLoading(false);
              }}
            >
              Ok
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}; 