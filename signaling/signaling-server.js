const http = require('http');
const url = require('url');
const WebSocket = require('ws');

const serverPort = Number(process.env.PORT || 7673);
const signalingPath = process.env.SIGNALING_PATH || '/ws/signaling';

const httpServer = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('OK');
});

const wsServer = new WebSocket.Server({ noServer: true });

const rooms = new Map();
const connectionInfo = new WeakMap();

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function sendJson(socket, payload) {
  try { socket.send(JSON.stringify(payload)); } catch {}
}

function broadcastToRoom(roomId, exceptSocket, payload) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [clientSocket] of room) {
    if (clientSocket !== exceptSocket && clientSocket.readyState === WebSocket.OPEN) {
      sendJson(clientSocket, payload);
    }
  }
}

wsServer.on('connection', (socket, request) => {
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });

  socket.on('message', (data) => {
    let message;
    try { message = JSON.parse(data.toString()); } catch { return; }
    const type = message && message.type;

    if (type === 'join') {
      const roomId = String(message.roomId || '').trim();
      const peerId = String(message.peerId || '').trim();
      if (!roomId || !peerId) return;
      const room = getRoom(roomId);
      connectionInfo.set(socket, { roomId, peerId });
      room.set(socket, { peerId });
      const peerList = Array.from(room.values()).map(v => v.peerId).filter(id => id !== peerId);
      sendJson(socket, { type: 'peers', peers: peerList });
      broadcastToRoom(roomId, socket, { type: 'peer-joined', peerId });
      return;
    }

    if (type === 'leave') {
      const info = connectionInfo.get(socket);
      if (!info) return;
      const { roomId, peerId } = info;
      const room = rooms.get(roomId);
      if (room) {
        room.delete(socket);
        if (room.size === 0) rooms.delete(roomId);
      }
      broadcastToRoom(roomId, socket, { type: 'peer-left', peerId });
      return;
    }

    if (type === 'offer' || type === 'answer' || type === 'candidate' || type === 'screen-start' || type === 'screen-stop') {
      const info = connectionInfo.get(socket);
      if (!info) return;
      const { roomId, peerId } = info;
      const room = rooms.get(roomId);
      if (!room) return;
      const targetPeerId = message.to ? String(message.to) : undefined;
      if (targetPeerId) {
        for (const [clientSocket, meta] of room) {
          if (meta.peerId === targetPeerId && clientSocket.readyState === WebSocket.OPEN) {
            sendJson(clientSocket, { type, from: peerId, data: message.data });
          }
        }
      } else {
        broadcastToRoom(roomId, socket, { type, from: peerId, data: message.data });
      }
      return;
    }
  });

  socket.on('close', () => {
    const info = connectionInfo.get(socket);
    if (!info) return;
    const { roomId, peerId } = info;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) rooms.delete(roomId);
    }
    broadcastToRoom(roomId, socket, { type: 'peer-left', peerId });
  });
});

const interval = setInterval(() => {
  wsServer.clients.forEach((client) => {
    if (!client.isAlive) return client.terminate();
    client.isAlive = false;
    try { client.ping(); } catch {}
  });
}, 30000);

wsServer.on('close', () => { clearInterval(interval); });

httpServer.on('upgrade', (request, socket, head) => {
  const { pathname } = url.parse(request.url);
  if (pathname !== signalingPath) {
    socket.destroy();
    return;
  }
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit('connection', ws, request);
  });
});

httpServer.listen(serverPort, '0.0.0.0', () => {
  console.log(`Signaling server listening on ${serverPort}${signalingPath}`);
});


