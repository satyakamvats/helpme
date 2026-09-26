# ResQMesh

Disconnected-first emergency coordination prototype for a simulated Mangaluru coastal flood scenario. The application demonstrates incident intake, peer-to-peer store-and-forward, resource matching, a connected knowledge graph, and interoperability exports.

## Run

Open `index.html` in a current Chromium-based browser. There is no build step. The OpenStreetMap basemap and optional Gemini assistant need internet access; the map falls back to a labeled scenario grid if Leaflet or map tiles are unavailable.

Live demo: <https://supreetvardhamane.github.io/resqlens/>

For a local web server, run `python -m http.server 8000` from this directory and open `http://localhost:8000`.

## Demo Flow

- `Command Post` shows the Mangaluru incident queue, tactical map, trust/provenance, resource matches, and knowledge graph.
- `P2P Mesh View` shows five simulated relay hops, outage/reconnect controls, duplicate suppression, and a timestamped packet log.
- `Citizen Offline SOS` creates a new simulated incident that appears in the command queue.
- `Run Demo` walks through outage, peer relay, graph, matching, and reconnection.
- The Trust panel can inspect an Ed25519-signed packet and export CAP XML / GeoJSON test data.

See [RESQMESH_DEMO_GUIDE.md](RESQMESH_DEMO_GUIDE.md) for the timed judge walkthrough.

## Architecture

`index.html` is the judge-facing modular entry point. CSS and JavaScript are split under `css/` and `js/`; the older standalone HTML prototype is retained for reference. The project uses native browser APIs and has no build dependencies.

## Demo Safety

Incidents, confidence values, facility capacity, routes, responders, and ETAs are mock data around real Mangaluru place-name references. The map uses approximate coordinates and is not a live hazard or dispatch feed. BLE/Wi-Fi relaying and offline storage are not implemented; the P2P flow is simulated in the UI. Ed25519 keys are ephemeral to the tab and do not provide production identity management. CAP exports are `Test` / `Private` and must not be used as public alerts. Gemini is optional; use only a disposable demo key because the browser sends it directly to Google's API.