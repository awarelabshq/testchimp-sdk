// Shared HTML element info extraction utilities for both extension and injected scripts

// Prefer Playwright-style selectors
export function getUniqueSelector(el: HTMLElement): string {
    if (!el) return '';
    // 1. Prefer data-testid, data-test-id, data-test, data-id
    const testAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-id'];
    for (const attr of testAttrs) {
        const val = el.getAttribute && el.getAttribute(attr);
        if (val) return `[${attr}="${val}"]`;
    }
    // 2. Prefer role with accessible name
    const role = el.getAttribute && el.getAttribute('role');
    let accName = el.getAttribute && (el.getAttribute('aria-label') || (el.textContent && el.textContent.trim()));
    if (role && accName) {
        if (accName.length > 50) accName = accName.slice(0, 50) + '...';
        return `role=${role}[name="${accName}"]`;
    }
    // 3. Prefer text selector if visible text is present
    const visibleText = el.textContent && el.textContent.trim();
    if (visibleText && visibleText.length > 0 && visibleText.length < 100) {
        return `text="${visibleText}"`;
    }
    // 4. Fallback: short CSS selector (id, class, nth-child)
    if (el.id) return `#${el.id}`;
    let selector = el.tagName ? el.tagName.toLowerCase() : '';
    if (el.className && typeof el.className === 'string') {
        const classPart = el.className.trim().replace(/\s+/g, '.');
        if (classPart) selector += `.${classPart}`;
    }
    if (el.parentElement) {
        const siblings = Array.from(el.parentElement.children).filter(
            (sib) => sib.tagName === el.tagName
        );
        if (siblings.length > 1) {
            const idx = siblings.indexOf(el) + 1;
            selector += `:nth-of-type(${idx})`;
        }
    }
    return selector;
}

// Extract all attributes as a key-value map
function getElementAttributesAsKeys(element: HTMLElement): Record<string, any> {
    const attrs: Record<string, any> = {};
    for (let attr of Array.from(element.attributes)) {
        attrs[attr.name] = attr.value;
    }
    return attrs;
}

// Extract a subset or all computed styles as a key-value map
export function getComputedStylesMap(element: HTMLElement): Record<string, string> {
    const style = window.getComputedStyle(element);
    // You can select which properties to include, or include all
    const properties = [
        'color', 'background-color', 'font-size', 'font-weight', 'display', 'visibility', 'opacity',
        'border', 'margin', 'padding', 'width', 'height', 'position', 'top', 'left', 'right', 'bottom',
        'z-index', 'overflow', 'text-align', 'line-height', 'vertical-align', 'box-shadow', 'border-radius'
    ];
    const result: Record<string, string> = {};
    for (const prop of properties) {
        result[prop] = style.getPropertyValue(prop);
    }
    return result;
}

// Parameterized attribute selection
export const BASIC_ATTRS = ['id', 'class', 'name', 'type'];
export function getAttributes(element: HTMLElement, keys: string[] = BASIC_ATTRS): Record<string, string> {
    const attrs: Record<string, string> = {};
    const allAttrs = getElementAttributesAsKeys(element);
    keys.forEach(k => { if (allAttrs[k]) attrs[k] = allAttrs[k]; });
    // Always include data-* attributes
    Object.keys(allAttrs).forEach(k => {
        if (k.startsWith('data-')) attrs[k] = allAttrs[k];
    });
    return attrs;
}

// Parameterized computed style selection
export const BASIC_STYLES = ['color', 'background-color', 'font-size', 'font-weight', 'display'];
export function getComputedStyles(element: HTMLElement, keys: string[] = BASIC_STYLES): Record<string, string> {
    const allStyles = getComputedStylesMap(element);
    const styles: Record<string, string> = {};
    keys.forEach(k => { if (allStyles[k]) styles[k] = allStyles[k]; });
    return styles;
}

// Ancestor hierarchy extraction
export function getAncestorHierarchy(element: HTMLElement, opts?: { full?: boolean }): string {
    const parts: string[] = [];
    let el: HTMLElement | null = element;
    while (el && el !== document.body && el !== document.documentElement) {
        let part = el.tagName.toLowerCase();
        if (el.id) part += `#${el.id}`;
        if (el.className && typeof el.className === 'string') part += `.${el.className.trim().replace(/\s+/g, '.')}`;
        parts.unshift(part);
        el = el.parentElement;
        if (opts && !opts.full && parts.length >= 3) break; // Only 3 levels for short
    }
    return parts.join(' > ');
}

