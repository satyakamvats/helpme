# ResQMesh

Disconnected-first emergency coordination prototype for a simulated Mangaluru coastal flood scenario. The application demonstrates incident intake, peer-to-peer store-and-forward, resource matching, a connected knowledge graph, and interoperability exports.

## Run

### Live three-device judge demo

Install dependencies once, then run:

```powershell
npm install
npm run demo
```

Keep the laptop on the same Wi-Fi network or hotspot as the other devices. Open the LAN address printed by the server on the laptop, keep it on **Command / Safety Point**, then select **Set up live devices** and scan the generated **Victim phone** and **Relay device** QR codes. All three pages must use the same room name.

The local PeerServer performs WebRTC signaling only. The SOS envelope is signed on the victim device and its data travels directly to the relay, then directly to Command; the route advances only from real receive events. If the local server is unavailable, **Open visual replay fallback** is a clearly marked, non-networked presentation mode.

### Static preview

Open `index.html` in a current Chromium-based browser. There is no build step. After its first successful load, the app shell and SOS reports are available offline on GitHub Pages or localhost. OpenStreetMap tiles and optional Gemini answers need internet access; the map falls back to its labeled scenario view offline.

Live demo: <https://supreetvardhamane.github.io/resqlens/>

For a local web server, run `python -m http.server 8000` from this directory and open `http://localhost:8000`.

## Demo Flow

- `Command` shows the Mangaluru incident queue, tactical map, trust/provenance, resource matches, and knowledge graph. The route is recomputed with Dijkstra over a small scenario road/river graph and animated on the map.
- `Report SOS` saves a signed report to IndexedDB (localStorage fallback), then opens the Command queue.
- `Relay` is the live mission-control screen. In the LAN demo it shows actual peer links, signed packet receipt/forward/delivery events, QR joining, local duplicate suppression, and a stored outbox when the next device is unavailable.
- `RAISE SOS` creates a default flood report from any view. `Run Guided Demo` walks through outage, relay, graph, matching, and local save.
- The Trust panel can inspect an Ed25519-signed packet and export CAP XML / GeoJSON test data.

See [RESQMESH_DEMO_GUIDE.md](RESQMESH_DEMO_GUIDE.md) for the timed judge walkthrough.

## Architecture

`index.html` is the judge-facing modular entry point. CSS and JavaScript are split under `css/` and `js/`; `server.cjs` provides the optional local LAN demo server and PeerServer endpoint. The older standalone HTML prototype is retained for reference.

## Demo Safety

Live mode is browser WebRTC data-channel relay using a local signaling server. It is not Bluetooth mesh, Wi-Fi Aware, real GPS, or real emergency dispatch. The separate visual replay is not a live network demonstration.

Incidents, confidence values, facility capacity, responders, and ETAs are mock data around real Mangaluru place-name references. The map uses approximate coordinates; Dijkstra runs over a small scenario graph, not live routing or hazard data. The service worker caches same-origin app files and SOS records persist locally, but BLE/Wi-Fi relaying and server sync are simulated in the UI. Offline support begins after one successful load. Ed25519 keys are ephemeral to the tab and do not provide production identity management. CAP exports are `Test` / `Private` and must not be used as public alerts. Gemini is optional; use only a disposable demo key because the browser sends it directly to Google's API.
