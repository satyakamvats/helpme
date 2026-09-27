# ResQMesh Judge Demo Guide

## Launch

### Live LAN relay setup (do this before judges arrive)

1. On the Command laptop, run `npm install` once and then `npm run demo`.
2. Connect the Command laptop, victim phone, and relay phone/laptop to the same Wi-Fi or laptop hotspot.
3. Open the printed LAN URL on the Command laptop. It defaults to **Safety point**.
4. On the Command laptop select `Set up live devices`, then scan the **Victim phone** QR on the victim device and the **Relay device** QR on the middle device. Leave the default `judge-demo` room unchanged.
5. Wait until the relay says `Both neighbours connected` and Safety Point says `Relay device connected`.

The local PeerServer provides connection setup only. The browser sends the signed SOS directly from victim → relay → Safety Point. This is a WebRTC LAN demo, not Bluetooth mesh or real emergency dispatch.

Open `index.html` in a current Chromium-based browser. The application uses native browser modules only; there is no build step. After the first successful load, the app shell and SOS storage work offline. OpenStreetMap tiles need internet and fall back to the labeled scenario view. A local HTTP server is a good fallback if browser restrictions block a feature. Gemini is optional; the local scenario assistant works without it.

The judge-facing entry point is `index.html`. The older `ResQMesh — Emergency Operations Console (1).html` is a standalone prototype and does not contain the full modular feature set.

## Three-Minute Walkthrough

1. **Command Post, 0:00–0:25**
   Point out the incident queue and Mangaluru scenario landmarks: Ullal, Nethravathi River, Kadri Hills, Wenlock District Hospital, Surathkal, and Collector HQ. Choose `SOS-1042` and show Trust & Provenance. Incident and resource values are scenario data, not live feeds.

2. **Live P2P relay, 0:25–1:10**
   On the victim phone choose an SOS category and submit it. Show the packet ID on the phone, then the same ID on the relay device as it verifies, stores, decrements TTL, and forwards. The Command laptop receives the same signed packet and adds it to the queue. The acknowledgement travels back so every screen ends in delivery state.

3. **Duplicate suppression, 1:10–1:25**
   Send the same envelope a second time during rehearsal. The relay event trail reports the duplicate drop and Command creates no second incident. Do not claim a live duplicate test unless the trail visibly shows it.

4. **Trust and authenticity, 1:25–1:55**
   In Trust & Provenance, click `Inspect Ed25519 Packet`. The browser signs the canonical packet with an ephemeral Web Crypto Ed25519 key. Choose `Simulate Packet Tampering`: the original signature should fail against the altered payload. Choose restore to verify the original again.

5. **Road reroute and graph, 1:55–2:25**
   Click `Toggle Road Obstruction` on the map. Dijkstra recomputes the shortest path without Ullal Beach Road; watch the animated route and packet move to the NH-66 detour or NDRF Boat Unit 02 water route. Resource Match and Knowledge Graph show the same new path and simulated distance/ETA.

6. **Interoperability and citizen flow, 2:25–3:00**
   In Trust & Provenance, choose `Export CAP 1.2 Alert`, inspect the XML/GeoJSON and optionally download both. The CAP status is `Test` and scope is `Private`. Choose `Report SOS`, submit a report, and it returns to `Command` with the saved incident selected.

## Claims You Can Make

- The prototype demonstrates a disconnected-first incident workflow, a live three-browser WebRTC relay on a local LAN, local duplicate suppression, road-state-driven matching, a linked knowledge-graph view, Web Crypto Ed25519 signing/verification, and CAP/GeoJSON test export.
- The seed incidents, facility capacity, routes, responders, confidence values, and ETAs are mock data located around real Mangaluru place names.
- The basemap uses OpenStreetMap with approximate scenario coordinates. It is not a live GPS, flood, traffic, or dispatch feed; the incident/resource values remain simulated.
- Dijkstra runs on a small illustrative road/river graph, not a live road network or pgRouting service. Its distances and ETAs are for demonstration only.
- The Ed25519 key pair is ephemeral to the browser tab. It demonstrates cryptographic verification but is not a production identity or key-management system.
- The live peer flow uses browser WebRTC data channels after setup through the local PeerServer. It does not open Bluetooth or Wi-Fi Aware radios, contact responders, or send a packet to a backend. The visual replay fallback is intentionally labelled and is not a live network claim.
- CAP output is a private `Test` alert for inspection and must not be treated as a public warning or dispatch instruction.
- Gemini is optional and makes a direct browser-to-Google API request when configured. A browser-entered key is visible to the browser session; use only a disposable demo key, never a production credential.
- The service worker caches same-origin app files; new SOS reports persist in IndexedDB with a localStorage fallback. These work after one successful online page load. OSM map tiles and Gemini are not cached; offline map view falls back to the labeled local overlay.

## Before Presenting

- `RAISE SOS` creates a default flood incident from any view. `Report SOS` opens the form for a custom report and returns to Command after saving.
- Reload `index.html` to restore the six seeded incidents plus reports saved on that browser origin.
- Keep the browser online only if you plan to use optional Gemini. The core walkthrough works without it.
- Use the LAN live flow only after all three peer-status indicators are connected; otherwise open the labelled visual replay fallback rather than presenting it as live P2P.
- Do not enter real personal, patient, or emergency information.
