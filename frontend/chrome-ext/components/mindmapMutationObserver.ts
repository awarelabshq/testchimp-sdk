// mindmapMutationObserver.ts
// Helper to observe user actions and DOM mutations for MindMapBuilder

let observer: MutationObserver | null = null;
let listeners: Array<() => void> = [];
let inputTimeouts: Map<HTMLInputElement, NodeJS.Timeout> = new Map();

function truncateText(text: string, maxLength = 30): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export function startMindMapMutationObserver(callback: (action: string) => void) {
  // Listen for clicks
  const clickListener = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    
    // Skip if clicking within the extension UI or sidebar
    if (target.closest('.ant-drawer') || target.closest('.ant-modal') || target.closest('[data-testid="tc-ext-sidebar"]') || target.closest('.sidebar')) {
      return;
    }
    
    let desc = '';
    if (target.tagName === 'BUTTON') {
      const text = truncateText(target.innerText.trim() || target.textContent?.trim() || '');
      desc = text ? `Clicked button: "${text}"` : 'Clicked button';
    } else if (target.tagName === 'A') {
      const text = truncateText(target.innerText.trim() || target.textContent?.trim() || '');
      desc = text ? `Clicked link: "${text}"` : 'Clicked link';
    } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Don't capture input clicks, they'll be handled by input events
      return;
    } else {
      // Try to get meaningful text from the element
      const text = truncateText(target.innerText.trim() || target.textContent?.trim() || '');
      const ariaLabel = truncateText(target.getAttribute('aria-label') || '');
      const title = truncateText(target.getAttribute('title') || '');
      const placeholder = truncateText(target.getAttribute('placeholder') || '');
      
      if (text) {
        desc = `Clicked: "${text}"`;
      } else if (ariaLabel) {
        desc = `Clicked: "${ariaLabel}"`;
      } else if (title) {
        desc = `Clicked: "${title}"`;
      } else if (placeholder) {
        desc = `Clicked: "${placeholder}"`;
      } else {
        desc = `Clicked ${target.tagName.toLowerCase()}`;
      }
    }
    callback(desc);
  };
  document.addEventListener('click', clickListener, true);
  listeners.push(() => document.removeEventListener('click', clickListener, true));

  // Listen for input changes with debouncing
  const inputListener = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target || target.type === 'file') return;
    
    // Clear existing timeout for this input
    const existingTimeout = inputTimeouts.get(target);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to capture the final value
    const timeout = setTimeout(() => {
      const value = truncateText(target.value);
      const placeholder = truncateText(target.placeholder || target.name || 'input field');
      callback(`Entered text in ${placeholder}: "${value}"`);
      inputTimeouts.delete(target);
    }, 500); // Wait 500ms after user stops typing
    
    inputTimeouts.set(target, timeout);
  };
  document.addEventListener('input', inputListener, true);
  listeners.push(() => document.removeEventListener('input', inputListener, true));

  // Listen for blur events to capture input immediately when user leaves the field
  const blurListener = (e: FocusEvent) => {
    const target = e.target as HTMLInputElement;
    if (!target || target.type === 'file') return;
    
    const existingTimeout = inputTimeouts.get(target);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      inputTimeouts.delete(target);
      
      const value = truncateText(target.value);
      const placeholder = truncateText(target.placeholder || target.name || 'input field');
      callback(`Entered text in ${placeholder}: "${value}"`);
    }
  };
  document.addEventListener('blur', blurListener, true);
  listeners.push(() => document.removeEventListener('blur', blurListener, true));

  // Listen for form submissions
  const submitListener = (e: Event) => {
    const target = e.target as HTMLFormElement;
    if (!target) return;
    callback(`Submitted form: ${truncateText(target.action || 'unknown form')}`);
  };
  document.addEventListener('submit', submitListener, true);
  listeners.push(() => document.removeEventListener('submit', submitListener, true));

  // Note: DOM mutation observer removed as page content changes don't need capturing
}

export function stopMindMapMutationObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  listeners.forEach(unlisten => unlisten());
  listeners = [];
  
  // Clear any pending input timeouts
  inputTimeouts.forEach(timeout => clearTimeout(timeout));
  inputTimeouts.clear();
} 