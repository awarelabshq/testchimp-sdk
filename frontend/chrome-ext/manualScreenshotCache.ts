export type ManualScreenshotCache = Record<string, string>;

export function setManualScreenshot(stepId: string, dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'set_manual_screenshot', stepId, dataUrl },
      (resp) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

export function getManualScreenshots(): Promise<ManualScreenshotCache> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'get_manual_screenshots' }, (resp) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve((resp?.cache as ManualScreenshotCache) || {});
    });
  });
}

export function deleteManualScreenshot(stepId: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'delete_manual_screenshot', stepId }, () => resolve());
  });
}

export function clearManualScreenshotCache(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'clear_manual_screenshot_cache' }, () => resolve());
  });
}
