import { ContextElement, ContextElementType, UIElementContext, BoundingBoxContext, BoundingBoxValue } from './datas';
import { getUniqueSelector, getQuerySelector, getAttributes, getComputedStyles, getAncestorHierarchy, BASIC_ATTRS, BASIC_STYLES } from './html_utils';

// In-memory store for context elements only (not extra info)
const contextElementStore: Record<string, ContextElement> = {};

export function getBasicInfo(element: Element): UIElementContext {
    const info: Record<string, any> = {};
    info.type = ContextElementType.UIElement;
    info.selector = getUniqueSelector(element as HTMLElement);
    info.querySelector = getQuerySelector(element as HTMLElement);
    info.role = element.getAttribute('role') || undefined;
    info.text = element.getAttribute('aria-label') || element.textContent?.trim() || undefined;
    info.tagName = element.tagName;
    if (element.textContent) {
        const maxLen = 300;
        info.textContent = element.textContent.length > maxLen
            ? element.textContent.slice(0, maxLen) + '...'
            : element.textContent;
    }
    info.attributes = getAttributes(element as HTMLElement, BASIC_ATTRS);
    info.computedStyles = getComputedStyles(element as HTMLElement, BASIC_STYLES);
    info.ancestorHierarchy = getAncestorHierarchy(element as HTMLElement, { full: false });
    const rect = element.getBoundingClientRect();
    info.boundingBox = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    return info as UIElementContext;
}

export function getFullInfo(element: HTMLElement): UIElementContext {
    const info: Record<string, any> = {};
    info.type = ContextElementType.UIElement;
    info.selector = getUniqueSelector(element);
    info.querySelector = getQuerySelector(element);
    info.role = element.getAttribute('role') || undefined;
    info.text = element.getAttribute('aria-label') || element.textContent?.trim() || undefined;
    info.tagName = element.tagName;
    info.textContent = element.textContent || '';
    info.attributes = getAttributes(element, Object.keys(getAttributes(element)));
    info.computedStyles = getComputedStyles(element, Object.keys(getComputedStyles(element)));
    info.ancestorHierarchy = getAncestorHierarchy(element, { full: true });
    const rect = element.getBoundingClientRect();
    info.boundingBox = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    return info as UIElementContext;
}

export function getTopLevelUIElementsInBox(box: BoundingBoxValue): HTMLElement[] {
    const { xPct, yPct, wPct, hPct } = box;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const left = (xPct / 100) * vw;
    const top = (yPct / 100) * vh;
    const right = left + (wPct / 100) * vw;
    const bottom = top + (hPct / 100) * vh;
    const allElements = Array.from(document.querySelectorAll('*')) as HTMLElement[];
    const elementsInBox: HTMLElement[] = [];
    for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (
            rect.left >= left &&
            rect.top >= top &&
            rect.right <= right &&
            rect.bottom <= bottom
        ) {
            elementsInBox.push(el);
        }
    }
    // Filter to only top-level elements (not descendants of another in the set)
    const topLevelElementsInBox = elementsInBox.filter(el =>
        !elementsInBox.some(parent => parent !== el && parent.contains(el))
    );
    return topLevelElementsInBox;
}

export function getBasicInfoForBoxElements(box: { xPct: number; yPct: number; wPct: number; hPct: number }): UIElementContext[] {
    return getTopLevelUIElementsInBox(box as BoundingBoxValue).map(getBasicInfo);
}

export function getFullInfoForBoxElements(box: BoundingBoxValue): UIElementContext[] {
    return getTopLevelUIElementsInBox(box).map(getFullInfo);
}

export async function addOrUpdateContextElements(elements: ContextElement[]) {
    for (const elem of elements) {
        contextElementStore[elem.contextId] = elem;
    }
}

export function removeContextElementById(id: string) {
    delete contextElementStore[id];
}

export function getContextElementById(id: string): ContextElement | undefined {
    return contextElementStore[id];
}

export function getAllContextElements(): ContextElement[] {
    return Object.values(contextElementStore);
}