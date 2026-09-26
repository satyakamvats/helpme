/**
 * ResQMesh — Main Application Orchestrator & UI Renderer
 */

const priorityLabels = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  resolved: 'RESOLVED'
};

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let appToastTimer = null;
function showAppToast(message) {
  const toast = document.getElementById('appToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('on');
  clearTimeout(appToastTimer);
  appToastTimer = setTimeout(() => toast.classList.remove('on'), 3200);
}

async function restoreSavedIncidents() {
  if (!window.OfflineStore) return;
  const state = ResQState.get();
  const knownIds = new Set(state.sosData.map(incident => incident.id));
  const restored = await OfflineStore.getAllIncidents();
  let newestRestored = null;
  restored.reverse().forEach(incident => {
    if (knownIds.has(incident.id)) return;
    state.sosData.unshift(incident);
    knownIds.add(incident.id);
    newestRestored = incident;
    window.seenFingerprints?.add(window.fingerprintFor(incident));
    const number = Number(incident.id.match(/^SOS-(\d+)$/)?.[1]);
    if (Number.isFinite(number)) state.nextSosNumber = Math.max(state.nextSosNumber, number + 1);
  });
  if (newestRestored) state.selected = newestRestored;
}

// ==================== RENDERING LOGIC ====================

let tacticalMap = null;
let incidentLayer = null;
let resourceLayer = null;
let roadLayer = null;

function initializeTacticalMap(state) {
  const host = document.getElementById('tacticalMap');
  const mapWrap = document.getElementById('mapWrap');
  if (!host || !window.L) return false;
  if (tacticalMap) return true;

  tacticalMap = L.map(host, { zoomControl: false, scrollWheelZoom: false, maxZoom: 18 });
  L.control.zoom({ position: 'bottomright' }).addTo(tacticalMap);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).on('tileload', () => {
    mapWrap.classList.add('leaflet-ready');
    tacticalMap.invalidateSize({ pan: false });
  }).addTo(tacticalMap);

  incidentLayer = L.layerGroup().addTo(tacticalMap);
  resourceLayer = L.layerGroup().addTo(tacticalMap);
  roadLayer = L.layerGroup().addTo(tacticalMap);

  const locations = [
    ...state.sosData.map(incident => incident.coordinates),
    ...window.OTHER_MARKERS.map(marker => marker.coordinates)
  ].filter(location => Array.isArray(location) && location.length === 2);
  tacticalMap.fitBounds(locations, { padding: [28, 28], maxZoom: 13 });
  requestAnimationFrame(() => tacticalMap.invalidateSize({ pan: false }));
  return true;
}

