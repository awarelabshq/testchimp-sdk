/** Wait until DOM mutations settle (for post-click/navigate screenshots). */
export function waitForDomStability(options?: {
  quietMs?: number;
  maxWaitMs?: number;
}): Promise<void> {
  const quietMs = options?.quietMs ?? 400;
  const maxWaitMs = options?.maxWaitMs ?? 3000;

  if (typeof document === 'undefined' || !document.documentElement) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    const maxTimer = setTimeout(() => {
      observer.disconnect();
      if (quietTimer) clearTimeout(quietTimer);
      resolve();
    }, maxWaitMs);

    const scheduleQuiet = () => {
      if (quietTimer) clearTimeout(quietTimer);
      quietTimer = setTimeout(() => {
        observer.disconnect();
        clearTimeout(maxTimer);
        resolve();
      }, quietMs);
    };

    const observer = new MutationObserver(() => {
      scheduleQuiet();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    scheduleQuiet();
  });
}
