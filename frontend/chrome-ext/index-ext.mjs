import {
  startStepCapture,
  stopStepCapture,
  restoreCaptureState,
  autoRestoreCaptureState,
  resumeStepCapture,
} from './stepCaptureHandler.ts';
import './elementPickHandler.ts';

window._stepCaptureActive = false;
window._lastStepMessage = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'start_step_capture') {
      window.postMessage({ type: 'tc-hide-sidebar' }, '*');
      window._stepCaptureActive = true;
      startStepCapture(message.initialSteps);
      if (sendResponse) sendResponse({ success: true });
    } else if (message.action === 'stop_step_capture') {
      window._stepCaptureActive = false;
      stopStepCapture();
      chrome.storage.local.get(['manualCaptureInProgress'], (result) => {
        if (!result.manualCaptureInProgress) {
          window.postMessage({ type: 'tc-show-sidebar' }, '*');
        }
      });
      if (sendResponse) sendResponse({ success: true });
    } else if (message.action === 'resume_step_capture') {
      window._stepCaptureActive = true;
      resumeStepCapture();
      if (sendResponse) sendResponse({ success: true });
    } else if (message.action === 'restore_step_capture') {
      restoreCaptureState()
        .then(() => {
          if (sendResponse) sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('[ContentScript] Error restoring step capture state:', error);
          if (sendResponse) sendResponse({ success: false, error: error.message });
        });
      return true;
    } else if (message.type === 'wait_manual_screenshot_queue') {
      import('./manualTestScreenshotHandler.ts')
        .then((module) => {
          module.waitForManualCaptureQueue().then(() => {
            if (sendResponse) sendResponse({ ok: true });
          });
        })
        .catch((err) => {
          console.error('[ContentScript] wait_manual_screenshot_queue failed:', err);
          if (sendResponse) sendResponse({ ok: false, error: err?.message });
        });
      return true;
    } else if (message.action === 'set_assertion_mode') {
      import('./stepCaptureHandler.ts')
        .then((module) => {
          module.setAssertionMode(message.mode, message.sticky);
          if (sendResponse) sendResponse({ success: true });
        })
        .catch((err) => {
          console.error('[ContentScript] Failed to set assertion mode:', err);
          if (sendResponse) sendResponse({ success: false, error: err.message });
        });
      return true;
    } else {
      window.postMessage(message, '*');
      if (sendResponse) sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }

  return true;
});

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data && event.data.type === 'tc-playwright-step') {
    try {
      const messageKey = `${event.data.cmd}_${event.data.kind}`;
      const now = Date.now();

      if (
        !window._lastStepMessage ||
        window._lastStepMessage.key !== messageKey ||
        now - window._lastStepMessage.time > 500
      ) {
        window._lastStepMessage = { key: messageKey, time: now };

        if (window._stepCaptureActive) {
          chrome.runtime?.sendMessage({
            type: 'captured_step',
            cmd: event.data.cmd,
            kind: event.data.kind,
          });
        }
      }
    } catch (_) {
      /* ignore */
    }
    return;
  }

  if (event.data?.type === 'get_tc_ext_config') {
    chrome.storage.sync.get(['currentUserId', 'userAuthKey'], (result) => {
      if (chrome.runtime.lastError) {
        window.postMessage(
          {
            type: 'get_tc_ext_config_response',
            payload: { currentUserId: null, userAuthKey: null },
            error: chrome.runtime.lastError.message,
          },
          '*'
        );
        return;
      }
      window.postMessage(
        {
          type: 'get_tc_ext_config_response',
          payload: {
            currentUserId: result.currentUserId ?? null,
            userAuthKey: result.userAuthKey ?? null,
          },
        },
        '*'
      );
    });
    return;
  }

  if (event.data.type === 'tc_open_options_page') {
    chrome.runtime.sendMessage({ type: 'tc_open_options_page_in_bg' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error opening options page:', chrome.runtime.lastError.message);
      }
    });
    return;
  }

  if (event.data.type === 'update_tc_ext_config') {
    const dataToStore = event.data.payload;
    chrome.storage.sync.set(dataToStore, () => {
      if (chrome.runtime.lastError) {
        window.postMessage(
          {
            type: 'update_tc_ext_config_response',
            success: false,
            error: chrome.runtime.lastError.message,
          },
          '*'
        );
      } else {
        window.postMessage({ type: 'update_tc_ext_config_response', success: true }, '*');
      }
    });
    return;
  }

  if (
    event.data.type === 'check_extension' ||
    event.data.type === 'run_tests_request'
  ) {
    chrome.runtime.sendMessage(event.data, (response) => {
      if (!event.data.type) {
        return;
      }

      if (chrome.runtime.lastError) {
        if (event.data.type === 'check_extension') {
          window.postMessage(
            { type: 'check_extension_response', success: false, installed: false },
            '*'
          );
        } else if (event.data.type === 'run_tests_request') {
          window.postMessage(
            {
              type: 'run_tests_response',
              error: 'Extension error: ' + chrome.runtime.lastError.message,
            },
            '*'
          );
        }
        return;
      }

      if (response?.error) {
        if (event.data.type === 'check_extension') {
          window.postMessage(
            { type: 'check_extension_response', success: false, installed: false },
            '*'
          );
        } else if (event.data.type === 'run_tests_request') {
          window.postMessage({ type: 'run_tests_response', error: response.error }, '*');
        }
        return;
      }

      if (event.data.type === 'check_extension') {
        if (response == null) {
          window.postMessage(
            { type: 'check_extension_response', success: false, installed: false },
            '*'
          );
        } else {
          window.postMessage(
            {
              type: 'check_extension_response',
              success: response.success === true,
              installed: response.installed !== false,
            },
            '*'
          );
        }
      } else if (event.data.type === 'run_tests_request') {
        window.postMessage({ type: 'run_tests_response', response: response?.data }, '*');
      }
    });
  }
});

autoRestoreCaptureState();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data && (event.data.type === 'fetchProjects' || event.data.type === 'getUserAuthInfo')) {
    chrome.storage.sync.get(['userAuthKey', 'currentUserId', 'projectId'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting user auth info:', chrome.runtime.lastError.message);
        return;
      }
      window.postMessage(
        {
          type: 'userAuthInfo',
          userAuthKey: result.userAuthKey,
          currentUserId: result.currentUserId,
          projectId: result.projectId,
        },
        '*'
      );
    });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.userAuthKey || changes.currentUserId || changes.projectId)) {
    chrome.storage.sync.get(['userAuthKey', 'currentUserId', 'projectId'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting user auth info on change:', chrome.runtime.lastError.message);
        return;
      }
      window.postMessage(
        {
          type: 'userAuthInfo',
          userAuthKey: result.userAuthKey,
          currentUserId: result.currentUserId,
          projectId: result.projectId,
        },
        '*'
      );
    });
  }
});
