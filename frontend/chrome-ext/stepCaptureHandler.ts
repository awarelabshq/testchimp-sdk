import { 
  genClickCommand, genInputCommand, genSelectCommand, genCheckCommand, 
  genHoverCommand, genKeyPressCommand, genDragDropCommand, genGotoCommand,
  CapturedStep, generateStepId
} from './playwrightCodegen';

let isCapturing = false;
let cleanupFns: Array<() => void> = [];
let eventListenersAttached = false;

// Add unique instance ID to track multiple content scripts
const instanceId = Math.random().toString(36).substr(2, 9);
console.log('[StepCapture] Content script instance ID:', instanceId);

// Function to safely attach event listeners only once
function attachEventListeners() {
  console.log(`[StepCapture] attachEventListeners called (instance: ${instanceId}) - eventListenersAttached:`, eventListenersAttached, 'cleanupFns.length:', cleanupFns.length);
  
  // Check if event listeners are already attached globally (across all instances)
  if ((window as any)._stepCaptureListenersAttached) {
    console.log(`[StepCapture] Event listeners already attached globally (instance: ${instanceId}), skipping`);
    return;
  }
  
  if (eventListenersAttached) {
    console.log(`[StepCapture] Event listeners already attached (instance: ${instanceId}), skipping`);
    return;
  }
  
  // CRITICAL: Force cleanup any existing listeners first to prevent duplicates
  console.log('[StepCapture] Force cleaning up any existing listeners first');
  for (const fn of cleanupFns) {
    try { fn(); } catch (_) {}
  }
  cleanupFns = [];
  
  console.log('[StepCapture] Attaching event listeners');
  const listenerOptions = { capture: true, passive: true };
  
  document.addEventListener('click', handleClicks, listenerOptions);
  document.addEventListener('change', handleInputs, listenerOptions);
  document.addEventListener('input', handleInputs, listenerOptions);
  document.addEventListener('blur', handleBlur, listenerOptions);
  document.addEventListener('keydown', handleKeydown, listenerOptions);
  document.addEventListener('dragstart', handleDragStart, listenerOptions);
  document.addEventListener('drop', handleDrop, listenerOptions);
  
  cleanupFns.push(() => document.removeEventListener('click', handleClicks, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('change', handleInputs, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('input', handleInputs, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('blur', handleBlur, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('dragstart', handleDragStart, listenerOptions));
  cleanupFns.push(() => document.removeEventListener('drop', handleDrop, listenerOptions));
  
  eventListenersAttached = true;
  (window as any)._stepCaptureListenersAttached = true; // Set global flag
  console.log('[StepCapture] Event listeners attached successfully');
}

// Replace debounce with WeakMap for blur-based input tracking (Playwright approach)
const fieldValues = new WeakMap<HTMLElement, string>();

// Frame context tracking for iframe support
const frameContextMap = new WeakMap<HTMLElement, string>();

// Global flag to prevent any step emission
let stepCaptureEnabled = false;

// Track recent Tab key presses to avoid duplicate steps with blur events
let recentTabPresses = new Map<HTMLElement, number>();

// Track recent step emissions to prevent duplicates
let recentStepEmissions = new Map<string, number>();
const STEP_DEBOUNCE_MS = 500; // Prevent same step within 500ms (reduced from 1000ms due to 200ms time tolerance)

// Helper function to generate a simple selector for an element
function getElementSelector(element: HTMLElement): string {
  // Try to get a meaningful selector
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.name) {
    return `[name="${element.name}"]`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 2).join('.');
    return `.${classes}`;
  }
  
  // Fallback to tag name
  return element.tagName.toLowerCase();
}

// Enhanced deduplication key generator with time tolerance
function generateDeduplicationKey(cmd: string, kind: string, element?: HTMLElement, timestamp?: number): string {
  // Round to 200ms buckets for tolerance (fast interactions within 200ms are considered same time)
  const timeKey = timestamp ? Math.floor(timestamp / 200) : Math.floor(Date.now() / 200);
  
  if (!element) {
    return `${cmd}_${kind}_${timeKey}`;
  }
  
  // For input elements, include the value, selector, and timestamp to detect real duplicates
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const value = element.value || '';
    const selector = getElementSelector(element);
    return `${kind}_${selector}_${value}_${timeKey}`;
  }
  
  // For clickable elements, include the selector, text, and timestamp
  if (kind === 'click') {
    const selector = getElementSelector(element);
    const text = element.textContent?.trim() || '';
    return `${kind}_${selector}_${text}_${timeKey}`;
  }
  
  // Default fallback with timestamp
  return `${cmd}_${kind}_${timeKey}`;
}

// Removed tabKeyPressed flag - using element-specific debouncing instead

// Storage keys for persistence
const STORAGE_KEYS = {
  STEP_CAPTURE_ACTIVE: 'stepCaptureActive',
  CAPTURED_STEPS_WITH_CONTEXT: 'capturedStepsWithContext', // Single source of truth
  CURRENT_URL: 'currentCaptureUrl'
};

// Memory management constants
const MAX_CAPTURED_STEPS = 100;
const MAX_DOM_CONTEXT_LENGTH = 2000; // ~500 tokens

// Track captured steps with context
let capturedSteps: CapturedStep[] = [];
let lastContextStepIndex: number | null = null;

// Capture start time for relative timestamps
let captureStartTime: number | null = null;

// Flag to prevent duplicate goto steps
let initialGotoStepAdded: boolean = false;

function isInExtensionUi(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.closest('#testchimp-sidebar') || el.closest('#testchimp-sidebar-toggle')) return true;
  // ant drawer/modals in sidebar shadowRoot are inside #testchimp-sidebar
  return false;
}

