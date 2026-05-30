import { useEffect, useState, useCallback } from 'react';
import { useElementSelector } from './elementSelector';
import type { BoundingBox } from './datas';
import { boundingBoxFromElement, boundingBoxFromDrawCoords } from './boundingBoxUtils';

export interface ElementAreaSelection {
  type: 'element' | 'area';
  boundingBox: BoundingBox;
  querySelector?: string;
}

export function useElementAreaSelections(options?: { maxSelections?: number }) {
  const singleOnly = (options?.maxSelections ?? Infinity) === 1;

  const [selections, setSelections] = useState<ElementAreaSelection[]>([]);
  const [currentMode, setCurrentMode] = useState<'normal' | 'select' | 'box'>('normal');

  const addSelection = useCallback(
    (selection: ElementAreaSelection) => {
      setSelections(singleOnly ? [selection] : (prev) => [...prev, selection]);
      setCurrentMode('normal');
    },
    [singleOnly]
  );

  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    const boundingBox = boundingBoxFromElement(element);
    if (boundingBox) {
      addSelection({ type: 'element', boundingBox, querySelector });
    }
  });

  useEffect(() => {
    function onPageMessage(event: MessageEvent) {
      if (event.data?.type !== 'boxDrawn' || !event.data.coords) return;
      addSelection({ type: 'area', boundingBox: boundingBoxFromDrawCoords(event.data.coords) });
      window.postMessage({ type: 'tc-show-sidebar' }, '*');
    }
    window.addEventListener('message', onPageMessage);
    return () => window.removeEventListener('message', onPageMessage);
  }, [addSelection]);

  useEffect(() => {
    if (currentMode === 'select') {
      window.postMessage({ type: 'startElementSelect' }, '*');
      window.postMessage({ type: 'tc-hide-sidebar' }, '*');
    } else if (currentMode === 'box') {
      window.postMessage({ type: 'startBoxDraw' }, '*');
      window.postMessage({ type: 'tc-hide-sidebar' }, '*');
    }
  }, [currentMode]);

  return {
    selections,
    selecting,
    currentMode,
    startElementSelect: () => {
      setCurrentMode('select');
      startSelecting();
    },
    startAreaSelect: () => setCurrentMode('box'),
    removeSelection: (index: number) => setSelections((prev) => prev.filter((_, i) => i !== index)),
    clearSelections: () => setSelections([]),
  };
}
