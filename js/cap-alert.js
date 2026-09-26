/**
 * ResQMesh — OASIS Common Alerting Protocol (CAP) v1.2 & GeoJSON Interoperability
 * Generates standards-compliant XML alerts and GeoJSON structures for NDMA India
 * and state emergency operations centers.
 */

const CapAlertEngine = {
  generateCapXml(incident) {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const coordinates = incident.coordinates || [12.8152, 74.8584];
    const cap = incident.cap || {
      event: 'Disaster Emergency',
      urgency: 'Immediate',
      severity: 'Extreme',
      certainty: 'Observed',
      headline: incident.title,
      areaDesc: incident.loc
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>RESQMESH-ALERT-${incident.id}-${Date.now()}</identifier>
  <sender>resqmesh-demo@invalid.example</sender>
  <sent>${nowIso}</sent>
  <status>Test</status>
  <msgType>Alert</msgType>
  <scope>Private</scope>
  <code>ResQMesh-DTN-Protocol-v1.0</code>
  <info>
    <category>Safety</category>
    <event>${escapeXml(cap.event)}</event>
    <responseType>${escapeXml(cap.responseType || 'Monitor')}</responseType>
    <urgency>${cap.urgency}</urgency>
    <severity>${cap.severity}</severity>
    <certainty>${cap.certainty}</certainty>
    <effective>${nowIso}</effective>
    <onset>${nowIso}</onset>
    <expires>${expiresIso}</expires>
    <senderName>ResQMesh Demo Gateway</senderName>
    <headline>${escapeXml(cap.headline)}</headline>
    <description>SIMULATION ONLY. ${escapeXml(incident.title)} - ${incident.people || 1} person(s) affected. Not a real public warning or dispatch request.</description>
    <instruction>For demonstration and interoperability testing only. Do not dispatch responders based on this test alert.</instruction>
    <area>
      <areaDesc>${escapeXml(cap.areaDesc)}</areaDesc>
      <circle>${coordinates[0]},${coordinates[1]},1.5</circle>
    </area>
    <parameter>
      <valueName>ResQMesh-Packet-ID</valueName>
      <value>${escapeXml(incident.packet)}</value>
    </parameter>
    <parameter>
      <valueName>Ed25519-Verification</valueName>
      <value>${incident.ed25519 && incident.ed25519.verified ? 'verified' : 'not verified'}</value>
    </parameter>
  </info>
</alert>`;
  },

  generateGeoJson(incident) {
    const coordinates = incident.coordinates || [12.8152, 74.8584];
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [coordinates[1], coordinates[0]]
          },
          properties: {
            id: incident.id,
            title: incident.title,
            priority: incident.priority,
            status: incident.status,
            hops: incident.hops,
            source: incident.trust.source,
            ed25519_verified: Boolean(incident.ed25519 && incident.ed25519.verified),
            simulated: true,
            timestamp: new Date().toISOString()
          }
        }
      ]
    };
  }
};

function escapeXml(str) {
  return String(str || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]));
}

window.CapAlertEngine = CapAlertEngine;
