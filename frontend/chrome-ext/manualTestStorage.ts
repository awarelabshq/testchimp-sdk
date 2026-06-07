import type { BoundingBox, Bug } from './datas';
import { clearManualScreenshotCache } from './manualScreenshotCache';
import { resetManualCaptureQueue } from './manualTestScreenshotHandler';

export const MANUAL_STORAGE_KEYS = {
  CAPTURE_IN_PROGRESS: 'manualCaptureInProgress',
  CAPTURE_MODE: 'manualCaptureMode',
  CAPTURED_STEPS: 'manualCapturedSteps',
  SESSION_META: 'manualCaptureSessionMeta',
  PAST_RECORDINGS: 'manualTestPastRecordings',
} as const;

export type ManualCaptureMode = 'scenario' | 'open_ended';

export interface ManualCaptureScenarioRef {
  id: string;
  title: string;
}

export interface ManualCaptureSessionMeta {
  mode: ManualCaptureMode;
  scenarioId?: string;
  scenarioTitle?: string;
  scenarioIds?: string[];
  scenarios?: ManualCaptureScenarioRef[];
  objective?: string;
  branchId?: number;
  environment?: string;
  release?: string;
}

export interface ManualTestNote {
  text: string;
  boundingBox?: BoundingBox;
}

export interface ManualTestStepBug {
  bug: Bug;
  assignee?: string;
}

export interface ManualCapturedStep {
  stepId: string;
  stepCode: string;
  notes?: ManualTestNote[];
  bugs?: ManualTestStepBug[];
  screenshotUrl?: string;
}

export interface ManualTestPastRecording {
  id: string;
  scenarioTitle?: string;
  createdAt: number;
}

export async function getManualCapturedSteps(): Promise<ManualCapturedStep[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([MANUAL_STORAGE_KEYS.CAPTURED_STEPS], (result) => {
      resolve(result[MANUAL_STORAGE_KEYS.CAPTURED_STEPS] || []);
    });
  });
}

export async function setManualCapturedSteps(steps: ManualCapturedStep[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MANUAL_STORAGE_KEYS.CAPTURED_STEPS]: steps }, () => resolve());
  });
}

export async function appendNoteToLatestStep(note: ManualTestNote): Promise<void> {
  const steps = await getManualCapturedSteps();
  if (steps.length === 0) return;
  const last = steps[steps.length - 1];
  steps[steps.length - 1] = { ...last, notes: [...(last.notes || []), note] };
  await setManualCapturedSteps(steps);
}

export async function appendBugToLatestStep(stepBug: ManualTestStepBug): Promise<void> {
  const steps = await getManualCapturedSteps();
  if (steps.length === 0) return;
  const last = steps[steps.length - 1];
  steps[steps.length - 1] = { ...last, bugs: [...(last.bugs || []), stepBug] };
  await setManualCapturedSteps(steps);
}

export async function setStepScreenshotUrl(stepId: string, screenshotUrl: string): Promise<void> {
  const steps = await getManualCapturedSteps();
  const idx = steps.findIndex((s) => s.stepId === stepId);
  if (idx >= 0) {
    steps[idx] = { ...steps[idx], screenshotUrl };
    await setManualCapturedSteps(steps);
  }
}

export async function clearManualCaptureState(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [MANUAL_STORAGE_KEYS.CAPTURE_IN_PROGRESS]: false,
        [MANUAL_STORAGE_KEYS.CAPTURE_MODE]: false,
        [MANUAL_STORAGE_KEYS.CAPTURED_STEPS]: [],
        [MANUAL_STORAGE_KEYS.SESSION_META]: null,
      },
      () => resolve()
    );
  });
}

export async function teardownManualCaptureSession(): Promise<void> {
  await clearManualScreenshotCache();
  resetManualCaptureQueue();
  await clearManualCaptureState();
}

export async function appendPastRecording(entry: ManualTestPastRecording): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get([MANUAL_STORAGE_KEYS.PAST_RECORDINGS], (result) => {
      const existing: ManualTestPastRecording[] = result[MANUAL_STORAGE_KEYS.PAST_RECORDINGS] || [];
      const updated = [entry, ...existing].slice(0, 10);
      chrome.storage.local.set({ [MANUAL_STORAGE_KEYS.PAST_RECORDINGS]: updated }, () => resolve());
    });
  });
}

export async function getPastRecordings(): Promise<ManualTestPastRecording[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([MANUAL_STORAGE_KEYS.PAST_RECORDINGS], (result) => {
      resolve(result[MANUAL_STORAGE_KEYS.PAST_RECORDINGS] || []);
    });
  });
}
