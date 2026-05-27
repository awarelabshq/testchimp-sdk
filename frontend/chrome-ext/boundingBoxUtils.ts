import type { BoundingBox } from './datas';

/** Percentage bounding box from a DOM element's client rect. */
export function boundingBoxFromElement(element: HTMLElement): BoundingBox | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw <= 0 || vh <= 0) return null;
  try {
    const rect = element.getBoundingClientRect();
    const xPct = (rect.left / vw) * 100;
    const yPct = (rect.top / vh) * 100;
    const widthPct = (rect.width / vw) * 100;
    const heightPct = (rect.height / vh) * 100;
    if (xPct < 0 || yPct < 0 || widthPct <= 0 || heightPct <= 0) return null;
    return clampBoundingBox({ xPct, yPct, widthPct, heightPct });
  } catch {
    return null;
  }
}

/** Percentage bounding box from box-draw coords (pixels). */
export function boundingBoxFromDrawCoords(coords: {
  left: unknown;
  top: unknown;
  width: unknown;
  height: unknown;
}): BoundingBox {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  return clampBoundingBox({
    xPct: (parseFloat(String(coords.left)) / vw) * 100,
    yPct: (parseFloat(String(coords.top)) / vh) * 100,
    widthPct: (parseFloat(String(coords.width)) / vw) * 100,
    heightPct: (parseFloat(String(coords.height)) / vh) * 100,
  });
}

function clampBoundingBox(box: BoundingBox): BoundingBox {
  return {
    xPct: Math.max(0, Math.min(100, box.xPct ?? 0)),
    yPct: Math.max(0, Math.min(100, box.yPct ?? 0)),
    widthPct: Math.max(0, Math.min(100, box.widthPct ?? 0)),
    heightPct: Math.max(0, Math.min(100, box.heightPct ?? 0)),
  };
}
