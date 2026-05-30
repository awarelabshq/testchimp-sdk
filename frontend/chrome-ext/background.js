/** In-memory JPEG data URLs keyed by manual capture stepId (never persisted to chrome.storage). */
const manualScreenshotCache = new Map();

function clearManualScreenshotCache() {
  manualScreenshotCache.clear();
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('TestChimp Chrome Extension installed.');

  chrome.storage.sync.set({ enableRunLocallyForTcRuns: true }, () => {
    console.log('Enabled run locally for test studio runs.');
  });

  chrome.storage.sync.get(['currentUserId'], (result) => {
    if (!result.currentUserId) {
      chrome.storage.sync.set({ currentUserId: 'default_tester@example.com' }, () => {
        console.log("Set default currentUserId to 'default_tester@example.com'.");
      });
    }
  });

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && tab.url.includes('testchimp')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['index.js'],
        });
      }
    }
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;

  chrome.storage.local.set({ forceExpandSidebar: true }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injectSidebar.js'],
    });
  });
});

const getConfig = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['enableRunLocallyForTcRuns'], (result) => {
      resolve({
        enableRunLocallyForTcRuns: result.enableRunLocallyForTcRuns ?? true,
      });
    });
  });
};

/** Serializes viewport captures so concurrent sendMessage callers do not clobber sendResponse. */
let viewportCaptureQueue = Promise.resolve();

function captureViewportForTab(tabId, windowId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          console.log('[scripting] activating tab before screenshot');
        },
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 60 }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!dataUrl) {
            reject(new Error('captureVisibleTab returned empty data'));
            return;
          }
          resolve(dataUrl);
        });
      }
    );
  });
}

