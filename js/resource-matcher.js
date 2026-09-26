/**
 * ResQMesh — Community Resource Mesh & Dynamic Matching
 * Core Chain: Need -> Capability -> Location -> Availability -> Assignment
 * Applies deterministic demo rerouting rules; ETAs and assignments are simulated.
 */

const ResourceMatcher = {
  getCandidates(incident, isRoadBlocked = false) {
    const type = incident.type || 'other';

    if (type === 'medical') {
      return [
        {
          chain: 'NEED: MEDICAL → CAP: ADVANCED LIFE SUPPORT → 1.8km → SUGGESTED',
          name: 'Ambulance 04 (Wenlock Fleet)',
          eta: isRoadBlocked ? 'ETA 15 min · simulated detour via NH-66' : 'ETA 6 min · simulated direct route',
          status: 'Suggested · simulated',
          rerouted: isRoadBlocked
        },
        {
          chain: 'NEED: SURGICAL CARE → CAP: EMERGENCY WARD → 3.2km → CANDIDATE',
          name: 'Wenlock District Hospital (Trauma Ward)',
          eta: isRoadBlocked ? 'ETA 21 min · simulated detour' : 'ETA 11 min · simulated, capacity unverified',
          status: 'Candidate · capacity mocked',
          rerouted: isRoadBlocked
        }
      ];
    }

    if (type === 'trapped') {
      return [
        {
          chain: 'NEED: HIGH-WATER EXTRACTION → CAP: INFLATABLE BOAT + CREW',
          name: isRoadBlocked ? 'NDRF Boat Unit 02 (Reassigned)' : 'NDRF Field Vehicle · Surathkal',
          eta: isRoadBlocked ? 'ETA 8 min · simulated water route' : 'ETA 6 min · simulated ground route',
          status: 'Suggested · simulated',
          rerouted: isRoadBlocked
        },
        {
          chain: 'NEED: CASUALTY STABILIZATION → CAP: AMBULANCE TRIAGE',
          name: 'Wenlock Hospital + Ambulance 04',
          eta: isRoadBlocked ? 'ETA 16 min · simulated' : 'ETA 11 min · simulated',
          status: 'Candidate · simulated',
          rerouted: isRoadBlocked
        },
        {
          chain: 'NEED: LOCAL RELIEF → CAP: COMMUNITY ASSET MATCH',
          name: 'Volunteer Bike · Relay Team',
          eta: isRoadBlocked ? 'ETA 10 min · simulated alley route' : 'ETA 14 min · simulated',
          status: 'Candidate · simulated',
          rerouted: isRoadBlocked
        }
      ];
    }

    return [
      {
        chain: 'NEED: GENERAL RELIEF / SHELTER → CAP: COMMUNITY VOLUNTEER',
        name: 'Community Response Unit · Ullal Ward',
        eta: isRoadBlocked ? 'ETA 14 min · simulated' : 'ETA 9 min · simulated',
        status: 'Candidate · simulated',
        rerouted: isRoadBlocked
      },
      {
        chain: 'NEED: EMERGENCY POWER → CAP: 5kVA GENERATOR',
        name: 'Surathkal Shelter Reserve',
        eta: 'ETA 22 min · simulated',
        status: 'Candidate · simulated',
        rerouted: false
      }
    ];
  }
};

window.ResourceMatcher = ResourceMatcher;