// DOM context capture functions
function capturePageContext(): string {
  try {
    // Extract key interactive elements
    const interactiveElements = Array.from(
      document.querySelectorAll('button, a, input, select, textarea, [role="button"]')
    ).slice(0, 50) // Limit to first 50 interactive elements
      .map(el => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const label = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30);
        return `<${tag}${role ? ` role="${role}"` : ''}>${label || ''}</${tag}>`;
      })
      .join('\n');
    
    const landmarks = document.querySelector('main,nav,header,footer')?.tagName || 'none';
    const context = `Page landmarks: ${landmarks}\n${interactiveElements}`;
    
    // Truncate to max length
    return context.slice(0, MAX_DOM_CONTEXT_LENGTH);
  } catch (e) {
    console.warn('[StepCapture] Failed to capture DOM context:', e);
    return ''; // Fail gracefully
  }
}

// Navigation and DOM context tracking
let domContextNeeded = false;
let domContextAvailable = false;
let currentUrl = window.location.href;
let currentTitle = document.title;

function shouldCaptureContext(step: CapturedStep, lastContextStep?: CapturedStep): boolean {
  // Always capture context for first step
  if (!lastContextStep) {
    return true;
  }
  
  // Check for actual navigation (URL or title change)
  const newUrl = window.location.href;
  const newTitle = document.title;
  const hasNavigated = newUrl !== currentUrl || newTitle !== currentTitle;
  
  if (hasNavigated) {
    // Navigation detected - update tracking variables and mark as needing DOM context
    currentUrl = newUrl;
    currentTitle = newTitle;
    domContextNeeded = true;
    domContextAvailable = false;
    console.log('[StepCapture] Navigation detected, marking DOM context as needed');
    return false; // Don't capture yet, wait for DOMContentLoaded
  }
  
  // Check if we need DOM context and it's now available
  if (domContextNeeded && domContextAvailable) {
    console.log('[StepCapture] DOM context needed and available, capturing context');
    domContextNeeded = false;
    domContextAvailable = false;
    return true; // Capture context now
  }
  
  // If we need DOM context but it's not available yet, don't capture
  if (domContextNeeded && !domContextAvailable) {
    return false; // Still waiting for DOMContentLoaded
  }
  
  // Regular context capture logic for non-navigation steps
  // Only capture for goto commands (page navigation)
  return step.kind === 'goto';
}




