const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const QRCode = require('qrcode');
const { ExpressPeerServer } = require('peer');

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
