import { getUniqueSelector, getQuerySelector, escapeCSSClass, filterMeaningfulClasses, getClassSelector, isSVGElement, ensureUniqueSelector } from './html_utils';
import type { ActionType, AssertionType, ActionOptions, ElementSnapshot } from './playwrightCodegen';

const MAX_TEXT_LENGTH = 200;
const TRUNCATION_SUFFIXES = ['...', '…'];

function normalizeTextValue(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    return null;
  }
  return trimmed;
}

function isTruncatedText(value?: string | null): boolean {
  if (!value) return false;
  return TRUNCATION_SUFFIXES.some(suffix => value.endsWith(suffix));
}

/**
 * Command Generator Utility
 * 
 * Generates multiple Playwright command variants using different selector strategies.
 * Strategies are conditionally applied based on element properties.
 */

// Helper to add unique commands to array
function addUnique(commands: string[], seenCommands: Set<string>, cmd: string): void {
  if (!seenCommands.has(cmd)) {
    seenCommands.add(cmd);
    commands.push(cmd);
  }
}

// Helper to escape text for Playwright selectors
function escapeText(text: string | null | undefined): string {
  if (!text) return '';
  const jsonEscaped = JSON.stringify(text);
  return jsonEscaped.slice(1, -1);
}

function quote(text: string | null | undefined): string {
  return '`' + escapeText(text) + '`';
}

// Get effective ARIA role (explicit or implicit)
// Maps HTML tags to valid Playwright roles per W3C ARIA specifications
function getEffectiveRole(el: HTMLElement): string | null {
  const explicitRole = el.getAttribute('role');
  if (explicitRole) return explicitRole;
  
  const tagName = el.tagName.toLowerCase();
  
  // Special case: input elements need type-based mapping
  if (tagName === 'input') {
    return getInputRole(el as HTMLInputElement);
  }
  
  // Map HTML tag names to valid Playwright roles (per W3C ARIA specifications)
  const implicitRoles: Record<string, string> = {
    'a': 'link',                    // <a> with href → 'link' role
    'button': 'button',             // <button> → 'button' role
    'textarea': 'textbox',          // <textarea> → 'textbox' role
    'select': 'combobox',           // <select> → 'combobox' role
    'option': 'option',             // <option> → 'option' role
    'img': 'img',                   // <img> → 'img' role
    'h1': 'heading',                // <h1> → 'heading' role
    'h2': 'heading',                // <h2> → 'heading' role
    'h3': 'heading',                // <h3> → 'heading' role
    'h4': 'heading',                // <h4> → 'heading' role
    'h5': 'heading',                // <h5> → 'heading' role
    'h6': 'heading',                // <h6> → 'heading' role
    'article': 'article',           // <article> → 'article' role
    'aside': 'complementary',       // <aside> → 'complementary' role
    'main': 'main',                 // <main> → 'main' role
    'nav': 'navigation',            // <nav> → 'navigation' role
    'form': 'form',                 // <form> → 'form' role
    'header': 'banner',            // <header> → 'banner' role
    'footer': 'contentinfo',       // <footer> → 'contentinfo' role
    'table': 'table',               // <table> → 'table' role
    'ul': 'list',                   // <ul> → 'list' role
    'ol': 'list',                   // <ol> → 'list' role
    'li': 'listitem',               // <li> → 'listitem' role
  };
  
  return implicitRoles[tagName] || null;
}

function getInputRole(el: HTMLInputElement): string {
  const type = el.type || 'text';
  const typeRoles: Record<string, string> = {
    'button': 'button',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'range': 'slider',
    'search': 'searchbox',
  };
  return typeRoles[type] || 'textbox';
}

