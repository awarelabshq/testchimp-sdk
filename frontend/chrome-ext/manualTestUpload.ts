import { uploadScreenshot } from './apiService';
import { captureManualTestStepScreenshot } from './screenshotUtils';
import type { ManualCapturedStep } from './manualTestStorage';
import { setStepScreenshotUrl } from './manualTestStorage';
import {
  getManualScreenshots,
  setManualScreenshot,
  deleteManualScreenshot,
  type ManualScreenshotCache,
} from './manualScreenshotCache';
import { selectScreenshotUploadSet } from './manualTestFinish';

const UPLOAD_INTER_STEP_MS = 250;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Ensures the last step has a cache entry (end-of-session capture only). */
export async function ensureLastStepScreenshotAtFinish(
  steps: ManualCapturedStep[],
  cache: ManualScreenshotCache
): Promise<ManualScreenshotCache> {
  if (steps.length === 0) return cache;
  const last = steps[steps.length - 1];
  if (cache[last.stepId]) return cache;

  const dataUrl = await captureManualTestStepScreenshot({
    keepSidebarHidden: true,
    showCaptureBanner: false,
  });
  if (!dataUrl) return cache;

  await setManualScreenshot(last.stepId, dataUrl);
  return { ...cache, [last.stepId]: dataUrl };
}

export async function uploadManualTestScreenshots(options: {
  steps: ManualCapturedStep[];
  onProgress?: (done: number, total: number) => void;
}): Promise<Record<string, string>> {
  let cache = await getManualScreenshots();
  cache = await ensureLastStepScreenshotAtFinish(options.steps, cache);

  const uploadStepIds = selectScreenshotUploadSet(options.steps, cache);
  const uploadedUrlsByStepId: Record<string, string> = {};
  const total = uploadStepIds.length;
  let uploadedCount = 0;

  options.onProgress?.(0, total);

  for (let i = 0; i < uploadStepIds.length; i++) {
    const stepId = uploadStepIds[i];
    const dataUrl = cache[stepId];
    if (!dataUrl) continue;

    try {
      const { gcpPath } = await uploadScreenshot(dataUrl, stepId);
      if (gcpPath) {
        uploadedUrlsByStepId[stepId] = gcpPath;
        await setStepScreenshotUrl(stepId, gcpPath);
        await deleteManualScreenshot(stepId);
        uploadedCount++;
        options.onProgress?.(uploadedCount, total);
      }
    } catch (err) {
      console.error('[ManualTest] upload failed for', stepId, err);
    }

    if (i < uploadStepIds.length - 1) {
      await sleep(UPLOAD_INTER_STEP_MS);
    }
  }

  return uploadedUrlsByStepId;
}
