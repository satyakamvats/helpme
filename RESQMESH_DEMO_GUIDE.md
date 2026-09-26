# ResQMesh Judge Demo Guide

## Launch

Open `index.html` in a current Chromium-based browser. The application uses native browser modules only; there is no build step. The OpenStreetMap basemap needs an internet connection; if tiles or Leaflet fail to load, the labeled grid is retained as a fallback. A local HTTP server is a good fallback if browser restrictions block a feature. Gemini is optional; the local scenario assistant works without it.

The judge-facing entry point is `index.html`. The older `ResQMesh — Emergency Operations Console (1).html` is a standalone prototype and does not contain the full modular feature set.

## Three-Minute Walkthrough

1. **Command Post, 0:00–0:25**
   Point out the incident queue and Mangaluru scenario landmarks: Ullal, Nethravathi River, Kadri Hills, Wenlock District Hospital, Surathkal, and Collector HQ. Choose `SOS-1042` and show Trust & Provenance. Incident and resource values are scenario data, not live feeds.

2. **Outage and P2P relay, 0:25–1:10**
   Click `Run Demo` or choose `P2P Mesh View`. Use `Next Hop` to walk through Victim Phone → Neha's BLE phone → Volunteer Bike → NDRF Field Vehicle → Collector HQ. The live log records each simulated receipt/forward. Choose `Simulate Flood Outage`, then `Restore Uplink` to show queued packets syncing.

3. **Duplicate suppression, 1:10–1:25**
   Choose `Test Duplicate Dropping (Bloom Filter)`. The in-memory Bloom filter recognizes the selected packet and logs a drop without adding another incident.

4. **Trust and authenticity, 1:25–1:55**
   In Trust & Provenance, click `Inspect Ed25519 Packet`. The browser signs the canonical packet with an ephemeral Web Crypto Ed25519 key. Choose `Simulate Packet Tampering`: the original signature should fail against the altered payload. Choose restore to verify the original again.

5. **Road reroute and graph, 1:55–2:25**
   Click `Toggle Road Obstruction` on the map. Ullal Beach Road changes state; open Resource Match to show the ground vehicle recommendation replaced by NDRF Boat Unit 02. Open Knowledge Graph to see the changed corridor and resource relationship.

6. **Interoperability and citizen flow, 2:25–3:00**
   In Trust & Provenance, choose `Export CAP 1.2 Alert`, inspect the XML/GeoJSON and optionally download both. The CAP status is `Test` and scope is `Private`. Switch to Citizen Offline SOS, submit a report, then return to Command Post to see it enter the incident queue.

## Claims You Can Make

- The prototype demonstrates a disconnected-first incident workflow, simulated multi-hop store-and-forward, in-memory Bloom-filter duplicate detection, road-state-driven matching, a linked knowledge-graph view, real Web Crypto Ed25519 signing/verification, and CAP/GeoJSON test export.
- The seed incidents, facility capacity, routes, responders, confidence values, and ETAs are mock data located around real Mangaluru place names.
- The basemap uses OpenStreetMap with approximate scenario coordinates. It is not a live GPS, flood, traffic, or dispatch feed; the incident/resource values remain simulated.
- The Ed25519 key pair is ephemeral to the browser tab. It demonstrates cryptographic verification but is not a production identity or key-management system.
- The P2P/Bluetooth path is simulated in the UI. It does not open Bluetooth/Wi-Fi radios, contact responders, or send packets to a backend.
- CAP output is a private `Test` alert for inspection and must not be treated as a public warning or dispatch instruction.
- Gemini is optional and makes a direct browser-to-Google API request when configured. A browser-entered key is visible to the browser session; use only a disposable demo key, never a production credential.
- The current demo does not persist incident state to IndexedDB and does not include a service worker/PWA offline cache.

## Before Presenting

- Reload `index.html` to restore the six seeded incidents and initial state.
- Check browser audio permission if you plan to demonstrate sound; audio can be muted from the header.
- Keep the browser online only if you plan to use optional Gemini. The core walkthrough works without it.
- Do not enter real personal, patient, or emergency information.