// Get accessible name for element
// Returns full text (no truncation) for use in getByRole/getByText with exact: true
// Uses snapshot data when available
function getAccessibleName(el: HTMLElement, snapshot?: ElementSnapshot): string | null {
  const ariaLabel = normalizeTextValue(el.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;
  
  const title = normalizeTextValue(el.getAttribute('title'));
  if (title) return title;
  
  const alt = normalizeTextValue(el.getAttribute('alt'));
  if (alt) return alt;
  
  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    const labelText = normalizeTextValue(labelEl?.textContent || null);
    if (labelText) return labelText;
  }
  
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const labels = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).labels;
    if (labels && labels.length > 0) {
      const text = normalizeTextValue(labels[0].textContent || null);
      if (text) return text;
    }
  }
  
  const snapshotText = normalizeTextValue(snapshot?.textContent || null);
  if (snapshotText) return snapshotText;
  
  return null;
}

function resolveFullText(
  element: HTMLElement,
  snapshot?: ElementSnapshot
): string | null {
  const snapshotText = normalizeTextValue(snapshot?.textContent || null);
  if (snapshotText && !isTruncatedText(snapshotText)) {
    return snapshotText;
  }

  const candidateAttrs = [
    snapshot?.title,
    snapshot?.ariaLabel,
    element.getAttribute('title'),
    element.getAttribute('aria-label'),
  ];
  for (const attr of candidateAttrs) {
    const normalized = normalizeTextValue(attr);
    if (normalized && (!snapshotText || normalized.length > snapshotText.length)) {
      return normalized;
    }
  }

  if (!snapshotText) {
    // Fallback to live text content if no snapshot available
    const live = normalizeTextValue(element.textContent);
    if (live) {
      return live;
    }
  }

  return snapshotText;
}

// Get visible text from element
// Returns full textContent (no truncation) for use in getByText with exact: true
// IMPORTANT: Never truncates text ourselves - uses actual textContent as-is
// If text is too long, returns null (skip this strategy) rather than truncating
function getVisibleText(el: HTMLElement, snapshot?: ElementSnapshot): string | null {
  const resolved = resolveFullText(el, snapshot);
  if (resolved && !isTruncatedText(resolved)) {
    return resolved;
  }

  // As a last resort, examine the element text (even if truncated)
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  if (!text) {
    text = el.textContent || '';
  }
  return normalizeTextValue(text);
}

// Check if element has meaningful ID (not auto-generated)
function hasMeaningfulId(id: string): boolean {
  if (!id) return false;
  
  if (id.includes('-') || id.includes('_')) return true;
  
  const autoGeneratedPatterns = [
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    /^[a-f0-9]{32}$/i,
    /^[a-f0-9]{40}$/i,
    /^[a-f0-9]{64}$/i,
    /^[a-f0-9]{12,}$/i,
    /^react-[a-z0-9]{6,}$/i,
    /^ember[0-9]+$/i,
    /^vue-[a-z0-9]{6,}$/i,
  ];
  
  return !autoGeneratedPatterns.some(pattern => pattern.test(id));
}

// Check if selector has multiple matches
function hasMultipleMatches(selector: string): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length > 1;
  } catch {
    return false;
  }
}

// Check if element has no meaningful classes
function hasNoClasses(el: HTMLElement): boolean {
  return getClassSelector(el) === null;
}

// Extract meaningful class selector from parent element (alias for clarity)
function getParentClassSelector(parent: HTMLElement): string | null {
  return getClassSelector(parent);
}

// Check if element is clickable (button, role="button", or has click handler)
function isClickableElement(el: HTMLElement): boolean {
  return el.tagName.toLowerCase() === 'button' || 
         el.getAttribute('role') === 'button' ||
         el.hasAttribute('onclick');
}

// Build SVG path from element to parent (returns array of SVG tag names)
function buildSVGPath(element: HTMLElement, stopAt: HTMLElement): string[] {
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== stopAt) {
    if (isSVGElement(current)) {
      path.unshift(current.tagName.toLowerCase());
    }
    current = current.parentElement;
  }
  
  return path;
}

