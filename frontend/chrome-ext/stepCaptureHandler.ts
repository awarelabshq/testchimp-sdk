import { 
  genClickCommand, genInputCommand, genSelectCommand, genCheckCommand, 
  genHoverCommand, genKeyPressCommand, genDragDropCommand, genGotoCommand,
  CapturedStep, generateStepId, extractSelector
} from './playwrightCodegen';

let isCapturing = false;
let cleanupFns: Array<() => void> = [];

// Replace debounce with WeakMap for blur-based input tracking (Playwright approach)
const fieldValues = new WeakMap<HTMLElement, string>();

// Frame context tracking for iframe support
const frameContextMap = new WeakMap<HTMLElement, string>();

// Global flag to prevent any step emission
let stepCaptureEnabled = false;

// Removed tabKeyPressed flag - using element-specific debouncing instead

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

// Get frame chain for element (for iframe support)
function getFrameContext(el: HTMLElement): string[] {
  const frames: string[] = [];
  let currentWindow: Window | null = window;
  const MAX_FRAME_DEPTH = 5; // Prevent infinite loops in deeply nested iframes
  let depth = 0;
  
  try {
    // Walk up the frame hierarchy
    while (currentWindow !== window.top && depth < MAX_FRAME_DEPTH) {
      if (!currentWindow || !currentWindow.frameElement) break;
      
      const frameEl = currentWindow.frameElement as HTMLIFrameElement;
      
      // Try to build a selector for the frame
      let frameSelector = '';
      if (frameEl.name) {
        frameSelector = `[name="${frameEl.name}"]`;
      } else if (frameEl.id) {
        frameSelector = `#${frameEl.id}`;
      } else if (frameEl.title) {
        frameSelector = `[title="${frameEl.title}"]`;
      } else {
        // Use URL as fallback
        const frameSrc = frameEl.src;
        if (frameSrc) {
          try {
            const url = new URL(frameSrc);
            frameSelector = `iframe[src*="${url.pathname.split('/').pop()}"]`;
          } catch (_) {
            frameSelector = `iframe:nth-of-type(${Array.from(frameEl.parentElement?.children || []).indexOf(frameEl) + 1})`;
          }
        }
      }
      
      frames.unshift(frameSelector);
      currentWindow = currentWindow.parent;
      depth++;
    }
    
    if (depth >= MAX_FRAME_DEPTH) {
      console.warn('[StepCapture] Frame depth limit reached, stopping traversal');
    }
  } catch (e) {
    // Cross-origin iframe - can't access frame hierarchy
    console.warn('[StepCapture] Cannot access frame hierarchy (cross-origin):', e);
  }
  
  return frames;
}

// Prefix selector with frame context if in iframe
function addFrameContextToSelector(selector: string, frames: string[]): string {
  if (frames.length === 0) return selector;
  
  // Build frame locator chain: page.frameLocator('frame1').frameLocator('frame2').locator('selector')
  let result = selector;
  for (const frame of frames) {
    result = `frameLocator('${frame}').${result}`;
  }
  return result;
}

// Enhanced debouncing mechanism to prevent infinite loops and duplicate steps
const lastEmittedSteps = new Map<string, number>();
const elementLastEmitted = new WeakMap<HTMLElement, number>(); // Track per-element timing
const DEBOUNCE_TIME = 1000; // 1 second debounce for identical steps
const MIN_STEP_INTERVAL = 300; // 300ms minimum between any steps
const RAPID_FIRE_THRESHOLD = 3; // Max 3 identical steps in 1 second

