type RelatedFile = {
  path: string;
  type: string;
  confidence: number;
};

export async function getRelatedFiles(): Promise<{ files: RelatedFile[] }> {
  const files: RelatedFile[] = [];

  // Helper: Add file if not duplicate
  function addFile(path: string, type: RelatedFile['type'], confidence: number) {
    if (!path) return;
    if (files.some(f => f.path === path)) return;
    files.push({ path, type, confidence });
  }

  // --- 1. Try to use React Fiber if available
  try {
    const reactRoot = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (reactRoot && reactRoot.renderers.size > 0) {
      for (const renderer of reactRoot.renderers.values()) {
        const inspector = renderer.findFiberByHostInstance;
        if (inspector) {
          const rootFiber = inspector(document.body);
          if (rootFiber) {
            const seen = new Set<any>();
            function walk(fiber: any) {
              if (!fiber || seen.has(fiber)) return;
              seen.add(fiber);

              if (fiber._debugSource?.fileName) {
                const filePath = fiber._debugSource.fileName;
                addFile(filePath, 'component', 1.0);
              }

              if (fiber.child) walk(fiber.child);
              if (fiber.sibling) walk(fiber.sibling);
            }
            walk(rootFiber);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Fiber inspection failed', err);
  }

  // --- 2. Fallback: Use JS Stack Trace if Fiber not available
  if (files.length === 0) {
    try {
      const stack = new Error().stack || '';
      const lines = stack.split('\n');
      for (const line of lines) {
        const match = line.match(/(\/.*?\.(js|ts|jsx|tsx))/);
        if (match) {
          const path = match[1];
          addFile(path, 'script', 0.6);
        }
      }
    } catch (err) {
      console.warn('Stack trace parsing failed', err);
    }
  }

  // --- 3. Also gather relevant CSS files
  try {
    const cssFiles = Array.from(document.styleSheets)
      .filter(sheet => {
        try {
          return sheet.href && !sheet.href.startsWith('chrome-extension://');
        } catch {
          return false; // avoid CORS errors
        }
      })
      .map(sheet => sheet.href!);

    for (const href of cssFiles) {
      addFile(href, 'stylesheet', 0.5); // slightly lower confidence
    }
  } catch (err) {
    console.warn('CSS file detection failed', err);
  }

  // --- 4. Slight bonus: prioritize styles actually used by visible elements
  try {
    const visibleClasses = new Set<string>();
    document.querySelectorAll('*').forEach(el => {
      if (el instanceof HTMLElement && el.offsetParent !== null) {
        el.classList.forEach(cls => visibleClasses.add(cls));
      }
    });

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.href) continue;
        const rules = (sheet as CSSStyleSheet).cssRules;
        for (const rule of Array.from(rules)) {
          if ((rule as CSSStyleRule).selectorText) {
            const selectors = (rule as CSSStyleRule).selectorText.split(',').map(s => s.trim());
            for (const sel of selectors) {
              if (sel.startsWith('.') && visibleClasses.has(sel.slice(1))) {
                addFile(sheet.href, 'stylesheet', 0.8);
              }
            }
          }
        }
      } catch {
        // Ignore CORS or unreadable sheets
      }
    }
  } catch (err) {
    console.warn('CSS matching boost failed', err);
  }

  return { files };
}