function startNavigationMonitoring() {
  console.log('[StepCapture] Starting navigation monitoring');
  
  // Reset state
  domContextNeeded = false;
  domContextAvailable = false;
  
  // Listen for DOMContentLoaded event
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      domContextAvailable = true;
      console.log('[StepCapture] DOMContentLoaded event fired - DOM context now available');
    });
  } else {
    // Already loaded
    domContextAvailable = true;
  }
  
  // Listen for SPA navigation events
  window.addEventListener('popstate', () => {
    console.log('[StepCapture] SPA navigation detected (popstate)');
    domContextNeeded = true;
    domContextAvailable = false;
  });
  
  // Intercept history.pushState and history.replaceState for SPA navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    console.log('[StepCapture] SPA navigation detected (pushState)');
    domContextNeeded = true;
    domContextAvailable = false;
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    console.log('[StepCapture] SPA navigation detected (replaceState)');
    domContextNeeded = true;
    domContextAvailable = false;
  };
}

function stopNavigationMonitoring() {
  console.log('[StepCapture] Stopping navigation monitoring');
  
  // Reset state
  domContextNeeded = false;
  domContextAvailable = false;
}

// Utility functions
function truncateUrl(url: string, maxLength: number = 200): string {
  if (url.length <= maxLength) return url;
  try {
    const urlObj = new URL(url);
    const base = `${urlObj.protocol}//${urlObj.host}`;
    const remaining = maxLength - base.length - 3;
    if (remaining <= 0) return base;
    return base + url.substring(base.length, base.length + remaining) + "...";
  } catch {
    return url.slice(0, maxLength - 3) + "...";
  }
}

function captureElementInfo(element: HTMLElement): { tag: string; attributes: Record<string, string>; text?: string } {
  try {
    const tag = element.tagName.toLowerCase();
    const attributes: Record<string, string> = {};
    
    // Capture key attributes that are semantically meaningful
    const keyAttributes = ['id', 'class', 'type', 'name', 'value', 'placeholder', 'aria-label', 'role', 'data-testid'];
    keyAttributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        // Truncate long values
        attributes[attr] = value.length > 50 ? value.slice(0, 47) + '...' : value;
      }
    });
    
    // Get visible text content (truncated)
    let text: string | undefined;
    try {
      const visibleText = element.textContent?.trim();
      if (visibleText && visibleText.length > 0) {
        text = visibleText.length > 50 ? visibleText.slice(0, 50) + '...' : visibleText;
      }
    } catch (e) {
      // Ignore if we can't access text content
    }
    
    return { tag, attributes, text };
  } catch (e) {
    console.warn('[StepCapture] Failed to capture element info:', e);
    return { tag: 'unknown', attributes: {}, text: undefined };
  }
}

