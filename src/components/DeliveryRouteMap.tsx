import { useEffect, useRef, useState, useId } from 'react';

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
  /** Tailwind height class, default h-56 */
  height?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DeliveryRouteMap({
  customerLat,
  customerLng,
  customerAddress,
  height = 'h-56',
}: DeliveryRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const uid = useId().replace(/:/g, '');

  const [loading,   setLoading]   = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeError, setRouteError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await loadLeaflet();
      if (cancelled || !mapContainerRef.current) return;

      // Destroy any previous map on this element
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L   = (window as any).L;
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,  // don't hijack page scroll
        tap: false,              // prevent touch-scroll capture on mobile
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // ── Custom markers ──────────────────────────────────────────────────────
      const makeIcon = (emoji: string, bg: string) =>
        L.divIcon({
          className: '',
          html: `<div style="background:${bg};color:white;border-radius:50%;width:34px;height:34px;
                   display:flex;align-items:center;justify-content:center;font-size:15px;
                   border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25)">${emoji}</div>`,
          iconSize:   [34, 34],
          iconAnchor: [17, 17],
          popupAnchor:[0, -20],
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

      // ── Fetch driving route from OSRM ───────────────────────────────────────
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${STORE.lng},${STORE.lat};${customerLng},${customerLat}` +
          `?overview=full&geometries=geojson`;

        const res  = await fetch(url);
        const data = await res.json();

        if (!cancelled && data.code === 'Ok' && data.routes?.[0]) {
          const route  = data.routes[0];
          const coords = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng],
          );

          // Green driving polyline with dashed store-to-start segment styling
          L.polyline(coords, {
            color:   '#16a34a',
            weight:  5,
            opacity: 0.85,
            lineJoin: 'round',
          }).addTo(map);

          map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });

          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.round(route.duration / 60);
          const durStr = durMin >= 60
            ? `${Math.floor(durMin / 60)}h ${durMin % 60}m`
            : `${durMin} min`;

          if (!cancelled) setRouteInfo({ distance: `${distKm} km`, duration: durStr });
        } else {
          throw new Error('No route');
        }
      } catch {
        if (!cancelled) {
          setRouteError(true);
          // Fallback: just fit both markers
          map.fitBounds(
            [[STORE.lat, STORE.lng], [customerLat, customerLng]],
            { padding: [50, 50] },
          );
        }
      }

      if (!cancelled) setLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [customerLat, customerLng]);

  return (
    <div className="space-y-2">
      {/* Route stats bar */}
      <div className="flex items-center gap-3 flex-wrap min-h-[20px]">
        {routeInfo && (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              🛣 {routeInfo.distance}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              ⏱ Est. {routeInfo.duration} driving
            </span>
          </>
        )}
        {routeError && (
          <span className="text-[11px] text-orange-500 font-medium">
            ⚠ Route unavailable — showing locations only
          </span>
        )}
        {loading && (
          <span className="text-[11px] text-gray-400 animate-pulse">Calculating route…</span>
        )}
      </div>

      {/* Map container — isolated stacking context keeps Leaflet panes below the sticky nav (z-[100]) */}
      <div className={`relative rounded-xl overflow-hidden border border-gray-200 shadow-sm ${height} w-full`}
           style={{ zIndex: 0, isolation: 'isolate' }}>
        {loading && (
          <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center z-10 gap-2">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-gray-400">Loading map…</span>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 font-medium">
        <span className="flex items-center gap-1">🏪 NEXUS PC Store</span>
        <span className="flex items-center gap-1">📍 Delivery Address</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-1 rounded bg-green-500" /> Route
        </span>
      </div>
    </div>
  );
}
