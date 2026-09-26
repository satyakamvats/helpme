/**
 * ResQMesh — P2P Mesh Simulator & Delay-Tolerant Networking
 * Handles hop-by-hop relay, SVG route animation, Bloom filter duplicate dropping,
 * and event logging.
 */

const MeshSimulator = (function() {
  let meshLogEntries = [];
  let meshStep = -1;
  let meshTimer = null;
  let meshPaused = false;

  function appendLog(message, alert = false) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    meshLogEntries.unshift({ time, message, alert });
    meshLogEntries = meshLogEntries.slice(0, 60);

    const logEl = document.getElementById('meshLog');
    if (logEl) {
      logEl.innerHTML = meshLogEntries
        .map(entry => `
          <div class="mesh-log-entry ${entry.alert ? 'alert' : ''}">
            <time>${entry.time}</time>
            <span class="event">${escapeHtml(entry.message)}</span>
          </div>
        `).join('');
    }
  }

  function renderNodes() {
    const listEl = document.getElementById('meshNodeList');
    if (!listEl) return;
    listEl.innerHTML = window.MESH_NODES.map((node, index) => `
      <div class="mesh-node" data-node="${index}">
        <b>${escapeHtml(node.short)}</b>
        <span>${index === 0 ? 'SOS source' : index === 4 ? 'Command HQ' : 'BLE peer relay'}</span>
      </div>
    `).join('');
  }

  function applyHop(index) {
    meshStep = index;
    const [x, y] = window.MESH_POSITIONS[index];
    const packetEl = document.getElementById('routePacket');
    if (packetEl) {
      packetEl.setAttribute('cx', x);
      packetEl.setAttribute('cy', y);
    }

    document.querySelectorAll('.route-stop').forEach((node, i) => node.classList.toggle('is-active', i === index));
    document.querySelectorAll('.mesh-node').forEach((node, i) => node.classList.toggle('is-active', i === index));
    document.querySelectorAll('#meshDock .flow-node').forEach((node, i) => node.classList.toggle('active', i <= index));

    const stepCountEl = document.getElementById('meshStepCount');
    const narrationEl = document.getElementById('meshNarration');
    const playBtn = document.getElementById('meshPlayButton');

    if (stepCountEl) stepCountEl.textContent = `HOP ${index + 1} / ${window.MESH_NODES.length}`;
    if (narrationEl) narrationEl.textContent = window.MESH_NODES[index].narration;
    if (playBtn) playBtn.textContent = meshPaused ? 'Play' : 'Pause';

    const routeLinkEl = document.getElementById('routeLink');
    if (routeLinkEl) routeLinkEl.classList.add('is-live');

    // Audio cue
    if (window.ResQAudio) ResQAudio.playPacketChirp();

    const state = ResQState.get();
    const sel = state.selected;
    if (sel) {
      const isLast = index === window.MESH_NODES.length - 1;
      const status = isLast
        ? (state.outage || !navigator.onLine ? 'Saved locally' : 'Delivered · demo')
        : index === 0 ? 'Queued' : 'Relaying · demo';
      sel.hops = index;
      sel.ttl = Math.max(0, 7 - index);
      sel.status = status;

      ResQState.setRelayOverride({
        id: sel.id,
        packet: sel.packet,
        status,
        hops: index,
        ttl: Math.max(0, 7 - index),
        activeNodes: index + 1
      });
    }

    appendLog(`${window.MESH_NODES[index].title}: ${index === 0 ? 'packet created' : index === window.MESH_NODES.length - 1 ? 'delivery acknowledged' : 'packet received and forwarded'}.`);
    
    if (index === window.MESH_NODES.length - 1) {
      appendLog(state.outage || !navigator.onLine
        ? 'Relay demo ended. SOS remains saved locally; no network sync occurred.'
        : 'Relay simulation reached Collector HQ. No live dispatch or server sync occurred.');
      if (window.ResQAudio) ResQAudio.playSyncChime();
    }
  }

  function advance() {
    if (meshStep < 0) {
      applyHop(0);
      return;
    }
    if (meshStep === window.MESH_NODES.length - 1) {
      restart();
      return;
    }
    applyHop(meshStep + 1);
  }

  function schedule() {
    clearInterval(meshTimer);
    if (!meshPaused && meshStep >= 0 && meshStep < window.MESH_NODES.length - 1) {
      meshTimer = setInterval(advance, 2600);
    }
  }

  function start() {
    clearInterval(meshTimer);
    meshPaused = false;
    meshLogEntries = [];
    renderNodes();
    const logEl = document.getElementById('meshLog');
    if (logEl) logEl.innerHTML = '';
    applyHop(0);
    schedule();
  }

  function restart() {
    start();
  }

  function toggle() {
    if (meshStep === window.MESH_NODES.length - 1) {
      restart();
      return;
    }
    meshPaused = !meshPaused;
    const playBtn = document.getElementById('meshPlayButton');
    if (playBtn) playBtn.textContent = meshPaused ? 'Play' : 'Pause';
    schedule();
  }

  function stop() {
    clearInterval(meshTimer);
    meshPaused = true;
  }

  function sendDuplicate() {
    const sel = ResQState.get().selected;
    if (!sel) return;
    const fp = window.fingerprintFor(sel);

    if (window.seenFingerprints && window.seenFingerprints.mightContain(fp)) {
      appendLog(`Duplicate packet [${sel.packet}] dropped by Bloom filter. Conserves battery & channel bandwidth.`, true);
      if (window.ResQAudio) ResQAudio.playAlertBeep();
      return;
    }

    if (window.seenFingerprints) window.seenFingerprints.add(fp);
    appendLog(`Unique packet [${sel.packet}] accepted and queued for relay.`);
  }

  function restoreLink() {
    if (!navigator.onLine) {
      ResQState.setOutage(false);
      appendLog('Browser is still offline. Reports remain saved on this device.');
      ResQState.notify('render_all');
      return;
    }
    if (window.setOutageState) window.setOutageState(false);
    else ResQState.setOutage(false);
    let synced = 0;
    const state = ResQState.get();
    state.sosData.forEach(s => {
      if (s.status === 'Queued for sync' || s.status === 'Queued offline') {
        s.status = 'Delivered · demo';
        synced++;
      }
    });

    if (state.selected && state.relayOverride && state.relayOverride.id === state.selected.id && state.relayOverride.status.startsWith('Queued')) {
      ResQState.setRelayOverride({
        ...state.relayOverride,
        status: 'Delivered · demo',
        activeNodes: 5
      });
    }

    appendLog(synced ? `${synced} saved incident(s) advanced in the relay demo. No server sync occurred.` : 'Outage simulation ended. Reports remain saved locally.');
    if (window.ResQAudio) ResQAudio.playSyncChime();
    ResQState.notify('render_all');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return {
    start,
    restart,
    toggle,
    stop,
    advance,
    applyHop,
    appendLog,
    sendDuplicate,
    restoreLink
  };
})();

window.MeshSimulator = MeshSimulator;
