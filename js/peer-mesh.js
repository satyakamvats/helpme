/* ResQMesh live LAN relay. PeerServer is used only for WebRTC signalling. */
const PeerMesh = (() => {
  const validRoles = ['victim', 'relay', 'command'];
  const labels = { victim: 'Victim phone', relay: 'Volunteer relay', command: 'Safety point' };
  const roleToScreen = { victim: 'citizen', relay: 'mesh', command: 'responder' };
  const state = {
    room: 'judge-demo', role: 'command', peer: null, peerId: '', connections: new Map(),
    events: [], packet: null, seen: new Set(), outbox: [], started: false, available: false
  };

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const idFor = role => `resqmesh-${state.room}-${role}`;
  const storageKey = () => `resqmesh.mesh-outbox.v1.${state.room}.${state.role}`;

  function readQuery() {
    const query = new URLSearchParams(location.search);
    state.role = validRoles.includes(query.get('role')) ? query.get('role') : 'command';
    state.room = (query.get('room') || 'judge-demo').replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'judge-demo';
  }

  function persistOutbox() {
    try { localStorage.setItem(storageKey(), JSON.stringify(state.outbox)); } catch { /* storage is optional */ }
  }

  function loadOutbox() {
    try { state.outbox = JSON.parse(localStorage.getItem(storageKey()) || '[]'); } catch { state.outbox = []; }
  }

  function event(message, tone = 'neutral') {
    state.events.unshift({ time: now(), message, tone });
    state.events = state.events.slice(0, 30);
    render();
  }

  function setPacket(packet, status) {
    state.packet = { ...state.packet, ...packet, status };
    render();
  }

  function connectionState(role) {
    const connection = state.connections.get(idFor(role));
    return Boolean(connection && connection.open);
  }

  function connectionSummary() {
    if (!state.available) return 'Visual replay only · live relay server unavailable';
    if (!state.started) return 'Ready to join this LAN mission';
    if (state.role === 'victim') return connectionState('relay') ? 'Relay device connected' : 'Waiting for the relay device';
    if (state.role === 'relay') return connectionState('victim') && connectionState('command') ? 'Both neighbours connected' : 'Waiting for a neighbour';
    return connectionState('relay') ? 'Relay device connected' : 'Waiting for the relay device';
  }

  function renderEvents(target) {
    if (!target) return;
    target.innerHTML = state.events.length
      ? state.events.map(item => `<div class="live-event ${item.tone}"><time>${item.time}</time><span>${safe(item.message)}</span></div>`).join('')
      : '<div class="live-event"><span>Join the mission, then open the next role on the other devices.</span></div>';
  }

  function renderRoute(target) {
    if (!target) return;
    const history = state.packet?.route || [];
    target.querySelectorAll('[data-live-hop]').forEach(node => {
      const role = node.dataset.liveHop;
      const visited = history.some(hop => hop.role === role);
      const current = state.packet?.currentRole === role && state.packet?.status !== 'delivered';
      node.classList.toggle('is-reached', visited);
      node.classList.toggle('is-current', current);
      const detail = node.querySelector('[data-live-detail]');
      if (detail) detail.textContent = visited ? `Received ${history.find(hop => hop.role === role)?.at || ''}` : role === state.role ? 'This device' : 'Waiting';
    });
  }

  function render() {
    const status = connectionSummary();
    document.querySelectorAll('[data-mesh-status]').forEach(element => { element.textContent = status; });
    document.querySelectorAll('[data-mesh-room]').forEach(element => { element.textContent = state.room; });
    document.querySelectorAll('[data-mesh-peer]').forEach(element => { element.textContent = state.peerId || 'Not joined'; });
    document.querySelectorAll('[data-mesh-packet]').forEach(element => { element.textContent = state.packet?.packetId || 'No live packet yet'; });
    document.querySelectorAll('[data-mesh-ttl]').forEach(element => { element.textContent = state.packet ? String(state.packet.ttl) : '—'; });
    document.querySelectorAll('[data-mesh-role-button]').forEach(button => button.classList.toggle('on', button.dataset.meshRoleButton === state.role));
    document.querySelectorAll('[data-mesh-route]').forEach(renderRoute);
    document.querySelectorAll('[data-mesh-event-log]').forEach(renderEvents);
    const roomInput = document.getElementById('meshRoomInput');
    if (roomInput && document.activeElement !== roomInput) roomInput.value = state.room;
    const joinButton = document.getElementById('meshJoinButton');
    if (joinButton) joinButton.textContent = state.started ? 'Reconnect this device' : 'Join live mission';
    const mode = document.getElementById('meshModeLabel');
    if (mode) mode.textContent = state.available ? 'LIVE WEBRTC' : 'VISUAL REPLAY';
    const qr = document.getElementById('victimQr');
    const relayQr = document.getElementById('relayQr');
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    if (qr) qr.src = `/qr?role=victim&room=${encodeURIComponent(state.room)}`;
    if (relayQr) relayQr.src = `/qr?role=relay&room=${encodeURIComponent(state.room)}`;
  }

  function routeHtml(compact = false) {
    return `<div class="live-route ${compact ? 'compact' : ''}" data-mesh-route>
      ${validRoles.map((role, index) => `${index ? '<div class="live-link" aria-hidden="true"></div>' : ''}<div class="live-device" data-live-hop="${role}"><span class="device-icon">${role === 'command' ? '⌂' : role === 'relay' ? '▣' : '▯'}</span><b>${labels[role]}</b><small data-live-detail>${role === state.role ? 'This device' : 'Waiting'}</small></div>`).join('')}
    </div>`;
  }

  function peerOptions() {
    return {
      host: location.hostname,
      port: Number(location.port) || (location.protocol === 'https:' ? 443 : 80),
      path: '/peerjs',
      secure: location.protocol === 'https:',
      debug: 1
    };
  }

  function bindConnection(connection) {
    if (!connection || state.connections.has(connection.peer)) return;
    state.connections.set(connection.peer, connection);
    connection.on('open', () => {
      event(`Direct WebRTC channel open: ${connection.peer.replace(`resqmesh-${state.room}-`, '')}.`, 'good');
      flushOutbox();
      render();
    });
    connection.on('data', data => handleMessage(data, connection).catch(error => event(`Packet rejected: ${error.message}`, 'bad')));
    connection.on('close', () => {
      state.connections.delete(connection.peer);
      event(`Channel closed: ${connection.peer.replace(`resqmesh-${state.room}-`, '')}.`, 'warn');
      render();
    });
    connection.on('error', error => event(`Channel error: ${error.type || error.message}.`, 'bad'));
  }

  function connect(role) {
    if (!state.peer?.open || role === state.role || connectionState(role)) return;
    try { bindConnection(state.peer.connect(idFor(role), { reliable: true, serialization: 'json' })); }
    catch (error) { event(`Cannot open ${role} channel: ${error.message}.`, 'bad'); }
  }

  function targetForCurrentRole() {
    return state.role === 'victim' ? 'relay' : state.role === 'relay' ? 'command' : null;
  }

  function queue(message, targetRole) {
    state.outbox = state.outbox.filter(item => item.message.messageId !== message.messageId || item.targetRole !== targetRole);
    state.outbox.push({ message, targetRole, queuedAt: Date.now() });
    persistOutbox();
    event(`Saved ${message.packetId || 'packet'} locally; ${targetRole} is not connected yet.`, 'warn');
  }

  function send(message, targetRole, allowQueue = true) {
    const connection = state.connections.get(idFor(targetRole));
    if (!connection?.open) {
      if (allowQueue) queue(message, targetRole);
      return false;
    }
    try {
      connection.send(message);
      return true;
    } catch (error) {
      if (allowQueue) queue(message, targetRole);
      return false;
    }
  }

  function flushOutbox() {
    const pending = state.outbox.slice();
    state.outbox = [];
    pending.forEach(item => {
      if (send(item.message, item.targetRole, false)) event(`Forwarded saved packet ${item.message.packetId}.`, 'good');
      else state.outbox.push(item);
    });
    persistOutbox();
    render();
  }

  async function verifyEnvelope(envelope) {
    if (!envelope.incident?.ed25519?.signature || !window.CryptoInspector?.verifyIncident) return false;
    return window.CryptoInspector.verifyIncident(envelope.incident);
  }

  function addRoute(envelope, role) {
    const route = Array.isArray(envelope.route) ? envelope.route.slice() : [];
    if (!route.some(hop => hop.role === role)) route.push({ role, peerId: state.peerId, at: now() });
    return route;
  }

  async function receiveSos(envelope, connection) {
    if (!envelope.messageId || !envelope.incident) throw new Error('missing SOS packet fields');
    if (state.seen.has(envelope.messageId)) {
      event(`Duplicate ${envelope.packetId} dropped on this device.`, 'warn');
      return;
    }
    state.seen.add(envelope.messageId);
    const verified = await verifyEnvelope(envelope);
    if (!verified) throw new Error('Ed25519 signature did not verify');

    const route = addRoute(envelope, state.role);
    const nextTtl = state.role === 'relay' ? Math.max(0, Number(envelope.ttl || 0) - 1) : Number(envelope.ttl || 0);
    setPacket({ packetId: envelope.packetId, messageId: envelope.messageId, route, ttl: nextTtl, currentRole: state.role }, state.role === 'command' ? 'delivered' : 'received');
    event(`${envelope.packetId} verified on ${labels[state.role]}.`, 'good');

    if (state.role === 'relay') {
      const forwarded = { ...envelope, ttl: nextTtl, route, currentRole: 'relay' };
      await window.OfflineStore?.saveIncident({ ...envelope.incident, status: 'Stored at relay', hops: route.length - 1, ttl: nextTtl, createdAt: Date.now() });
      connection.send({ type: 'receipt', messageId: envelope.messageId, packetId: envelope.packetId, stage: 'relay-received', route, ttl: nextTtl });
      if (send(forwarded, 'command')) event(`${envelope.packetId} forwarded directly to Safety Point.`, 'good');
      return;
    }

    if (state.role === 'command') {
      const incident = { ...envelope.incident, hops: route.length - 1, ttl: nextTtl, status: 'Delivered · live relay', createdAt: Date.now(), trust: { ...envelope.incident.trust, source: 'Live LAN relay · verified', corrob: route.length - 1 } };
      const existing = ResQState.get().sosData.find(item => item.packet === incident.packet);
      if (!existing) ResQState.addSos(incident);
      await window.OfflineStore?.saveIncident(incident);
      connection.send({ type: 'delivery-ack', messageId: envelope.messageId, packetId: envelope.packetId, route, ttl: nextTtl });
      event(`${envelope.packetId} saved in the Command queue. Delivery acknowledged.`, 'good');
    }
  }

  function receiveReceipt(message) {
    setPacket({ packetId: message.packetId, messageId: message.messageId, route: message.route || [], ttl: message.ttl, currentRole: 'relay' }, 'relay received');
    event(`${message.packetId} reached the relay device.`, 'good');
  }

  function receiveAck(message, connection) {
    setPacket({ packetId: message.packetId, messageId: message.messageId, route: message.route || [], ttl: message.ttl, currentRole: 'command' }, 'delivered');
    event(`${message.packetId} delivered to Safety Point.`, 'good');
    if (state.role === 'relay') {
      const source = state.connections.get(idFor('victim'));
      if (source?.open) source.send(message);
    }
  }

  async function handleMessage(message, connection) {
    if (!message || typeof message !== 'object') throw new Error('invalid channel payload');
    if (message.type === 'sos') return receiveSos(message, connection);
    if (message.type === 'receipt') return receiveReceipt(message);
    if (message.type === 'delivery-ack') return receiveAck(message, connection);
  }

  function start() {
    if (!window.Peer) {
      state.available = false;
      event('Live relay needs the local demo server. Open this page through npm run demo.', 'warn');
      return;
    }
    stop(false);
    state.available = true;
    state.started = true;
    state.peerId = idFor(state.role);
    loadOutbox();
    state.peer = new window.Peer(state.peerId, peerOptions());
    state.peer.on('open', id => {
      state.peerId = id;
      event(`Joined room ${state.room} as ${labels[state.role]}.`, 'good');
      const next = targetForCurrentRole();
      if (next) connect(next);
      if (state.role === 'relay') connect('command');
      flushOutbox();
      render();
    });
    state.peer.on('connection', bindConnection);
    state.peer.on('error', error => {
      const duplicate = error.type === 'unavailable-id';
      event(duplicate ? 'This role is already open in the room. Use another role or room name.' : `Peer setup error: ${error.type || error.message}.`, 'bad');
      if (duplicate) stop(false);
    });
    state.peer.on('disconnected', () => event('Signalling connection lost; existing direct channels may remain active.', 'warn'));
    render();
  }

  function stop(renderAfter = true) {
    state.connections.forEach(connection => connection.close());
    state.connections.clear();
    if (state.peer) state.peer.destroy();
    state.peer = null;
    state.started = false;
    if (renderAfter) render();
  }

  async function sendIncident(incident) {
    if (state.role !== 'victim') return false;
    if (!state.started) start();
    const envelope = {
      type: 'sos', version: 1, messageId: crypto.randomUUID(), packetId: incident.packet,
      createdAt: new Date().toISOString(), ttl: Number(incident.ttl || 7), currentRole: 'victim',
      route: [{ role: 'victim', peerId: state.peerId || idFor('victim'), at: now() }], incident
    };
    state.seen.add(envelope.messageId);
    setPacket({ packetId: envelope.packetId, messageId: envelope.messageId, route: envelope.route, ttl: envelope.ttl, currentRole: 'victim' }, 'queued');
    if (send(envelope, 'relay')) event(`${envelope.packetId} sent through a direct WebRTC channel.`, 'good');
    return true;
  }

  function selectRole(role) {
    if (!validRoles.includes(role) || role === state.role) return;
    const query = new URLSearchParams(location.search);
    query.set('role', role); query.set('room', state.room);
    history.replaceState({}, '', `${location.pathname}?${query}`);
    state.role = role;
    if (typeof window.setRole === 'function') window.setRole(roleToScreen[role]);
    start();
  }

  function setRoom() {
    const input = document.getElementById('meshRoomInput');
    const nextRoom = (input?.value || '').replace(/[^a-z0-9-]/gi, '').slice(0, 32);
    if (!nextRoom || nextRoom === state.room) return start();
    state.room = nextRoom;
    const query = new URLSearchParams(location.search);
    query.set('role', state.role); query.set('room', state.room);
    history.replaceState({}, '', `${location.pathname}?${query}`);
    state.packet = null; state.events = []; start();
  }

  function mount() {
    readQuery();
    document.querySelectorAll('[data-mesh-role-button]').forEach(button => button.addEventListener('click', () => selectRole(button.dataset.meshRoleButton)));
    document.getElementById('meshJoinButton')?.addEventListener('click', setRoom);
    document.getElementById('meshReplayButton')?.addEventListener('click', () => {
      document.getElementById('meshReplay')?.classList.toggle('on');
      window.MeshSimulator?.start();
    });
    if (typeof window.setRole === 'function') window.setRole(roleToScreen[state.role]);
    state.available = Boolean(window.Peer);
    render();
    start();
  }

  return { mount, start, stop, sendIncident, render, chooseRole: selectRole, getState: () => ({ ...state }), isLive: () => state.started && state.available, routeHtml };
})();

window.PeerMesh = PeerMesh;
