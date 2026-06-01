import { useEffect, useRef, useCallback, useState } from 'react';

export function useWebSocket(token) {
  const wsRef = useRef(null);
  const listeners = useRef({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const wsBase = import.meta.env.VITE_WS_URL || '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = wsBase
      ? `${wsBase}/ws/?token=${token}`
      : `${protocol}//${window.location.host}/ws/?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); wsRef.current = null; };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const handlers = listeners.current[data.type] || [];
        handlers.forEach(fn => fn(data));
      } catch {}
    };

    return () => ws.close();
  }, [token]);

  const on = useCallback((event, fn) => {
    if (!listeners.current[event]) listeners.current[event] = [];
    if (!listeners.current[event].includes(fn)) {
      listeners.current[event].push(fn);
    }
  }, []);

  const off = useCallback((event, fn) => {
    if (listeners.current[event]) {
      listeners.current[event] = listeners.current[event].filter(f => f !== fn);
    }
  }, []);

  const emit = useCallback((type, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  return { connected, on, off, emit };
}
