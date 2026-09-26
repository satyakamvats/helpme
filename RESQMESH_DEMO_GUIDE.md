# ResQMesh Judge Demo Guide

## Launch

Open `index.html` in a current Chromium-based browser. The application uses native browser modules only; there is no build step. After the first successful load, the app shell and SOS storage work offline. OpenStreetMap tiles need internet and fall back to the labeled scenario view. A local HTTP server is a good fallback if browser restrictions block a feature. Gemini is optional; the local scenario assistant works without it.

The judge-facing entry point is `index.html`. The older `ResQMesh — Emergency Operations Console (1).html` is a standalone prototype and does not contain the full modular feature set.

## Three-Minute Walkthrough

1. **Command Post, 0:00–0:25**
   Point out the incident queue and Mangaluru scenario landmarks: Ullal, Nethravathi River, Kadri Hills, Wenlock District Hospital, Surathkal, and Collector HQ. Choose `SOS-1042` and show Trust & Provenance. Incident and resource values are scenario data, not live feeds.

2. **Outage and P2P relay, 0:25–1:10**
   Click `Run Guided Demo` or choose `Relay`. Use `Next Hop` to walk through Victim Phone → Neha's phone → Volunteer Bike → NDRF Field Vehicle → Collector HQ. The live log records each simulated receipt/forward. Choose `Simulate Flood Outage`, then `Restore Uplink`; the report remains saved locally throughout.

3. **Duplicate suppression, 1:10–1:25**
   Choose `Test Duplicate Dropping (Bloom Filter)`. The in-memory Bloom filter recognizes the selected packet and logs a drop without adding another incident.

4. **Trust and authenticity, 1:25–1:55**
   In Trust & Provenance, click `Inspect Ed25519 Packet`. The browser signs the canonical packet with an ephemeral Web Crypto Ed25519 key. Choose `Simulate Packet Tampering`: the original signature should fail against the altered payload. Choose restore to verify the original again.

5. **Road reroute and graph, 1:55–2:25**
   Click `Toggle Road Obstruction` on the map. Dijkstra recomputes the shortest path without Ullal Beach Road; watch the animated route and packet move to the NH-66 detour or NDRF Boat Unit 02 water route. Resource Match and Knowledge Graph show the same new path and simulated distance/ETA.

6. **Interoperability and citizen flow, 2:25–3:00**
   In Trust & Provenance, choose `Export CAP 1.2 Alert`, inspect the XML/GeoJSON and optionally download both. The CAP status is `Test` and scope is `Private`. Choose `Report SOS`, submit a report, and it returns to `Command` with the saved incident selected.

## Claims You Can Make

- The prototype demonstrates a disconnected-first incident workflow, simulated multi-hop store-and-forward, in-memory Bloom-filter duplicate detection, road-state-driven matching, a linked knowledge-graph view, real Web Crypto Ed25519 signing/verification, and CAP/GeoJSON test export.
- The seed incidents, facility capacity, routes, responders, confidence values, and ETAs are mock data located around real Mangaluru place names.
- The basemap uses OpenStreetMap with approximate scenario coordinates. It is not a live GPS, flood, traffic, or dispatch feed; the incident/resource values remain simulated.
- Dijkstra runs on a small illustrative road/river graph, not a live road network or pgRouting service. Its distances and ETAs are for demonstration only.
- The Ed25519 key pair is ephemeral to the browser tab. It demonstrates cryptographic verification but is not a production identity or key-management system.
- The P2P/Bluetooth path is simulated in the UI. It does not open Bluetooth/Wi-Fi radios, contact responders, or send packets to a backend.
- CAP output is a private `Test` alert for inspection and must not be treated as a public warning or dispatch instruction.
- Gemini is optional and makes a direct browser-to-Google API request when configured. A browser-entered key is visible to the browser session; use only a disposable demo key, never a production credential.
- The service worker caches same-origin app files; new SOS reports persist in IndexedDB with a localStorage fallback. These work after one successful online page load. OSM map tiles and Gemini are not cached; offline map view falls back to the labeled local overlay.

## Before Presenting

- `RAISE SOS` creates a default flood incident from any view. `Report SOS` opens the form for a custom report and returns to Command after saving.
- Reload `index.html` to restore the six seeded incidents plus reports saved on that browser origin.
- Keep the browser online only if you plan to use optional Gemini. The core walkthrough works without it.
- Do not enter real personal, patient, or emergency information.
