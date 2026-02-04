import { useEffect, useRef, useState, useCallback } from 'react';
import config from '../config';

export function useWebSocket(userEmail, onNewEmails) {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (!userEmail) return;
    
    const wsUrl = config.wsUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws`;
    
    try {
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        setReconnectAttempt(0);
        ws.current.send(JSON.stringify({ type: 'auth', email: userEmail }));
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_emails' && onNewEmails) {
            onNewEmails(data.emails);
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };
      
      ws.current.onclose = () => {
        setIsConnected(false);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        reconnectTimeout.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connect();
        }, delay);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, [userEmail, onNewEmails, reconnectAttempt]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userEmail]);

  return { isConnected };
}
