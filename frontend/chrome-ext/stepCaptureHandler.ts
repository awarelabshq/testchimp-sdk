import { genClickCommand, genInputCommand, genSelectCommand, genCheckCommand, genHoverCommand, genKeyPressCommand, genDragDropCommand, genGotoCommand } from './playwrightCodegen';

let isCapturing = false;
let cleanupFns: Array<() => void> = [];
let inputDebounceTimer: NodeJS.Timeout | null = null;
let lastInputElement: HTMLInputElement | HTMLTextAreaElement | null = null;

// Global flag to prevent any step emission
let stepCaptureEnabled = false;

// Storage keys for persistence
const STORAGE_KEYS = {
  STEP_CAPTURE_ACTIVE: 'stepCaptureActive',
  CAPTURED_STEPS: 'capturedSteps',
  CURRENT_URL: 'currentCaptureUrl'
};

function isInExtensionUi(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.closest('#testchimp-sidebar') || el.closest('#testchimp-sidebar-toggle')) return true;
  // ant drawer/modals in sidebar shadowRoot are inside #testchimp-sidebar
  return false;
}

function emitStep(cmd: string, kind: string) {
  if (!isCapturing || !stepCaptureEnabled) {
    console.log('[StepCapture] Ignoring step emission - not capturing or disabled:', cmd);
    return;
  }
  console.log('[StepCapture] Emitting step:', cmd);
  window.postMessage({ type: 'tc-playwright-step', cmd, kind }, '*');
  
  // Save step to storage for persistence
  saveStepToStorage(cmd);
}

function saveStepToStorage(cmd: string) {
  chrome.storage.local.get([STORAGE_KEYS.CAPTURED_STEPS], (result) => {
    const steps = result[STORAGE_KEYS.CAPTURED_STEPS] || [];
    steps.push(cmd);
    chrome.storage.local.set({ [STORAGE_KEYS.CAPTURED_STEPS]: steps });
  });
}

function saveCaptureState(active: boolean, url?: string) {
  chrome.storage.local.set({
    [STORAGE_KEYS.STEP_CAPTURE_ACTIVE]: active,
    [STORAGE_KEYS.CURRENT_URL]: url || location.href
  });
}

function loadCaptureState(): Promise<{active: boolean, steps: string[], url: string}> {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      STORAGE_KEYS.STEP_CAPTURE_ACTIVE,
      STORAGE_KEYS.CAPTURED_STEPS,
      STORAGE_KEYS.CURRENT_URL
    ], (result) => {
      resolve({
        active: result[STORAGE_KEYS.STEP_CAPTURE_ACTIVE] || false,
        steps: result[STORAGE_KEYS.CAPTURED_STEPS] || [],
        url: result[STORAGE_KEYS.CURRENT_URL] || location.href
      });
    });
  });
}

function clearCaptureState() {
  chrome.storage.local.remove([
    STORAGE_KEYS.STEP_CAPTURE_ACTIVE,
    STORAGE_KEYS.CAPTURED_STEPS,
    STORAGE_KEYS.CURRENT_URL
  ]);
}

function handleClicks(e: MouseEvent) {
  console.log('[StepCapture] Click handler called:', { isCapturing, stepCaptureEnabled, target: e.target });
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  const element = e.target as HTMLElement;
  const cmd = genClickCommand({ element, dblclick: e.detail === 2, button: e.button === 1 ? 'middle' : e.button === 2 ? 'right' : 'left', modifiers: [] });
  if (cmd) {
    console.log('[StepCapture] Generated click command:', cmd);
    emitStep(cmd, e.detail === 2 ? 'dblclick' : 'click');
  }
}

function handleInputs(e: Event) {
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  const el = e.target as HTMLElement;
  if (!el) return;
  
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      // Immediate capture for checkboxes/radios
      const cmd = genCheckCommand({ element: el, checked: !!el.checked });
      if (cmd) emitStep(cmd, 'check');
      return;
    }
    
    // Debounce text input - only capture final value after user stops typing
    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
    }
    
    lastInputElement = el;
    inputDebounceTimer = setTimeout(() => {
      if (lastInputElement) {
        const cmd = genInputCommand({ element: lastInputElement, value: lastInputElement.value, type: 'fill' });
        if (cmd) emitStep(cmd, 'input');
        lastInputElement = null;
      }
    }, 1000); // Wait 1 second after user stops typing
    return;
  }
  
  if (el instanceof HTMLSelectElement) {
    // Immediate capture for select changes
    const value = el.multiple ? Array.from(el.selectedOptions).map(o => o.value) : el.value;
    const cmd = genSelectCommand({ element: el, value });
    if (cmd) emitStep(cmd, 'select');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  
  // Only capture specific meaningful keys, not every keystroke
  const meaningfulKeys = ['Enter', 'Tab', 'Escape'];
  if (!meaningfulKeys.includes(e.key)) return;
  
  const element = e.target as HTMLElement | null;
  const cmd = genKeyPressCommand({ element, key: e.key });
  if (cmd) emitStep(cmd, 'keypress');
}