// Get parent with meaningful classes (traverse up to 3 levels)
// Returns: { parent: HTMLElement, classSelector: string } or null
function getParentWithClasses(el: HTMLElement, maxLevels: number = 3): { parent: HTMLElement, classSelector: string } | null {
  let parent = el.parentElement;
  let level = 0;
  
  while (parent && level < maxLevels) {
    // Prefer ID, but also check for classes
    if (parent.id && hasMeaningfulId(parent.id)) {
      const classSelector = getParentClassSelector(parent);
      if (classSelector) {
        return { parent, classSelector: `#${parent.id}` };
      }
    }
    
    const classSelector = getParentClassSelector(parent);
    if (classSelector) {
      return { parent, classSelector };
    }
    
    parent = parent.parentElement;
    level++;
  }
  
  return null;
}


// Get parent selector for chaining
function getParentSelector(el: HTMLElement): string | null {
  const parent = el.parentElement;
  if (!parent) return null;
  
  if (parent.id && hasMeaningfulId(parent.id)) {
    return `#${parent.id}`;
  }
  
  if (parent.hasAttribute('data-testid')) {
    return `[data-testid="${parent.getAttribute('data-testid')}"]`;
  }
  
  // Check parent class names (prioritize over role)
  const classSelector = getParentClassSelector(parent);
  if (classSelector) {
    return classSelector;
  }
  
  if (parent.hasAttribute('role')) {
    return `[role="${parent.getAttribute('role')}"]`;
  }
  
  return null;
}

function getAttributeValue(element: HTMLElement, attr: string, snapshot?: ElementSnapshot): string | null {
  if (snapshot?.attributes && snapshot.attributes[attr] !== undefined) {
    return snapshot.attributes[attr];
  }
  return element.getAttribute(attr);
}

/**
 * Generate multiple locator strings using different selector strategies
 * @param element - The target element
 * @param excludeText - If true, skip getByText strategy (used for assertions with toHaveText)
 * @returns Array of locator strings
 */