function cleanupOldContexts() {
  // During capture, we keep ALL contexts to maintain full context for LLM
  // Only clean up if we exceed the absolute limit to prevent memory issues
  const MAX_TOTAL_CONTEXTS = 50; // Allow more contexts during capture
  
  // Find all steps with context
  const stepsWithContext: number[] = [];
  capturedSteps.forEach((step, index) => {
    if (step.context?.domContext) {
      stepsWithContext.push(index);
    }
  });
  
  // Only clean up if we exceed the absolute limit
  if (stepsWithContext.length > MAX_TOTAL_CONTEXTS) {
    const indexesToClear = stepsWithContext.slice(0, stepsWithContext.length - MAX_TOTAL_CONTEXTS);
    indexesToClear.forEach(index => {
      if (capturedSteps[index].context) {
        delete capturedSteps[index].context!.domContext; // Clear DOM context but keep URL/title
      }
    });
  }
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

// Emit structured step with context capture and memory management
function emitStep(cmd: string, kind: string, element?: HTMLElement) {
  if (!isCapturing || !stepCaptureEnabled) {
    console.log('[StepCapture] Ignoring step emission - not capturing or disabled:', cmd);
    return;
  }
  
  // Check if we've hit the step limit
  if (capturedSteps.length >= MAX_CAPTURED_STEPS) {
    console.warn(`[StepCapture] Reached max steps limit (${MAX_CAPTURED_STEPS}). Stopping capture.`);
    // Emit warning to UI
    window.postMessage({ 
      type: 'step_capture_limit_reached', 
      maxSteps: MAX_CAPTURED_STEPS 
    }, '*');
    return;
  }
  
  const now = Date.now();
  const stepKey = `${cmd}_${kind}`;
  
  // Calculate relative timestamp for deduplication
  const relativeTimestamp = captureStartTime ? now - captureStartTime : 0;
  
  // Generate enhanced deduplication key based on element type, value, context, and timestamp
  const deduplicationKey = generateDeduplicationKey(cmd, kind, element, relativeTimestamp);
  
  // Check for duplicate step emission within debounce window
  const lastEmission = recentStepEmissions.get(deduplicationKey);
  if (lastEmission && (now - lastEmission) < STEP_DEBOUNCE_MS) {
    console.log(`[StepCapture] Duplicate step detected, ignoring:`, cmd);
    return;
  }
  
  // Record this step emission with enhanced key
  recentStepEmissions.set(deduplicationKey, now);
  
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
    timestamp: captureStartTime ? Date.now() - captureStartTime : 0
  };
  
  // Always capture element info for each step (lightweight)
  if (element) {
    step.context = {
      element: captureElementInfo(element)
    };
  }
  
  // Determine if we should capture additional context for this step
  const lastContextStep = lastContextStepIndex !== null 
    ? capturedSteps[lastContextStepIndex] 
    : undefined;
  
  if (shouldCaptureContext(step, lastContextStep)) {
    step.context = {
      ...step.context,
      domContext: capturePageContext(),
      pageUrl: truncateUrl(window.location.href, 200),
      pageTitle: document.title
    };
    lastContextStepIndex = capturedSteps.length;
  }
  
  // Add to captured steps array
  capturedSteps.push(step);
  
  // Clean up old contexts to save memory
  cleanupOldContexts();
  
  console.log(`[StepCapture] Emitting step (instance: ${instanceId}):`, step.cmd, 'ID:', step.id, 'URL:', location.href, 'relative_timestamp_ms:', step.timestamp, 'capturedSteps.length:', capturedSteps.length);
  
  // Save step to storage (single source of truth - no need for window.postMessage relay)
  saveStepToStorage(step);
}

function saveStepToStorage(step: CapturedStep) {
  const timestamp = Date.now();
  console.log(`[StepCapture] saveStepToStorage called at ${timestamp} for step:`, step.cmd);
  
  // Single source of truth: only use capturedStepsWithContext
  chrome.storage.local.get([STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT], (result) => {
    const existingSteps = result[STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT] || [];
    const updatedSteps = [...existingSteps, step];
    
    // Single atomic operation - only update the single source of truth
    chrome.storage.local.set({ 
      [STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT]: updatedSteps
    }, () => {
      console.log(`[StepCapture] Step saved:`, step.cmd);
    });
  });
}

// Function to get captured steps with context for API
export async function getCapturedStepsWithContext(): Promise<CapturedStep[]> {
  console.log('[StepCapture] getCapturedStepsWithContext called - reading from single source of truth');
  
  // Always read from the single source of truth in storage
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT], (result) => {
      const storedSteps = result[STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT] || [];
      console.log('[StepCapture] Loaded from single source of truth:', storedSteps.length, 'steps');
      resolve(storedSteps);
    });
  });
}

// Function to update the single source of truth when steps are modified in UI
export function updateCapturedSteps(updatedSteps: CapturedStep[]) {
  console.log('[StepCapture] updateCapturedSteps called with', updatedSteps.length, 'steps');
  
  // Update the single source of truth in storage
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT]: updatedSteps 
  }, () => {
    console.log('[StepCapture] Updated single source of truth with', updatedSteps.length, 'steps');
  });
}

