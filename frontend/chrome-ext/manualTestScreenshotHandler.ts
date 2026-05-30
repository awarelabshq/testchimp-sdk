import { captureManualTestStepScreenshot } from './screenshotUtils';
import { waitForDomStability } from './domStability';
import { shouldCaptureScreenshot, shouldWaitForDomStability } from './manualTestStepActions';
import { setManualScreenshot } from './manualScreenshotCache';

let captureQueue: Promise<void> = Promise.resolve();

export function waitForManualCaptureQueue(): Promise<void> {
  return captureQueue;
}

export function resetManualCaptureQueue(): void {
  captureQueue = Promise.resolve();
}

function enqueueCapture(task: () => Promise<void>): void {
  captureQueue = captureQueue.then(task).catch((err) => {
    console.error('[ManualTest] capture queue task failed', err);
  });
}

async function captureAndCache(
  stepId: string,
  stepCode: string,
  skipDomStability: boolean,
  keepSidebarHidden = true,
  showCaptureBanner = false
): Promise<boolean> {
  if (!skipDomStability && shouldWaitForDomStability(stepCode)) {
    await waitForDomStability();
  }
  // Auto step captures keep the sidebar hidden; user-initiated note/bug captures restore it.
  const dataUrl = await captureManualTestStepScreenshot({ keepSidebarHidden, showCaptureBanner });
  if (!dataUrl) {
    console.warn('[ManualTest] capture empty for step', stepCode || stepId);
    return false;
  }
  await setManualScreenshot(stepId, dataUrl);
  return true;
}

/** Capture screenshot locally (no upload); keyed by stepId in background cache. */
export function enqueueManualStepScreenshot(stepId: string, stepCode: string): void {
  if (!shouldCaptureScreenshot(stepCode)) return;
  enqueueCapture(() => captureAndCache(stepId, stepCode, false));
}

/** Immediate capture for note add / finish; serialized through the same queue. */
export function captureManualScreenshotNow(
  stepId: string,
  options?: {
    skipDomStability?: boolean;
    stepCode?: string;
    /** Re-expand sidebar after capture (e.g. user clicked Add bug/note from the panel). */
    restoreSidebarAfterCapture?: boolean;
  }
): Promise<boolean> {
  const skipDomStability = options?.skipDomStability ?? true;
  const stepCode = options?.stepCode ?? '';
  const userInitiated = !!options?.restoreSidebarAfterCapture;
  const keepSidebarHidden = !userInitiated;
  const showCaptureBanner = userInitiated;
  return new Promise((resolve) => {
    enqueueCapture(async () => {
      resolve(
        await captureAndCache(stepId, stepCode, skipDomStability, keepSidebarHidden, showCaptureBanner)
      );
    });
  });
}
