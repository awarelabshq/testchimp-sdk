import { getUniqueSelector, getQuerySelector } from './html_utils';

export type PlaywrightCommand = string;

function escapeText(text: string | null | undefined): string {
  const s = (text ?? '').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  return s;
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


