import React, { useEffect, useState } from 'react';
import { Input, Select, Button, Modal, Spin, AutoComplete, Tooltip, message } from 'antd';
import { SelectOutlined, BorderOutlined } from '@ant-design/icons';
import { AnnotationInputSection } from '../components/AnnotationInputSection';
import { updateBugs, listReleases, createNewRelease, ReleaseInfo, ResourceType, listPossibleAssignees, SimpleUserInfo, captureCurrentTabScreenshotBase64 } from '../apiService';
import { BugSeverity, BugStatus, BugCategory, Bug, JourneyAgnotism, BoundingBox } from '../datas';
import { useElementSelector } from '../elementSelector';
import { getUniqueSelector } from '../html_utils';
import { boundingBoxFromElement, boundingBoxFromDrawCoords } from '../boundingBoxUtils';


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

  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    const boundingBox = boundingBoxFromElement(element);
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
        const boundingBox = boundingBoxFromDrawCoords(event.data.coords);
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
        <div style={{ marginBottom: 8 }}>
          <AnnotationInputSection
            text={addBugDescription}
            onTextChange={setAddBugDescription}
            selections={addBugSelections.map((s) => ({
              type: s.type,
              boundingBox: s.boundingBox,
            }))}
            onAddElement={() => {
              setCurrentMode('select');
              startSelecting();
            }}
            onAddArea={startAreaSelection}
            onRemoveSelection={removeSelection}
            disabled={addBugLoading || selecting || currentMode === 'box'}
            textPlaceholder="Description"
          />
        </div>
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
                    if (!screenshotBase64) {
                      message.warning('Screenshot capture failed; bug saved without image.');
                    }
                  } catch (screenshotError) {
                    console.error('Screenshot capture failed:', screenshotError);
                    message.warning('Screenshot capture failed; bug saved without image.');
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