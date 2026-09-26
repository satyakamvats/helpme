/**
 * ResQMesh — Relay Offline Scenario Assistant & Gemini 2.5 Flash Connector
 */

const RelayAssistant = (function() {
  let geminiApiKey = '';

  function addMsg(text, who) {
    const container = document.getElementById('assistMsgs');
    if (!container) return null;
    const msg = document.createElement('div');
    msg.className = `msg ${who}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  function getLocalResponse(query) {
    const q = query.toLowerCase();
    const state = ResQState.get();
    const sel = state.selected;

    if (q.includes('shelter')) {
      return 'Scenario estimate: Ullal Community Relief Camp (84% capacity, 1.6km). Alternate: Surathkal Coastal Higher Primary School (32% capacity, 5.4km). Capacity and distances are simulated.';
    }
    if (q.includes('hospital') || q.includes('bed')) {
      return 'Wenlock District Hospital is the real facility reference. Bed counts, availability, and Ambulance 04 linkage are simulated, not live hospital data.';
    }
    if (q.includes('road') || q.includes('block') || q.includes('nh-66')) {
      return state.roadBlocked
        ? 'SIMULATED ALERT: Ullal Beach Road is marked blocked by Nethravathi overflow. The demo reroutes ground response to NDRF Boat Unit 02.'
        : 'SIMULATED ROAD STATUS: NH-66 is open in the scenario; Ullal coastal road has minor waterlogging and is passable to volunteer bikes.';
    }
    if (q.includes('sos') || q.includes('status') || q.includes('hop')) {
      const relay = state.relayOverride && state.relayOverride.id === sel.id ? state.relayOverride : sel;
      return `${sel.id} ("${sel.title}") is currently marked "${relay.status}". Relayed through ${relay.hops} hops via ${sel.trust.source}. TTL remaining: ${relay.ttl}.`;
    }
    if (q.includes('medical') || q.includes('help')) {
      return 'Scenario workflow: select an incident and open Resource Match. The simulated matcher can suggest an ambulance and Wenlock trauma care; nothing is actually reserved or notified.';
    }
    if (q.includes('resource') || q.includes('ambulance') || q.includes('boat')) {
      return 'Simulated resources: Ambulance 04 (ALS, 1.8km), NDRF Flood Boat 02 (Surathkal), Wenlock trauma care, and volunteer bike relays.';
    }
    return 'Relay Assistant: I can summarize the simulated incident queue, hospital and shelter estimates, road scenario, resource matching, or packet verification.';
  }

  async function getGeminiResponse(question) {
    const state = ResQState.get();
    const incidents = state.sosData
      .filter(s => s.priority !== 'resolved')
      .map(s => `${s.id}: ${s.title}; Loc: ${s.loc}; Priority: ${s.priority}; Status: ${s.status}; Hops: ${s.hops}`)
      .join('\n');

    const prompt = `You are Relay, the assistant for a disaster-response prototype demonstration.
  Context: a simulated Mangaluru flood scenario using real place-name references (Ullal, Kadri Hills, NH-66, Wenlock Hospital, Surathkal, Collector HQ).
  All incident details, road status, facility capacity, available responders, and travel times are mock data. Never describe them as live or verified, and never imply you dispatched or reserved resources. State that the scenario is simulated.
  Road Blocked State (simulated): ${state.roadBlocked ? 'Yes, Ullal Beach Road is marked blocked' : 'No road block is active in the scenario'}.
Active Incidents:
${incidents}

User Question: ${question}
Answer concisely, operationally, and realistically for disaster command authorities.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed');
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No answer returned from Gemini.';
  }

  return {
    toggle() {
      const panel = document.getElementById('assistPanel');
      if (panel) panel.classList.toggle('on');
    },
    close() {
      const panel = document.getElementById('assistPanel');
      if (panel) panel.classList.remove('on');
    },
    setApiKey(key) {
      geminiApiKey = key.trim();
      const inputEl = document.getElementById('geminiKey');
      if (inputEl) inputEl.value = '';
      const statusEl = document.getElementById('geminiStatus');
      if (statusEl) {
        statusEl.textContent = geminiApiKey
          ? 'Key held in memory for this tab. Gemini is tested on the next question; demo use only.'
          : 'Local answers active without API key.';
      }
    },
    clearApiKey() {
      geminiApiKey = '';
      const inputEl = document.getElementById('geminiKey');
      if (inputEl) inputEl.value = '';
      const statusEl = document.getElementById('geminiStatus');
      if (statusEl) statusEl.textContent = 'API key cleared. Local offline knowledge base active.';
    },
    async ask(query) {
      if (!query || !query.trim()) return;
      addMsg(query, 'user');

      const botMsg = addMsg(geminiApiKey ? 'Consulting Gemini 2.5 Flash…' : 'Querying local disaster graph…', 'bot');
      try {
        if (geminiApiKey) {
          botMsg.textContent = await getGeminiResponse(query);
        } else {
          botMsg.textContent = getLocalResponse(query);
        }
      } catch (err) {
        botMsg.textContent = `Offline Fallback: ${getLocalResponse(query)}`;
      }
    }
  };
})();

window.RelayAssistant = RelayAssistant;
