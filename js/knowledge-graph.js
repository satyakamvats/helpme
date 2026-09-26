/**
 * ResQMesh — Distributed Disaster Knowledge Graph
 * Visualizes relational graph between Person, Needs, Resources, Roads, and Responders.
 * Automatically adapts when road conditions change or different incidents are selected.
 */

const KnowledgeGraphRenderer = {
  render(incident, containerElement, isRoadBlocked = false) {
    if (!incident || !containerElement) return;

    const resources = window.ResourceMatcher
      ? window.ResourceMatcher.getCandidates(incident, isRoadBlocked)
      : [];
    const route = resources[0]?.route;
    const resourceName = resources.length ? resources[0].name.split('(')[0].trim() : 'NDRF Unit';
    const area = (incident.loc || 'Mangaluru').split('·')[0].trim();
    const roadCondition = route ? `${route.mode.toUpperCase()} · ${route.distanceKm.toFixed(1)} km` : 'NO PATH';
    const roadColor = isRoadBlocked ? '#FF2B3E' : '#20BF6B';

    const entities = [
      { id: 'sos', x: 130, y: 38, label: 'SOS', detail: incident.id, color: '#FF2B3E' },
      { id: 'person', x: 50, y: 110, label: 'Person', detail: `${incident.people || 1} trapped`, color: '#E58E26' },
      { id: 'relay', x: 210, y: 110, label: 'Relay', detail: incident.trust.source.split('·')[0], color: '#0FB9B1' },
      { id: 'resource', x: 50, y: 195, label: 'Resource', detail: resourceName, color: '#20BF6B' },
      { id: 'road', x: 130, y: 195, label: 'Corridor', detail: roadCondition, color: roadColor },
      { id: 'area', x: 210, y: 195, label: 'Area', detail: area, color: '#8854D0' }
    ];

    const edges = [
      { x1: 130, y1: 52, x2: 60, y2: 95, label: 'REQUIRES', x: 80, y: 72 },
      { x1: 130, y1: 52, x2: 200, y2: 95, label: 'RELAYED VIA', x: 155, y: 72 },
      { x1: 55, y1: 125, x2: 55, y2: 180, label: 'ASSIGNED', x: 58, y: 152 },
      { x1: 55, y1: 195, x2: 115, y2: 195, label: 'ROUTES VIA', x: 85, y: 190 },
      { x1: 210, y1: 125, x2: 210, y2: 180, label: 'LOCATED AT', x: 214, y: 152 }
    ];

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    containerElement.innerHTML = `
      <div class="ctx-head-row">
        <h4>Knowledge Graph</h4>
        <button class="btn-secondary ${isRoadBlocked ? 'highlight' : ''}" onclick="ResQState.toggleRoadBlocked()">
          ${isRoadBlocked ? '⚠ Rerouted: Clear Road' : '⚡ Simulate Blocked Road'}
        </button>
      </div>
      <div class="sub">Incident, response resource, and the current shortest route for ${incident.id}.</div>
      
      <svg class="graph-svg" viewBox="0 0 260 235" role="img" aria-label="Distributed knowledge graph">
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF2B3E" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#20BF6B" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        
        <!-- Edges -->
        <g class="graph-edge" stroke="#384358" stroke-width="1.2">
          ${edges.map(e => `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}"/>`).join('')}
        </g>
        
        <!-- Edge Labels -->
        <g font-family="JetBrains Mono" font-size="6" fill="#8E9CB2" font-weight="600">
          ${edges.map(e => `<text x="${e.x}" y="${e.y}" text-anchor="middle">${e.label}</text>`).join('')}
        </g>
        
        <!-- Nodes -->
        <g class="graph-nodes" font-family="Manrope" font-size="8.5" font-weight="800">
          ${entities.map(n => `
            <g>
              <circle cx="${n.x}" cy="${n.y}" r="16" fill="#131826" stroke="${n.color}" stroke-width="2"/>
              <text x="${n.x}" y="${n.y + 3}" fill="${n.color}" text-anchor="middle">${n.label}</text>
            </g>
          `).join('')}
        </g>
        
        <!-- Sub-labels -->
        <g font-family="JetBrains Mono" font-size="7.5" fill="#9CA6B8" text-anchor="middle">
          ${entities.map(n => `
            <text x="${n.x}" y="${n.y + 27}">
              ${escapeHtml(n.detail.length > 18 ? n.detail.slice(0, 16) + '…' : n.detail)}
            </text>
          `).join('')}
        </g>
      </svg>
      
      <div class="graph-route-summary ${isRoadBlocked ? 'rerouted' : ''}">
        <b>${isRoadBlocked ? 'REROUTED' : 'SHORTEST ROUTE'} · ${route ? route.mode.toUpperCase() : 'NO PATH'}</b>
        <span>${escapeHtml(route ? route.routeLabel : 'No route found')}</span>
        <span>${route ? `${route.distanceKm.toFixed(1)} km · scenario estimate` : 'Check the scenario network'}</span>
      </div>
    `;
  }
};

window.KnowledgeGraphRenderer = KnowledgeGraphRenderer;