let dragSourceEl: HTMLElement | null = null;
function handleDragStart(e: DragEvent) {
  dragSourceEl = (e.target as HTMLElement) || null;
}
function handleDrop(e: DragEvent) {
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  if (dragSourceEl && e.target instanceof HTMLElement) {
    const cmd = genDragDropCommand({ source: dragSourceEl, target: e.target });
    if (cmd) emitStep(cmd, 'dragdrop');
  }
  dragSourceEl = null;
}

function handleMouseOver(e: MouseEvent) {
  // Disable hover capture to reduce noise - only capture explicit user actions
  // Most hovers are accidental and don't represent meaningful test steps
  return;
}


export function startStepCapture() {
  console.log('[StepCapture] startStepCapture called, current state:', { isCapturing, stepCaptureEnabled });
  if (isCapturing) {
    console.log('[StepCapture] Already capturing, ignoring start request');
    return;
  }
  
  // Ensure any previous cleanup is complete
  if (cleanupFns.length > 0) {
    console.log('[StepCapture] Cleaning up previous listeners before starting');
    for (const fn of cleanupFns) {
      try { fn(); } catch (_) {}
    }
    cleanupFns = [];
  }
  
  isCapturing = true;
  stepCaptureEnabled = true;
  
  // Save state to storage
  saveCaptureState(true);
  
  console.log('[StepCapture] Starting capture - NO navigation step for troubleshooting');
  // Temporarily disabled navigation step for troubleshooting
  // emitStep(genGotoCommand(location.href), 'goto');
  
  document.addEventListener('click', handleClicks, true);
  document.addEventListener('change', handleInputs, true);
  document.addEventListener('input', handleInputs, true);
  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('dragstart', handleDragStart, true);
  document.addEventListener('drop', handleDrop, true);
  document.addEventListener('mouseover', handleMouseOver, true);
  cleanupFns.push(() => document.removeEventListener('click', handleClicks, true));
  cleanupFns.push(() => document.removeEventListener('change', handleInputs, true));
  cleanupFns.push(() => document.removeEventListener('input', handleInputs, true));
  cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown, true));
  cleanupFns.push(() => document.removeEventListener('dragstart', handleDragStart, true));
  cleanupFns.push(() => document.removeEventListener('drop', handleDrop, true));
  cleanupFns.push(() => document.removeEventListener('mouseover', handleMouseOver, true));
}

export function stopStepCapture() {
  console.log('[StepCapture] Stop requested, current state:', isCapturing);
  if (!isCapturing) {
    console.log('[StepCapture] Not capturing, ignoring stop request');
    return;
  }
  console.log('[StepCapture] Stopping capture');
  isCapturing = false;
  stepCaptureEnabled = false;
  
  // Clear state from storage
  clearCaptureState();
  
  // Clear any pending input debounce
  if (inputDebounceTimer) {
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = null;
  }
  
  console.log('[StepCapture] Cleaning up', cleanupFns.length, 'event listeners');
  for (const fn of cleanupFns) {
    try { fn(); } catch (_) {}
  }
  cleanupFns = [];
  dragSourceEl = null;
  lastInputElement = null;
  console.log('[StepCapture] Capture stopped, isCapturing:', isCapturing);
}

// Force stop - used when we need to ensure capture is stopped regardless of state
export function forceStopStepCapture() {
  console.log('[StepCapture] Force stopping capture');
  isCapturing = false;
  stepCaptureEnabled = false;
  
  // Clear any pending input debounce
  if (inputDebounceTimer) {
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = null;
  }
  
  for (const fn of cleanupFns) {
    try { fn(); } catch (_) {}
  }
  cleanupFns = [];
  dragSourceEl = null;
  lastInputElement = null;
  console.log('[StepCapture] Force stop completed, isCapturing:', isCapturing);
}

// Restore capture state on page load
export async function restoreCaptureState() {
  try {
    const state = await loadCaptureState();
    console.log('[StepCapture] Restoring state:', state);
    
    if (state.active) {
      // Check if we're on the same domain (allow cross-page navigation within same site)
      const currentDomain = new URL(location.href).hostname;
      const storedDomain = new URL(state.url).hostname;
      
      if (currentDomain === storedDomain) {
        console.log('[StepCapture] Restoring capture on new page');
        isCapturing = true;
        stepCaptureEnabled = true;
        
        // Set up event listeners
        document.addEventListener('click', handleClicks, true);
        document.addEventListener('change', handleInputs, true);
        document.addEventListener('input', handleInputs, true);
        document.addEventListener('keydown', handleKeydown, true);
        document.addEventListener('dragstart', handleDragStart, true);
        document.addEventListener('drop', handleDrop, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        
        // Notify sidebar that capture is active
        window.postMessage({ type: 'tc-step-capture-restored', steps: state.steps }, '*');
      } else {
        console.log('[StepCapture] Different domain, clearing state');
        clearCaptureState();
      }
    }
  } catch (error) {
    console.error('[StepCapture] Error restoring state:', error);
  }
}


