/**
 * ResQMesh — Web Crypto Ed25519 Packet Inspector
 * Session keys are ephemeral and are only suitable for demonstrating verification.
 */

const CryptoInspector = (() => {
  const encoder = new TextEncoder();
  let keyPairPromise;
  let inspectedPacket = null;

  function toHex(buffer) {
    return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function fromHex(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    return bytes;
  }

  function getKeyPair() {
    if (!keyPairPromise) keyPairPromise = crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    return keyPairPromise;
  }

  function getPayload(incident) {
    return JSON.stringify({
      version: '1.0',
      type: 'RESQMESH_SOS_BUNDLE',
      packet_id: incident.packet,
      incident_id: incident.id,
      timestamp: incident.time,
      priority: incident.priority,
      category: incident.type || 'other',
      title: incident.title,
      location: incident.loc,
      coordinates: incident.coordinates || [12.8152, 74.8584],
      affected_people: incident.people || 1
    }, null, 2);
  }

  async function signIncident(incident) {
    const payload = getPayload(incident);
    try {
      const pair = await getKeyPair();
      const [publicKey, signature] = await Promise.all([
        crypto.subtle.exportKey('raw', pair.publicKey),
        crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, encoder.encode(payload))
      ]);
      incident.ed25519 = {
        algorithm: 'Ed25519 / Web Crypto',
        pubkey: toHex(publicKey),
        signature: toHex(signature),
        payload,
        verified: await crypto.subtle.verify({ name: 'Ed25519' }, pair.publicKey, signature, encoder.encode(payload))
      };
    } catch (error) {
      incident.ed25519 = { algorithm: 'Unavailable', pubkey: '', signature: '', payload, verified: false, error: error.message };
    }
    return incident.ed25519;
  }

  async function verifyPayload(incident, payload) {
    const pair = await getKeyPair();
    const publicKey = await crypto.subtle.importKey('raw', fromHex(incident.ed25519.pubkey), { name: 'Ed25519' }, false, ['verify']);
    return crypto.subtle.verify({ name: 'Ed25519' }, publicKey, fromHex(incident.ed25519.signature), encoder.encode(payload));
  }

  async function renderInspector(incident) {
    const ed = await signIncident(incident);
    const valid = ed.verified && await verifyPayload(incident, ed.payload);
    inspectedPacket = { id: incident.id, incident, originalPayload: ed.payload, tampered: false };
    const payloadView = JSON.stringify(JSON.parse(ed.payload), null, 2);
    const signatureDisplay = ed.signature ? `${ed.signature.slice(0, 32)}…` : 'Unavailable in this browser';
    const stateLabel = valid ? '✓ ED25519 SIGNATURE VERIFIED' : '✗ NOT CRYPTOGRAPHICALLY VERIFIED';

    return `
      <div class="modal-header">
        <h4>Ed25519 Packet Inspector · ${escapeHtml(incident.id)}</h4>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div id="cryptoStatusBadge" class="crypto-badge ${valid ? 'crypto-valid' : 'crypto-invalid'}"><span>${stateLabel}</span></div>
      <div style="font-size:11.5px;color:var(--ink-dim);margin-bottom:10px;">Signed and verified locally with Web Crypto. The private key is ephemeral to this tab; this demo does not establish production identity.</div>
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;">Canonical packet payload:</div>
      <pre class="code-preview" id="cryptoPayloadPreview">${escapeHtml(payloadView)}</pre>
      <div class="kv" style="margin-top:10px;"><span>Ephemeral public key · Ed25519</span><span class="mono" style="color:var(--info);">${ed.pubkey ? `${ed.pubkey.slice(0, 30)}…` : 'Unavailable'}</span></div>
      <div class="kv"><span>Signature · 64-byte hex</span><span class="mono" style="color:#fdba74;">${signatureDisplay}</span></div>
      <div class="modal-actions">
        <button class="btn-secondary" id="tamperBtn" ${valid ? '' : 'disabled'} onclick="CryptoInspector.toggleTamper('${escapeHtml(incident.id)}')">Simulate Packet Tampering</button>
        <button class="btn-primary" onclick="closeModal()">Done</button>
      </div>
    `;
  }

  async function toggleTamper(incidentId) {
    if (!inspectedPacket || inspectedPacket.id !== incidentId) return;
    inspectedPacket.tampered = !inspectedPacket.tampered;
    let payload = inspectedPacket.originalPayload;
    if (inspectedPacket.tampered) {
      const bytes = encoder.encode(payload);
      const packetIdOffset = payload.indexOf(inspectedPacket.incident.id);
      bytes[packetIdOffset + inspectedPacket.incident.id.length - 1] ^= 1;
      payload = new TextDecoder().decode(bytes);
    }
    const valid = await verifyPayload(inspectedPacket.incident, payload);
    const badge = document.getElementById('cryptoStatusBadge');
    const preview = document.getElementById('cryptoPayloadPreview');
    const button = document.getElementById('tamperBtn');
    if (!badge || !preview || !button) return;
    badge.className = `crypto-badge ${valid ? 'crypto-valid' : 'crypto-invalid'}`;
    badge.innerHTML = `<span>${valid ? '✓ ED25519 SIGNATURE VERIFIED' : '✗ SIGNATURE INVALID · PAYLOAD ALTERED'}</span>`;
    preview.textContent = JSON.stringify(JSON.parse(payload), null, 2);
    button.textContent = inspectedPacket.tampered ? 'Restore Original Payload' : 'Simulate Packet Tampering';
    if (window.ResQAudio) valid ? ResQAudio.playPacketChirp() : ResQAudio.playAlertBeep();
  }

  return { signIncident, renderInspector, toggleTamper };
})();

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.CryptoInspector = CryptoInspector;