// Emit structured step (future-ready for DOM snapshots)
function emitStep(cmd: string, kind: string, element?: HTMLElement) {
  if (!isCapturing || !stepCaptureEnabled) {
    console.log('[StepCapture] Ignoring step emission - not capturing or disabled:', cmd);
    return;
  }
  
  const now = Date.now();
  const stepKey = `${cmd}_${kind}`;
  
  // Element-specific debouncing for blur events
  if (element && (kind === 'input' || kind === 'fill')) {
    const lastEmitted = elementLastEmitted.get(element);
    if (lastEmitted && (now - lastEmitted) < MIN_STEP_INTERVAL) {
      console.log('[StepCapture] Debouncing element-specific step:', cmd, 'time diff:', (now - lastEmitted) + 'ms');
      return;
    }
    elementLastEmitted.set(element, now);
  }
  
  // Global debouncing: check for rapid-fire identical steps
  const lastEmitted = lastEmittedSteps.get(stepKey);
  if (lastEmitted) {
    const timeDiff = now - lastEmitted;
    
    // For any step type, if it's the same command within 1 second, debounce it
    if (timeDiff < DEBOUNCE_TIME) {
      console.log('[StepCapture] Debouncing duplicate step:', cmd, 'time diff:', timeDiff + 'ms');
      return;
    }
    
    // For rapid-fire detection, count how many times this exact step was emitted recently
    const recentSteps = Array.from(lastEmittedSteps.entries())
      .filter(([key, timestamp]) => key === stepKey && (now - timestamp) < 1000)
      .length;
    
    if (recentSteps >= RAPID_FIRE_THRESHOLD) {
      console.log('[StepCapture] Blocking rapid-fire step:', cmd, 'count:', recentSteps);
      return;
    }
  }
  
  lastEmittedSteps.set(stepKey, now);
  
  // Clean up old entries to prevent memory leaks (keep only last 100 entries)
  if (lastEmittedSteps.size > 100) {
    const entries = Array.from(lastEmittedSteps.entries());
    const cutoff = now - (DEBOUNCE_TIME * 2); // Keep entries from last 2 seconds
    for (const [key, timestamp] of entries) {
      if (timestamp < cutoff) {
        lastEmittedSteps.delete(key);
      }
    }
  }
  
  // Check if we're on the same URL as when capture started
  const currentUrl = location.href;
  const storedUrl = localStorage.getItem('stepCaptureStartUrl');
  if (storedUrl && currentUrl !== storedUrl) {
    console.log('[StepCapture] URL changed during capture, updating start URL from', storedUrl, 'to', currentUrl);
    // Update the start URL to the current page
    localStorage.setItem('stepCaptureStartUrl', currentUrl);
  }
  
  // Create structured step with UUID
  const step: CapturedStep = {
    id: generateStepId(),
    cmd,
    kind,
    selector: extractSelector(cmd),
    timestamp: Date.now()
    // context field can be added in Phase 5 for DOM snapshots
  };
  
  console.log('[StepCapture] Emitting step:', step.cmd, 'ID:', step.id, 'URL:', location.href, 'timestamp:', new Date().toISOString());
  
  // For now, send command to sidebar (backward compatible)
  window.postMessage({ type: 'tc-playwright-step', cmd: step.cmd, kind: step.kind }, '*');
  
  // Save step to storage
  saveStepToStorage(step);
}

function saveStepToStorage(step: CapturedStep) {
  chrome.storage.local.get([STORAGE_KEYS.CAPTURED_STEPS], (result) => {
    const steps = result[STORAGE_KEYS.CAPTURED_STEPS] || [];
    // For now, store as command strings for backward compatibility
    // Phase 5: can store full CapturedStep objects
    steps.push(step.cmd);
    chrome.storage.local.set({ [STORAGE_KEYS.CAPTURED_STEPS]: steps });
  });
}

function saveCaptureState(active: boolean, url?: string) {
  const state = {
    [STORAGE_KEYS.STEP_CAPTURE_ACTIVE]: active,
    [STORAGE_KEYS.CURRENT_URL]: url || location.href
  };
  console.log('[StepCapture] Saving capture state:', state);
  chrome.storage.local.set(state, () => {
    console.log('[StepCapture] Capture state saved successfully');
  });
}

function loadCaptureState(): Promise<{active: boolean, steps: string[], url: string}> {
  return new Promise((resolve) => {
    console.log('[StepCapture] Loading capture state from storage...');
    chrome.storage.local.get([
      STORAGE_KEYS.STEP_CAPTURE_ACTIVE,
      STORAGE_KEYS.CAPTURED_STEPS,
      STORAGE_KEYS.CURRENT_URL
    ], (result) => {
      const state = {
        active: result[STORAGE_KEYS.STEP_CAPTURE_ACTIVE] || false,
        steps: result[STORAGE_KEYS.CAPTURED_STEPS] || [],
        url: result[STORAGE_KEYS.CURRENT_URL] || location.href
      };
      console.log('[StepCapture] Loaded state from storage:', state);
      resolve(state);
    });
  });
}

function clearCaptureState() {
  console.log('[StepCapture] Clearing capture state from storage');
  chrome.storage.local.remove([
    STORAGE_KEYS.STEP_CAPTURE_ACTIVE,
    STORAGE_KEYS.CAPTURED_STEPS,
    STORAGE_KEYS.CURRENT_URL
  ], () => {
    console.log('[StepCapture] Storage cleared successfully');
  });
}

