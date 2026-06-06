import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Typography, Popover, message, Collapse, Spin, Tooltip, Tabs, Segmented, Input, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  listAgentTestScenarios,
  listGithubBranches,
  insertManualTestRecord,
  listNamedTestRunsForPicker,
  getScreenStates,
  getScreenForPage,
  GithubBranchItem,
} from './apiService';
import { AgentTestScenarioWithStatus, ScreenStates } from './datas';
import { UI_BASE_URL } from './config';
import {
  MANUAL_STORAGE_KEYS,
  ManualCaptureSessionMeta,
  ManualCaptureMode,
  ManualCapturedStep,
  appendPastRecording,
  teardownManualCaptureSession,
  getManualCapturedSteps,
  getPastRecordings,
  ManualTestPastRecording,
  appendNoteToLatestStep,
  appendBugToLatestStep,
} from './manualTestStorage';
import { buildManualInsertSteps } from './manualTestFinish';
import { uploadManualTestScreenshots } from './manualTestUpload';
import { clearManualScreenshotCache, getManualScreenshots } from './manualScreenshotCache';
import {
  captureManualScreenshotNow,
  resetManualCaptureQueue,
} from './manualTestScreenshotHandler';
import { generateStepId, genGotoCommand } from './playwrightCodegen';
import { AnnotationInputSection } from './components/AnnotationInputSection';
import { ScreenStateSelector } from './components/ScreenStateSelector';
import { AddBugForm } from './bugs/AddBugForm';
import { useElementAreaSelections } from './useElementAreaSelections';
import type { CapturedStep } from './playwrightCodegen';

const { Text, Title } = Typography;

const sectionStyle: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 8,
  padding: 12,
  background: '#1a1a1a',
};

interface ManualTestTabProps {
  selectedEnvironment?: string;
  selectedRelease?: string;
  /** Increment from sidebar to reload scenarios, branches, and test runs. */
  refreshSignal?: number;
}

function scenarioLabel(s: AgentTestScenarioWithStatus): string {
  return s.scenario?.title || s.id || 'Untitled scenario';
}

