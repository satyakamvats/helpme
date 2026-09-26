/* Deterministic Dijkstra planner for the approximate Mangaluru demo road/water graph. */
const RoutePlanner = (() => {
  const nodes = {
    ullal: { label: 'Ullal SOS', coordinates: [12.8152, 74.8584] },
    beach: { label: 'Ullal Beach Road', coordinates: [12.823, 74.855] },
    nh66: { label: 'NH-66 feeder', coordinates: [12.84, 74.852] },
    hub: { label: 'Mangaluru hub', coordinates: [12.854, 74.846] },
    wenlock: { label: 'Wenlock Hospital', coordinates: [12.87, 74.843] },
    collector: { label: 'Collector HQ', coordinates: [12.876, 74.845] },
    surathkal: { label: 'Surathkal NDRF base', coordinates: [13.006, 74.792] },
    riverbank: { label: 'Nethravathi river approach', coordinates: [12.823, 74.864] },
    boat: { label: 'Ullal boat landing', coordinates: [12.831, 74.868] }
  };

  const edges = [
    { from: 'ullal', to: 'beach', mode: 'road', name: 'Ullal Beach Road', blockedBy: 'roadBlocked', factor: 1.25 },
    { from: 'beach', to: 'hub', mode: 'road', name: 'Coastal connector', factor: 1.3 },
    { from: 'ullal', to: 'nh66', mode: 'road', name: 'Ullal NH-66 feeder', factor: 1.4 },
    { from: 'nh66', to: 'hub', mode: 'road', name: 'NH-66', factor: 1.25 },
    { from: 'hub', to: 'wenlock', mode: 'road', name: 'Wenlock access road', factor: 1.2 },
    { from: 'hub', to: 'collector', mode: 'road', name: 'Collector approach', factor: 1.2 },
    { from: 'collector', to: 'surathkal', mode: 'road', name: 'NH-66 north', factor: 1.25 },
    { from: 'ullal', to: 'riverbank', mode: 'water', name: 'Nethravathi River', factor: 1.35 },
    { from: 'riverbank', to: 'boat', mode: 'water', name: 'Ullal boat landing', factor: 1.25 }
  ];

  function distanceKm(first, second) {
    const radians = value => value * Math.PI / 180;
    const latDelta = radians(second[0] - first[0]);
    const lonDelta = radians(second[1] - first[1]);
    const firstLat = radians(first[0]);
    const secondLat = radians(second[0]);
    const haversine = Math.sin(latDelta / 2) ** 2
      + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lonDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  function shortestPath(origin, destinationId, { mode = 'road', roadBlocked = false } = {}) {
    if (!nodes[destinationId] || !Array.isArray(origin) || origin.length !== 2) return null;
    const usableEdges = edges.filter(edge => edge.mode === mode && !(roadBlocked && edge.blockedBy === 'roadBlocked'));
    const reachableIds = new Set(usableEdges.flatMap(edge => [edge.from, edge.to]));
    if (!reachableIds.has(destinationId)) return null;

    const accessNodes = [...reachableIds]
      .sort((first, second) => distanceKm(origin, nodes[first].coordinates) - distanceKm(origin, nodes[second].coordinates))
      .slice(0, 1);
    const distances = new Map([...reachableIds].map(id => [id, Infinity]));
    const previous = new Map();
    const unvisited = new Set(reachableIds);

    accessNodes.forEach(id => { distances.set(id, distanceKm(origin, nodes[id].coordinates) * 1.2); });

    while (unvisited.size) {
      let current = null;
      let currentDistance = Infinity;
      for (const id of unvisited) {
        if (distances.get(id) < currentDistance) {
          current = id;
          currentDistance = distances.get(id);
        }
      }
      if (current === null || current === destinationId) break;
      unvisited.delete(current);

      for (const edge of usableEdges) {
        const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
        if (!next || !unvisited.has(next)) continue;
        const edgeDistance = distanceKm(nodes[current].coordinates, nodes[next].coordinates) * edge.factor;
        const alternative = currentDistance + edgeDistance;
        if (alternative < distances.get(next)) {
          distances.set(next, alternative);
          previous.set(next, { from: current, edge });
        }
      }
    }

    if (!Number.isFinite(distances.get(destinationId))) return null;
    const nodeIds = [];
    const pathEdges = [];
    let current = destinationId;
    while (current) {
      nodeIds.unshift(current);
      const link = previous.get(current);
      if (!link) break;
      pathEdges.unshift(link.edge);
      current = link.from;
    }

    const pathNodes = nodeIds.map(id => ({ id, ...nodes[id] }));
    const coordinates = [origin, ...pathNodes.map(node => node.coordinates)]
      .filter((coordinate, index, path) => index === 0 || distanceKm(path[index - 1], coordinate) > 0.005);
    const routeNames = pathEdges.map(edge => edge.name);
    if (distanceKm(origin, nodes[nodeIds[0]].coordinates) > 0.02) routeNames.unshift('Local access');

    return {
      mode,
      nodeIds,
      nodes: pathNodes,
      edges: pathEdges,
      coordinates,
      routeNames,
      routeLabel: routeNames.join(' → '),
      distanceKm: distances.get(destinationId)
    };
  }

  function forIncident(incident, roadBlocked = false) {
    const trapped = incident.type === 'trapped';
    const mode = trapped && roadBlocked ? 'water' : 'road';
    const destinationId = mode === 'water'
      ? 'boat'
      : incident.type === 'medical' ? 'wenlock' : trapped ? 'surathkal' : 'collector';
    const route = shortestPath(incident.coordinates || [12.8152, 74.8584], destinationId, { mode, roadBlocked });
    return route ? { ...route, destinationId, rerouted: roadBlocked } : null;
  }

  return { shortestPath, forIncident, nodes };
})();

window.RoutePlanner = RoutePlanner;
