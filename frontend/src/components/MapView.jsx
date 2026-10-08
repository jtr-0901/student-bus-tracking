import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const busIcon = L.divIcon({
  html: `<div style="
    background: linear-gradient(135deg, #2563eb, #1e3a5f);
    border: 3px solid #f59e0b;
    border-radius: 50%;
    width: 42px; height: 42px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 15px rgba(37,99,235,0.6);
    animation: busAnim 1.5s ease-in-out infinite alternate;
  ">🚌</div>
  <style>
    @keyframes busAnim {
      from { box-shadow: 0 4px 15px rgba(37,99,235,0.4); transform: scale(1); }
      to   { box-shadow: 0 4px 25px rgba(37,99,235,0.9); transform: scale(1.08); }
    }
  </style>`,
  className: '',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -25],
});

const stopIcon = L.divIcon({
  html: `<div style="
    background: rgba(245,158,11,0.9);
    border: 2px solid #fff;
    border-radius: 50%;
    width: 14px; height: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  "></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

export default function MapView({ busLocation, routeStops = [], height = '400px', style = {} }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);

  const defaultCenter = [11.0168, 76.9558]; // Coimbatore

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Draw route stops
    if (routeStops.length > 0) {
      const polyline = L.polyline(routeStops.map(s => [s.lat, s.lng]), {
        color: '#2563eb',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5',
      }).addTo(map);
      routeLayerRef.current = polyline;

      routeStops.forEach((stop, idx) => {
        L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:140px">
              <strong style="color:#f1f5f9">Stop ${idx + 1}</strong><br/>
              <span style="color:#94a3b8">${stop.name}</span>
            </div>
          `);

        L.tooltip({
          permanent: true,
          direction: 'top',
          offset: [0, -10],
          className: '',
        })
          .setContent(`<span style="font-size:0.7rem;color:#94a3b8;background:#1a2740;padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.1)">${stop.name}</span>`)
          .setLatLng([stop.lat, stop.lng])
          .addTo(map);
      });

      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update bus marker on location change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !busLocation) return;

    const { lat, lng, speed = 0 } = busLocation;
    if (!lat || !lng) return;

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([lat, lng]);
    } else {
      busMarkerRef.current = L.marker([lat, lng], { icon: busIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif">
            <strong style="color:#f1f5f9">🚌 School Bus</strong><br/>
            <span style="color:#94a3b8">Speed: ${speed} km/h</span><br/>
            <span style="color:#10b981;font-size:0.75rem">● Live</span>
          </div>
        `);
      map.setView([lat, lng], 14, { animate: true });
    }

    // Update popup content
    busMarkerRef.current.setPopupContent(`
      <div style="font-family:Inter,sans-serif;min-width:150px">
        <strong style="color:#f1f5f9">🚌 School Bus</strong><br/>
        <span style="color:#94a3b8">Speed: ${speed} km/h</span><br/>
        <span style="color:#94a3b8;font-size:0.75rem">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span><br/>
        <span style="color:#10b981;font-size:0.75rem">● Live Tracking</span>
      </div>
    `);
  }, [busLocation]);

  return (
    <div
      ref={mapRef}
      className="map-container"
      style={{ height, width: '100%', ...style }}
    />
  );
}
