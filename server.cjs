const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const QRCode = require('qrcode');
const { ExpressPeerServer } = require('peer');
const { Server } = require('socket.io');

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

const peerServer = ExpressPeerServer(server, { path: '/', allow_discovery: false, proxied: false });
app.use('/peerjs', peerServer);
const io = new Server(server, { path: '/live-relay', cors: { origin: true, methods: ['GET', 'POST'] } });

function roomPresence(room) {
  const counts = { victim: 0, relay: 0, command: 0 };
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.room === room && counts[socket.data.role] !== undefined) counts[socket.data.role] += 1;
  }
  return counts;
}

function emitPresence(room) {
  io.to(room).emit('mission:presence', roomPresence(room));
}

io.on('connection', socket => {
  socket.on('mission:join', ({ room, role } = {}) => {
    const validRoom = String(room || '').replace(/[^a-z0-9-]/gi, '').slice(0, 32);
    if (!validRoom || !['victim', 'relay', 'command'].includes(role)) return;
    if (socket.data.room) socket.leave(socket.data.room);
    socket.data.room = validRoom;
    socket.data.role = role;
    socket.join(validRoom);
    socket.emit('mission:joined', { room: validRoom, role });
    emitPresence(validRoom);
  });
  socket.on('sos:send', envelope => {
    if (socket.data.role === 'victim' && socket.data.room) io.to(socket.data.room).emit('relay:receive', envelope);
  });
  socket.on('relay:forward', envelope => {
    if (socket.data.role === 'relay' && socket.data.room) io.to(socket.data.room).emit('command:receive', envelope);
  });
  socket.on('command:ack', ack => {
    if (socket.data.role === 'command' && socket.data.room) io.to(socket.data.room).emit('delivery:ack', ack);
  });
  socket.on('disconnect', () => { if (socket.data.room) emitPresence(socket.data.room); });
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
