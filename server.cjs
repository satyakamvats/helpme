const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const QRCode = require('qrcode');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const root = __dirname;
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.get('/vendor/peerjs.min.js', (_req, res) => {
  res.sendFile(require.resolve('peerjs/dist/peerjs.min.js'));
});

app.get('/qr', async (req, res, next) => {
  try {
    const role = ['victim', 'relay', 'command'].includes(req.query.role) ? req.query.role : 'victim';
    const room = String(req.query.room || 'judge-demo').replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'judge-demo';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const joinUrl = `${protocol}://${host}/?role=${role}&room=${room}`;
    res.type('png').send(await QRCode.toBuffer(joinUrl, { width: 220, margin: 1, color: { dark: '#172231', light: '#F6F4EF' } }));
  } catch (error) {
    next(error);
  }
});

const liveClients = new Set();
const liveServer = new WebSocketServer({ noServer: true });
server.prependListener('upgrade', (request, socket, head) => {
  if (new URL(request.url, 'http://localhost').pathname !== '/live') return;
  liveServer.handleUpgrade(request, socket, head, client => liveServer.emit('connection', client, request));
});

function roomPresence(room) {
  const counts = { victim: 0, relay: 0, command: 0 };
  for (const client of liveClients) {
    if (client.data.room === room && counts[client.data.role] !== undefined) counts[client.data.role] += 1;
  }
  return counts;
}

function send(client, type, payload) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type, payload }));
}

function broadcast(room, type, payload) {
  for (const client of liveClients) if (client.data.room === room) send(client, type, payload);
}

function emitPresence(room) {
  broadcast(room, 'mission:presence', roomPresence(room));
}

liveServer.on('connection', client => {
  client.data = {};
  liveClients.add(client);
  client.on('message', raw => {
    let message;
    try { message = JSON.parse(String(raw)); } catch { return; }
    const { type, payload } = message || {};
    if (type === 'mission:join') {
      const { room, role } = payload || {};
    const validRoom = String(room || '').replace(/[^a-z0-9-]/gi, '').slice(0, 32);
    if (!validRoom || !['victim', 'relay', 'command'].includes(role)) return;
    const previousRoom = client.data.room;
    client.data.room = validRoom;
    client.data.role = role;
    if (previousRoom && previousRoom !== validRoom) emitPresence(previousRoom);
    send(client, 'mission:joined', { room: validRoom, role });
    emitPresence(validRoom);
    } else if (type === 'sos:send' && client.data.role === 'victim' && client.data.room) {
      broadcast(client.data.room, 'relay:receive', payload);
    } else if (type === 'relay:forward' && client.data.role === 'relay' && client.data.room) {
      broadcast(client.data.room, 'command:receive', payload);
    } else if (type === 'command:ack' && client.data.role === 'command' && client.data.room) {
      broadcast(client.data.room, 'delivery:ack', payload);
    }
  });
  client.on('close', () => {
    const room = client.data.room;
    liveClients.delete(client);
    if (room) emitPresence(room);
  });
});
app.use(express.static(root, { extensions: ['html'], index: 'index.html' }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unable to generate the demo QR code.' });
});

server.listen(port, '0.0.0.0', () => {
  const lanAddress = Object.values(os.networkInterfaces())
    .flat()
    .find(network => network && network.family === 'IPv4' && !network.internal)?.address;
  console.log(`ResQMesh demo is running on http://localhost:${port}`);
  console.log(lanAddress
    ? `Open http://${lanAddress}:${port} on the Command laptop, then scan the QR codes.`
    : 'Open the Command laptop LAN address on the victim phone and relay device.');
});
