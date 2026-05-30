import type { ManualCapturedStep, ManualTestNote, ManualTestStepBug } from './manualTestStorage';
import type { ManualScreenshotCache } from './manualScreenshotCache';
import { isHighSignalStep } from './manualTestStepActions';

export const MAX_SCREENSHOT_UPLOADS = 20;

export type ManualInsertStep = {
  stepId?: string;
  stepCode: string;
  screenshotUrl?: string;
  notes?: ManualTestNote[];
  bugs?: ManualTestStepBug[];
};

function orderedUploadIds(uploadSet: Set<string>, steps: ManualCapturedStep[]): string[] {
  return steps.map((s) => s.stepId).filter((id) => uploadSet.has(id));
}

function stepNeedsScreenshotUpload(step: ManualCapturedStep): boolean {
  return (step.notes?.length ?? 0) > 0 || (step.bugs?.length ?? 0) > 0;
}

/** stepIds to upload (max 20); result is always in step index order. */
export function selectScreenshotUploadSet(
  steps: ManualCapturedStep[],
  cache: ManualScreenshotCache
): string[] {
  if (steps.length === 0) return [];

  const mandatory = new Set<string>();
  const lastStep = steps[steps.length - 1];
  if (cache[lastStep.stepId]) {
    mandatory.add(lastStep.stepId);
  }
  for (const step of steps) {
    if (stepNeedsScreenshotUpload(step) && cache[step.stepId]) {
      mandatory.add(step.stepId);
    }
  }

  let uploadSet = new Set(mandatory);
  if (uploadSet.size > MAX_SCREENSHOT_UPLOADS) {
    const pruned = orderedUploadIds(uploadSet, steps).slice(-MAX_SCREENSHOT_UPLOADS);
    return pruned;
  }
  if (uploadSet.size >= MAX_SCREENSHOT_UPLOADS) {
    return orderedUploadIds(uploadSet, steps);
  }

  const cachedIndices = steps
    .map((step, i) => (cache[step.stepId] ? i : -1))
    .filter((i) => i >= 0);

  const firstIdx = cachedIndices[0];
  if (firstIdx !== undefined) {
    uploadSet.add(steps[firstIdx].stepId);
  }

  if (uploadSet.size < MAX_SCREENSHOT_UPLOADS) {
    for (let i = 0; i < steps.length && uploadSet.size < MAX_SCREENSHOT_UPLOADS; i++) {
      const step = steps[i];
      if (cache[step.stepId] && !uploadSet.has(step.stepId) && isHighSignalStep(step.stepCode)) {
        uploadSet.add(step.stepId);
      }
    }
  }

  if (uploadSet.size < MAX_SCREENSHOT_UPLOADS) {
    const remaining = cachedIndices.filter((i) => !uploadSet.has(steps[i].stepId));
    const need = MAX_SCREENSHOT_UPLOADS - uploadSet.size;
    const stride = Math.max(1, Math.floor(remaining.length / Math.max(1, need)));
    for (let j = 0; j < remaining.length && uploadSet.size < MAX_SCREENSHOT_UPLOADS; j += stride) {
      uploadSet.add(steps[remaining[j]].stepId);
    }
    for (const i of remaining) {
      if (uploadSet.size >= MAX_SCREENSHOT_UPLOADS) break;
      uploadSet.add(steps[i].stepId);
    }
  }

  return orderedUploadIds(uploadSet, steps);
}

function serializeBugForInsert(stepBug: ManualTestStepBug) {
  const bug = stepBug.bug;
  return {
    bug: {
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      category: bug.category,
      location: bug.location,
      screen: bug.screen,
      screenState: bug.screenState,
      platform: bug.platform ?? 'WEB_EXECUTION_PLATFORM',
      ...(bug.artifactReference ? { artifactReference: bug.artifactReference } : {}),
    },
    ...(stepBug.assignee ? { assignee: stepBug.assignee } : {}),
  };
}

export function buildManualInsertSteps(
  steps: ManualCapturedStep[],
  uploadedUrlsByStepId: Record<string, string>
): ManualInsertStep[] {
  return steps.map((step) => ({
    stepId: step.stepId,
    stepCode: step.stepCode,
    ...(uploadedUrlsByStepId[step.stepId]
      ? { screenshotUrl: uploadedUrlsByStepId[step.stepId] }
      : {}),
    ...(step.notes?.length ? { notes: step.notes } : {}),
    ...(step.bugs?.length ? { bugs: step.bugs.map(serializeBugForInsert) } : {}),
  }));
}
