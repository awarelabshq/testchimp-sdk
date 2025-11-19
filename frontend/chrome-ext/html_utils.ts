// Shared HTML element info extraction utilities for both extension and injected scripts

// Selector cache for performance (WeakMap automatically cleans up when elements are removed)
const selectorCache = new WeakMap<HTMLElement, string>();

// Escape CSS class names with special characters for use in CSS selectors
// Special characters like /, :, etc. need to be escaped with backslash
export function escapeCSSClass(className: string): string {
    if (!className) return '';
    // Escape any character that's not alphanumeric, underscore, or dash
    return className.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

// Filter meaningful classes from element (excludes framework-generated and random hex classes)
export function filterMeaningfulClasses(className: string | null | undefined): string[] {
    if (!className || typeof className !== 'string') return [];
    return className.trim().split(/\s+/).filter(cls => {
        return !cls.match(/^(react-|ember-|vue-|ng-|jquery-)/) && 
               !cls.match(/^[a-f0-9]{8,}$/) && 
               cls.length > 1;
    });
}

// Extract meaningful class selector from element (returns .class1.class2 format or null)
export function getClassSelector(element: HTMLElement): string | null {
    const classes = filterMeaningfulClasses(element.className);
    if (classes.length === 0) return null;
    const escapedClasses = classes.map(cls => escapeCSSClass(cls));
    return `.${escapedClasses.join('.')}`;
}

// Check if element is an SVG element or nested SVG child
export function isSVGElement(el: HTMLElement): boolean {
    const tagName = el.tagName.toLowerCase();
    const svgTags = ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'text', 'use'];
    return svgTags.includes(tagName) || el.namespaceURI === 'http://www.w3.org/2000/svg';
}

// Validate selector uniqueness and add qualifiers if needed
export function ensureUniqueSelector(selector: string, targetElement: HTMLElement): string[] {
    try {
        const matches = document.querySelectorAll(selector);
        if (matches.length === 0) return [];
        if (matches.length === 1 && matches[0] === targetElement) {
            return [selector]; // Unique match
        }
        
        // Multiple matches - generate variants with qualifiers
        const variants: string[] = [];
        const index = Array.from(matches).indexOf(targetElement);
        
        if (index === 0) {
            variants.push(`${selector}:first()`);
        }
        if (index >= 0 && index <= 5) {
            variants.push(`${selector}:nth(${index})`);
        }
        
        return variants.length > 0 ? variants : [selector]; // Fallback to original if can't make unique
    } catch {
        return [selector]; // Invalid selector, return as-is
    }
}

// Enhanced Playwright-style selector generation with better specificity
export function getUniqueSelector(el: HTMLElement): string {
    if (!el) return '';
    
    // Check cache first for performance
    const cached = selectorCache.get(el);
    if (cached) return cached;
    
    // Generate selector
    const selector = generateSelector(el);
    
    // Cache result
    selectorCache.set(el, selector);
    return selector;
}

