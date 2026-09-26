/**
 * ResQMesh — Central Reactive State Management
 */
const ResQState = (function() {
  const sosData = JSON.parse(JSON.stringify(window.INITIAL_SOS_DATA));
  const scenarioClock = Date.now();
  sosData.forEach((s, index) => {
    s.createdAt = scenarioClock - index * 60000;
    s.ed25519 = null;
    if (window.seenFingerprints) {
      window.seenFingerprints.add(window.fingerprintFor(s));
    }
  });

  const state = {
    sosData,
    selected: sosData[0],
    activeFilter: 'all',
    activeTab: 'trust',
    currentRole: 'responder',
    outage: false,
    roadBlocked: false,
    relayOverride: null,
    nextSosNumber: 1047
  };

  const listeners = [];

  return {
    get() {
      return state;
    },
    subscribe(fn) {
      listeners.push(fn);
    },
    notify(event, payload) {
      listeners.forEach(fn => fn(event, payload, state));
    },
    setSelected(id) {
      const found = state.sosData.find(s => s.id === id);
      if (found) {
        state.selected = found;
        this.notify('selected_change', found);
      }
    },
    setFilter(filter) {
      state.activeFilter = filter;
      this.notify('filter_change', filter);
    },
    setTab(tab) {
      state.activeTab = tab;
      this.notify('tab_change', tab);
    },
    setRole(role) {
      const prev = state.currentRole;
      state.currentRole = role;
      this.notify('role_change', { current: role, previous: prev });
    },
    setOutage(isOutage) {
      state.outage = isOutage;
      this.notify('outage_change', isOutage);
    },
    toggleRoadBlocked() {
      state.roadBlocked = !state.roadBlocked;
      this.notify('road_status_change', state.roadBlocked);
      return state.roadBlocked;
    },
    setRelayOverride(override) {
      state.relayOverride = override;
      this.notify('relay_override_change', override);
    },
    addSos(sos) {
      state.sosData.unshift(sos);
      if (window.seenFingerprints) {
        window.seenFingerprints.add(window.fingerprintFor(sos));
      }
      state.selected = sos;
      this.notify('sos_added', sos);
    }
  };
})();

window.ResQState = ResQState;
