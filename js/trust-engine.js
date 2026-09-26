/**
 * ResQMesh — Provenance & Trust Engine
 * Tracks source authenticity, cryptographic verification, age decay,
 * multi-node corroboration, and resolves conflicting reports through weighting.
 */

const TrustEngine = {
  calculateFreshness(createdAt, initialFreshness = 95) {
    const ageMinutes = (Date.now() - (createdAt || Date.now())) / 60000;
    return Math.max(5, Math.round(initialFreshness - ageMinutes * 4.5));
  },

  calculateConfidence(incident) {
    const t = incident.trust;
    const ageMinutes = (Date.now() - (incident.createdAt || Date.now())) / 60000;
    
    // Base weight from source tier
    let sourceWeight = 70;
    if (t.source.includes('NDRF') || t.source.includes('HQ')) sourceWeight = 95;
    else if (t.source.includes('Volunteer') || t.source.includes('Relay')) sourceWeight = 80;
    else if (t.source.includes('BLE')) sourceWeight = 75;

    // Corroboration boost (+6% per peer node)
    const corroborationBoost = Math.min(25, (t.corrob || 0) * 6);

    // Conflict penalty if conflicting observation exists
    const conflictPenalty = t.conflict ? 15 : 0;

    // Decay over time
    const decay = ageMinutes * 1.8;

    const score = Math.round(sourceWeight + corroborationBoost - conflictPenalty - decay);
    return Math.max(10, Math.min(99, score));
  },

  formatTrustDetails(incident) {
    const t = incident.trust;
    const freshness = this.calculateFreshness(incident.createdAt, t.fresh);
    const confidence = this.calculateConfidence(incident);

    return {
      source: t.source,
      reported: t.reported,
      corroboration: `${t.corrob} peer node${t.corrob !== 1 ? 's' : ''}`,
      signature: incident.ed25519 && incident.ed25519.verified
        ? 'Ed25519 · Web Crypto verified (session key)'
        : 'Not verified · local signature unavailable',
      freshness,
      confidence,
      hasConflict: !!t.conflict,
      conflictNote: t.conflict
        ? 'Conflict Detected: Newer report claims road partially passable. Trust Engine weights NDRF & multiple BLE relays higher than single unverified beacon.'
        : null
    };
  }
};

window.TrustEngine = TrustEngine;
