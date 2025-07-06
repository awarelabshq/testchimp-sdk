import { ContextElement, ContextElementType, UIElementContext, BoundingBoxContext } from './datas';

// In-memory stores
const contextElementStore: Record<string, ContextElement> = {};
const extraInfoStore: Record<string, Record<string, string>> = {};

// Helper: get outerHTML for a selector (content script context)
function getOuterHTMLForSelector(selector: string): string | undefined {
    try {
        const el = document.querySelector(selector);
        return el ? el.outerHTML : undefined;
    } catch {
        return undefined;
    }
}

// Helper: request screenshot from background script
function requestScreenshotFromBackground(): Promise<string | undefined> {
    return new Promise((resolve) => {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            console.log('[contextStore] Sending screenshot request to background');
            chrome.runtime.sendMessage({ type: 'capture_viewport_screenshot' }, (response) => {
                if (response && response.dataUrl) {
                    console.log('[contextStore] Received screenshot dataUrl from background');
                    resolve(response.dataUrl);
                } else {
                    console.warn('[contextStore] No dataUrl received in screenshot response', response);
                    resolve(undefined);
                }
            });
        } else {
            console.warn('[contextStore] chrome.runtime.sendMessage not available in this context');
            resolve(undefined);
        }
    });
}

export async function addOrUpdateContextElements(elements: ContextElement[]) {
    for (const elem of elements) {
        contextElementStore[elem.id] = elem;
        // Prepare extra info map
        if (!extraInfoStore[elem.id]) extraInfoStore[elem.id] = {};
        // UIElement: store outerHTML
        if (elem.type === ContextElementType.UIElement) {
            const uiElem = elem as UIElementContext;
            if (uiElem.selector) {
                const outerHTML = getOuterHTMLForSelector(uiElem.selector);
                if (outerHTML) {
                    extraInfoStore[elem.id]["outer_div"] = outerHTML;
                    console.log(`[contextStore] Added outer_div for id=${elem.id}`);
                }
            }
        }
        // BoundingBox: take screenshot via background relay
        if (elem.type === ContextElementType.BoundingBox) {
            requestScreenshotFromBackground().then((base64) => {
                if (base64) {
                    extraInfoStore[elem.id]["page_screenshot"] = base64;
                    console.log(`[contextStore] Added page_screenshot for id=${elem.id} (base64 length: ${base64.length})`);
                    console.log(`[contextStore] Updated extra info for id=${elem.id}:`, extraInfoStore[elem.id]);
                } else {
                    console.warn(`[contextStore] Screenshot not set for id=${elem.id}`);
                }
            });
        }
        // Log all extra info for this id
        setTimeout(() => {
            console.log(`[contextStore] Current extra info for id=${elem.id}:`, extraInfoStore[elem.id]);
        }, 500);
    }
}

export function removeContextElementById(id: string) {
    delete contextElementStore[id];
    if (extraInfoStore[id]) {
        console.log(`[contextStore] Removing extra info for id=${id}`);
        delete extraInfoStore[id];
    }
}

export function getContextElementById(id: string): ContextElement | undefined {
    return contextElementStore[id];
}

export function getAllContextElements(): ContextElement[] {
    return Object.values(contextElementStore);
}

export function getExtraInfo(id: string): Record<string, string> | undefined {
    return extraInfoStore[id];
}

export function setExtraInfo(id: string, key: string, value: string) {
    if (!extraInfoStore[id]) extraInfoStore[id] = {};
    extraInfoStore[id][key] = value;
} 