function handleClicks(e: MouseEvent) {
  console.log('[StepCapture] Click handler called:', { isCapturing, stepCaptureEnabled, target: e.target, url: location.href });
  if (!isCapturing) {
    console.log('[StepCapture] Click handler - not capturing, ignoring');
    return;
  }
  if (isInExtensionUi(e.target)) {
    console.log('[StepCapture] Click handler - extension UI, ignoring');
    return;
  }
  const element = e.target as HTMLElement;
  
  // Generate base command
  const cmd = genClickCommand({ element, dblclick: e.detail === 2, button: e.button === 1 ? 'middle' : e.button === 2 ? 'right' : 'left', modifiers: [] });
  if (!cmd) return;
  
  // Apply iframe context if needed
  const frames = getFrameContext(element);
  const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
  
  console.log('[StepCapture] Generated click command:', finalCmd, frames.length > 0 ? `(in ${frames.length} iframe(s))` : '');
  emitStep(finalCmd, e.detail === 2 ? 'dblclick' : 'click');
}

// Handle input changes - track values but don't emit until blur (Playwright approach)
function handleInputs(e: Event) {
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  const el = e.target as HTMLElement;
  if (!el) return;
  
  console.log('[StepCapture] Input/Change event detected on element:', el.tagName, 'type:', (el as HTMLInputElement).type, 'event:', e.type);
  
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      // Immediate capture for checkboxes/radios (on change)
      const cmd = genCheckCommand({ element: el, checked: !!el.checked });
      if (cmd) {
        const frames = getFrameContext(el);
        const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
        emitStep(finalCmd, 'check');
      }
      return;
    }
    
    // Track value for text inputs (including password), but don't emit yet - wait for blur
    console.log('[StepCapture] Tracking input value for', el.type, 'input:', el.value ? '***' : '(empty)');
    
    // For password inputs, we might need to handle this differently due to security restrictions
    if (el.type === 'password') {
      console.log('[StepCapture] Password input detected, value length:', el.value.length);
    }
    
    fieldValues.set(el, el.value);
    return;
  }
  
  if (el instanceof HTMLTextAreaElement) {
    // Track value for text areas, but don't emit yet - wait for blur
    fieldValues.set(el, el.value);
    return;
  }
  
  if (el instanceof HTMLSelectElement) {
    // Immediate capture for select (on change)
    const value = el.multiple ? Array.from(el.selectedOptions).map(o => o.value) : el.value;
    const cmd = genSelectCommand({ element: el, value });
    if (cmd) {
      const frames = getFrameContext(el);
      const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
      emitStep(finalCmd, 'select');
    }
  }
}

