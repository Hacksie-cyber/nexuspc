import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

// ─── Store location ───────────────────────────────────────────────────────────
const STORE = { lat: 8.4815, lng: 124.6472 };

// ─── Singleton Leaflet loader ─────────────────────────────────────────────────
let leafletReady: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (leafletReady) return leafletReady;
  leafletReady = new Promise(resolve => {
    if ((window as any).L) { resolve(); return; }

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return leafletReady;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface DeliveryRouteMapProps {
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
  height?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DeliveryRouteMap({
  customerLat,
  customerLng,
  customerAddress,
  height = 'h-56',
}: DeliveryRouteMapProps) {
  const normalRef     = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);

  const [loading,      setLoading]      = useState(true);
  const [routeInfo,    setRouteInfo]    = useState<{ distance: string; duration: string } | null>(null);
  const [routeError,   setRouteError]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Core map builder ────────────────────────────────────────────────────────
  const buildMap = async (container: HTMLDivElement, cancelled: { v: boolean }) => {
    await loadLeaflet();
    if (cancelled.v || !container) return;

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const L   = (window as any).L;
    const map = L.map(container, {
      zoomControl:      true,
      attributionControl: true,
      scrollWheelZoom:  false,
      tap:              false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const makeIcon = (emoji: string, bg: string) =>
      L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:white;border-radius:50%;width:36px;height:36px;
                 display:flex;align-items:center;justify-content:center;font-size:16px;
                 border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3)">${emoji}</div>`,
        iconSize:   [36, 36],
        iconAnchor: [18, 18],
        popupAnchor:[0, -22],
      });

    L.marker([STORE.lat, STORE.lng], { icon: makeIcon('🏪', '#16a34a') })
      .addTo(map)
      .bindPopup('<strong style="font-size:12px">NEXUS PC Store</strong><br><span style="font-size:11px;color:#6b7280">123 Corrales Ave, CDO</span>');

    L.marker([customerLat, customerLng], { icon: makeIcon('📍', '#dc2626') })
      .addTo(map)
      .bindPopup(
        `<strong style="font-size:12px">Delivery Address</strong>` +
        (customerAddress ? `<br><span style="font-size:11px;color:#6b7280">${customerAddress}</span>` : ''),
      );

    try {
      const res  = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${STORE.lng},${STORE.lat};${customerLng},${customerLat}` +
        `?overview=full&geometries=geojson`,
      );
      const data = await res.json();

      if (!cancelled.v && data.code === 'Ok' && data.routes?.[0]) {
        const route  = data.routes[0];
        const coords = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

        L.polyline(coords, { color: '#16a34a', weight: 5, opacity: 0.85, lineJoin: 'round' }).addTo(map);
        map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });

        const distKm = (route.distance / 1000).toFixed(1);
        const durMin = Math.round(route.duration / 60);
        const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin} min`;

        if (!cancelled.v) setRouteInfo({ distance: `${distKm} km`, duration: durStr });
      } else {
        throw new Error('No route');
      }
    } catch {
      if (!cancelled.v) {
        setRouteError(true);
        map.fitBounds([[STORE.lat, STORE.lng], [customerLat, customerLng]], { padding: [50, 50] });
      }
    }

    if (!cancelled.v) setLoading(false);
  };

  // ── Init normal map on mount ────────────────────────────────────────────────
  useEffect(() => {
    const cancelled = { v: false };
    if (normalRef.current) buildMap(normalRef.current, cancelled);
    return () => {
      cancelled.v = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [customerLat, customerLng]);

  // ── Rebuild whenever fullscreen toggles ─────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setRouteInfo(null);
    setRouteError(false);
    const cancelled = { v: false };
    const target = isFullscreen ? fullscreenRef.current : normalRef.current;
    // Small delay so the target div is painted before Leaflet mounts
    const t = setTimeout(() => { if (target) buildMap(target, cancelled); }, 30);
    return () => { cancelled.v = true; clearTimeout(t); };
  }, [isFullscreen]);

  // ── Lock body scroll in fullscreen ──────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  // ── Shared sub-components ───────────────────────────────────────────────────
  const InfoBar = () => (
    <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
      {routeInfo && (
        <>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            🛣 {routeInfo.distance}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            ⏱ Est. {routeInfo.duration} driving
          </span>
        </>
      )}
      {routeError && <span className="text-[11px] text-orange-400 font-medium">⚠ Route unavailable — showing locations only</span>}
      {loading    && <span className="text-[11px] text-gray-400 animate-pulse">Calculating route…</span>}
    </div>
  );

  const Legend = ({ dark = false }: { dark?: boolean }) => (
    <div className={`flex items-center gap-4 text-[10px] font-medium ${dark ? 'text-white/50' : 'text-gray-400'}`}>
      <span>🏪 NEXUS PC Store</span>
      <span>📍 Delivery Address</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-5 h-1 rounded bg-green-500" /> Route
      </span>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Normal inline map ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <InfoBar />
          <button
            onClick={() => setIsFullscreen(true)}
            title="View fullscreen"
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-green-600 bg-gray-100 hover:bg-green-50 border border-gray-200 hover:border-green-300 px-2.5 py-1 rounded-full transition-all"
          >
            <Maximize2 className="w-3 h-3" /> Fullscreen
          </button>
        </div>

        <div
          className={`relative rounded-xl overflow-hidden border border-gray-200 shadow-sm ${height} w-full`}
          style={{ zIndex: 0, isolation: 'isolate' }}
        >
          {loading && (
            <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center z-10 gap-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-gray-400">Loading map…</span>
            </div>
          )}
          <div ref={normalRef} className="w-full h-full" />
        </div>

        <Legend />
      </div>

      {/* ── Fullscreen overlay ───────────────────────────────────────────────── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 flex flex-col bg-[#1a1a1a]"
          style={{ zIndex: 9999 }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-[#111] border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0 mr-4">
              <p className="text-white font-bold text-sm tracking-tight">Delivery Route</p>
              {customerAddress && (
                <p className="text-white/40 text-[11px] truncate">📍 {customerAddress}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
              <InfoBar />
              <button
                onClick={() => setIsFullscreen(false)}
                title="Exit fullscreen"
                className="flex items-center gap-1.5 text-[11px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Exit
              </button>
            </div>
          </div>

          {/* Map fills remaining space */}
          <div className="flex-1 relative min-h-0">
            {loading && (
              <div className="absolute inset-0 bg-gray-900/60 flex flex-col items-center justify-center z-10 gap-3">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-white/60">Loading map…</span>
              </div>
            )}
            <div ref={fullscreenRef} className="w-full h-full" />
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-[#111] border-t border-white/10">
            <Legend dark />
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
