import { getUniqueSelector, getQuerySelector } from './html_utils';

export type PlaywrightCommand = string;

// Structured step data for future DOM snapshot correlation
export interface CapturedStep {
  id: string;       // UUID for correlation with DOM snapshots
  cmd: string;      // "await page.click('button.submit');"
  kind: string;     // "click", "fill", "select", etc.
  selector: string; // "button.submit" (parsed selector)
  timestamp: number; // When action was captured
  
  // Optional - for future DOM snapshot capture
  context?: {
    element?: {
      tag: string;
      attributes: Record<string, string>;
      text?: string;
    };
    domSnapshotId?: string;  // Reference to stored snapshot
    domSnapshot?: string;    // Or inline simplified HTML
  };
}

// Generate UUID for step identification
export function generateStepId(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Extract selector from generated command
export function extractSelector(cmd: string): string {
  // Extract selector from command string
  // "await page.click('selector');" -> "selector"
  const match = cmd.match(/\(['`"]([^'"`]+)['`"]/);
  return match ? match[1] : '';
}

// Enhanced escape function for template literals with comprehensive Unicode support
function escapeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Use JSON.stringify for proper Unicode and special character escaping
  // This handles all Unicode characters, control characters, and special chars
  const jsonEscaped = JSON.stringify(text);
  
  // Remove the outer quotes that JSON.stringify adds
  return jsonEscaped.slice(1, -1);
}

// Escape selector values for CSS attribute selectors
export function escapeSelectorValue(value: string | null | undefined): string {
  if (!value) return '';
  
  // Use CSS.escape() if available (modern browsers)
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }
  
  // Fallback: manual escaping for common cases
  return value
    .replace(/\\/g, '\\\\')   // Backslash
    .replace(/"/g, '\\"')     // Double quote
    .replace(/'/g, "\\'")     // Single quote
    .replace(/\[/g, '\\[')    // Opening bracket
    .replace(/\]/g, '\\]')    // Closing bracket
    .replace(/\(/g, '\\(')    // Opening parenthesis
    .replace(/\)/g, '\\)')    // Closing parenthesis
    .replace(/\{/g, '\\{')    // Opening brace
    .replace(/\}/g, '\\}');   // Closing brace
}

function quote(text: string | null | undefined): string {
  return '`' + escapeText(text) + '`';
}

function selectorFor(element: HTMLElement | null): string {
  if (!element) return '';
  try {
    return getUniqueSelector(element) || getQuerySelector(element) || '';
  } catch (_) {
    return '';
  }
}

export interface ClickEventPayload {
  element: HTMLElement;
  dblclick?: boolean;
  button?: 'left' | 'middle' | 'right';
  modifiers?: string[]; // 'Shift' | 'Alt' | 'Control' | 'Meta'
}

export function genClickCommand(payload: ClickEventPayload): PlaywrightCommand | undefined {
  const sel = selectorFor(payload.element);
  if (!sel) return undefined;
  const base = payload.dblclick ? 'dblclick' : 'click';
  const opts: Record<string, any> = {};
  if (payload.button && payload.button !== 'left') opts.button = payload.button;
  if (payload.modifiers && payload.modifiers.length) opts.modifiers = payload.modifiers;
  const optsStr = Object.keys(opts).length ? `, ${JSON.stringify(opts)}` : '';
  return `await page.${base}(${quote(sel)}${optsStr});`;
}

export interface InputEventPayload {
  element: HTMLInputElement | HTMLTextAreaElement;
  value: string;
  type?: 'fill' | 'type';
}

export function genInputCommand(payload: InputEventPayload): PlaywrightCommand | undefined {
  const sel = selectorFor(payload.element as unknown as HTMLElement);
  if (!sel) return undefined;
  const method = payload.type === 'type' ? 'type' : 'fill';
  return `await page.${method}(${quote(sel)}, ${quote(payload.value)});`;
}

export interface SelectEventPayload {
  element: HTMLSelectElement;
  value: string | string[];
}

export function genSelectCommand(payload: SelectEventPayload): PlaywrightCommand | undefined {
  const sel = selectorFor(payload.element as unknown as HTMLElement);
  if (!sel) return undefined;
  return `await page.selectOption(${quote(sel)}, ${JSON.stringify(payload.value)});`;
}

export interface CheckEventPayload {
  element: HTMLInputElement; // checkbox or radio
  checked: boolean;
}

export function genCheckCommand(payload: CheckEventPayload): PlaywrightCommand | undefined {
  const sel = selectorFor(payload.element as unknown as HTMLElement);
  if (!sel) return undefined;
  if (payload.element.type === 'radio') {
    return `await page.check(${quote(sel)});`;
  }
  return payload.checked ? `await page.check(${quote(sel)});` : `await page.uncheck(${quote(sel)});`;
}

export interface HoverEventPayload {
  element: HTMLElement;
}

export function genHoverCommand(payload: HoverEventPayload): PlaywrightCommand | undefined {
  const sel = selectorFor(payload.element);
  if (!sel) return undefined;
  return `await page.hover(${quote(sel)});`;
}

export interface KeyPressPayload {
  element?: HTMLElement | null;
  key: string;
}

export function genKeyPressCommand(payload: KeyPressPayload): PlaywrightCommand | undefined {
  // Prefer element-targeted press when we have a selector
  const sel = payload.element ? selectorFor(payload.element) : '';
  const key = payload.key;
  if (!key) return undefined;
  if (sel) return `await page.press(${quote(sel)}, ${quote(key)});`;
  return `await page.keyboard.press(${quote(key)});`;
}

export interface DragDropPayload {
  source: HTMLElement;
  target: HTMLElement;
}

export function genDragDropCommand(payload: DragDropPayload): PlaywrightCommand | undefined {
  const src = selectorFor(payload.source);
  const dst = selectorFor(payload.target);
  if (!src || !dst) return undefined;
  return `await page.dragAndDrop(${quote(src)}, ${quote(dst)});`;
}

export function genGotoCommand(url: string): PlaywrightCommand {
  return `await page.goto(${quote(url)});`;
}

export type GeneratedCommand = {
  cmd: PlaywrightCommand;
  kind:
    | 'click'
    | 'dblclick'
    | 'input'
    | 'select'
    | 'check'
    | 'hover'
    | 'keypress'
    | 'dragdrop'
    | 'goto';
};


