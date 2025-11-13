import { getUniqueSelector, getQuerySelector } from './html_utils';
import { generateMultipleCommands, generateMultipleAssertions, generateGotoCommands, generateLocators } from './commandGenerator';

export type PlaywrightCommand = string;

// Shared type definitions
export type ActionType = 'click' | 'fill' | 'type' | 'check' | 'uncheck' | 'selectOption' | 'hover' | 'press' | 'dblclick';
export type AssertionType = 'toBeVisible' | 'toHaveText' | 'toHaveValue' | 'toBeEnabled' | 'toBeDisabled' | 'toHaveCount';
export interface ActionOptions {
  button?: 'left' | 'middle' | 'right';
  modifiers?: string[];
}

// Structured step data for future DOM snapshot correlation
export interface CapturedStep {
  id: string;       // UUID for correlation with DOM snapshots
  commands: string[];  // Array of alternative Playwright commands
  selectedCommandIndex: number;  // Index of currently selected command (0-based, defaults to 0)
  kind: string;     // "click", "fill", "select", etc.
  timestamp: number; // When action was captured
  
  // Optional - for LLM context and element info
  context?: {
    domContext?: string;  // Token-efficient ARIA snapshot at key steps only
    pageUrl?: string;     // Truncated to 200 chars max
    pageTitle?: string;   // Current page title
    element?: {
      tag: string;        // HTML tag name
      attributes: Record<string, string>;  // Key attributes (id, class, type, etc.)
      text?: string;      // Visible text content (truncated)
    };
  };
}

// Helper function to get selected command
export function getSelectedCommand(step: CapturedStep): string {
  if (!step.commands || step.commands.length === 0) return '';
  const index = Math.max(0, Math.min(step.selectedCommandIndex || 0, step.commands.length - 1));
  return step.commands[index];
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

export function genClickCommand(payload: ClickEventPayload): string[] {
  const actionType = payload.dblclick ? 'dblclick' : 'click';
  
  // Build options object if needed
  const options: ActionOptions = {};
  if (payload.button && payload.button !== 'left') {
    options.button = payload.button;
  }
  if (payload.modifiers && payload.modifiers.length) {
    options.modifiers = payload.modifiers;
  }
  
  // Generate commands with options
  return generateMultipleCommands(
    payload.element, 
    actionType, 
    undefined, 
    Object.keys(options).length > 0 ? options : undefined
  );
}

export interface InputEventPayload {
  element: HTMLInputElement | HTMLTextAreaElement;
  value: string;
  type?: 'fill' | 'type';
}

export function genInputCommand(payload: InputEventPayload): string[] {
  const actionType = payload.type === 'type' ? 'type' : 'fill';
  return generateMultipleCommands(payload.element, actionType, payload.value);
}

export interface SelectEventPayload {
  element: HTMLSelectElement;
  value: string | string[];
}

export function genSelectCommand(payload: SelectEventPayload): string[] {
  return generateMultipleCommands(payload.element, 'selectOption', payload.value);
}

export interface CheckEventPayload {
  element: HTMLInputElement; // checkbox or radio
  checked: boolean;
}

export function genCheckCommand(payload: CheckEventPayload): string[] {
  // Radio buttons always check, checkboxes can check or uncheck
  if (payload.element.type === 'radio') {
    return generateMultipleCommands(payload.element, 'check');
  }
  const actionType = payload.checked ? 'check' : 'uncheck';
  return generateMultipleCommands(payload.element, actionType);
}

export interface HoverEventPayload {
  element: HTMLElement;
}

export function genHoverCommand(payload: HoverEventPayload): string[] {
  return generateMultipleCommands(payload.element, 'hover');
}

export interface KeyPressPayload {
  element?: HTMLElement | null;
  key: string;
}

export function genKeyPressCommand(payload: KeyPressPayload): string[] {
  const key = payload.key;
  if (!key) return [];
  
  if (payload.element) {
    return generateMultipleCommands(payload.element, 'press', key);
  }
  
  // For keyboard-level press (no element), return single command
  return [`await page.keyboard.press(${quote(key)});`];
}

export interface DragDropPayload {
  source: HTMLElement;
  target: HTMLElement;
}

export function genDragDropCommand(payload: DragDropPayload): string[] {
  // Generate locators for both source and target
  const sourceLocators = generateLocators(payload.source);
  const targetLocators = generateLocators(payload.target);
  
  const commands: string[] = [];
  const seenCommands = new Set<string>();
  
  // Generate drag and drop commands for each combination (prioritize first source with all targets)
  if (sourceLocators.length > 0 && targetLocators.length > 0) {
    // Use first source locator with all target locators
    for (const targetLoc of targetLocators) {
      const cmd = `await ${sourceLocators[0]}.dragTo(${targetLoc});`;
      if (!seenCommands.has(cmd)) {
        seenCommands.add(cmd);
        commands.push(cmd);
      }
    }
    
    // Add variants with different source locators if we have them
    for (let i = 1; i < Math.min(sourceLocators.length, 3); i++) {
      const cmd = `await ${sourceLocators[i]}.dragTo(${targetLocators[0]});`;
      if (!seenCommands.has(cmd)) {
        seenCommands.add(cmd);
        commands.push(cmd);
      }
    }
  }
  
  return commands;
}

export function genGotoCommand(url: string): string[] {
  return generateGotoCommands(url);
}

// Assertion generation functions
export function genAssertVisible(element: HTMLElement): string[] {
  return generateMultipleAssertions(element, 'toBeVisible');
}

export function genAssertText(element: HTMLElement): string[] {
  const text = element.textContent?.trim() || '';
  return generateMultipleAssertions(element, 'toHaveText', text);
}

export function genAssertValue(element: HTMLElement): string[] {
  // Only works for input elements
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
    return [];
  }
  
  const value = (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value || '';
  return generateMultipleAssertions(element, 'toHaveValue', value);
}

export function genAssertEnabled(element: HTMLElement): string[] {
  const isDisabled = element.hasAttribute('disabled');
  return generateMultipleAssertions(element, isDisabled ? 'toBeDisabled' : 'toBeEnabled');
}

export function genAssertCount(element: HTMLElement): string[] {
  const sel = selectorFor(element);
  if (!sel) return [];
  
  // Count elements with same selector
  const count = document.querySelectorAll(sel).length;
  return generateMultipleAssertions(element, 'toHaveCount', count);
}

// Helper function to generate assertion based on mode
export function generateAssertion(element: HTMLElement, mode: AssertionMode): string[] {
  switch (mode) {
    case 'assertVisible':
      return genAssertVisible(element);
    case 'assertText':
      return genAssertText(element);
    case 'assertValue':
      return genAssertValue(element);
    case 'assertEnabled':
      return genAssertEnabled(element);
    case 'assertCount':
      return genAssertCount(element);
    default:
      return [];
  }
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
    | 'goto'
    | 'assert_visible'
    | 'assert_text'
    | 'assert_value'
    | 'assert_enabled'
    | 'assert_count';
};

// Assertion mode types
export type AssertionMode = 
  | 'normal'
  | 'assertVisible'
  | 'assertText'
  | 'assertValue'
  | 'assertEnabled'
  | 'assertCount';