// Internal selector generation logic
function generateSelector(el: HTMLElement): string {
    if (!el) return '';
    
    // 1. Prefer data-testid, data-test-id, data-test, data-id (highest priority)
    const testAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-id', 'data-cy', 'data-qa'];
    for (const attr of testAttrs) {
        const val = el.getAttribute && el.getAttribute(attr);
        if (val && val.trim()) return `[${attr}="${val.trim()}"]`;
    }
    
    // 2. Prefer role with accessible name (ARIA - including implicit roles)
    const role = getEffectiveRole(el);
    if (role) {
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const title = el.getAttribute('title');
        const alt = el.getAttribute('alt');
        
        let accessibleName = ariaLabel || title || alt;
        
        // If no direct accessible name, try to get it from aria-labelledby
        if (!accessibleName && ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) accessibleName = labelEl.textContent?.trim();
        }
        
        // If still no accessible name, try to get visible text
        if (!accessibleName) {
            const visibleText = getVisibleText(el);
            if (visibleText && visibleText.length > 0 && visibleText.length < 100) {
                accessibleName = visibleText;
            }
        }
        
        if (accessibleName) {
            const cleanName = accessibleName.trim();
            // Don't truncate names - if too long, skip this selector strategy to avoid invalid selectors
            // Playwright's getByRole handles partial matching, but we don't want to generate selectors
            // with truncation markers that don't match the actual text
            if (cleanName.length > 50) {
                // Skip this selector strategy if name is too long (fall through to next strategy)
                // Truncation would create invalid selectors like role=button[name="viewInvoiceHist..."]
                // which don't match the actual text that contains the full string
            } else {
                return `role=${role}[name="${cleanName}"]`;
            }
        }
        
        // Role without accessible name (only use if it's a semantic element like nav, main, etc.)
        const meaningfulRolesWithoutName = ['navigation', 'main', 'complementary', 'banner', 'contentinfo', 'form', 'search'];
        if (meaningfulRolesWithoutName.includes(role)) {
            return `role=${role}`;
        }
    }
    
    // 3. Prefer text selector for elements with meaningful text
    const visibleText = getVisibleText(el);
    if (visibleText && visibleText.length > 0 && visibleText.length < 100 && isTextElement(el)) {
        return `text="${visibleText}"`;
    }
    
    // 4. Prefer form elements with name/label
    if (isFormElement(el)) {
        const name = el.getAttribute('name');
        const id = el.getAttribute('id');
        const placeholder = el.getAttribute('placeholder');
        
        if (name) return `[name="${name}"]`;
        if (id) return `#${id}`;
        if (placeholder) return `[placeholder="${placeholder}"]`;
    }
    
    // 5. Prefer elements with meaningful IDs
    if (el.id && isMeaningfulId(el.id)) {
        const idSelector = `#${el.id}`;
        return validateAndEnhanceSelector(el, idSelector);
    }
    
    // 6. Use CSS selector with better specificity
    const cssSelector = getCSSSelector(el);
    return validateAndEnhanceSelector(el, cssSelector);
}

// Cache for visible text (performance optimization)
const visibleTextCache = new WeakMap<HTMLElement, string>();

// Helper function to get visible text content (optimized)
function getVisibleText(el: HTMLElement): string {
    // Check cache first
    const cached = visibleTextCache.get(el);
    if (cached !== undefined) return cached;
    
    // Get direct text content (faster than textContent for shallow elements)
    let text = '';
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        }
    }
    text = text.trim();
    
    // If no direct text, fall back to textContent (includes nested elements)
    if (!text) {
        text = el.textContent?.trim() || '';
    }
    
    // Limit text length for performance
    if (text.length > 100) {
        text = ''; // Too long, not useful for selector
    }
    
    // Cache result
    visibleTextCache.set(el, text);
    return text;
}

// Check if element is a text-based element (extended for better support)
function isTextElement(el: HTMLElement): boolean {
    const tagName = el.tagName.toLowerCase();
    return [
        'button', 'a', 'label', 'span', 'div', 'p', 
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'td', 'th', 'li', 'dt', 'dd', 'figcaption', 'caption',
        'summary', 'legend', 'option'
    ].includes(tagName);
}

// Check if element is a form element
function isFormElement(el: HTMLElement): boolean {
    const tagName = el.tagName.toLowerCase();
    return ['input', 'select', 'textarea', 'button'].includes(tagName);
}

// Semantic ID prefixes that indicate meaningful IDs
const SEMANTIC_ID_PREFIXES = [
    'user', 'main', 'nav', 'header', 'footer', 'content', 
    'app', 'page', 'section', 'sidebar', 'modal', 'form',
    'button', 'input', 'menu', 'login', 'signup'
];

