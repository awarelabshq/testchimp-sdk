import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Typography, Popover, message, Collapse, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  listAgentTestScenarios,
  listGithubBranches,
  insertManualTestRecord,
  GithubBranchItem,
} from './apiService';
import { AgentTestScenarioWithStatus } from './datas';
import { UI_BASE_URL } from './config';
import {
  MANUAL_STORAGE_KEYS,
  ManualCaptureSessionMeta,
  ManualCapturedStep,
  appendPastRecording,
  teardownManualCaptureSession,
  getManualCapturedSteps,
  getPastRecordings,
  ManualTestPastRecording,
  appendNoteToLatestStep,
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
}) => {
  const [showForm, setShowForm] = useState(false);
  const [scenarios, setScenarios] = useState<AgentTestScenarioWithStatus[]>([]);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>();
  const [branches, setBranches] = useState<GithubBranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>();
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [captureActive, setCaptureActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [endPopoverOpen, setEndPopoverOpen] = useState(false);
  const [pastRecordings, setPastRecordings] = useState<ManualTestPastRecording[]>([]);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [capturedSteps, setCapturedSteps] = useState<ManualCapturedStep[]>([]);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const {
    selections: noteSelections,
    startElementSelect,
    startAreaSelect,
    removeSelection,
    clearSelections,
  } = useElementAreaSelections({ maxSelections: 1 });

  const noteTextTrimmed = noteText.trim();
  const canAddNote = noteTextTrimmed.length > 0 && !addingNote && !submitting;

  const loadScenarios = useCallback(async (title?: string) => {
    const res = await listAgentTestScenarios({ priorities: [], screenStates: [], title });
    setScenarios(res.scenarios || []);
  }, []);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const res = await listGithubBranches();
      setBranches(res.branches || []);
      const defaultBranch = (res.branches || []).find(
        (b) => b.isDefault || b.name === res.defaultBranch
      );
      if (defaultBranch?.branchId ?? defaultBranch?.id) {
        setSelectedBranchId(defaultBranch.branchId ?? defaultBranch.id);
      } else if (res.selectedBranchId) {
        setSelectedBranchId(res.selectedBranchId);
      }
    } catch {
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const refreshCapturedSteps = useCallback(() => {
    getManualCapturedSteps().then(setCapturedSteps);
  }, []);

  const collapseSidebar = useCallback(() => {
    window.postMessage({ type: 'tc-hide-sidebar' }, '*');
  }, []);

  useEffect(() => {
    loadScenarios();
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
          if (meta?.scenarioId) {
            setSelectedScenarioId(meta.scenarioId);
          }
          refreshCapturedSteps();
        }
      }
    );
  }, [loadScenarios, loadBranches, refreshCapturedSteps, collapseSidebar]);

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
    const timer = setTimeout(() => {
      loadScenarios(scenarioSearch || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [scenarioSearch, loadScenarios]);

  useEffect(() => {
    if (!successLink) return;
    const timer = setTimeout(() => setSuccessLink(null), 10_000);
    return () => clearTimeout(timer);
  }, [successLink]);

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
    if (!selectedScenarioId) {
      message.error('Select a test scenario');
      return;
    }
    const scenario = scenarios.find((s) => s.id === selectedScenarioId);
    const meta: ManualCaptureSessionMeta = {
      scenarioId: selectedScenarioId,
      scenarioTitle: scenario ? scenarioLabel(scenario) : undefined,
      branchId: selectedBranchId,
      environment: selectedEnvironment,
      release: selectedRelease,
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
    try {
      const cache = await getManualScreenshots();
      const needsCapture = !cache[latest.stepId];
      const needsReshoot = !!boundingBox;

      if (needsCapture || needsReshoot) {
        const ok = await captureManualScreenshotNow(latest.stepId, {
          skipDomStability: true,
          stepCode: latest.stepCode,
        });
        if (!ok) {
          message.warning('Screenshot capture failed; note saved without image.');
        }
      }

      await appendNoteToLatestStep(note);
      message.success('Note added to latest step');
      setNoteText('');
      clearSelections();
      refreshCapturedSteps();
    } finally {
      setAddingNote(false);
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
      // Restore sidebar for upload / save progress (stays collapsed during active capture).
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

      const insertResp = await insertManualTestRecord({
        testScenarioId: meta?.scenarioId || selectedScenarioId!,
        branchId: meta?.branchId ?? selectedBranchId,
        environment: meta?.environment || selectedEnvironment,
        release: meta?.release || selectedRelease,
        platform: 'WEB_EXECUTION_PLATFORM',
        result: passed ? 'SMART_TEST_EXECUTION_COMPLETED' : 'SMART_TEST_EXECUTION_FAILED',
        steps: insertSteps,
      });

      if (insertResp.id) {
        const link = `${UI_BASE_URL}/smart-test-execution?job_id=${encodeURIComponent(insertResp.id)}&test_type=manual`;
        setSuccessLink(link);
        await appendPastRecording({
          id: insertResp.id,
          scenarioTitle: meta?.scenarioTitle,
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
    </div>
  );

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {!showForm && !captureActive && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)} block>
          Create Manual Test Record
        </Button>
      )}

      {captureActive || submitting ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section style={sectionStyle}>
            <Title level={5} style={{ color: '#ccc', margin: '0 0 8px', fontSize: 13 }}>
              Captured steps
            </Title>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
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
                </div>
              ))}
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ color: '#ccc', margin: '0 0 8px', fontSize: 13 }}>
              Add note
            </Title>
            <AnnotationInputSection
              text={noteText}
              onTextChange={setNoteText}
              selections={noteSelections}
              onAddElement={startElementSelect}
              onAddArea={startAreaSelect}
              onRemoveSelection={removeSelection}
              disabled={addingNote || submitting}
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
          </section>

          {!submitting && (
            <section style={sectionStyle}>
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
              <Text style={{ color: '#aaa', fontSize: 12 }}>Test scenario</Text>
              <Select
                showSearch
                filterOption={false}
                onSearch={setScenarioSearch}
                placeholder="Search scenarios"
                options={scenarioOptions}
                value={selectedScenarioId}
                onChange={setSelectedScenarioId}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
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
            <Button
              type="primary"
              onClick={startCapture}
              disabled={!selectedScenarioId || submitting}
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
