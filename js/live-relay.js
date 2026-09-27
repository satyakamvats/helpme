/* Reliable live judge demo: server-assisted store-and-forward relay over Socket.IO. */
const LiveRelay = (() => {
  const roles = ['victim', 'relay', 'command'];
  const labels = { victim: 'Victim phone', relay: 'Volunteer relay', command: 'Safety point' };
  const screens = { victim: 'citizen', relay: 'mesh', command: 'responder' };
  const state = { room: 'judge-demo', role: 'command', socket: null, connected: false, presence: { victim: 0, relay: 0, command: 0 }, packet: null, events: [], seen: new Set() };
  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const log = (message, tone = 'neutral') => { state.events.unshift({ time: now(), message, tone }); state.events = state.events.slice(0, 30); render(); };
  const send = (type, payload) => {
    if (state.socket?.readyState === WebSocket.OPEN) state.socket.send(JSON.stringify({ type, payload }));
  };

  function status() {
    if (!state.connected) return 'Connecting to live relay…';
    if (state.packet?.status === 'delivered') return 'Live delivery confirmed';
    if (state.role === 'victim') return state.presence.relay ? 'Relay device connected' : 'Waiting for the relay device';
    if (state.role === 'relay') return state.presence.victim && state.presence.command ? 'Both neighbours connected' : 'Waiting for a neighbour';
    return state.presence.relay ? 'Relay device connected' : 'Ready to join this LAN mission';
  }

  function renderRoute(target) {
    const history = state.packet?.route || [];
    target.querySelectorAll('[data-live-hop]').forEach(node => {
      const role = node.dataset.liveHop;
      const hit = history.find(hop => hop.role === role);
      node.classList.toggle('is-reached', Boolean(hit));
      node.classList.toggle('is-current', state.packet?.currentRole === role && state.packet?.status !== 'delivered');
      const detail = node.querySelector('[data-live-detail]');
      if (detail) detail.textContent = hit ? `Received ${hit.at}` : role === state.role ? 'This device' : 'Waiting';
    });
  }

  function render() {
    document.querySelectorAll('[data-mesh-status]').forEach(el => { el.textContent = status(); });
    document.querySelectorAll('[data-mesh-room]').forEach(el => { el.textContent = state.room; });
    document.querySelectorAll('[data-mesh-peer]').forEach(el => { el.textContent = state.connected ? `${state.role} · connected` : 'Connecting'; });
    document.querySelectorAll('[data-mesh-packet]').forEach(el => { el.textContent = state.packet?.packetId || 'No live packet yet'; });
    document.querySelectorAll('[data-mesh-ttl]').forEach(el => { el.textContent = state.packet ? String(state.packet.ttl) : '—'; });
    document.querySelectorAll('[data-mesh-role-button]').forEach(button => button.classList.toggle('on', button.dataset.meshRoleButton === state.role));
    document.querySelectorAll('[data-mesh-route]').forEach(renderRoute);
    document.querySelectorAll('[data-mesh-event-log]').forEach(el => { el.innerHTML = state.events.map(item => `<div class="live-event ${item.tone}"><time>${item.time}</time><span>${safe(item.message)}</span></div>`).join('') || '<div class="live-event"><span>Open the other two roles to begin.</span></div>'; });
    const input = document.getElementById('meshRoomInput');
    if (input && document.activeElement !== input) input.value = state.room;
    const button = document.getElementById('meshJoinButton');
    if (button) button.textContent = 'Live relay connected';
    const mode = document.getElementById('meshModeLabel');
    if (mode) mode.textContent = 'LIVE RELAY';
    const victimQr = document.getElementById('victimQr');
    const relayQr = document.getElementById('relayQr');
    if (victimQr) victimQr.src = `/qr?role=victim&room=${encodeURIComponent(state.room)}`;
    if (relayQr) relayQr.src = `/qr?role=relay&room=${encodeURIComponent(state.room)}`;
  }

  const route = (envelope, role) => [...(envelope.route || []).filter(hop => hop.role !== role), { role, at: now() }];
  const packetState = (envelope, currentRole, statusLabel, ttl = envelope.ttl) => { state.packet = { packetId: envelope.packetId, messageId: envelope.messageId, route: envelope.route || [], currentRole, status: statusLabel, ttl }; render(); };

  async function relayReceive(envelope) {
    if (state.role !== 'relay' || state.seen.has(envelope.messageId)) return;
    state.seen.add(envelope.messageId);
    if (!(await window.CryptoInspector.verifyIncident(envelope.incident))) return log(`${envelope.packetId} failed signature verification.`, 'bad');
    const forwarded = { ...envelope, route: route(envelope, 'relay'), ttl: Math.max(0, Number(envelope.ttl) - 1) };
    packetState(forwarded, 'relay', 'forwarding');
    await window.OfflineStore?.saveIncident({ ...envelope.incident, status: 'Stored at relay', ttl: forwarded.ttl, createdAt: Date.now() });
    log(`${envelope.packetId} verified and forwarded to Safety Point.`, 'good');
    send('relay:forward', forwarded);
  }

  async function commandReceive(envelope) {
    if (state.role !== 'command') return;
    const valid = await window.CryptoInspector.verifyIncident(envelope.incident);
    if (!valid) return log(`${envelope.packetId} failed signature verification.`, 'bad');
    const delivered = { ...envelope, route: route(envelope, 'command') };
    const incident = { ...envelope.incident, hops: delivered.route.length - 1, ttl: delivered.ttl, status: 'Delivered · live relay', createdAt: Date.now(), trust: { ...envelope.incident.trust, source: 'Live relay · verified', corrob: delivered.route.length - 1 } };
    if (!ResQState.get().sosData.some(item => item.packet === incident.packet)) ResQState.addSos(incident);
    await window.OfflineStore?.saveIncident(incident);
    packetState(delivered, 'command', 'delivered');
    log(`${envelope.packetId} reached Safety Point and entered the incident queue.`, 'good');
    send('command:ack', { messageId: envelope.messageId, packetId: envelope.packetId, route: delivered.route, ttl: delivered.ttl });
  }

  function start() {
    if (state.socket) state.socket.close();
    state.connected = false;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    state.socket = new WebSocket(`${protocol}://${location.host}/live`);
    state.socket.onopen = () => {
      state.connected = true;
      send('mission:join', { room: state.room, role: state.role });
      log(`Joined ${state.room} as ${labels[state.role]}.`, 'good');
    };
    state.socket.onclose = () => { state.connected = false; render(); };
    state.socket.onmessage = async event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      const { type, payload } = message || {};
      if (type === 'mission:presence') { state.presence = payload; render(); }
      else if (type === 'relay:receive') await relayReceive(payload);
      else if (type === 'command:receive') await commandReceive(payload);
      else if (type === 'delivery:ack') {
        if (!state.packet || state.packet.messageId !== payload.messageId) return;
        state.packet = { ...state.packet, route: payload.route, ttl: payload.ttl, currentRole: 'command', status: 'delivered' };
        log(`${payload.packetId} delivery acknowledged by Safety Point.`, 'good');
      }
    };
    render();
  }

  async function sendIncident(incident) {
    if (state.role !== 'victim' || !state.connected) { log('Waiting for the live relay connection.', 'warn'); return false; }
    const envelope = { messageId: crypto.randomUUID(), packetId: incident.packet, ttl: Number(incident.ttl || 7), incident, route: [{ role: 'victim', at: now() }] };
    state.seen.add(envelope.messageId);
    packetState(envelope, 'victim', 'sent');
    send('sos:send', envelope);
    log(`${envelope.packetId} sent to the live relay.`, 'good');
    return true;
  }

  function chooseRole(role) {
    if (!roles.includes(role)) return;
    const query = new URLSearchParams(location.search); query.set('role', role); query.set('room', state.room);
    location.href = `${location.pathname}?${query}`;
  }

  function setRoom() {
    const next = (document.getElementById('meshRoomInput')?.value || '').replace(/[^a-z0-9-]/gi, '').slice(0, 32);
    if (!next || next === state.room) return;
    state.room = next; state.packet = null; state.events = []; start();
  }

  function mount() {
    const query = new URLSearchParams(location.search);
    state.role = roles.includes(query.get('role')) ? query.get('role') : 'command';
    state.room = (query.get('room') || 'judge-demo').replace(/[^a-z0-9-]/gi, '') || 'judge-demo';
    document.querySelectorAll('[data-mesh-role-button]').forEach(button => button.addEventListener('click', () => chooseRole(button.dataset.meshRoleButton)));
    document.getElementById('meshJoinButton')?.addEventListener('click', setRoom);
    document.getElementById('meshReplayButton')?.addEventListener('click', () => { document.getElementById('meshReplay')?.classList.toggle('on'); window.MeshSimulator?.start(); });
    if (typeof window.setRole === 'function') window.setRole(screens[state.role]);
    start();
  }

  return { mount, start, stop: () => state.socket?.close(), sendIncident, render, chooseRole, getState: () => ({ ...state }), isLive: () => state.connected };
})();

window.PeerMesh = LiveRelay;