// Handle blur - emit fill command with final value (Playwright approach)
function handleBlur(e: FocusEvent) {
  console.log('[StepCapture] Blur handler called:', { isCapturing, stepCaptureEnabled, target: e.target, url: location.href });
  if (!isCapturing) {
    console.log('[StepCapture] Blur handler - not capturing, ignoring');
    return;
  }
  if (isInExtensionUi(e.target)) {
    console.log('[StepCapture] Blur handler - extension UI, ignoring');
    return;
  }
  
  const el = e.target as HTMLElement;
  
  console.log('[StepCapture] Blur event detected on element:', el.tagName, 'type:', (el as HTMLInputElement).type, 'will emit step:', el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement);
  
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.type === 'checkbox' || el.type === 'radio') return; // Already handled on change
    
    // Emit fill command on blur with final value
    let value = fieldValues.get(el);
    
    // For password inputs, try to get the current value as fallback
    if (el.type === 'password' && (value === undefined || value === '')) {
      try {
        value = el.value;
        console.log('[StepCapture] Password input fallback - got value from element directly, length:', value.length);
      } catch (e) {
        console.warn('[StepCapture] Cannot access password input value due to security restrictions:', e);
        // Generate a command with placeholder value
        value = '[PASSWORD]';
      }
    }
    
    console.log('[StepCapture] Blur event for', el.type, 'input, value:', value ? '***' : '(empty)');
    if (value !== undefined && value !== '') {
      const cmd = genInputCommand({ element: el, value, type: 'fill' });
      if (cmd) {
        console.log('[StepCapture] Generated input command for', el.type, ':', cmd);
        const frames = getFrameContext(el);
        const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
        emitStep(finalCmd, 'input', el);
      } else {
        console.warn('[StepCapture] Failed to generate input command for', el.type, 'input');
      }
      fieldValues.delete(el); // Clean up
    } else {
      console.log('[StepCapture] No tracked value found for', el.type, 'input on blur');
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  
  // Only capture specific meaningful keys, not every keystroke
  const meaningfulKeys = ['Enter', 'Tab', 'Escape'];
  if (!meaningfulKeys.includes(e.key)) return;
  
  // Handle Tab key with element-specific debouncing
  if (e.key === 'Tab') {
    // Small delay to let blur events settle, but still capture Tab key
    setTimeout(() => {
      const element = e.target as HTMLElement | null;
      const cmd = genKeyPressCommand({ element, key: e.key });
      if (cmd) {
        const frames = element ? getFrameContext(element) : [];
        const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
        emitStep(finalCmd, 'keypress', element || undefined);
      }
    }, 50); // Smaller delay since we have better debouncing
    return;
  }
  
  const element = e.target as HTMLElement | null;
  const cmd = genKeyPressCommand({ element, key: e.key });
  if (cmd) {
    const frames = element ? getFrameContext(element) : [];
    const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
    emitStep(finalCmd, 'keypress', element || undefined);
  }
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
    if (cmd) {
      // For drag-drop, we need to check if either element is in an iframe
      const sourceFrames = getFrameContext(dragSourceEl);
      const targetFrames = getFrameContext(e.target);
      
      // If both elements are in the same frame context, use that
      // If different contexts, use the target's context (where drop happens)
      const frames = targetFrames.length > 0 ? targetFrames : sourceFrames;
      const finalCmd = frames.length > 0 ? addFrameContextToSelector(cmd, frames) : cmd;
      emitStep(finalCmd, 'dragdrop');
    }
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
    
    // Set the global flag for content script
    (window as any)._stepCaptureActive = true;
    console.log('[StepCapture] Set window._stepCaptureActive to true');
    
    // Store the start URL to prevent cross-page step emission
    localStorage.setItem('stepCaptureStartUrl', location.href);
  
  // Add initial page.goto() step
  const gotoStep = `await page.goto('${location.href}');`;
  console.log('[StepCapture] Adding initial page.goto() step:', gotoStep);
  emitStep(gotoStep, 'goto');
  
  // Save state to storage
  saveCaptureState(true);
  
  console.log('[StepCapture] Starting capture with passive listeners (Playwright approach)');
  
  // Use capture phase with passive listeners (Playwright approach - no preventDefault)
  const listenerOptions = { capture: true, passive: true };
  
  document.addEventListener('click', handleClicks, listenerOptions);
  document.addEventListener('change', handleInputs, listenerOptions);
  // Remove input listener - we only need change for checkboxes/radios and blur for text inputs
  // document.addEventListener('input', handleInputs, listenerOptions);
  document.addEventListener('blur', handleBlur, listenerOptions); // NEW: blur for input completion
  document.addEventListener('keydown', handleKeydown, listenerOptions);
  document.addEventListener('dragstart', handleDragStart, listenerOptions);
  document.addEventListener('drop', handleDrop, listenerOptions);
  // Hover disabled - too noisy, not useful for tests
  // document.addEventListener('mouseover', handleMouseOver, listenerOptions);
  
  cleanupFns.push(() => document.removeEventListener('click', handleClicks, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('change', handleInputs, listenerOptions));
  // cleanupFns.push(() => document.removeEventListener('input', handleInputs, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('blur', handleBlur, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('dragstart', handleDragStart, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('drop', handleDrop, listenerOptions));
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
    
    // Clear the global flag for content script
    (window as any)._stepCaptureActive = false;
    console.log('[StepCapture] Set window._stepCaptureActive to false');
    
    // Clear the start URL
    localStorage.removeItem('stepCaptureStartUrl');
  
  // Clear debounce map
  lastEmittedSteps.clear();
  
  // Clear state from storage
  clearCaptureState();
  
  console.log('[StepCapture] Cleaning up', cleanupFns.length, 'event listeners');
  for (const fn of cleanupFns) {
    try { fn(); } catch (_) {}
  }
  cleanupFns = [];
  dragSourceEl = null;
  console.log('[StepCapture] Capture stopped, isCapturing:', isCapturing);
}

// Resume step capture without adding page.goto() (for Cancel button)
export function resumeStepCapture() {
  console.log('[StepCapture] Resume requested, current state:', isCapturing);
  if (isCapturing) {
    console.log('[StepCapture] Already capturing, ignoring resume request');
    return;
  }
  console.log('[StepCapture] Resuming capture');
  
  // Ensure any previous cleanup is complete
  if (cleanupFns.length > 0) {
    console.log('[StepCapture] Cleaning up previous listeners before resuming');
    for (const fn of cleanupFns) {
      try { fn(); } catch (_) {}
    }
    cleanupFns = [];
  }
  
  isCapturing = true;
  stepCaptureEnabled = true;
  
  // Set the global flag for content script
  (window as any)._stepCaptureActive = true;
  console.log('[StepCapture] Set window._stepCaptureActive to true (resume)');
  
  // Update the start URL for the current page
  localStorage.setItem('stepCaptureStartUrl', location.href);
  
  // Save state to storage
  saveCaptureState(true);
  
  console.log('[StepCapture] Resuming capture with passive listeners (Playwright approach)');
  
  // Use capture phase with passive listeners (Playwright approach - no preventDefault)
  const listenerOptions = { capture: true, passive: true };
  
  document.addEventListener('click', handleClicks, listenerOptions);
  document.addEventListener('change', handleInputs, listenerOptions);
  document.addEventListener('blur', handleBlur, listenerOptions);
  document.addEventListener('keydown', handleKeydown, listenerOptions);
  document.addEventListener('dragstart', handleDragStart, listenerOptions);
  document.addEventListener('drop', handleDrop, listenerOptions);
  
  cleanupFns.push(() => document.removeEventListener('click', handleClicks, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('change', handleInputs, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('blur', handleBlur, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('dragstart', handleDragStart, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('drop', handleDrop, listenerOptions));
  
  console.log('[StepCapture] Capture resumed, isCapturing:', isCapturing);
}

// Force stop - used when we need to ensure capture is stopped regardless of state
export function forceStopStepCapture() {
  console.log('[StepCapture] Force stopping capture');
  isCapturing = false;
  stepCaptureEnabled = false;
  
  // Clear the global flag for content script
  (window as any)._stepCaptureActive = false;
  console.log('[StepCapture] Set window._stepCaptureActive to false (force stop)');
  
  // Clear debounce map
  lastEmittedSteps.clear();
  
  for (const fn of cleanupFns) {
    try { fn(); } catch (_) {}
  }
  cleanupFns = [];
  dragSourceEl = null;
  console.log('[StepCapture] Force stop completed, isCapturing:', isCapturing);
}

// Restore capture state on page load
export async function restoreCaptureState() {
  try {
    console.log('[StepCapture] ===== RESTORATION STARTED =====');
    console.log('[StepCapture] Starting restoreCaptureState, current URL:', location.href);
    console.log('[StepCapture] Document ready state:', document.readyState);
    console.log('[StepCapture] Current isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
    
    const state = await loadCaptureState();
    console.log('[StepCapture] Loaded state from storage:', state);
    
    if (state.active) {
      // Check if we're on the same domain (allow cross-page navigation within same site)
      const currentDomain = new URL(location.href).hostname;
      const storedDomain = new URL(state.url).hostname;
      console.log('[StepCapture] Domain check - current:', currentDomain, 'stored:', storedDomain);
      
      if (currentDomain === storedDomain) {
        console.log('[StepCapture] Same domain, restoring capture on new page');
        
        // Use a timeout to ensure DOM is ready and avoid race conditions
        setTimeout(() => {
          console.log('[StepCapture] Setting up capture after navigation with timeout');
          setupCaptureAfterNavigation();
        }, 100);
        
            function setupCaptureAfterNavigation() {
              console.log('[StepCapture] Setting up capture - DOM ready state:', document.readyState);
              console.log('[StepCapture] Before setup - isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
              isCapturing = true;
              stepCaptureEnabled = true;
              
              // CRITICAL: Set the global flag for content script
              (window as any)._stepCaptureActive = true;
              console.log('[StepCapture] Set window._stepCaptureActive to true');
              
              console.log('[StepCapture] After setup - isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
          
          // Update the start URL for the new page
          localStorage.setItem('stepCaptureStartUrl', location.href);
          
          // Don't clear stored steps - keep them for the sidebar UI
          // The sidebar will show the original steps, and new steps will be added
          console.log('[StepCapture] Keeping stored steps for sidebar UI');
          
          // Set up event listeners with same options as startStepCapture
          const listenerOptions = { capture: true, passive: true };
          
          console.log('[StepCapture] Adding event listeners for restoration');
          document.addEventListener('click', handleClicks, listenerOptions);
          document.addEventListener('change', handleInputs, listenerOptions);
          // Remove input listener - we only need change for checkboxes/radios and blur for text inputs
          // document.addEventListener('input', handleInputs, listenerOptions);
          document.addEventListener('blur', handleBlur, listenerOptions); // CRITICAL: Missing blur listener
          document.addEventListener('keydown', handleKeydown, listenerOptions);
          document.addEventListener('dragstart', handleDragStart, listenerOptions);
          document.addEventListener('drop', handleDrop, listenerOptions);
          console.log('[StepCapture] Event listeners added for restoration');
          
          // Test if event listeners are working
          console.log('[StepCapture] Testing event listeners - try clicking on the page to see if events are captured');
          
          // Verify event listeners are attached
          console.log('[StepCapture] Event listener count:', cleanupFns.length);
          console.log('[StepCapture] Current state - isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
          
          // Hover disabled - too noisy, not useful for tests
          // document.addEventListener('mouseover', handleMouseOver, listenerOptions);
          
          // Add cleanup functions for proper restoration
          cleanupFns.push(() => document.removeEventListener('click', handleClicks, listenerOptions));
          cleanupFns.push(() => document.removeEventListener('change', handleInputs, listenerOptions));
          // cleanupFns.push(() => document.removeEventListener('input', handleInputs, listenerOptions));
          cleanupFns.push(() => document.removeEventListener('blur', handleBlur, listenerOptions));
          cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown, listenerOptions));
          cleanupFns.push(() => document.removeEventListener('dragstart', handleDragStart, listenerOptions));
          cleanupFns.push(() => document.removeEventListener('drop', handleDrop, listenerOptions));
          
              // Notify sidebar that capture is active and restored
              console.log('[StepCapture] Sending restoration message to sidebar - capture restored');
              console.log('[StepCapture] Current URL:', location.href, 'isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
              window.postMessage({ type: 'tc-step-capture-restored', steps: [] }, '*'); // Sidebar will load steps from storage
          console.log('[StepCapture] Event listeners attached, isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
          
          // Test if event listeners are working by simulating a click
          console.log('[StepCapture] Testing event listeners - try clicking on the page now');
          console.log('[StepCapture] If you click and see no logs, the event listeners are not working');
          
          // Test if event listeners are working
          console.log('[StepCapture] Testing event listeners - try clicking on the page to see if events are captured');
          
          console.log('[StepCapture] ===== RESTORATION COMPLETED =====');
        }
      } else {
        console.log('[StepCapture] Different domain, clearing state');
        clearCaptureState();
      }
    } else {
      console.log('[StepCapture] No active state found in storage');
    }
    } catch (error) {
      console.error('[StepCapture] Error restoring state:', error);
    }
  }

// Auto-restore capture state on page load (without requiring sidebar to be opened)
export async function autoRestoreCaptureState() {
  try {
    const state = await loadCaptureState();
    
    if (state.active) {
      // Check if we're on the same domain (allow cross-page navigation within same site)
      const currentDomain = new URL(location.href).hostname;
      const storedDomain = new URL(state.url).hostname;
      
      if (currentDomain === storedDomain) {
        // Use a timeout to ensure DOM is ready and avoid race conditions
        setTimeout(() => {
          setupAutoCaptureAfterNavigation();
        }, 100);
      } else {
        clearCaptureState();
      }
    }
  } catch (error) {
    console.error('[StepCapture] Error auto-restoring state:', error);
  }
}

// Setup capture after navigation for auto-restore
function setupAutoCaptureAfterNavigation() {
  isCapturing = true;
  stepCaptureEnabled = true;
  
  // CRITICAL: Set the global flag for content script
  (window as any)._stepCaptureActive = true;

  // Update the start URL for the new page
  localStorage.setItem('stepCaptureStartUrl', location.href);
  
  // Set up event listeners with same options as startStepCapture
  const listenerOptions = { capture: true, passive: true };
  
  document.addEventListener('click', handleClicks, listenerOptions);
  document.addEventListener('change', handleInputs, listenerOptions);
  document.addEventListener('blur', handleBlur, listenerOptions);
  document.addEventListener('keydown', handleKeydown, listenerOptions);
  document.addEventListener('dragstart', handleDragStart, listenerOptions);
  document.addEventListener('drop', handleDrop, listenerOptions);
  
  // Add cleanup functions for proper restoration
  cleanupFns.push(() => document.removeEventListener('click', handleClicks, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('change', handleInputs, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('blur', handleBlur, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('dragstart', handleDragStart, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('drop', handleDrop, listenerOptions));
}


