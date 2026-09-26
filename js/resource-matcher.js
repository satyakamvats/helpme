/**
 * ResQMesh — Community Resource Mesh & Dynamic Matching
 * Core Chain: Need -> Capability -> Location -> Availability -> Assignment
 * Applies deterministic demo rerouting rules; ETAs and assignments are simulated.
 */

const ResourceMatcher = {
  getCandidates(incident, isRoadBlocked = false) {
    const type = incident.type || 'other';
    const route = window.RoutePlanner?.forIncident(incident, isRoadBlocked) || null;
    const hospitalRoute = window.RoutePlanner?.forIncident({ ...incident, type: 'medical' }, isRoadBlocked) || null;
    const volunteerRoute = window.RoutePlanner?.forIncident({ ...incident, type: 'other' }, isRoadBlocked) || null;
    const routeLabel = plan => plan
      ? `DIJKSTRA · ${plan.mode.toUpperCase()} · ${plan.routeLabel} · ${plan.distanceKm.toFixed(1)} km`
      : 'SHORTEST PATH · unavailable in scenario graph';
    const simulatedEta = plan => {
      if (!plan) return 'ETA unavailable · no scenario route';
      const averageSpeedKmh = plan.mode === 'water' ? 16 : 32;
      const minutes = Math.max(3, Math.ceil(plan.distanceKm / averageSpeedKmh * 60) + 4);
      return `ETA ${minutes} min · simulated ${plan.mode} route`;
    };

    if (type === 'medical') {
      return [
        {
          chain: `NEED: MEDICAL → CAP: ADVANCED LIFE SUPPORT → ${routeLabel(route)}`,
          name: 'Ambulance 04 (Wenlock Fleet)',
          eta: simulatedEta(route),
          status: 'Suggested · simulated',
          rerouted: isRoadBlocked,
          route
        },
        {
          chain: `NEED: SURGICAL CARE → CAP: EMERGENCY WARD → ${routeLabel(hospitalRoute)}`,
          name: 'Wenlock District Hospital (Trauma Ward)',
          eta: `${simulatedEta(hospitalRoute)} · capacity unverified`,
          status: 'Candidate · capacity mocked',
          rerouted: isRoadBlocked,
          route
        }
      ];
    }

    if (type === 'trapped') {
      return [
        {
          chain: `NEED: HIGH-WATER EXTRACTION → ${routeLabel(route)}`,
          name: isRoadBlocked ? 'NDRF Boat Unit 02 (Reassigned)' : 'NDRF Field Vehicle · Surathkal',
          eta: simulatedEta(route),
          status: 'Suggested · simulated',
          rerouted: isRoadBlocked,
          route
        },
        {
          chain: `NEED: CASUALTY STABILIZATION → CAP: AMBULANCE TRIAGE → ${routeLabel(hospitalRoute)}`,
          name: 'Wenlock Hospital + Ambulance 04',
          eta: `${simulatedEta(hospitalRoute)} · capacity mocked`,
          status: 'Candidate · simulated',
          rerouted: isRoadBlocked,
          route: hospitalRoute
        },
        {
          chain: `NEED: LOCAL RELIEF → CAP: COMMUNITY ASSET MATCH → ${routeLabel(volunteerRoute)}`,
          name: 'Volunteer Bike · Relay Team',
          eta: simulatedEta(volunteerRoute),
          status: 'Candidate · simulated',
          rerouted: isRoadBlocked,
          route: volunteerRoute
        }
      ];
    }

    return [
      {
        chain: `NEED: GENERAL RELIEF / SHELTER → CAP: COMMUNITY VOLUNTEER → ${routeLabel(route)}`,
        name: 'Community Response Unit · Ullal Ward',
        eta: simulatedEta(route),
        status: 'Candidate · simulated',
        rerouted: isRoadBlocked,
        route
      },
      {
        chain: `NEED: EMERGENCY POWER → CAP: 5kVA GENERATOR → ${routeLabel(route)}`,
        name: 'Surathkal Shelter Reserve',
        eta: simulatedEta(route),
        status: 'Candidate · simulated',
        rerouted: false,
        route
      }
    ];
  }
};

window.ResourceMatcher = ResourceMatcher;