export function generateLocators(element: HTMLElement, excludeText: boolean = false, snapshot?: ElementSnapshot): string[] {
  const locators: string[] = [];
  const seenLocators = new Set<string>();
  
  // Strategy 1: Data test attributes
  const testAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-id', 'data-cy', 'data-qa'];
  for (const attr of testAttrs) {
    const val = getAttributeValue(element, attr, snapshot);
    if (val && val.trim()) {
      const locator = `page.getByTestId(${quote(val.trim())})`;
      addUnique(locators, seenLocators, locator);
      break;
    }
  }
  
  // Strategy 2: getByRole with name
  const role = getEffectiveRole(element);
  if (role) {
    const accessibleName = getAccessibleName(element, snapshot);
    const visibleText = accessibleName || getVisibleText(element, snapshot);
    
    // Use full text as-is (getAccessibleName/getVisibleText never truncate)
    if (visibleText) {
      const locator = `page.getByRole(${quote(role)}, { name: ${quote(visibleText)} })`;
      addUnique(locators, seenLocators, locator);
    }
  }
  
  // Strategy 2.5: Icon container click strategy (for all SVG elements)
  if (isSVGElement(element)) {
    const parent = element.parentElement;
    if (parent && isClickableElement(parent)) {
      const classSelector = getParentClassSelector(parent);
      if (classSelector) {
        for (const sel of ensureUniqueSelector(classSelector, parent)) {
          addUnique(locators, seenLocators, `page.locator(${quote(sel)})`);
        }
      }
    }
  }
  
  // Strategy 3: getByText (skip if excludeText is true)
  // Use exact: true to avoid strict mode violations (matches multiple elements)
  // IMPORTANT: getVisibleText() returns full textContent (never truncates)
  // If text is too long, getVisibleText() returns null and we skip this strategy
  if (!excludeText) {
    const text = getVisibleText(element, snapshot);
    if (text) {
      // Use exact: true to prevent matching partial text that could match multiple elements
      // text is already full textContent (no truncation)
      const locator = `page.getByText(${quote(text)}, { exact: true })`;
      addUnique(locators, seenLocators, locator);
    }
  }
  
  // Strategy 4: ID selector
  if (element.id && hasMeaningfulId(element.id)) {
    const locator = `page.locator(${quote('#' + element.id)})`;
    addUnique(locators, seenLocators, locator);
  }
  
  // Strategy 5: Name selector (for form elements)
  const name = getAttributeValue(element, 'name', snapshot);
  if (name && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
    const locator = `page.locator(${quote('[name="' + name + '"]')})`;
    addUnique(locators, seenLocators, locator);
  }
  
  // Strategy 5.5: Parent class selector strategy (for SVG elements and elements without classes)
  // This runs BEFORE nth-of-type to prioritize parent class selectors
  if (isSVGElement(element) || hasNoClasses(element)) {
    const parentInfo = getParentWithClasses(element, 3);
    if (parentInfo) {
      const { parent, classSelector } = parentInfo;
      const elementTag = element.tagName.toLowerCase();
      
      // Build selector variants
      const variants: string[] = [`${classSelector} > ${elementTag}`];
      
      // For SVG elements, add nested path variant (parent.class > svg > path)
      if (isSVGElement(element)) {
        const svgPath = buildSVGPath(element, parent);
        if (svgPath.length > 1) {
          variants.push(`${classSelector} > ${svgPath.join(' > ')}`);
        }
      }
      
      // Validate uniqueness and add locators
      for (const variant of variants) {
        for (const sel of ensureUniqueSelector(variant, element)) {
          addUnique(locators, seenLocators, `page.locator(${quote(sel)})`);
        }
      }
    }
  }
  
  // Strategy 6: CSS selector (fallback - always generate)
  const cssSelector = getUniqueSelector(element);
  if (cssSelector) {
    const locator = `page.locator(${quote(cssSelector)})`;
    addUnique(locators, seenLocators, locator);
  }
  
  // Strategy 7: nth selector (if multiple matches)
  // Only suggest nth selectors if index <= 5 to avoid brittle selectors
  const tagName = element.tagName.toLowerCase();
  if (hasMultipleMatches(tagName)) {
    const siblings = Array.from(document.querySelectorAll(tagName));
    const index = siblings.indexOf(element);
    if (index >= 0 && index <= 5) {
      const locator = `page.locator(${quote(tagName)}).nth(${index})`;
      addUnique(locators, seenLocators, locator);
    }
  }
  
  // Strategy 8: first selector (if it's the first match)
  if (cssSelector && hasMultipleMatches(cssSelector)) {
    const matches = document.querySelectorAll(cssSelector);
    if (matches[0] === element) {
      const locator = `page.locator(${quote(cssSelector)}).first()`;
      addUnique(locators, seenLocators, locator);
    }
  }
  
  // Strategy 9: Parent chaining (if selector isn't unique)
  if (cssSelector && hasMultipleMatches(cssSelector)) {
    const parentSel = getParentSelector(element);
    if (parentSel) {
      const childSel = element.tagName.toLowerCase();
      const locator = `page.locator(${quote(parentSel + ' > ' + childSel)})`;
      addUnique(locators, seenLocators, locator);
    }
  }
  
  // Ensure at least one locator is generated
  if (locators.length === 0 && cssSelector) {
    const locator = `page.locator(${quote(cssSelector)})`;
    addUnique(locators, seenLocators, locator);
  }
  
  return locators;
}

/**
 * Generate multiple Playwright commands using different selector strategies
 * @param element - The target element
 * @param actionType - The type of action (click, fill, etc.)
 * @param actionValue - Optional value for the action (e.g., fill value)
 * @param options - Optional action options (button, modifiers)
 * @returns Array of command strings
 */
export function generateMultipleCommands(
  element: HTMLElement,
  actionType: ActionType,
  actionValue?: string | string[],
  options?: ActionOptions,
  snapshot?: ElementSnapshot
): string[] {
  const locators = generateLocators(element, false, snapshot);
  return locators.map(locator => buildActionCommand(locator, actionType, actionValue, options));
}

