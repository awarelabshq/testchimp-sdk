/**
 * Page-side element pick and bounding-box draw for sidebar annotation flows.
 * Listens for window messages from the sidebar and posts results back.
 */

import { getCSSSelector } from './html_utils';

let pickActive = false;
let highlightEl: HTMLElement | null = null;
let boxOverlay: HTMLDivElement | null = null;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
let drawing = false;

const PICK_OVERLAY_IDS = new Set([
  'tc-mode-overlay',
  'tc-control-box-overlay',
  'tc-element-pick-box',
]);

export function isElementPickActive(): boolean {
  return pickActive;
}

function setPickActive(active: boolean): void {
  pickActive = active;
}

function isExtensionUiElement(el: HTMLElement | null): boolean {
  if (!el) return true;
  if (el.closest('#testchimp-sidebar') || el.closest('#testchimp-sidebar-toggle')) return true;
  if (PICK_OVERLAY_IDS.has(el.id)) return true;
  return false;
}

function resolveTarget(el: EventTarget | null): HTMLElement | null {
  const node = el as HTMLElement | null;
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  if (isExtensionUiElement(node)) return null;
  return node;
}

function cssSelectorForElement(el: HTMLElement): string {
  const selector = getCSSSelector(el);
  if (!selector) return el.tagName.toLowerCase();
  try {
    const match = document.querySelector(selector);
    if (match === el) return selector;
  } catch {
    /* fall through */
  }

  if (el.id) return `#${CSS.escape(el.id)}`;

  const parts: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part = `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((s) => s.tagName === current!.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ') || el.tagName.toLowerCase();
}

function clearHighlight(): void {
  if (highlightEl) {
    highlightEl.style.outline = '';
    highlightEl = null;
  }
}

function cleanupElementSelect(): void {
  document.removeEventListener('mousemove', onHover, true);
  document.removeEventListener('click', onElementClick, true);
  document.removeEventListener('keydown', onElementKeyDown, true);
  clearHighlight();
  document.body.style.cursor = '';
  setPickActive(false);
}

function onHover(e: MouseEvent): void {
  const target = resolveTarget(e.target);
  if (highlightEl && highlightEl !== target) {
    highlightEl.style.outline = '';
  }
  highlightEl = target;
  if (highlightEl) {
    highlightEl.style.outline = '2px solid #72BDA3';
  }
}

function onElementClick(e: MouseEvent): void {
  const target = resolveTarget(e.target);
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  cleanupElementSelect();

  if (!target) {
    window.postMessage({ type: 'tc-show-sidebar' }, '*');
    return;
  }

  clearHighlight();
  const querySelector = cssSelectorForElement(target);
  const role = target.getAttribute('role') || '';
  const text = (target.innerText || target.textContent || '').trim();
  const tagName = target.tagName.toLowerCase();

  window.postMessage(
    {
      type: 'elementSelected',
      querySelector,
      id: target.id || '',
      role,
      text,
      tagName,
    },
    '*'
  );
}

function onElementKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    cleanupElementSelect();
    window.postMessage({ type: 'tc-show-sidebar' }, '*');
  }
}

function startElementSelect(): void {
  cleanupElementSelect();
  cleanupBoxDraw();
  setPickActive(true);
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onHover, true);
  document.addEventListener('click', onElementClick, true);
  document.addEventListener('keydown', onElementKeyDown, true);
}

function cleanupBoxDraw(): void {
  document.removeEventListener('mousedown', onBoxDown, true);
  document.removeEventListener('mousemove', onBoxMove, true);
  document.removeEventListener('mouseup', onBoxUp, true);
  document.removeEventListener('keydown', onBoxKeyDown, true);
  if (boxOverlay?.parentNode) {
    boxOverlay.parentNode.removeChild(boxOverlay);
  }
  boxOverlay = null;
  drawing = false;
  document.body.style.cursor = '';
  setPickActive(false);
}

function onBoxDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  if (drawing) return;
  if (isExtensionUiElement(e.target as HTMLElement)) return;

  drawing = true;
  startX = e.clientX;
  startY = e.clientY;

  boxOverlay = document.createElement('div');
  boxOverlay.id = 'tc-element-pick-box';
  Object.assign(boxOverlay.style, {
    position: 'fixed',
    zIndex: '9999999',
    border: '2px dashed #ff6b65',
    background: 'rgba(255,107,101,0.1)',
    pointerEvents: 'none',
    left: `${startX}px`,
    top: `${startY}px`,
    width: '0px',
    height: '0px',
  });
  document.body.appendChild(boxOverlay);

  document.addEventListener('mousemove', onBoxMove, true);
  document.addEventListener('mouseup', onBoxUp, true);
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}

function onBoxMove(e: MouseEvent): void {
  if (!drawing || !boxOverlay) return;
  endX = e.clientX;
  endY = e.clientY;
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  Object.assign(boxOverlay.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
}

function onBoxUp(e: MouseEvent): void {
  if (!drawing) return;
  drawing = false;
  document.removeEventListener('mousemove', onBoxMove, true);
  document.removeEventListener('mouseup', onBoxUp, true);

  if (boxOverlay) {
    const rect = boxOverlay.getBoundingClientRect();
    if (rect.width >= 4 && rect.height >= 4) {
      window.postMessage(
        {
          type: 'boxDrawn',
          coords: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        },
        '*'
      );
    }
    if (boxOverlay.parentNode) {
      boxOverlay.parentNode.removeChild(boxOverlay);
    }
    boxOverlay = null;
  }

  cleanupBoxDraw();
}

function onBoxKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    cleanupBoxDraw();
    window.postMessage({ type: 'tc-show-sidebar' }, '*');
  }
}

function startBoxDraw(): void {
  cleanupElementSelect();
  cleanupBoxDraw();
  setPickActive(true);
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousedown', onBoxDown, true);
  document.addEventListener('keydown', onBoxKeyDown, true);
}

function onWindowMessage(event: MessageEvent): void {
  if (event.source !== window) return;
  if (!event.data || typeof event.data.type !== 'string') return;

  if (event.data.type === 'startElementSelect') {
    startElementSelect();
  } else if (event.data.type === 'startBoxDraw') {
    startBoxDraw();
  }
}

export function initElementPickHandler(): void {
  if (window !== window.top) return;
  if ((window as Window & { __tcElementPickHandlerInit?: boolean }).__tcElementPickHandlerInit) return;
  (window as Window & { __tcElementPickHandlerInit?: boolean }).__tcElementPickHandlerInit = true;
  window.addEventListener('message', onWindowMessage);
}

initElementPickHandler();
