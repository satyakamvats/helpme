/**
 * ResQMesh Tactical Audio Synthesizer (Web Audio API)
 * Zero external audio assets required; operates 100% offline.
 */
const ResQAudio = (function() {
  let audioCtx = null;
  let enabled = false;

  function initCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  return {
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    setEnabled(val) {
      enabled = !!val;
    },

    // High-tech subtle chirp when a mesh packet hops
    playPacketChirp() {
      if (!enabled) return;
      try {
        initCtx();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08); // A6
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (e) {
        // audio might be blocked before user gesture
      }
    },

    // Tactical double-beep for critical alert creation
    playAlertBeep() {
      if (!enabled) return;
      try {
        initCtx();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        [0, 0.12].forEach(offset => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(659.25, now + offset); // E5
          gain.gain.setValueAtTime(0.12, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.07);
        });
      } catch (e) {}
    },

    // Harmonic chime when queued incidents sync to headquarters
    playSyncChime() {
      if (!enabled) return;
      try {
        initCtx();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.1, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.25);
        });
      } catch (e) {}
    }
  };
})();

window.ResQAudio = ResQAudio;