// Function to clear captured steps (called after test creation)
export function clearCapturedSteps() {
  // Clear all captured steps and reset context tracking
  capturedSteps = [];
  lastContextStepIndex = null;
  captureStartTime = null;
  initialGotoStepAdded = false;
  
  // Clear from storage
  chrome.storage.local.set({ [STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT]: [] });
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
      STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT,
      STORAGE_KEYS.CURRENT_URL
    ], (result) => {
      const capturedSteps = result[STORAGE_KEYS.CAPTURED_STEPS_WITH_CONTEXT] || [];
      const steps = capturedSteps.map((step: any) => step.cmd);
      const state = {
        active: result[STORAGE_KEYS.STEP_CAPTURE_ACTIVE] || false,
        steps: steps,
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
  console.log(`[StepCapture] Click handler called (instance: ${instanceId}):`, { isCapturing, stepCaptureEnabled, target: e.target, url: location.href });
  if (!isCapturing) {
    console.log(`[StepCapture] Click handler (instance: ${instanceId}) - not capturing, ignoring`);
    return;
  }
  if (isInExtensionUi(e.target)) {
    console.log(`[StepCapture] Click handler (instance: ${instanceId}) - extension UI, ignoring`);
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
  console.log(`[StepCapture] handleInputs called (instance: ${instanceId}) - event type:`, e.type, 'isCapturing:', isCapturing, 'target:', e.target);
  if (!isCapturing) return;
  if (isInExtensionUi(e.target)) return;
  const el = e.target as HTMLElement;
  if (!el) return;
  
  console.log(`[StepCapture] Input/Change event detected (instance: ${instanceId}) on element:`, el.tagName, 'type:', (el as HTMLInputElement).type, 'event:', e.type);
  
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
        
        // If this blur was caused by a Tab key press, skip the Tab key step to avoid duplication
        const tabPressTime = recentTabPresses.get(el);
        if (tabPressTime && (Date.now() - tabPressTime) < 200) {
          console.log('[StepCapture] Blur after Tab key - skipping Tab key step to avoid duplication');
          recentTabPresses.delete(el); // Clean up
        }
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
    const element = e.target as HTMLElement | null;
    if (element) {
      // Check if this is an input field with a value - if so, skip Tab key step
      // because the blur event will generate a fill command
      if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && 
          element.value && element.value.trim() !== '') {
        console.log('[StepCapture] Tab key on input field with value - skipping Tab step (blur will handle fill)');
        return;
      }
      
      // Track this Tab press for potential blur event filtering
      recentTabPresses.set(element, Date.now());
      console.log('[StepCapture] Tab key pressed on element, tracking for potential blur filtering');
    }
    
    // Small delay to let blur events settle, but still capture Tab key
    setTimeout(() => {
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
  console.log(`[StepCapture] startStepCapture called (instance: ${instanceId}), current state:`, { isCapturing, stepCaptureEnabled, initialGotoStepAdded });
  if (isCapturing) {
    console.log(`[StepCapture] Already capturing (instance: ${instanceId}), ignoring start request`);
    return;
  }
  
  // Only clear state when starting a completely new capture session
  // Don't clear if this is called during navigation restoration
  const isNewCapture = !isCapturing;
  
  if (isNewCapture) {
    console.log('[StepCapture] Starting NEW capture session - clearing all previous state');
    // CRITICAL: Clear all previous state and storage before starting new capture
    capturedSteps = [];
    lastContextStepIndex = null;
    captureStartTime = null;
    lastEmittedSteps.clear();
    recentStepEmissions.clear();
    initialGotoStepAdded = false;
    
    // Clear storage to prevent old steps from persisting
    chrome.storage.local.set({ 
      capturedStepsWithContext: [],
      stepCaptureActive: false,
      currentCaptureUrl: null
    });
  } else {
    console.log('[StepCapture] Restoring capture after navigation - preserving existing steps');
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
    
    // Set capture start time for relative timestamps
    captureStartTime = Date.now();
    
    // Set the global flag for content script
    (window as any)._stepCaptureActive = true;
    console.log('[StepCapture] Set window._stepCaptureActive to true');
    
    // Store the start URL to prevent cross-page step emission
    localStorage.setItem('stepCaptureStartUrl', location.href);
  
  // Start monitoring navigation events
  startNavigationMonitoring();
  
  // Add initial page.goto() step (only once per session)
  if (!initialGotoStepAdded) {
    const gotoStep = `await page.goto('${location.href}');`;
    console.log('[StepCapture] Adding initial page.goto() step:', gotoStep, 'initialGotoStepAdded was:', initialGotoStepAdded);
    emitStep(gotoStep, 'goto');
    initialGotoStepAdded = true;
    console.log('[StepCapture] Set initialGotoStepAdded to:', initialGotoStepAdded);
  } else {
    console.log('[StepCapture] Skipping page.goto() step - already added, initialGotoStepAdded:', initialGotoStepAdded);
  }
  
  // Save state to storage
  saveCaptureState(true);
  
  console.log('[StepCapture] Starting capture with passive listeners (Playwright approach)');
  
  // Attach event listeners safely (only once)
  attachEventListeners();
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
  
  // Stop navigation monitoring
  stopNavigationMonitoring();
  
  // Clear debounce maps
  lastEmittedSteps.clear();
  recentStepEmissions.clear();
  
  // DON'T clear captured steps yet - they should be preserved until sent to server
  // The steps will be cleared by clearCapturedSteps() after successful test creation
  console.log('[StepCapture] Preserving captured steps in storage until test is created');
  
  // Clear state from storage (but keep capturedStepsWithContext for test creation)
  chrome.storage.local.set({ 
    stepCaptureActive: false,
    currentCaptureUrl: null
  }, () => {
    console.log('[StepCapture] Storage cleared successfully');
  });
  
  console.log('[StepCapture] Cleaning up', cleanupFns.length, 'event listeners');
  for (const fn of cleanupFns) {
    try { 
      console.log('[StepCapture] Calling cleanup function');
      fn(); 
    } catch (e) {
      console.error('[StepCapture] Error in cleanup function:', e);
    }
  }
  cleanupFns = [];
  eventListenersAttached = false; // Reset flag for next capture session
  (window as any)._stepCaptureListenersAttached = false; // Reset global flag
  console.log('[StepCapture] Cleanup completed - eventListenersAttached:', eventListenersAttached, 'cleanupFns.length:', cleanupFns.length);
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
  
  // Attach event listeners safely (only once)
  attachEventListeners();
  
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
          
          // DON'T clear old steps on navigation - preserve them for the full session
          // The sidebar should show all steps from the entire capture session
          console.log('[StepCapture] Preserving steps across navigation - keeping all session steps');
          // Only reset the goto flag for the new page
          initialGotoStepAdded = false;
          
          // Attach event listeners safely (only once)
          console.log('[StepCapture] Adding event listeners for restoration');
          attachEventListeners();
          console.log('[StepCapture] Event listeners added for restoration');
          
          // Test if event listeners are working
          console.log('[StepCapture] Testing event listeners - try clicking on the page to see if events are captured');
          
          // Verify event listeners are attached
          console.log('[StepCapture] Event listener count:', cleanupFns.length);
          console.log('[StepCapture] Current state - isCapturing:', isCapturing, 'stepCaptureEnabled:', stepCaptureEnabled);
          
          // Hover disabled - too noisy, not useful for tests
          // document.addEventListener('mouseover', handleMouseOver, listenerOptions);
          
          // Cleanup functions are now handled by attachEventListeners()
          
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
          console.log('[StepCapture] Setting up capture after navigation with timeout');
          // Set up capture state
          isCapturing = true;
          stepCaptureEnabled = true;
          (window as any)._stepCaptureActive = true;
          
          // Update the start URL for the new page
          localStorage.setItem('stepCaptureStartUrl', location.href);
          
          // Preserve steps across navigation
          initialGotoStepAdded = false;
          
          // Attach event listeners safely
          attachEventListeners();
          
          // Notify sidebar
          window.postMessage({ type: 'tc-step-capture-restored', steps: [] }, '*');
        }, 100);
      } else {
        clearCaptureState();
      }
    }
  } catch (error) {
    console.error('[StepCapture] Error auto-restoring state:', error);
  }
}