// Returns a valid CSS selector for use with document.querySelector
export function getQuerySelector(el: HTMLElement): string {
    if (!el) return '';
    // Prefer id
    if (el.id) return `#${el.id}`;
    // Prefer data-testid, data-test-id, data-test, data-id
    const testAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-id'];
    for (const attr of testAttrs) {
        const val = el.getAttribute && el.getAttribute(attr);
        if (val) return `[${attr}="${val}"]`;
    }
    // Fallback: tag.class
    let selector = el.tagName ? el.tagName.toLowerCase() : '';
    if (el.className && typeof el.className === 'string') {
        const classPart = el.className.trim().replace(/\s+/g, '.');
        if (classPart) selector += `.${classPart}`;
    }
    // Add nth-of-type if needed for uniqueness
    if (el.parentElement) {
        const siblings = Array.from(el.parentElement.children).filter(
            (sib) => sib.tagName === el.tagName
        );
        if (siblings.length > 1) {
            const idx = siblings.indexOf(el) + 1;
            selector += `:nth-of-type(${idx})`;
        }
    }
    return selector;
}

/**
 * Recursively walk the DOM and output a simplified, LLM-friendly JSON structure for bug analytics.
 * - Outputs: tag, key attributes, computed styles, and children (recursive tree)
 * - Prunes noisy elements, skips invisible nodes
 * - Summarizes tables/lists to avoid repetition
 * - Default: maxDepth=12, maxChildren=30
 */
export function simplifyDOMForLLM(
  root: HTMLElement = document.body,
  opts?: { maxDepth?: number; maxChildren?: number }
): any {
  const maxDepth = opts?.maxDepth ?? 12;
  const maxChildren = opts?.maxChildren ?? 30;
  const NOISY_TAGS = new Set([
    'SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS', 'HEAD', 'TITLE', 'OBJECT', 'EMBED',
  ]);
  // Subset of computed styles useful for bug analytics
  const STYLE_KEYS = [
    'display', 'visibility', 'color', 'background-color', 'font-size', 'font-weight', 'position', 'z-index',
    'width', 'height', 'overflow', 'opacity', 'border', 'margin', 'padding', 'text-align', 'line-height',
  ];

  function isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    let cur: HTMLElement | null = el;
    while (cur) {
      if (cur.hidden) return false;
      cur = cur.parentElement;
    }
    return true;
  }

  function getKeyAttrs(el: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) {
      if (/^(id|class|role|name|type|data-|aria-)/.test(attr.name)) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }

  function getStyles(el: HTMLElement): Record<string, string> {
    const style = window.getComputedStyle(el);
    const out: Record<string, string> = {};
    for (const k of STYLE_KEYS) {
      out[k] = style.getPropertyValue(k);
    }
    return out;
  }

  function getShortText(el: HTMLElement): string | undefined {
    const txt = el.textContent?.trim() || '';
    if (!txt) return undefined;
    if (txt.length > 120) return txt.slice(0, 117) + '...';
    return txt;
  }

  function summarizeTable(table: HTMLTableElement, depth: number): any {
    // Show first row/cell, then summary counts
    const out: any = { tag: 'table', attrs: getKeyAttrs(table), styles: getStyles(table) };
    const rows = Array.from(table.rows);
    if (rows.length > 0) {
      out.firstRow = Array.from(rows[0].cells).map(cell => ({
        tag: cell.tagName.toLowerCase(),
        attrs: getKeyAttrs(cell),
        styles: getStyles(cell),
        text: getShortText(cell),
      }));
    }
    out.rowCount = rows.length;
    out.colCount = rows[0]?.cells.length || 0;
    return out;
  }

  function summarizeList(list: HTMLElement, depth: number): any {
    // Show first 3 items, then summary count
    const out: any = { tag: list.tagName.toLowerCase(), attrs: getKeyAttrs(list), styles: getStyles(list) };
    const items = Array.from(list.children).filter(
      el => el.tagName === 'LI'
    ) as HTMLElement[];
    out.items = items.slice(0, 3).map(li => ({
      tag: 'li',
      attrs: getKeyAttrs(li),
      styles: getStyles(li),
      text: getShortText(li),
    }));
    if (items.length > 3) out.moreItems = items.length - 3;
    return out;
  }

  function walk(el: HTMLElement, depth: number): any {
    if (depth > maxDepth) return undefined;
    if (NOISY_TAGS.has(el.tagName)) return undefined;
    if (!isVisible(el)) return undefined;
    // Table summarization
    if (el.tagName === 'TABLE') return summarizeTable(el as HTMLTableElement, depth);
    // List summarization
    if ((el.tagName === 'UL' || el.tagName === 'OL') && el.children.length > 10) return summarizeList(el, depth);
    const node: any = {
      tag: el.tagName.toLowerCase(),
      attrs: getKeyAttrs(el),
      styles: getStyles(el),
    };
    const label = el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title');
    if (label) node.label = label;
    const text = getShortText(el);
    if (text) node.text = text;
    // Children
    const children: any[] = [];
    let count = 0;
    for (const child of Array.from(el.children)) {
      if (count >= maxChildren) break;
      const c = walk(child as HTMLElement, depth + 1);
      if (c) {
        children.push(c);
        count++;
      }
    }
    if (children.length > 0) node.children = children;
    return node;
  }

  return walk(root, 0);
}

// Add other shared helpers here as needed (attribute extraction, style extraction, ancestor hierarchy, etc.) 