import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Map();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.userEmail = null;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth' && message.email) {
          ws.userEmail = message.email;
          
          if (!clients.has(message.email)) {
            clients.set(message.email, new Set());
          }
          clients.get(message.email).add(ws);
          
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    ws.on('close', () => {
      if (ws.userEmail && clients.has(ws.userEmail)) {
        clients.get(ws.userEmail).delete(ws);
        if (clients.get(ws.userEmail).size === 0) {
          clients.delete(ws.userEmail);
        }
      }
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });
  
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  return wss;
}

export function notifyUser(email, data) {
  if (!clients.has(email)) return;
  
  const userClients = clients.get(email);
  const message = JSON.stringify(data);
  
  userClients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  });
}

export function broadcast(data) {
  if (!wss) return;
  
  const message = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  });
}

export function getConnectedUsers() {
  return Array.from(clients.keys());
}