function renderSosList() {
  const state = ResQState.get();
  const list = state.sosData.filter(s => state.activeFilter === 'all' || s.priority === state.activeFilter);
  const container = document.getElementById('sosScroll');
  if (!container) return;

  container.innerHTML = list.map(s => {
    const isSelected = state.selected && state.selected.id === s.id;
    return `
      <div class="sos-item ${isSelected ? 'sel' : ''}" onclick="ResQState.setSelected('${s.id}')">
        <div class="top">
          <span class="id mono">${s.id}</span>
          <span class="badge b-${s.priority}">${priorityLabels[s.priority]}</span>
        </div>
        <h4>${escapeHtml(s.title)}</h4>
        <div class="meta">
          <span>${escapeHtml(s.loc.split('·')[0])}</span> · 
          <span>${escapeHtml(s.time.split('·')[0])}</span> · 
          <span class="mono">${s.hops} hops</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMap() {
  const state = ResQState.get();
  const container = document.getElementById('mapMarkers');
  if (!container) return;
  const hasLeafletMap = initializeTacticalMap(state);

  const bypassRoad = document.getElementById('bypassRoadSvg');
  const roadButton = document.querySelector('.map-btn');
  if (bypassRoad) {
    bypassRoad.style.stroke = state.roadBlocked ? 'var(--critical)' : 'var(--warn)';
    bypassRoad.style.strokeDasharray = state.roadBlocked ? '2 1' : '1.6 1.6';
    bypassRoad.style.strokeWidth = state.roadBlocked ? '2' : '1.2';
    bypassRoad.setAttribute('aria-label', state.roadBlocked ? 'Ullal Beach Road blocked in demo' : 'Ullal Beach Road open in demo');
  }
  if (roadButton) {
    roadButton.classList.toggle('active', state.roadBlocked);
    roadButton.textContent = state.roadBlocked ? '⚠ Clear Road Obstruction' : '⚡ Toggle Road Obstruction';
  }

  if (hasLeafletMap) {
    incidentLayer.clearLayers();
    resourceLayer.clearLayers();
    roadLayer.clearLayers();

    state.sosData.forEach(s => {
      if (!Array.isArray(s.coordinates)) return;
      const markerHtml = `<span class="m-dot" style="background:var(--critical)">${s.priority === 'critical' ? '<span class="m-ring"></span>' : ''}<span style="position:relative">!</span></span>`;
      L.marker(s.coordinates, {
        icon: L.divIcon({ className: 'resqmap-icon', html: markerHtml, iconSize: [28, 28], iconAnchor: [14, 14] })
      }).addTo(incidentLayer).bindPopup(`<div class="resqmap-popup"><b>${escapeHtml(s.id)}</b><br>${escapeHtml(s.title)}<br>${escapeHtml(s.loc)} · simulated</div>`)
        .on('click', () => ResQState.setSelected(s.id));
    });

    window.OTHER_MARKERS.forEach(marker => {
      if (!Array.isArray(marker.coordinates)) return;
      const blockedRoad = marker.t.includes('Ullal Beach Road') && state.roadBlocked;
      const color = blockedRoad ? 'var(--critical)' : marker.c;
      const markerHtml = `<span class="m-dot" style="width:${marker.l ? 22 : 12}px;height:${marker.l ? 22 : 12}px;background:${color}">${escapeHtml(marker.l || '')}</span>`;
      L.marker(marker.coordinates, {
        icon: L.divIcon({ className: 'resqmap-icon', html: markerHtml, iconSize: [26, 26], iconAnchor: [13, 13] })
      }).addTo(resourceLayer).bindPopup(`<div class="resqmap-popup">${escapeHtml(marker.t)}${blockedRoad ? '<br><b>BLOCKED · scenario only</b>' : ''}</div>`);
    });

    const roadCoordinates = [[12.8152, 74.8584], [12.827, 74.855], [12.84, 74.852]];
    L.polyline(roadCoordinates, {
      color: state.roadBlocked ? '#ff303f' : '#e58e26',
      weight: state.roadBlocked ? 6 : 4,
      opacity: 0.9,
      dashArray: state.roadBlocked ? '7 8' : '4 7'
    }).addTo(roadLayer).bindPopup(state.roadBlocked ? 'Ullal Beach Road · blocked in scenario simulation' : 'Ullal Beach Road · route status simulated');
    return;
  }

  let html = '';
  state.sosData.forEach(s => {
    const ring = s.priority === 'critical' ? `<span class="m-ring"></span>` : '';
    html += `
      <div class="marker" style="left:${s.x}%; top:${s.y}%;" title="${escapeHtml(s.id)} · ${escapeHtml(s.title)}" onclick="ResQState.setSelected('${s.id}')">
        <span class="m-dot" style="background:var(--critical);">
          ${ring}
          <span style="position:relative;">!</span>
        </span>
      </div>
    `;
  });

  window.OTHER_MARKERS.forEach(m => {
    const isBlockedRoad = m.t.includes('Ullal Beach Road');
    const markerColor = isBlockedRoad && state.roadBlocked ? 'var(--critical)' : m.c;
    const markerTitle = isBlockedRoad && state.roadBlocked ? 'Ullal Beach Road · BLOCKED in scenario simulation' : m.t;
    html += `
      <div class="marker" style="left:${m.x}%; top:${m.y}%" title="${escapeHtml(markerTitle)}">
        <span class="m-dot" style="width:${m.l ? 22 : 12}px; height:${m.l ? 22 : 12}px; background:${markerColor};">
          ${m.l || ''}
        </span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderContextPanel() {
  const state = ResQState.get();
  const s = state.selected;
  const container = document.getElementById('ctxBody');
  if (!container) return;

  if (!s) {
    container.innerHTML = '<div class="sub">Select an incident from the queue to inspect operational context.</div>';
    return;
  }

  if (state.activeTab === 'trust') {
    const t = window.TrustEngine.formatTrustDetails(s);
    container.innerHTML = `
      <div class="ctx-head-row">
        <h4>${s.id} · Trust & Provenance</h4>
      </div>
      <div class="sub">${escapeHtml(s.title)}</div>

      <div class="ctx-actions">
        <button class="btn-secondary" onclick="openCryptoModal()">
          🔒 Inspect Ed25519 Packet
        </button>
        <button class="btn-secondary" onclick="openCapModal()">
          📋 Export CAP 1.2 Alert
        </button>
      </div>

      <div class="kv"><span>Relay Source</span><span>${escapeHtml(t.source)}</span></div>
      <div class="kv"><span>Reported Time</span><span>${escapeHtml(t.reported)}</span></div>
      <div class="kv"><span>Corroboration</span><span>${escapeHtml(t.corroboration)}</span></div>
      <div class="kv"><span>Cryptographic Signature</span><span style="color:var(--ok)">${escapeHtml(t.signature)}</span></div>

      <div style="margin-top:14px;">
        <div class="kv" style="border:none; padding-bottom:3px;">
          <span>Freshness (Temporal Decay)</span>
          <span class="mono">${t.freshness}%</span>
        </div>
        <div class="conf-bar">
          <div class="conf-fill" style="width:${t.freshness}%; background:var(--accent);"></div>
        </div>
      </div>

      <div style="margin-top:10px;">
        <div class="kv" style="border:none; padding-bottom:3px;">
          <span>Confidence Score (Weighted)</span>
          <span class="mono">${t.confidence}%</span>
        </div>
        <div class="conf-bar">
          <div class="conf-fill" style="width:${t.confidence}%; background:var(--info);"></div>
        </div>
      </div>

      ${t.hasConflict ? `
        <div style="margin-top:14px; background:var(--warn-bg); border:1px solid rgba(229,142,38,0.4); border-radius:10px; padding:11px; font-size:11.5px; color:#fdba74; line-height:1.45;">
          ${escapeHtml(t.conflictNote)}
        </div>
      ` : ''}
    `;
  } else if (state.activeTab === 'match') {
    const candidates = window.ResourceMatcher.getCandidates(s, state.roadBlocked);
    const rows = candidates.map(m => `
      <div class="match-row">
        <div class="chain mono">${escapeHtml(m.chain)}</div>
        <div class="name">${escapeHtml(m.name)}</div>
        <div class="eta" style="${m.rerouted ? 'color:var(--critical);' : ''}">${escapeHtml(m.eta)}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="ctx-head-row">
        <h4>Community Resource Mesh</h4>
        <button class="btn-secondary ${state.roadBlocked ? 'highlight' : ''}" onclick="ResQState.toggleRoadBlocked()">
          ${state.roadBlocked ? '⚠ Rerouted: Clear Road' : '⚡ Simulate Blocked Road'}
        </button>
      </div>
      <div class="sub">Suggested capability matches for ${s.id}. Road changes update the simulated route; availability and ETAs are mock data.</div>
      ${rows}
    `;
  } else if (state.activeTab === 'graph') {
    window.KnowledgeGraphRenderer.render(s, container, state.roadBlocked);
  }
}

function renderMeshDock() {
  const state = ResQState.get();
  const s = state.selected;
  if (!s) return;

  const r = state.relayOverride && state.relayOverride.id === s.id ? state.relayOverride : s;

  const packetEl = document.getElementById('mPacket');
  const hopsEl = document.getElementById('mHops');
  const ttlEl = document.getElementById('mTtl');
  const statusEl = document.getElementById('mStatus');

  if (packetEl) packetEl.textContent = r.packet;
  if (hopsEl) hopsEl.textContent = r.hops;
  if (ttlEl) ttlEl.textContent = r.ttl;
  if (statusEl) {
    statusEl.textContent = r.status;
    statusEl.style.color = ['Delivered', 'Delivered · demo', 'Saved locally', 'Synced'].includes(r.status)
      ? 'var(--ok)' : r.status === 'Resolved' ? 'var(--ink-dim)' : 'var(--warn)';
  }

  const activeNodes = r.activeNodes || (['Delivered', 'Delivered · demo', 'Saved locally', 'Synced'].includes(r.status) ? 5 : 3);
  document.querySelectorAll('#meshDock .flow-node').forEach((n, i) => {
    n.classList.toggle('active', i < activeNodes);
  });
}

function renderOverview() {
  const state = ResQState.get();
  const openCount = state.sosData.filter(s => s.priority !== 'resolved').length;

  const activeEl = document.querySelector('#overviewStrip .ov-cell b');
  const panelCountEl = document.querySelector('.sos-panel .panel-head .mono');

  if (activeEl) activeEl.textContent = openCount;
  if (panelCountEl) panelCountEl.textContent = `${openCount} open`;
}

function renderAll() {
  renderSosList();
  renderMap();
  renderContextPanel();
  renderMeshDock();
  renderOverview();
  refreshConnectivityStatus();
}

// ==================== APP INTERACTIONS ====================

function setRole(role) {
  const state = ResQState.get();
  const prev = state.currentRole;
  ResQState.setRole(role);

  document.getElementById('roleResponder').classList.toggle('on', role === 'responder');
  document.getElementById('roleCitizen').classList.toggle('on', role === 'citizen');
  document.getElementById('roleMesh').classList.toggle('on', role === 'mesh');

  document.getElementById('mainApp').style.display = role === 'responder' ? 'grid' : 'none';
  document.getElementById('meshDock').style.display = role === 'responder' ? 'flex' : 'none';
  document.getElementById('overviewStrip').style.display = role === 'responder' ? 'flex' : 'none';

  document.getElementById('citizenView').classList.toggle('on', role === 'citizen');
  document.getElementById('meshView').classList.toggle('on', role === 'mesh');

  if (role === 'mesh' && prev !== 'mesh') {
    window.MeshSimulator.start();
  }
  if (prev === 'mesh' && role !== 'mesh') {
    window.MeshSimulator.stop();
  }
}

function setFilter(filter) {
  ResQState.setFilter(filter);
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('on', b.dataset.f === filter));
  renderSosList();
}

function setTab(tab) {
  ResQState.setTab(tab);
  document.querySelectorAll('.ctx-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  renderContextPanel();
}

function toggleOutage() {
  const state = ResQState.get();
  setOutageState(!state.outage);
}

function refreshConnectivityStatus() {
  const state = ResQState.get();
  const offline = !navigator.onLine;
  const shellReady = Boolean(navigator.serviceWorker?.controller);
  const unavailable = offline || state.outage;
  const netPill = document.getElementById('netPill');
  const syncPill = document.getElementById('syncPill');
  const overviewStatus = document.getElementById('ovSync');
  if (netPill) {
    netPill.className = `pill ${unavailable ? 'warn' : 'ok'}`;
    netPill.querySelector('.txt').textContent = offline
      ? 'Offline · saving on device'
      : state.outage ? 'Simulated outage · local queue'
        : shellReady ? 'Online · offline-ready' : 'Online · preparing offline mode';
  }
  if (syncPill) syncPill.querySelector('.txt').textContent = 'SOS reports save on device';
  if (overviewStatus) overviewStatus.textContent = offline ? 'Offline' : 'Local queue';
}

function setOutageState(next) {
  const state = ResQState.get();
  const changed = state.outage !== next;
  if (changed) ResQState.setOutage(next);
  refreshConnectivityStatus();
  if (changed) window.MeshSimulator.appendLog(next
    ? 'Outage simulation started. Reports remain saved locally; peer relay is illustrative.'
    : 'Outage simulation ended. Local reports remain on this device.');
  renderAll();
}

function toggleSound() {
  const isEnabled = window.ResQAudio ? ResQAudio.toggle() : false;
  const btn = document.getElementById('soundToggleBtn');
  if (btn) {
    btn.classList.toggle('on', isEnabled);
    btn.querySelector('.txt').textContent = isEnabled ? 'Audio: On' : 'Audio: Muted';
  }
}

// ==================== MODALS ====================

function openModal(contentHtml) {
  const bg = document.getElementById('genericModalBg');
  const content = document.getElementById('genericModalContent');
  if (!bg || !content) return;
  content.innerHTML = contentHtml;
  bg.classList.add('on');
}

function closeModal() {
  const bg = document.getElementById('genericModalBg');
  if (bg) bg.classList.remove('on');
}

async function openCryptoModal() {
  const sel = ResQState.get().selected;
  if (!sel) return;
  openModal('<div class="sub">Creating and verifying an ephemeral Ed25519 demo signature…</div>');
  const content = await window.CryptoInspector.renderInspector(sel);
  if (ResQState.get().selected?.id === sel.id) openModal(content);
}

function openCapModal() {
  const sel = ResQState.get().selected;
  if (!sel) return;
  const xml = window.CapAlertEngine.generateCapXml(sel);
  const geojson = JSON.stringify(window.CapAlertEngine.generateGeoJson(sel), null, 2);

  const html = `
    <div class="modal-header">
      <h4>📋 OASIS CAP 1.2 & GeoJSON Interoperability</h4>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="font-size:12px; color:var(--ink-dim); margin-bottom:12px;">
      CAP 1.2 Test alert and GeoJSON for format inspection only. This private simulation is not sent to NDMA and must not trigger dispatch.
    </div>
    
    <div style="font-size:11px; font-weight:700; margin-bottom:4px; color:var(--ink);">OASIS CAP v1.2 XML:</div>
    <pre class="code-preview">${escapeHtml(xml)}</pre>
    
    <div style="font-size:11px; font-weight:700; margin:12px 0 4px; color:var(--ink);">GeoJSON Export:</div>
    <pre class="code-preview" style="max-height:140px;">${escapeHtml(geojson)}</pre>
    
    <div class="modal-actions">
      <button class="btn-secondary" onclick="downloadScenarioExport('cap')">Download CAP XML</button>
      <button class="btn-secondary" onclick="downloadScenarioExport('geojson')">Download GeoJSON</button>
      <button class="btn-primary" onclick="closeModal()">Close</button>
    </div>
  `;
  openModal(html);
}

function downloadScenarioExport(format) {
  const incident = ResQState.get().selected;
  if (!incident || !['cap', 'geojson'].includes(format)) return;
  const isCap = format === 'cap';
  const content = isCap
    ? window.CapAlertEngine.generateCapXml(incident)
    : JSON.stringify(window.CapAlertEngine.generateGeoJson(incident), null, 2);
  const blob = new Blob([content], { type: isCap ? 'application/xml' : 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${incident.id}.${isCap ? 'cap.xml' : 'geojson'}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==================== CITIZEN SUBMISSION ====================

async function submitCitizenSos() {
  const state = ResQState.get();
  const selectedType = document.querySelector('#typeChips button.on')?.textContent.toLowerCase() || 'other';
  const isMed = document.getElementById('medFlag')?.checked || selectedType === 'medical';
  const type = isMed ? 'medical' : (selectedType === 'trapped' || selectedType === 'flood') ? 'trapped' : 'other';
  const people = Math.max(1, Number(document.getElementById('peopleCount')?.value) || 1);
  const description = document.querySelector('#citizenView textarea')?.value.trim() || '';
  const title = description || `${selectedType.toUpperCase()} Emergency · ${people} Person(s)`;

  const id = `SOS-${state.nextSosNumber++}`;
  const packet = `0x${(0x8A10 + state.nextSosNumber * 73).toString(16).toUpperCase()}`;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newSos = {
    id,
    priority: type === 'medical' || type === 'trapped' ? 'critical' : 'high',
    title,
    loc: 'Ullal · Mangaluru coastal sector',
    time: `${time} · just now`,
    x: 24,
    y: 72,
    coordinates: [12.8152, 74.8584],
    hops: 0,
    ttl: 7,
    packet,
    status: 'Queued offline',
    people,
    type,
    ed25519: null,
    cap: {
      event: `${selectedType.toUpperCase()} Emergency`,
      urgency: 'Immediate',
      severity: 'Extreme',
      certainty: 'Observed',
      headline: title,
      areaDesc: 'Ullal coastal sector'
    },
    trust: {
      source: 'Citizen Smartphone (Offline BLE)',
      reported: `${time}`,
      corrob: 0,
      sig: 'Ed25519 Verified',
      fresh: 100,
      conf: 75,
      conflict: false
    }
  };

  newSos.createdAt = Date.now();
  newSos.ed25519 = await window.CryptoInspector.signIncident(newSos);
  newSos.trust.sig = newSos.ed25519.verified ? 'Ed25519 · Web Crypto verified' : 'Signature unavailable · unverified';
  let storageBackend = 'memory only';
  let storageFailed = false;
  try {
    storageBackend = await window.OfflineStore.saveIncident(newSos);
  } catch {
    storageFailed = true;
  }
  ResQState.addSos(newSos);
  if (ResQState.get().currentRole === 'citizen') setRole('responder');
  showAppToast(storageFailed
    ? `${newSos.id} is only in this open page; browser storage failed.`
    : `${newSos.id} saved on this device (${storageBackend}).`);

  if (window.ResQAudio) ResQAudio.playAlertBeep();

  // Show status stepper
  const cs = document.getElementById('citizenStatus');
  if (cs) {
    cs.classList.add('on');
    ['cs1', 'cs2', 'cs3', 'cs4'].forEach(cid => {
      const el = document.getElementById(cid);
      if (el) el.classList.remove('done');
    });

    const steps = ['cs1', 'cs2', 'cs3', 'cs4'];
    let i = 0;
    const interval = setInterval(() => {
      const stepEl = document.getElementById(steps[i]);
      if (stepEl) stepEl.classList.add('done');
      if (window.ResQAudio) ResQAudio.playPacketChirp();

      const hops = [0, 1, 3, 4][i];
      const status = i === 3 ? 'Saved locally' : ['Queued offline', 'Relaying · demo', 'Relaying · demo'][i];
      newSos.hops = hops;
      newSos.ttl = Math.max(0, 7 - hops);
      newSos.status = status;
      window.OfflineStore.saveIncident(newSos).catch(() => {});

      ResQState.setRelayOverride({
        id: newSos.id,
        packet: newSos.packet,
        status,
        hops,
        ttl: newSos.ttl,
        activeNodes: [1, 3, 4, 5][i]
      });

      renderAll();
      i++;
      if (i >= steps.length) clearInterval(interval);
    }, 900);
  }
  return newSos;
}

async function raiseDemoSos() {
  const button = document.querySelector('.btn-sos');
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    setRole('citizen');
    const incident = await submitCitizenSos();
    setRole('responder');
    if (incident) {
      showAppToast(`${incident.id} is in the Command Post queue.`);
      const label = button?.querySelector('.sos-label');
      if (label) {
        label.textContent = `${incident.id} ADDED`;
        setTimeout(() => { label.textContent = 'RAISE SOS'; }, 1800);
      }
    }
    return incident;
  } catch {
    setRole('responder');
    showAppToast('SOS could not be created. Please retry.');
  } finally {
    if (button) button.disabled = false;
  }
}

function shareLocation() {
  const b = document.getElementById('locBtn');
  const locStatus = document.getElementById('locStatus');
  if (b) b.classList.add('got');
  if (locStatus) locStatus.textContent = '12.8152°N, 74.8584°E · Ullal Coastal Zone ✓';
}

function pickChip(btn) {
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

// ==================== INITIALIZATION ====================

async function initializeResQMesh() {
  ResQState.subscribe((event, payload) => {
    renderAll();
  });

  document.getElementById('outageBtn')?.addEventListener('click', toggleOutage);
  document.getElementById('demoBtn')?.addEventListener('click', () => window.DemoController.start());
  document.getElementById('soundToggleBtn')?.addEventListener('click', toggleSound);

  window.addEventListener('online', refreshConnectivityStatus);
  window.addEventListener('offline', refreshConnectivityStatus);
  await restoreSavedIncidents();
  renderAll();

  Promise.all(ResQState.get().sosData.map(s => window.CryptoInspector.signIncident(s))).then(signatures => {
    ResQState.get().sosData.forEach((s, index) => {
      s.trust.sig = signatures[index].verified
        ? 'Ed25519 · Web Crypto verified (session key)'
        : 'Not verified · local signature unavailable';
    });
    renderAll();
  });

  // Freshness decay background ticker
  setInterval(() => {
    if (ResQState.get().currentRole === 'responder' && ResQState.get().activeTab === 'trust') {
      renderContextPanel();
    }
  }, 12000);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.addEventListener('controllerchange', refreshConnectivityStatus);
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .then(() => navigator.serviceWorker.ready.then(refreshConnectivityStatus))
      .catch(() => showAppToast('Offline app-shell cache is unavailable in this browser.'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initializeResQMesh().catch(error => showAppToast(`Startup issue: ${error.message}`));
});