/**
 * Build action command from locator and action type
 */
function buildActionCommand(
  locator: string,
  actionType: ActionType,
  actionValue?: string | string[],
  options?: ActionOptions
): string {
  // Build options string if provided
  let optsStr = '';
  if (options) {
    const opts: Record<string, any> = {};
    if (options.button && options.button !== 'left') opts.button = options.button;
    if (options.modifiers && options.modifiers.length) opts.modifiers = options.modifiers;
    if (Object.keys(opts).length > 0) {
      optsStr = `, ${JSON.stringify(opts)}`;
    }
  }
  
  switch (actionType) {
    case 'click':
      return `await ${locator}.click(${optsStr ? optsStr.slice(2) : ''});`;
    case 'dblclick':
      return `await ${locator}.dblclick(${optsStr ? optsStr.slice(2) : ''});`;
    case 'fill':
      return `await ${locator}.fill(${quote(actionValue as string)});`;
    case 'type':
      return `await ${locator}.type(${quote(actionValue as string)});`;
    case 'check':
      return `await ${locator}.check();`;
    case 'uncheck':
      return `await ${locator}.uncheck();`;
    case 'selectOption':
      return `await ${locator}.selectOption(${JSON.stringify(actionValue)});`;
    case 'hover':
      return `await ${locator}.hover();`;
    case 'press':
      return `await ${locator}.press(${quote(actionValue as string)});`;
    case 'setInputFiles': {
      const files = Array.isArray(actionValue)
        ? actionValue
        : typeof actionValue === 'string'
          ? [actionValue]
          : [];
      const sanitizedFiles = (files.length > 0 ? files : ['path/to/your-file.ext'])
        .filter((file): file is string => typeof file === 'string' && file.trim().length > 0)
        .map(file => JSON.stringify(file));
      const filesLiteral = `[${sanitizedFiles.join(', ')}]`;
      return `await ${locator}.setInputFiles(${filesLiteral});`;
    }
    default:
      return `await ${locator}.${actionType}();`;
  }
}

/**
 * Generate multiple assertion commands using different selector strategies
 */
export function generateMultipleAssertions(
  element: HTMLElement,
  assertionType: AssertionType,
  expectedValue?: string | number,
  snapshot?: ElementSnapshot
): string[] {
  // Exclude getByText strategy for toHaveText assertions to avoid redundancy
  const excludeText = assertionType === 'toHaveText';
  const locators = generateLocators(element, excludeText, snapshot);
  return locators.map(locator => buildAssertionCommand(locator, assertionType, expectedValue));
}

/**
 * Build assertion command from locator and assertion type
 */
function buildAssertionCommand(
  locator: string,
  assertionType: AssertionType,
  expectedValue?: string | number
): string {
  switch (assertionType) {
    case 'toBeVisible':
      return `await expect(${locator}).toBeVisible();`;
    case 'toHaveText':
      return `await expect(${locator}).toHaveText(${quote(expectedValue as string)});`;
    case 'toHaveValue':
      return `await expect(${locator}).toHaveValue(${quote(expectedValue as string)});`;
    case 'toBeEnabled':
      return `await expect(${locator}).toBeEnabled();`;
    case 'toBeDisabled':
      return `await expect(${locator}).toBeDisabled();`;
    case 'toHaveCount':
      return `await expect(${locator}).toHaveCount(${expectedValue});`;
    default:
      return `await expect(${locator}).${assertionType}();`;
  }
}

/**
 * Generate navigation commands with different wait strategies
 */
export function generateGotoCommands(url: string): string[] {
  return [
    `await page.goto(${quote(url)});`,
    `await page.goto(${quote(url)}, { waitUntil: 'networkidle' });`,
    `await page.goto(${quote(url)}, { waitUntil: 'load' });`,
  ];
}

