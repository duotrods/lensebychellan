import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";

const UK_CENTER = [52.5, -1.5];
const POLL_MS = 7000;
const STALE_MS = 60000;

// Pin colour per vehicle allocated — kept identical to K2's
// VEHICLE_ALLOCATED_HEX so both maps match. Unknown/empty falls back to teal.
const VEHICLE_HEX = {
  "Light Recovery": "#2563eb",
  "Heavy Recovery": "#9333ea",
  RIPV: "#dc2626",
  Motorbike: "#f97316",
};
const vehicleHex = (v) => VEHICLE_HEX[v] || "#0d9488";

// divIcon (styled <div>) avoids Leaflet's default marker images, which break
// under Vite bundling.
// White truck glyph (Lucide "truck") on a coloured badge; colour = vehicle type.
const TRUCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

const pinIcon = (stale, color) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
    html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:9999px;border:3px solid #fff;background:${
      stale ? "#9ca3af" : color
    };box-shadow:0 0 0 1px rgba(0,0,0,.35)">${TRUCK_SVG}</div>`,
  });

// Re-fits only when the *set* of incidents changes, so it doesn't fight an
// admin who is panning around between updates.
function FitBounds({ points, fitKey }) {
  const map = useMap();
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  });
  useEffect(() => {
    const pts = pointsRef.current;
    if (pts.length === 0) return;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [map, fitKey]);
  return null;
}

// Polls the getResponderLocations Cloud Function (a proxy to K2). Polling
// pauses while the tab is hidden to keep invocations (and cost) down.
const ResponderMap = ({ onCount }) => {
  const [pins, setPins] = useState([]);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const call = httpsCallable(functions, "getResponderLocations");
    let cancelled = false;
    let timer = null;

    const load = async () => {
      try {
        const { data } = await call();
        if (cancelled) return;
        setPins(data.responders || []);
        setError(false);
      } catch (err) {
        console.error("Responder locations failed:", err);
        if (!cancelled) setError(true);
      }
      if (!cancelled) setNow(Date.now());
    };

    const start = () => {
      if (timer) return;
      load();
      timer = setInterval(load, POLL_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    onCount?.(pins.length);
  }, [pins.length, onCount]);

  const points = useMemo(() => pins.map((p) => [p.lat, p.lng]), [pins]);
  const fitKey = useMemo(
    () => pins.map((p) => p.incidentId).sort().join(","),
    [pins],
  );

  return (
    <div className="relative h-[80vh] min-h-120 overflow-hidden rounded-lg border border-gray-100">
      <MapContainer center={UK_CENTER} zoom={6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} fitKey={fitKey} />
        {pins.map((p) => {
          const stale = now - new Date(p.recordedAt).getTime() > STALE_MS;
          return (
            <Marker
              key={p.incidentId}
              position={[p.lat, p.lng]}
              icon={pinIcon(stale, vehicleHex(p.vehicleAllocated))}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.referenceId || "Incident"}</p>
                  <p>{p.scheme}</p>
                  {p.vehicleAllocated && (
                    <p style={{ color: vehicleHex(p.vehicleAllocated) }}>
                      {p.vehicleAllocated}
                    </p>
                  )}
                  <p className={stale ? "text-gray-500" : "text-emerald-600"}>
                    {stale ? "Signal lost" : "Live"}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-1000 flex flex-col gap-1 rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
        {Object.keys(VEHICLE_HEX).map((v) => (
          <div key={v} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: VEHICLE_HEX[v] }}
            />
            {v}
          </div>
        ))}
      </div>
      {(pins.length === 0 || error) && (
        <div className="pointer-events-none absolute inset-0 z-1000 flex items-center justify-center">
          <p className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-500 shadow">
            {error
              ? "Couldn't load operator locations — retrying"
              : "No operators en route right now"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResponderMap;
