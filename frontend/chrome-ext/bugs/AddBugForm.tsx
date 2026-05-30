import React, { useEffect, useState } from 'react';
import { Input, Select, Button, AutoComplete, Tooltip } from 'antd';
import { AnnotationInputSection } from '../components/AnnotationInputSection';
import { listPossibleAssignees } from '../apiService';
import { Bug, BugCategory, BugSeverity, BoundingBox } from '../datas';
import { useElementSelector } from '../elementSelector';
import { getUniqueSelector } from '../html_utils';
import { boundingBoxFromElement, boundingBoxFromDrawCoords } from '../boundingBoxUtils';
import { BUG_CATEGORY_OPTIONS, SEVERITY_OPTIONS } from './bugFormConstants';

interface BugSelection {
  type: 'element' | 'area';
  element?: HTMLElement;
  querySelector?: string;
  boundingBox: BoundingBox;
}

export interface AddBugFormValues {
  bug: Bug;
  assignee?: string;
}

export interface AddBugFormProps {
  screen?: string;
  state?: string;
  disabled?: boolean;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (values: AddBugFormValues) => void | Promise<void>;
}

export function buildBugFromForm(
  title: string,
  description: string,
  severity: BugSeverity | undefined,
  category: string | undefined,
  screen: string | undefined,
  state: string | undefined,
  selections: BugSelection[]
): Bug {
  const boundingBoxes = selections.map((s) => s.boundingBox);
  const firstElementSelection = selections.find((s) => s.type === 'element' && s.element);
  const location = firstElementSelection?.element
    ? getUniqueSelector(firstElementSelection.element)
    : firstElementSelection?.querySelector || undefined;

  const artifactReference =
    boundingBoxes.length > 0
      ? {
          screenshotReference: {
            boundingBoxes,
          },
        }
      : undefined;

  return {
    title: title.trim(),
    description: description.trim(),
    severity,
    category,
    location,
    screen: screen || undefined,
    screenState: state || undefined,
    artifactReference,
    platform: 'WEB_EXECUTION_PLATFORM',
  };
}

export const AddBugForm: React.FC<AddBugFormProps> = ({
  screen,
  state,
  disabled = false,
  loading = false,
  submitLabel = 'Add Bug',
  onSubmit,
}) => {
  const [addBugTitle, setAddBugTitle] = useState('');
  const [addBugDescription, setAddBugDescription] = useState('');
  const [addBugSeverity, setAddBugSeverity] = useState<BugSeverity | undefined>(undefined);
  const [addBugCategory, setAddBugCategory] = useState<string | undefined>(undefined);
  const [addBugAssignee, setAddBugAssignee] = useState('');
  const [addBugSelections, setAddBugSelections] = useState<BugSelection[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<{ value: string; label: string }[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'normal' | 'select' | 'box'>('normal');

  const formDisabled = disabled || loading;

  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    const boundingBox = boundingBoxFromElement(element);
    if (boundingBox) {
      setAddBugSelections((prev) => [
        ...prev,
        {
          type: 'element',
          element,
          querySelector,
          boundingBox,
        },
      ]);
    }
    setCurrentMode('normal');
  });

  useEffect(() => {
    function onPageMessage(event: MessageEvent) {
      if (!event.data || typeof event.data.type !== 'string') return;

      if (event.data.type === 'boxDrawn' && event.data.coords) {
        const boundingBox = boundingBoxFromDrawCoords(event.data.coords);
        setAddBugSelections((prev) => [
          ...prev,
          {
            type: 'area',
            boundingBox,
          },
        ]);
        setCurrentMode('normal');
        window.postMessage({ type: 'tc-show-sidebar' }, '*');
      }
    }

    window.addEventListener('message', onPageMessage);

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

  useEffect(() => {
    if (currentMode === 'select') {
      window.postMessage({ type: 'startElementSelect' }, '*');
    } else if (currentMode === 'box') {
      window.postMessage({ type: 'startBoxDraw' }, '*');
      window.postMessage({ type: 'tc-hide-sidebar' }, '*');
    }
  }, [currentMode]);

  useEffect(() => {
    const fetchAssignees = async () => {
      setAssigneeLoading(true);
      try {
        const response = await listPossibleAssignees();
        const options = response.users
          .filter((user) => user.email)
          .map((user) => ({
            value: user.email!,
            label: user.email!,
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

  const removeSelection = (index: number) => {
    setAddBugSelections((prev) => prev.filter((_, i) => i !== index));
  };

  const startAreaSelection = () => {
    setCurrentMode('box');
  };

  const resetForm = () => {
    setAddBugTitle('');
    setAddBugDescription('');
    setAddBugSeverity(undefined);
    setAddBugCategory(undefined);
    setAddBugAssignee('');
    setAddBugSelections([]);
  };

  const canSubmit =
    addBugTitle.trim().length > 0 &&
    !!addBugSeverity &&
    !!addBugCategory &&
    !!screen &&
    !!state &&
    !formDisabled;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const bug = buildBugFromForm(
      addBugTitle,
      addBugDescription,
      addBugSeverity,
      addBugCategory,
      screen,
      state,
      addBugSelections
    );
    try {
      await onSubmit({
        bug,
        assignee: addBugAssignee.trim() || undefined,
      });
      resetForm();
    } catch {
      // Parent shows error; keep form values so the user can retry.
    }
  };

  return (
    <div>
      <Input
        placeholder="Bug title"
        value={addBugTitle}
        onChange={(e) => setAddBugTitle(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
        disabled={formDisabled}
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
          disabled={formDisabled || selecting || currentMode === 'box'}
          textPlaceholder="Description"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Select
          placeholder="Severity"
          value={addBugSeverity}
          onChange={(val) => setAddBugSeverity(val)}
          options={SEVERITY_OPTIONS}
          style={{ flex: 1 }}
          disabled={formDisabled}
          placement="topLeft"
          getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
        />
        <Select
          placeholder="Category"
          value={addBugCategory}
          onChange={(val) => setAddBugCategory(val)}
          options={BUG_CATEGORY_OPTIONS}
          style={{ flex: 2 }}
          disabled={formDisabled}
          placement="topLeft"
          getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
        />
      </div>

      <AutoComplete
        placeholder={assigneeLoading ? 'Loading assignees...' : 'Assignee (email)'}
        value={addBugAssignee}
        onChange={setAddBugAssignee}
        options={assigneeOptions}
        style={{ width: '100%', marginBottom: 8 }}
        disabled={formDisabled}
        placement="topLeft"
        getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
        allowClear
        showSearch
        filterOption={(inputValue, option) =>
          option?.label?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
        }
      />

      <Tooltip
        title={
          !screen || !state
            ? 'Please select both a screen and state before adding a bug.'
            : undefined
        }
      >
        <Button
          type="primary"
          loading={loading}
          disabled={!canSubmit}
          onClick={handleSubmit}
          block
        >
          {submitLabel}
        </Button>
      </Tooltip>
    </div>
  );
};
