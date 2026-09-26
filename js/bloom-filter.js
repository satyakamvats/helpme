/**
 * ResQMesh — Delay-Tolerant Networking Bloom Filter
 * Implements space-efficient probabilistic duplicate packet detection
 * as described in Delay-Tolerant Networking Architecture (RFC 4838).
 */
class DemoBloomFilter {
  constructor(size = 512, hashCount = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  indices(value) {
    let first = 2166136261;
    let second = 0x9e3779b9;
    for (const char of value) {
      const code = char.charCodeAt(0);
      first = Math.imul(first ^ code, 16777619) >>> 0;
      second = Math.imul(second ^ code, 0x5bd1e995) >>> 0;
    }
    return Array.from({ length: this.hashCount }, (_, i) => (first + i * second + i * i) % this.size);
  }

  add(value) {
    for (const index of this.indices(value)) {
      this.bits[index >> 3] |= (1 << (index & 7));
    }
  }

  mightContain(value) {
    return this.indices(value).every(index => (this.bits[index >> 3] & (1 << (index & 7))) !== 0);
  }

  reset() {
    this.bits.fill(0);
  }
}

// Global filter instance for packet deduplication
window.seenFingerprints = new DemoBloomFilter();
