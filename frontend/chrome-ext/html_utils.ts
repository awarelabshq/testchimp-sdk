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

// Add other shared helpers here as needed (attribute extraction, style extraction, ancestor hierarchy, etc.) 