function truncateStepCode(code: string, max = 72): string {
  const t = (code || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export const ManualTestTab: React.FC<ManualTestTabProps> = ({
  selectedEnvironment,
  selectedRelease,
  refreshSignal,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [captureMode, setCaptureMode] = useState<ManualCaptureMode>('scenario');
  const [objective, setObjective] = useState('');
  const [scenarios, setScenarios] = useState<AgentTestScenarioWithStatus[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>();
  const [branches, setBranches] = useState<GithubBranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>();
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [captureActive, setCaptureActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [endPopoverOpen, setEndPopoverOpen] = useState(false);
  const [pastRecordings, setPastRecordings] = useState<ManualTestPastRecording[]>([]);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [capturedSteps, setCapturedSteps] = useState<ManualCapturedStep[]>([]);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [addingBug, setAddingBug] = useState(false);
  const [annotationTab, setAnnotationTab] = useState<'note' | 'bug'>('note');
  const [annotationFeedback, setAnnotationFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [screenStates, setScreenStates] = useState<ScreenStates[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<string | undefined>();
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [screenStatesLoading, setScreenStatesLoading] = useState(false);
  const [selectedNamedTestRunIds, setSelectedNamedTestRunIds] = useState<string[]>([]);
  const [assignedTestRuns, setAssignedTestRuns] = useState<{ id: string; title: string }[]>([]);
  const [otherTestRuns, setOtherTestRuns] = useState<{ id: string; title: string }[]>([]);
  const [testRunsLoading, setTestRunsLoading] = useState(false);

  const {
    selections: noteSelections,
    startElementSelect,
    startAreaSelect,
    removeSelection,
    clearSelections,
  } = useElementAreaSelections({ maxSelections: 1 });

  const noteTextTrimmed = noteText.trim();
  const objectiveTrimmed = objective.trim();
  const canAddNote = noteTextTrimmed.length > 0 && !addingNote && !submitting && !addingBug;
  const canStartCapture =
    captureMode === 'scenario'
      ? !!selectedScenarioId && !submitting
      : objectiveTrimmed.length > 0 && !submitting;

  const loadScreenStates = useCallback(async () => {
    setScreenStatesLoading(true);
    try {
      const data = await getScreenStates();
      setScreenStates(data.screenStates || []);
    } catch {
      setScreenStates([]);
    } finally {
      setScreenStatesLoading(false);
    }
  }, []);

  const fetchScreenForCurrentPage = useCallback(async () => {
    try {
      const res = await getScreenForPage({ url: window.location.href });
      if (res.screenName) {
        setSelectedScreen(res.screenName);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadScenarios = useCallback(async () => {
    setScenariosLoading(true);
    try {
      const res = await listAgentTestScenarios({ priorities: [], screenStates: [], title: undefined });
      const sorted = (res.scenarios || [])
        .slice()
        .sort((a, b) =>
          scenarioLabel(a).localeCompare(scenarioLabel(b), undefined, { sensitivity: 'base' })
        );
      setScenarios(sorted);
    } catch {
      setScenarios([]);
    } finally {
      setScenariosLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async (options?: { preserveSelection?: boolean }) => {
    setBranchesLoading(true);
    try {
      const res = await listGithubBranches();
      const list = res.branches || [];
      setBranches(list);
      setSelectedBranchId((current) => {
        if (options?.preserveSelection && current != null) {
          const stillValid = list.some((b) => (b.branchId ?? b.id) === current);
          if (stillValid) return current;
        }
        const defaultBranch = list.find((b) => b.isDefault || b.name === res.defaultBranch);
        if (defaultBranch?.branchId ?? defaultBranch?.id) {
          return defaultBranch.branchId ?? defaultBranch.id;
        }
        if (res.selectedBranchId) {
          return res.selectedBranchId;
        }
        return undefined;
      });
    } catch {
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const openCreateForm = () => {
    setShowForm(true);
    setSelectedNamedTestRunIds([]);
    loadScenarios();
    loadNamedTestRuns();
  };

  const loadNamedTestRuns = useCallback(async () => {
    setTestRunsLoading(true);
    try {
      const res = await listNamedTestRunsForPicker();
      const toOption = (item: { id?: string; title?: string }) => ({
        id: item.id ?? '',
        title: item.title ?? 'Untitled test run',
      });
      setAssignedTestRuns((res.assignedToMe ?? []).map(toOption).filter((o) => o.id));
      setOtherTestRuns((res.other ?? []).map(toOption).filter((o) => o.id));
    } catch (e) {
      console.error('[ManualTest] failed to load named test runs', e);
      setAssignedTestRuns([]);
      setOtherTestRuns([]);
    } finally {
      setTestRunsLoading(false);
    }
  }, []);

  const refreshCapturedSteps = useCallback(() => {
    getManualCapturedSteps().then(setCapturedSteps);
  }, []);

  const collapseSidebar = useCallback(() => {
    window.postMessage({ type: 'tc-hide-sidebar' }, '*');
  }, []);

  useEffect(() => {
    if (!refreshSignal) return;
    loadScenarios();
    loadBranches({ preserveSelection: true });
    loadNamedTestRuns();
  }, [refreshSignal, loadScenarios, loadBranches, loadNamedTestRuns]);

  useEffect(() => {
    loadBranches();
    getPastRecordings().then(setPastRecordings);
    chrome.storage.local.get(
      [MANUAL_STORAGE_KEYS.CAPTURE_IN_PROGRESS, MANUAL_STORAGE_KEYS.SESSION_META],
      (items) => {
        if (items[MANUAL_STORAGE_KEYS.CAPTURE_IN_PROGRESS]) {
          setCaptureActive(true);
          setShowForm(true);
          collapseSidebar();
          const meta = items[MANUAL_STORAGE_KEYS.SESSION_META] as ManualCaptureSessionMeta | undefined;
          if (meta?.mode === 'open_ended') {
            setCaptureMode('open_ended');
            setObjective(meta.objective || '');
          } else {
            setCaptureMode('scenario');
            if (meta?.scenarioId) {
              setSelectedScenarioId(meta.scenarioId);
            }
          }
          refreshCapturedSteps();
          loadScreenStates().then(() => fetchScreenForCurrentPage());
        }
      }
    );
  }, [loadBranches, refreshCapturedSteps, collapseSidebar, loadScreenStates, fetchScreenForCurrentPage]);

  useEffect(() => {
    if (!captureActive) return;
    loadScreenStates().then(() => fetchScreenForCurrentPage());
  }, [captureActive, loadScreenStates, fetchScreenForCurrentPage]);

  useEffect(() => {
    if (!selectedScreen) {
      setSelectedState(undefined);
    }
  }, [selectedScreen]);

  useEffect(() => {
    if (!captureActive) return;
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      if (changes[MANUAL_STORAGE_KEYS.CAPTURED_STEPS]) {
        setCapturedSteps(changes[MANUAL_STORAGE_KEYS.CAPTURED_STEPS].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    refreshCapturedSteps();
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [captureActive, refreshCapturedSteps]);

  useEffect(() => {
    if (!successLink) return;
    const timer = setTimeout(() => setSuccessLink(null), 10_000);
    return () => clearTimeout(timer);
  }, [successLink]);

  useEffect(() => {
    if (!annotationFeedback) return;
    const timer = setTimeout(() => setAnnotationFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [annotationFeedback]);

  const scenarioOptions = useMemo(
    () =>
      scenarios.map((s) => ({
        value: s.id!,
        label: scenarioLabel(s),
      })),
    [scenarios]
  );

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: b.branchId ?? b.id,
        label: b.name || String(b.branchId ?? b.id),
      })),
    [branches]
  );

  const hasRepo = branches.length > 0;

  const startCapture = async () => {
    if (captureMode === 'scenario' && !selectedScenarioId) {
      message.error('Select a test scenario');
      return;
    }
    if (captureMode === 'open_ended' && !objectiveTrimmed) {
      message.error('Enter an objective');
      return;
    }

    const scenario = scenarios.find((s) => s.id === selectedScenarioId);
    const meta: ManualCaptureSessionMeta = {
      mode: captureMode,
      branchId: selectedBranchId,
      environment: selectedEnvironment,
      release: selectedRelease,
      ...(captureMode === 'scenario'
        ? {
            scenarioId: selectedScenarioId,
            scenarioTitle: scenario ? scenarioLabel(scenario) : undefined,
          }
        : { objective: objectiveTrimmed }),
    };

    const url = window.location.href || 'about:blank';
    const stepId = generateStepId();
    const stepCode = genGotoCommand(url)[0];
    const initialCapturedStep: ManualCapturedStep = { stepId, stepCode };
    const initialSteps: CapturedStep[] = [
      {
        id: stepId,
        commands: [stepCode],
        timestamp: 0,
      },
    ];

    await clearManualScreenshotCache();
    resetManualCaptureQueue();

    await new Promise<void>((resolve) => {
      chrome.storage.local.set(
        {
          [MANUAL_STORAGE_KEYS.CAPTURE_IN_PROGRESS]: true,
          [MANUAL_STORAGE_KEYS.CAPTURE_MODE]: true,
          [MANUAL_STORAGE_KEYS.CAPTURED_STEPS]: [initialCapturedStep],
          [MANUAL_STORAGE_KEYS.SESSION_META]: meta,
          stepCaptureInProgress: true,
        },
        () => resolve()
      );
    });

    setCapturedSteps([initialCapturedStep]);
    collapseSidebar();
    chrome.runtime.sendMessage(
      {
        type: 'start_step_capture_from_sidebar',
        manual: true,
        initialSteps,
      },
      () => {
        setCaptureActive(true);
        setStatusMessage(null);
        setSuccessLink(null);
      }
    );
  };

  const stopCapture = async (options?: { keepCaptureUi?: boolean; restoreSidebar?: boolean }) => {
    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'stop_step_capture_from_sidebar' }, () => {
        if (options?.restoreSidebar) {
          window.postMessage({ type: 'tc-show-sidebar' }, '*');
        }
        chrome.storage.local.set({ stepCaptureInProgress: false }, () => resolve());
      });
    });
    if (!options?.keepCaptureUi) {
      setCaptureActive(false);
    }
  };

  const captureScreenshotForLatestStepIfNeeded = async (
    latest: ManualCapturedStep,
    hasBoundingBox: boolean
  ): Promise<'captured' | 'failed' | 'skipped'> => {
    const cache = await getManualScreenshots();
    const needsCapture = !cache[latest.stepId];
    const needsReshoot = hasBoundingBox;
    if (!needsCapture && !needsReshoot) {
      return 'skipped';
    }
    const ok = await captureManualScreenshotNow(latest.stepId, {
      skipDomStability: true,
      stepCode: latest.stepCode,
      restoreSidebarAfterCapture: true,
    });
    return ok ? 'captured' : 'failed';
  };

  const handleAddNote = async () => {
    if (!noteTextTrimmed) return;

    const steps = await getManualCapturedSteps();
    if (steps.length === 0) {
      console.error('[ManualTest] Add note with empty steps — unexpected');
      return;
    }

    const latest = steps[steps.length - 1];
    const hasSelection = noteSelections.length > 0;
    const boundingBox = hasSelection ? noteSelections[0].boundingBox : undefined;
    const note = { text: noteTextTrimmed, boundingBox };

    setAddingNote(true);
    setAnnotationFeedback(null);
    try {
      const captureResult = await captureScreenshotForLatestStepIfNeeded(latest, !!boundingBox);
      await appendNoteToLatestStep(note);
      setNoteText('');
      clearSelections();
      refreshCapturedSteps();
      if (captureResult === 'failed') {
        setAnnotationFeedback({
          type: 'warning',
          text: 'Note added to latest step. Screenshot capture failed.',
        });
      } else {
        setAnnotationFeedback({
          type: 'success',
          text: 'Note added to latest step.',
        });
      }
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddBug = async (values: { bug: import('./datas').Bug; assignee?: string }) => {
    const steps = await getManualCapturedSteps();
    if (steps.length === 0) {
      message.error('No captured steps to attach bug to');
      throw new Error('No captured steps');
    }

    const latest = steps[steps.length - 1];
    const boundingBoxes =
      values.bug.artifactReference?.screenshotReference?.boundingBoxes || [];
    const hasBoundingBox = boundingBoxes.length > 0;

    setAddingBug(true);
    setAnnotationFeedback(null);
    try {
      const captureResult = await captureScreenshotForLatestStepIfNeeded(latest, hasBoundingBox);
      await appendBugToLatestStep({ bug: values.bug, assignee: values.assignee });
      refreshCapturedSteps();
      if (captureResult === 'failed') {
        setAnnotationFeedback({
          type: 'warning',
          text: 'Bug added to latest step. Screenshot capture failed.',
        });
      } else {
        setAnnotationFeedback({
          type: 'success',
          text: 'Bug added to latest step.',
        });
      }
    } catch (e) {
      setAnnotationFeedback({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to add bug',
      });
      throw e;
    } finally {
      setAddingBug(false);
    }
  };

  const cancelCapture = async () => {
    setEndPopoverOpen(false);
    setShowForm(false);
    try {
      await stopCapture({ restoreSidebar: true });
      await teardownManualCaptureSession();
      setCapturedSteps([]);
      setStatusMessage(null);
      setSuccessLink(null);
      message.info('Capture cancelled');
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Failed to cancel capture';
      message.error(err);
    } finally {
      setCaptureActive(false);
      setShowForm(false);
    }
  };

  const finishWithResult = async (passed: boolean) => {
    setEndPopoverOpen(false);
    setSubmitting(true);
    setStatusMessage(null);
    setSuccessLink(null);
    try {
      setStatusMessage('Finalizing capture...');
      await stopCapture({ keepCaptureUi: true });
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ type: 'wait_manual_screenshot_queue' }, () => resolve());
      });
      window.postMessage({ type: 'tc-show-sidebar' }, '*');

      const steps = await getManualCapturedSteps();
      if (steps.length === 0) {
        console.error('[ManualTest] finish with no steps — unexpected');
      }

      const uploadedUrlsByStepId = await uploadManualTestScreenshots({
        steps,
        onProgress: (done, total) => {
          if (total > 0) {
            setStatusMessage(`Uploading screenshots (${done}/${total})...`);
          }
        },
      });

      const insertSteps = buildManualInsertSteps(steps, uploadedUrlsByStepId);
      const withScreenshots = insertSteps.filter((s) => s.screenshotUrl).length;
      if (withScreenshots === 0 && insertSteps.length > 0) {
        message.warning('No screenshots were uploaded; saving steps without images.');
      }

      setStatusMessage('Creating manual test record...');
      const meta = await new Promise<ManualCaptureSessionMeta | undefined>((resolve) => {
        chrome.storage.local.get([MANUAL_STORAGE_KEYS.SESSION_META], (r) => {
          resolve(r[MANUAL_STORAGE_KEYS.SESSION_META] as ManualCaptureSessionMeta | undefined);
        });
      });

      const isOpenEnded = meta?.mode === 'open_ended' || captureMode === 'open_ended';
      const recordingTitle =
        meta?.scenarioTitle ||
        meta?.objective ||
        (isOpenEnded ? objectiveTrimmed : undefined);

      const insertResp = await insertManualTestRecord({
        ...(isOpenEnded
          ? { executionTitle: meta?.objective || objectiveTrimmed }
          : { testScenarioId: meta?.scenarioId || selectedScenarioId! }),
        branchId: meta?.branchId ?? selectedBranchId,
        environment: meta?.environment || selectedEnvironment,
        release: meta?.release || selectedRelease,
        platform: 'WEB_EXECUTION_PLATFORM',
        result: passed ? 'SMART_TEST_EXECUTION_COMPLETED' : 'SMART_TEST_EXECUTION_FAILED',
        steps: insertSteps,
        ...(selectedNamedTestRunIds.length > 0 ? { namedTestRunIds: selectedNamedTestRunIds } : {}),
      });

      if (insertResp.id) {
        const link = `${UI_BASE_URL}/smart-test-execution?job_id=${encodeURIComponent(insertResp.id)}&test_type=manual`;
        setSuccessLink(link);
        await appendPastRecording({
          id: insertResp.id,
          scenarioTitle: recordingTitle,
          createdAt: Date.now(),
        });
        const past = await getPastRecordings();
        setPastRecordings(past);
      }
      message.success('Manual test record created');
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Failed to save manual test record';
      message.error(err);
    } finally {
      await teardownManualCaptureSession();
      setCaptureActive(false);
      setCapturedSteps([]);
      setStatusMessage(null);
      setSubmitting(false);
      setShowForm(false);
    }
  };

  const endCaptureContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
      <Button
        type="text"
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        onClick={() => finishWithResult(true)}
        style={{ textAlign: 'left' }}
      >
        Mark as passed
      </Button>
      <Button
        type="text"
        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        onClick={() => finishWithResult(false)}
        style={{ textAlign: 'left' }}
      >
        Mark as failed
      </Button>
      <Button
        type="text"
        icon={<StopOutlined style={{ color: '#888' }} />}
        onClick={cancelCapture}
        style={{ textAlign: 'left' }}
      >
        Cancel capture
      </Button>
    </div>
  );

  const annotationTabItems = [
    {
      key: 'note',
      label: 'Add note',
      children: (
        <>
          <AnnotationInputSection
            text={noteText}
            onTextChange={setNoteText}
            selections={noteSelections}
            onAddElement={startElementSelect}
            onAddArea={startAreaSelect}
            onRemoveSelection={removeSelection}
            disabled={addingNote || addingBug || submitting}
            textPlaceholder="Note for latest step…"
            elementButtonLabel="Attach Element"
            areaButtonLabel="Attach Area"
          />
          <Button
            type="default"
            onClick={handleAddNote}
            loading={addingNote}
            disabled={!canAddNote}
            block
            style={{ marginTop: 10 }}
          >
            Add Note
          </Button>
        </>
      ),
    },
    {
      key: 'bug',
      label: 'Add bug',
      children: (
        <>
          <ScreenStateSelector
            screenStates={screenStates}
            selectedScreen={selectedScreen}
            setSelectedScreen={setSelectedScreen}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            onScreenStatesRefresh={loadScreenStates}
            disableScreenSelect={screenStatesLoading}
            disableStateSelect={screenStatesLoading}
          />
          <AddBugForm
            screen={selectedScreen}
            state={selectedState}
            loading={addingBug}
            disabled={submitting}
            onSubmit={handleAddBug}
          />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {!showForm && !captureActive && (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm} block>
          Create Manual Test Record
        </Button>
      )}

      {captureActive || submitting ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <section
            style={{
              ...sectionStyle,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Title level={5} style={{ color: '#ccc', margin: '0 0 8px', fontSize: 13, flexShrink: 0 }}>
              Captured steps
            </Title>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {capturedSteps.map((step, i) => (
                <div
                  key={step.stepId}
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    marginBottom: 6,
                    color: '#ccc',
                  }}
                >
                  <span style={{ color: '#888', marginRight: 6 }}>{i + 1}.</span>
                  {truncateStepCode(step.stepCode)}
                  {(step.notes?.length ?? 0) > 0 && (
                    <span style={{ marginLeft: 6, color: '#e6c200', fontSize: 10 }}>
                      ({step.notes!.length} note{step.notes!.length > 1 ? 's' : ''})
                    </span>
                  )}
                  {(step.bugs?.length ?? 0) > 0 && (
                    <span style={{ marginLeft: 6, color: '#ff7875', fontSize: 10 }}>
                      ({step.bugs!.length} bug{step.bugs!.length > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...sectionStyle, flexShrink: 0 }}>
            {annotationFeedback && (
              <Alert
                type={annotationFeedback.type}
                message={annotationFeedback.text}
                showIcon
                closable
                onClose={() => setAnnotationFeedback(null)}
                style={{ marginBottom: 8 }}
              />
            )}
            <Tabs
              activeKey={annotationTab}
              onChange={(key) => setAnnotationTab(key as 'note' | 'bug')}
              size="small"
              items={annotationTabItems}
            />
          </section>

          {!submitting && (
            <section style={{ ...sectionStyle, flexShrink: 0 }}>
              <Popover
                content={endCaptureContent}
                trigger="click"
                open={endPopoverOpen}
                onOpenChange={setEndPopoverOpen}
              >
                <Button type="primary" danger block>
                  End capture
                </Button>
              </Popover>
            </section>
          )}
        </div>
      ) : (
        showForm && (
          <>
            <div>
              <Text style={{ color: '#aaa', fontSize: 12 }}>Capture type</Text>
              <Segmented
                block
                style={{ marginTop: 4 }}
                value={captureMode}
                onChange={(v) => setCaptureMode(v as ManualCaptureMode)}
                options={[
                  { label: 'Test a scenario', value: 'scenario' },
                  { label: 'Open-ended', value: 'open_ended' },
                ]}
              />
            </div>
            {captureMode === 'scenario' ? (
              <div>
                <Text style={{ color: '#aaa', fontSize: 12 }}>Test scenario</Text>
                <Tooltip
                  title={
                    scenarioOptions.find((o) => o.value === selectedScenarioId)?.label ??
                    undefined
                  }
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Search scenarios"
                    options={scenarioOptions}
                    value={selectedScenarioId}
                    onChange={setSelectedScenarioId}
                    loading={scenariosLoading}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </Tooltip>
              </div>
            ) : (
              <div>
                <Text style={{ color: '#aaa', fontSize: 12 }}>Objective</Text>
                <Input
                  placeholder="What are you exploring?"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
            )}
            <div>
              <Text style={{ color: '#aaa', fontSize: 12 }}>Git branch</Text>
              <Select
                showSearch
                placeholder={hasRepo ? 'Select branch' : 'No repo connected'}
                options={branchOptions}
                value={selectedBranchId}
                onChange={(v) => setSelectedBranchId(v)}
                disabled={!hasRepo || branchesLoading}
                loading={branchesLoading}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            {(assignedTestRuns.length > 0 || otherTestRuns.length > 0) && (
              <div>
                <Text style={{ color: '#aaa', fontSize: 12 }}>Named test runs (optional)</Text>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Link to test runs"
                  value={selectedNamedTestRunIds}
                  onChange={setSelectedNamedTestRunIds}
                  loading={testRunsLoading}
                  style={{ width: '100%', marginTop: 4 }}
                  optionFilterProp="label"
                >
                  {assignedTestRuns.length > 0 && (
                    <Select.OptGroup label="Assigned to me">
                      {assignedTestRuns.map((run) => (
                        <Select.Option key={run.id} value={run.id} label={run.title}>
                          {run.title}
                        </Select.Option>
                      ))}
                    </Select.OptGroup>
                  )}
                  {otherTestRuns.length > 0 && (
                    <Select.OptGroup label="Other">
                      {otherTestRuns.map((run) => (
                        <Select.Option key={run.id} value={run.id} label={run.title}>
                          {run.title}
                        </Select.Option>
                      ))}
                    </Select.OptGroup>
                  )}
                </Select>
              </div>
            )}
            <Button
              type="primary"
              onClick={startCapture}
              disabled={!canStartCapture}
              block
            >
              Start Capture
            </Button>
          </>
        )
      )}

      {statusMessage && (
        <div style={{ textAlign: 'center' }}>
          <Spin size="small" style={{ marginRight: 8 }} />
          <Text style={{ color: '#e6c200' }}>{statusMessage}</Text>
        </div>
      )}

      {successLink && !captureActive && (
        <div>
          <Text style={{ color: '#aaa' }}>Record saved. </Text>
          <a
            href={successLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#52c41a', textDecoration: 'underline' }}
          >
            View execution
          </a>
        </div>
      )}

      {pastRecordings.length > 0 && !captureActive && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'past',
              label: <Text style={{ color: '#e6c200' }}>Past manual recordings</Text>,
              children: (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {pastRecordings.map((r) => (
                    <li key={r.id} style={{ marginBottom: 6 }}>
                      <a
                        href={`${UI_BASE_URL}/smart-test-execution?job_id=${encodeURIComponent(r.id)}&test_type=manual`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#aaa' }}
                      >
                        {r.scenarioTitle || r.id}
                      </a>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};
