const SKIP_CAPTURE_ACTIONS = new Set([
  'fill',
  'press',
  'check',
  'expect',
  'hover',
]);

const STABILITY_ACTIONS = new Set([
  'click',
  'goto',
  'navigate',
  'selectoption',
  'select',
  'drag',
  'dblclick',
]);

const HIGH_SIGNAL_ACTIONS = new Set(['click', 'goto', 'navigate', 'selectoption']);

function parseActionName(stepCode: string): string {
  const trimmed = (stepCode || '').trim();
  const dotMatch = trimmed.match(/\.(\w+)\s*\(/);
  if (dotMatch) return dotMatch[1].toLowerCase();
  const bareMatch = trimmed.match(/^(\w+)\s*\(/);
  if (bareMatch) return bareMatch[1].toLowerCase();
  if (trimmed.includes('goto')) return 'goto';
  if (trimmed.includes('navigate')) return 'navigate';
  return '';
}

export function shouldCaptureScreenshot(stepCode: string): boolean {
  const action = parseActionName(stepCode);
  if (!action) return true;
  return !SKIP_CAPTURE_ACTIONS.has(action);
}

export function shouldWaitForDomStability(stepCode: string): boolean {
  const action = parseActionName(stepCode);
  if (!action || SKIP_CAPTURE_ACTIONS.has(action)) return false;
  return STABILITY_ACTIONS.has(action);
}

export function isHighSignalStep(stepCode: string): boolean {
  const action = parseActionName(stepCode);
  return HIGH_SIGNAL_ACTIONS.has(action);
}
