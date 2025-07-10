import { useEffect, useState } from 'react';

export function useConnectionManager() {
  const [vscodeConnected, setVSCodeConnected] = useState(false);
  const [mcpConnected, setMCPConnected] = useState(false);

  useEffect(() => {
    function handleStatusEvent(event: MessageEvent) {
      if (event.data && event.data.type === 'connection_status') {
        if (typeof event.data.vscodeConnected !== 'undefined') setVSCodeConnected(!!event.data.vscodeConnected);
        if (typeof event.data.mcpConnected !== 'undefined') setMCPConnected(!!event.data.mcpConnected);
      }
    }
    window.addEventListener('message', handleStatusEvent);
    // Request initial status
    window.postMessage({ type: 'get_connection_status' }, '*');
    return () => window.removeEventListener('message', handleStatusEvent);
  }, []);

  return { vscodeConnected, mcpConnected };
} 