import { useState, useEffect, useCallback } from 'react';

export function useElementSelector(onElementSelected: (element: HTMLElement, querySelector: string) => void) {
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        let overlayDiv: HTMLDivElement | null = null;
        if (selecting) {
            overlayDiv = document.createElement('div');
            overlayDiv.id = 'tc-mode-overlay';
            Object.assign(overlayDiv.style, {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(30,30,30,0.15)',
                zIndex: 9999998,
                pointerEvents: 'none',
            });
            document.body.appendChild(overlayDiv);
            document.body.style.cursor = 'pointer';
            window.postMessage({ type: 'tc-hide-sidebar' }, '*');
        }
        function onPageMessage(event: MessageEvent) {
            if (!event.data || typeof event.data.type !== 'string') return;
            if (event.data.type === 'elementSelected' && event.data.querySelector) {
                const querySelector = event.data.querySelector;
                const element = document.querySelector(querySelector) as HTMLElement | null;
                if (element) {
                    onElementSelected(element, querySelector);
                }
                setSelecting(false);
                window.postMessage({ type: 'tc-show-sidebar' }, '*');
            }
        }
        if (selecting) {
            window.addEventListener('message', onPageMessage);
        }
        return () => {
            if (overlayDiv && overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
            const old = document.getElementById('tc-mode-overlay');
            if (old && old.parentNode) old.parentNode.removeChild(old);
            document.body.style.cursor = '';
            window.removeEventListener('message', onPageMessage);
        };
    }, [selecting, onElementSelected]);

    const startSelecting = useCallback(() => {
        setSelecting(true);
        window.postMessage({ type: 'startElementSelect' }, '*');
    }, []);

    return { selecting, startSelecting };
} 