function enqueueViewportCapture(tabId, windowId) {
  const job = viewportCaptureQueue.then(() => captureViewportForTab(tabId, windowId));
  viewportCaptureQueue = job.catch(() => {});
  return job;
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'tc_capture') {
    return;
  }
  port.onMessage.addListener((message) => {
    if (message?.type !== 'capture_viewport_screenshot') {
      return;
    }
    const resolveTab = (tab) => {
      if (!tab?.id || !tab.windowId) {
        port.postMessage({ error: 'No active tab found' });
        port.disconnect();
        return;
      }
      enqueueViewportCapture(tab.id, tab.windowId)
        .then((dataUrl) => {
          port.postMessage({ dataUrl });
          port.disconnect();
        })
        .catch((err) => {
          port.postMessage({ error: err?.message || String(err) });
          port.disconnect();
        });
    };
    if (port.sender?.tab?.id && port.sender.tab.windowId) {
      resolveTab(port.sender.tab);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolveTab(tabs[0]));
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'check_extension') {
    (async () => {
      try {
        const config = await getConfig();
        sendResponse({
          installed: true,
          success: config.enableRunLocallyForTcRuns,
        });
      } catch (e) {
        sendResponse({ installed: false, success: false });
      }
    })();
    return true;
  }

  if (message.type === 'run_tests_request') {
    let parsedBody;
    try {
      parsedBody = message.raw;
    } catch (error) {
      sendResponse({ error: 'Invalid request body' });
      return true;
    }

    (async () => {
      try {
        const requestBody = await parseRequestBody(parsedBody);
        const response = await makeSUTRequest(
          parsedBody.rawTestStepExecution,
          parsedBody.rawTestStepExecution.rawRequest.httpMethod,
          requestBody
        );
        sendResponse({ data: response });
      } catch (error) {
        sendResponse({ error: error.toString() });
      }
    })();
    return true;
  }

  if (message.type === 'start_step_capture_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      const isManual = !!message.manual;
      if (isManual) {
        clearManualScreenshotCache();
      }
      chrome.storage.local.set({
        stepCaptureInProgress: true,
        manualCaptureMode: isManual,
        manualCaptureInProgress: isManual,
      });
      chrome.tabs.sendMessage(
        tabId,
        {
          action: 'start_step_capture',
          initialSteps: message.initialSteps,
          manual: isManual,
        },
        () => {
          sendResponse &&
            sendResponse({
              success: !chrome.runtime.lastError,
              error: chrome.runtime.lastError?.message,
            });
        }
      );
    });
    return true;
  }

  if (message.type === 'stop_step_capture_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      chrome.storage.local.set({
        stepCaptureInProgress: false,
        manualCaptureMode: false,
      });
      chrome.tabs.sendMessage(tabId, { action: 'stop_step_capture' }, () => {
        sendResponse &&
          sendResponse({
            success: !chrome.runtime.lastError,
            error: chrome.runtime.lastError?.message,
          });
      });
    });
    return true;
  }

  if (message.type === 'restore_step_capture_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'restore_step_capture' }, () => {
        sendResponse &&
          sendResponse({
            success: !chrome.runtime.lastError,
            error: chrome.runtime.lastError?.message,
          });
      });
    });
    return true;
  }

  if (message.type === 'resume_step_capture_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'resume_step_capture' }, () => {
        sendResponse &&
          sendResponse({
            success: !chrome.runtime.lastError,
            error: chrome.runtime.lastError?.message,
          });
      });
    });
    return true;
  }

  if (message.type === 'set_assertion_mode') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(
        tabId,
        {
          action: 'set_assertion_mode',
          mode: message.mode,
          sticky: message.sticky,
        },
        () => {
          sendResponse &&
            sendResponse({
              success: !chrome.runtime.lastError,
              error: chrome.runtime.lastError?.message,
            });
        }
      );
    });
    return true;
  }

  if (message.type === 'captured_step') {
    try {
      const tabId = sender?.tab?.id;
      if (tabId) {
        const messageKey = `${message.cmd}_${message.kind}`;
        const now = Date.now();

        if (
          !global._lastStepMessage ||
          global._lastStepMessage.key !== messageKey ||
          now - global._lastStepMessage.time > 500
        ) {
          global._lastStepMessage = { key: messageKey, time: now };
          chrome.tabs.sendMessage(tabId, {
            type: 'captured_step',
            cmd: message.cmd,
            kind: message.kind,
          });
        }
      }
    } catch (_) {
      /* ignore */
    }
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'set_manual_screenshot') {
    if (message.stepId && message.dataUrl) {
      manualScreenshotCache.set(message.stepId, message.dataUrl);
    }
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'get_manual_screenshots') {
    const cache = {};
    manualScreenshotCache.forEach((dataUrl, stepId) => {
      cache[stepId] = dataUrl;
    });
    sendResponse && sendResponse({ cache });
    return true;
  }

  if (message.type === 'delete_manual_screenshot') {
    if (message.stepId) {
      manualScreenshotCache.delete(message.stepId);
    }
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'clear_manual_screenshot_cache') {
    clearManualScreenshotCache();
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'wait_manual_screenshot_queue') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse && sendResponse({ ok: false, error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tabId, { type: 'wait_manual_screenshot_queue' }, (resp) => {
        sendResponse && sendResponse(resp || { ok: true });
      });
    });
    return true;
  }

  if (message.type === 'capture_viewport_screenshot') {
    const resolveTab = (tab) => {
      if (!tab?.id || !tab.windowId) {
        sendResponse({ error: 'No active tab found' });
        return;
      }
      enqueueViewportCapture(tab.id, tab.windowId)
        .then((dataUrl) => {
          sendResponse({ dataUrl });
        })
        .catch((err) => {
          sendResponse({ error: err?.message || String(err) });
        });
    };

    if (sender?.tab?.id && sender.tab.windowId) {
      resolveTab(sender.tab);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolveTab(tabs[0]);
      });
    }
    return true;
  }

  if (message.type === 'fetch_image_as_base64') {
    fetch(message.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          sendResponse({ success: true, dataUrl: reader.result });
        };
        reader.onerror = () => {
          sendResponse({ success: false, error: 'Failed to convert image to base64' });
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'tc_open_options_page_in_bg') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

importScripts('contextMenu.js');
importScripts('localRun.js');

loadContextMenu();