// Implicit ARIA roles from semantic HTML elements (for fast lookup)
const IMPLICIT_ARIA_ROLES: Record<string, string | ((el: HTMLElement) => string | null)> = {
    'nav': 'navigation',
    'aside': 'complementary',
    'main': 'main',
    'header': (el) => el.closest('article, section') ? 'banner' : 'banner',
    'footer': (el) => el.closest('article, section') ? 'contentinfo' : 'contentinfo',
    'form': 'form',
    'article': 'article',
    'section': 'region',
    'button': 'button',
    'a': (el) => (el as HTMLAnchorElement).href ? 'link' : null,
    'img': (el) => (el as HTMLImageElement).alt ? 'img' : 'presentation',
    'ul': 'list',
    'ol': 'list',
    'li': 'listitem',
    'table': 'table',
    'tbody': 'rowgroup',
    'thead': 'rowgroup',
    'tfoot': 'rowgroup',
    'tr': 'row',
    'td': 'cell',
    'th': 'columnheader',
    'input': (el) => {
        const type = (el as HTMLInputElement).type;
        const typeRoleMap: Record<string, string> = {
            'button': 'button',
            'checkbox': 'checkbox',
            'radio': 'radio',
            'range': 'slider',
            'text': 'textbox',
            'email': 'textbox',
            'tel': 'textbox',
            'url': 'textbox',
            'search': 'searchbox',
        };
        return typeRoleMap[type] || 'textbox';
    },
    'textarea': 'textbox',
    'select': (el) => (el as HTMLSelectElement).multiple ? 'listbox' : 'combobox',
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading',
    'h4': 'heading',
    'h5': 'heading',
    'h6': 'heading',
};

// Get effective ARIA role (explicit or implicit)
function getEffectiveRole(el: HTMLElement): string | null {
    // Explicit role takes precedence
    const explicitRole = el.getAttribute('role');
    if (explicitRole) return explicitRole;
    
    // Check for implicit role
    const tagName = el.tagName.toLowerCase();
    const implicitRole = IMPLICIT_ARIA_ROLES[tagName];
    
    if (typeof implicitRole === 'function') {
        return implicitRole(el);
    }
    
    return implicitRole || null;
}

// Check if ID is meaningful (not auto-generated)
function isMeaningfulId(id: string): boolean {
    if (!id) return false;
    
    // Accept IDs with dashes or underscores (semantic naming convention)
    if (id.includes('-') || id.includes('_')) return true;
    
    // Check semantic prefix whitelist (fast check)
    const lowerID = id.toLowerCase();
    if (SEMANTIC_ID_PREFIXES.some(prefix => lowerID.startsWith(prefix))) {
        return true;
    }
    
    // Reject common auto-generated patterns
    const autoGeneratedPatterns = [
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID
        /^[a-f0-9]{32}$/i, // MD5 hash
        /^[a-f0-9]{40}$/i, // SHA1 hash
        /^[a-f0-9]{64}$/i, // SHA256 hash
        /^[a-f0-9]{12,}$/i, // Hex strings 12+ chars (likely hash)
        /^react-[a-z0-9]{6,}$/i, // React auto-generated with hash
        /^ember[0-9]+$/i, // Ember auto-generated
        /^vue-[a-z0-9]{6,}$/i, // Vue auto-generated with hash
    ];
    
    if (autoGeneratedPatterns.some(pattern => pattern.test(id))) {
        return false;
    }
    
    // Check for low entropy (all same char or sequential)
    const uniqueChars = new Set(id.toLowerCase()).size;
    if (uniqueChars < 3) return false; // "aaaaaa", "111111" etc.
    
    // Accept if it made it this far
    return true;
}

