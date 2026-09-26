/**
 * ResQMesh — Guided Hackathon Demo Controller
 * Implements the 5-step prototype evaluation scenario described in the abstract.
 */

const DemoController = (function() {
  const demoSteps = [
    {
      tab: 'trust',
      status: 'Queued offline',
      hops: 0,
      nodes: 1,
      title: 'Step 1 · Flood Outage & Disconnected SOS',
      copy: 'Cellular and grid power fail across Ullal coastal ward. A citizen signs an SOS packet locally on their smartphone with an Ed25519 signature.'
    },
    {
      tab: 'trust',
      status: 'Relaying',
      hops: 2,
      nodes: 3,
      title: 'Step 2 · Multi-Hop BLE / Wi-Fi Peer Relay',
      copy: 'Packet hops without internet: Citizen Phone → Neha (BLE) → Volunteer Bike. Duplicate packets are suppressed using space-efficient Bloom filters.'
    },
    {
      tab: 'graph',
      status: 'Relaying',
      hops: 3,
      nodes: 3,
      title: 'Step 3 · Distributed Knowledge Graph Assembly',
      copy: 'As packets arrive, each node updates its local knowledge graph linking victims, needs, physical roads, and nearby responders.'
    },
    {
      tab: 'match',
      status: 'Responder assigned',
      hops: 4,
      nodes: 4,
      title: 'Step 4 · Community Resource Mesh Matching',
      copy: 'Automated chain matching: Need (Medical/Trapped) → Capability (ALS Ambulance / Boat) → Location → Availability → Real-time assignment.'
    },
    {
      tab: 'match',
      status: 'Delivered · demo',
      hops: 5,
      nodes: 5,
      title: 'Step 5 · Reconnection, Rerouting & CAP 1.2 Sync',
      copy: 'The demo restores the uplink, syncs the incident view to Collector HQ, and generates a private CAP 1.2 Test alert for export. No real dispatch occurs.'
    }
  ];

  let demoStep = -1;
  let demoTimer = null;
  let demoPaused = false;

  function schedule() {
    clearTimeout(demoTimer);
    if (!demoPaused && demoStep >= 0 && demoStep < demoSteps.length - 1) {
      demoTimer = setTimeout(advance, 6000);
    }
  }

  function applyStep(index) {
    demoStep = index;
    const step = demoSteps[index];

    if (index === 1) {
      ResQState.setSelected('SOS-1042');
      setRole('mesh');
    } else if (ResQState.get().currentRole !== 'responder') {
      setRole('responder');
    }

    if (index === 0) setOutageState(true);
    if (index === demoSteps.length - 1) setOutageState(false);

    ResQState.setSelected('SOS-1042');
    ResQState.setFilter('all');
    ResQState.setTab(step.tab);

    const sel = ResQState.get().selected;
    if (sel) {
      sel.hops = step.hops;
      sel.ttl = Math.max(0, 7 - step.hops);
      sel.status = step.status;
      ResQState.setRelayOverride({
        id: sel.id,
        packet: sel.packet,
        status: step.status,
        hops: step.hops,
        ttl: Math.max(0, 7 - step.hops),
        activeNodes: step.nodes
      });
    }

    // Update banner UI
    const countEl = document.getElementById('demoCount');
    const copyEl = document.getElementById('demoCopy');
    const demoBtn = document.getElementById('demoBtn');
    const pauseBtn = document.getElementById('demoPause');
    const nextBtn = document.querySelector('#demoGuide .primary');

    if (countEl) countEl.textContent = `DEMO STEP ${index + 1} / ${demoSteps.length}`;
    if (copyEl) copyEl.innerHTML = `<b>${step.title}</b> ${step.copy}`;
    if (demoBtn) demoBtn.querySelector('.txt').textContent = index === demoSteps.length - 1 ? 'Replay Demo' : 'Demo Running';
    if (pauseBtn) pauseBtn.textContent = index === demoSteps.length - 1 ? 'Replay' : demoPaused ? 'Play' : 'Pause';
    if (nextBtn) nextBtn.disabled = index === demoSteps.length - 1;

    if (window.ResQAudio) ResQAudio.playPacketChirp();
    ResQState.notify('render_all');
    schedule();
  }

  function start() {
    clearTimeout(demoTimer);
    if (ResQState.get().roadBlocked) ResQState.toggleRoadBlocked();
    ResQState.setRelayOverride(null);
    setRole('responder');
    demoPaused = false;
    const guideEl = document.getElementById('demoGuide');
    const demoBtn = document.getElementById('demoBtn');
    if (guideEl) guideEl.classList.add('on');
    if (demoBtn) demoBtn.querySelector('.txt').textContent = 'Demo Running';
    applyStep(0);
  }

  function advance() {
    if (demoStep < 0) return;
    if (demoStep === demoSteps.length - 1) {
      start();
      return;
    }
    demoPaused = false;
    applyStep(demoStep + 1);
  }

  function togglePause() {
    if (demoStep === demoSteps.length - 1) {
      start();
      return;
    }
    demoPaused = !demoPaused;
    const pauseBtn = document.getElementById('demoPause');
    if (pauseBtn) pauseBtn.textContent = demoPaused ? 'Play' : 'Pause';
    schedule();
  }

  function stop() {
    clearTimeout(demoTimer);
    demoTimer = null;
    demoStep = -1;
    demoPaused = false;
    ResQState.setRelayOverride(null);
    const guideEl = document.getElementById('demoGuide');
    const demoBtn = document.getElementById('demoBtn');
    if (guideEl) guideEl.classList.remove('on');
    if (demoBtn) demoBtn.querySelector('.txt').textContent = 'Run Demo';
    setOutageState(false);
    ResQState.notify('render_all');
  }

  return {
    start,
    advance,
    togglePause,
    stop
  };
})();

window.DemoController = DemoController;