// Generate CSS selector with better specificity
export function getCSSSelector(el: HTMLElement): string {
    if (!el) return '';
    
    // Start with tag name
    let selector = el.tagName.toLowerCase();
    
    // Add ID if meaningful
    if (el.id && isMeaningfulId(el.id)) {
        return `#${el.id}`;
    }
    
    // Add classes (filter out framework-generated classes)
    const classSelector = getClassSelector(el);
    const hasElementClasses = classSelector !== null;
    if (classSelector) {
        selector += classSelector;
    }
    
    // If element has no classes, check parent for meaningful classes
    // This applies to SVG elements and non-SVG elements without classes
    if (!hasElementClasses && el.parentElement) {
        let parent: HTMLElement | null = el.parentElement;
        let level = 0;
        const maxLevels = 3;
        
        while (parent && level < maxLevels) {
            // Check parent class selector
            const parentClassSelector = getClassSelector(parent);
            if (parentClassSelector) {
                const parentScopedSelector = `${parentClassSelector} > ${selector}`;
                const uniqueSelectors = ensureUniqueSelector(parentScopedSelector, el);
                if (uniqueSelectors.length > 0 && uniqueSelectors[0] === parentScopedSelector) {
                    return parentScopedSelector; // Unique match, use it
                }
            }
            
            // Check parent ID (prefer over classes for uniqueness)
            if (parent.id && isMeaningfulId(parent.id)) {
                const idScopedSelector = `#${parent.id} > ${selector}`;
                const uniqueSelectors = ensureUniqueSelector(idScopedSelector, el);
                if (uniqueSelectors.length > 0 && uniqueSelectors[0] === idScopedSelector) {
                    return idScopedSelector;
                }
            }
            
            parent = parent.parentElement;
            level++;
        }
    }
    
    // Add attributes for better specificity
    const importantAttrs = ['name', 'type', 'value', 'placeholder', 'title', 'alt'];
    for (const attr of importantAttrs) {
        const val = el.getAttribute(attr);
        if (val && val.trim()) {
            selector += `[${attr}="${val.trim()}"]`;
            break; // Only add one attribute to keep selector clean
        }
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

// Validate selector uniqueness and enhance with parent context if needed
function validateAndEnhanceSelector(el: HTMLElement, selector: string): string {
    if (!selector || !el) return selector;
    
    try {
        // First try querySelector for performance (O(1) vs O(n))
        const firstMatch = document.querySelector(selector);
        if (firstMatch === el) {
            // Check if it's unique by trying querySelectorAll
            const allMatches = document.querySelectorAll(selector);
            if (allMatches.length === 1) {
                return selector; // Unique match
            }
            // Multiple matches, enhance with parent context
            return addParentContext(el, selector);
        }
        
        // No match or wrong element, return original
        return selector;
    } catch (e) {
        // Invalid selector or cross-origin access - return as-is and let it fail downstream
        if (e instanceof DOMException && e.name === 'SecurityError') {
            console.warn('[html_utils] Cross-origin access denied for selector:', selector);
        } else {
            console.warn('[html_utils] Invalid selector:', selector, e);
        }
        return selector;
    }
}

// Add parent context to disambiguate similar elements
function addParentContext(el: HTMLElement, selector: string): string {
    let parent = el.parentElement;
    let attempt = selector;
    
    // Try up to 3 levels of parent context
    for (let level = 0; level < 3 && parent; level++) {
        // Build parent selector
        let parentSel = '';
        
        // Prefer parent ID
        if (parent.id && isMeaningfulId(parent.id)) {
            parentSel = `#${parent.id}`;
        }
        // Or parent data-testid
        else if (parent.hasAttribute('data-testid')) {
            parentSel = `[data-testid="${parent.getAttribute('data-testid')}"]`;
        }
        // Or parent classes (prioritize over role and tag)
        else {
            const parentClassSelector = getClassSelector(parent);
            if (parentClassSelector) {
                parentSel = parentClassSelector;
            } else if (parent.hasAttribute('role')) {
                parentSel = `[role="${parent.getAttribute('role')}"]`;
            } else {
                parentSel = parent.tagName.toLowerCase();
            }
        }
        
        // Build scoped selector
        attempt = `${parentSel} > ${selector}`;
        
        try {
            const matches = document.querySelectorAll(attempt);
            if (matches.length === 1 && matches[0] === el) {
                return attempt; // Found unique selector with parent context!
            }
        } catch (e) {
            // Invalid selector or cross-origin access, try next level
            if (e instanceof DOMException && e.name === 'SecurityError') {
                console.warn('[html_utils] Cross-origin access denied in parent context:', attempt);
            }
        }
        
        parent = parent.parentElement;
    }
    
    // If still not unique, add :nth-child as last resort
    if (el.parentElement) {
        const siblings = Array.from(el.parentElement.children);
        const idx = siblings.indexOf(el) + 1;
        return `${selector}:nth-child(${idx})`;
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
    
    // Use the same enhanced logic as getUniqueSelector but return CSS selector format
    const uniqueSelector = getUniqueSelector(el);
    
    // If it's already a CSS selector, return it
    if (uniqueSelector.startsWith('#') || uniqueSelector.startsWith('[') || uniqueSelector.includes('.')) {
        return uniqueSelector;
    }
    
    // Convert Playwright selectors to CSS selectors
    if (uniqueSelector.startsWith('role=')) {
        const roleMatch = uniqueSelector.match(/role=([^[]+)(?:\[name="([^"]+)"\])?/);
        if (roleMatch) {
            const role = roleMatch[1];
            const name = roleMatch[2];
            if (name) {
                return `[role="${role}"][aria-label="${name}"], [role="${role}"][title="${name}"], [role="${role}"]:has-text("${name}")`;
            }
            return `[role="${role}"]`;
        }
    }
    
    if (uniqueSelector.startsWith('text=')) {
        const textMatch = uniqueSelector.match(/text="([^"]+)"/);
        if (textMatch) {
            const text = textMatch[1];
            return `:has-text("${text}")`;
        }
    }
    
    // Fallback to CSS selector generation
    return getCSSSelector(el);
}

/**
 * Recursively walk the DOM and output a simplified, LLM-friendly JSON structure for bug analytics.
 * - Outputs: tag, key attributes, computed styles (optional), and children (recursive tree)
 * - Prunes noisy elements, skips invisible nodes
 * - Summarizes tables/lists to avoid repetition
 * - Default: maxDepth=12, maxChildren=30, includeStyles=true
 */
export function simplifyDOMForLLM(
  root: HTMLElement = document.body,
  opts?: { maxDepth?: number; maxChildren?: number; includeStyles?: boolean }
): any {
  const maxDepth = opts?.maxDepth ?? 12;
  const maxChildren = opts?.maxChildren ?? 30;
  const includeStyles = opts?.includeStyles ?? true;
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
    if (!includeStyles) return {};
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
    const out: any = { tag: 'table', attrs: getKeyAttrs(table) };
    if (includeStyles) out.styles = getStyles(table);
    const rows = Array.from(table.rows);
    if (rows.length > 0) {
      out.firstRow = Array.from(rows[0].cells).map(cell => ({
        tag: cell.tagName.toLowerCase(),
        attrs: getKeyAttrs(cell),
        ...(includeStyles && { styles: getStyles(cell) }),
        text: getShortText(cell),
      }));
    }
    out.rowCount = rows.length;
    out.colCount = rows[0]?.cells.length || 0;
    return out;
  }

  function summarizeList(list: HTMLElement, depth: number): any {
    // Show first 3 items, then summary count
    const out: any = { tag: list.tagName.toLowerCase(), attrs: getKeyAttrs(list) };
    if (includeStyles) out.styles = getStyles(list);
    const items = Array.from(list.children).filter(
      el => el.tagName === 'LI'
    ) as HTMLElement[];
    out.items = items.slice(0, 3).map(li => ({
      tag: 'li',
      attrs: getKeyAttrs(li),
      ...(includeStyles && { styles: getStyles(li) }),
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
    };
    if (includeStyles) node.styles = getStyles(el);
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