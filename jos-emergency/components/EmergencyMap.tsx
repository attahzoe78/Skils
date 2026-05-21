'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface Incident {
  id: string;
  type: string;
  level: string;
  status: string;
  location: { lat: number; lng: number; address: string; lga: string };
  description: string;
  reportedAt: string;
  reportedBy: string;
  respondersAssigned: string[];
  updates: { time: string; message: string }[];
}

interface Hotspot {
  lat: number;
  lng: number;
  risk: number;
  area: string;
  primaryThreat: string;
  incidentCount: number;
}

interface Props {
  incidents: Incident[];
  hotspots?: Hotspot[];
  onSelectIncident?: (incident: Incident) => void;
  userLocation?: { lat: number; lng: number } | null;
  showHeatmap?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  medical: '#0891b2',
  fire: '#ea580c',
  robbery: '#dc2626',
  kidnapping: '#7c3aed',
  terrorism: '#be123c',
  bomb_threat: '#b45309',
  civil_unrest: '#d97706',
};

const STATUS_OPACITY: Record<string, number> = {
  active: 1,
  responding: 0.8,
  resolved: 0.4,
};

const TYPE_ICONS: Record<string, string> = {
  medical: '🏥',
  fire: '🔥',
  robbery: '🔫',
  kidnapping: '🚨',
  terrorism: '⚠️',
  bomb_threat: '💣',
  civil_unrest: '👥',
};

const GOOGLE_MAPS_KEY = 'AIzaSyBl-dqU3V47bpQ5oJECAr5EYRNUOgQd16Q';
const JOS_CENTER = { lat: 9.9236, lng: 8.8910 };

declare global {
  interface Window {
    google: typeof google;
    initGoogleMap?: () => void;
  }
}

export default function EmergencyMap({ incidents, hotspots = [], onSelectIncident, userLocation, showHeatmap }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState('');

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: JOS_CENTER,
      zoom: 13,
      mapTypeId: 'roadmap',
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2744' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3a5a' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#374162' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1627' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e2d4a' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
        { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e2d4a' }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();
    setMapLoaded(true);
  }, []);

  useEffect(() => {
    if (window.google?.maps) {
      initMap();
      return;
    }
    if (document.querySelector('#gmaps-script')) {
      window.initGoogleMap = initMap;
      return;
    }
    window.initGoogleMap = initMap;
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initGoogleMap&libraries=visualization`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setError('Map failed to load');
    document.head.appendChild(script);
    return () => { window.initGoogleMap = undefined; };
  }, [initMap]);

  // Update markers when incidents change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    incidents.forEach(incident => {
      const color = TYPE_COLORS[incident.type] || '#6b7280';
      const opacity = STATUS_OPACITY[incident.status] || 1;
      const icon = TYPE_ICONS[incident.type] || '❗';

      const marker = new window.google.maps.Marker({
        position: { lat: incident.location.lat, lng: incident.location.lng },
        map: mapInstanceRef.current!,
        title: incident.description,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: incident.level === 'critical' ? 14 : incident.level === 'high' ? 11 : 9,
          fillColor: color,
          fillOpacity: opacity,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        animation: incident.status === 'active' && incident.level === 'critical'
          ? window.google.maps.Animation.BOUNCE
          : undefined,
      });

      marker.addListener('click', () => {
        const content = `
          <div style="background:#1e293b;color:#f8fafc;padding:12px;border-radius:8px;min-width:220px;font-family:system-ui">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:20px">${icon}</span>
              <strong style="color:${color};text-transform:capitalize">${incident.type.replace('_', ' ')}</strong>
              <span style="margin-left:auto;padding:2px 8px;border-radius:999px;font-size:11px;background:${incident.level === 'critical' ? '#7f1d1d' : incident.level === 'high' ? '#7c2d12' : '#374151'};color:#fff">${incident.level.toUpperCase()}</span>
            </div>
            <p style="margin:0 0 6px;font-size:13px;color:#cbd5e1">${incident.description}</p>
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8">📍 ${incident.location.address}</p>
            <p style="margin:0;font-size:11px;color:#94a3b8">🕒 ${new Date(incident.reportedAt).toLocaleTimeString()}</p>
            <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
              <span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${incident.status === 'active' ? '#b91c1c' : incident.status === 'responding' ? '#b45309' : '#15803d'};color:#fff">${incident.status.toUpperCase()}</span>
            </div>
          </div>`;
        infoWindowRef.current!.setContent(content);
        infoWindowRef.current!.open(mapInstanceRef.current!, marker);
        onSelectIncident?.(incident);
      });

      markersRef.current.push(marker);
    });
  }, [incidents, mapLoaded, onSelectIncident]);

  // Hotspot circles
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];

    if (!showHeatmap) return;
    hotspots.forEach(hs => {
      const circle = new window.google.maps.Circle({
        map: mapInstanceRef.current!,
        center: { lat: hs.lat, lng: hs.lng },
        radius: 800,
        fillColor: hs.risk > 70 ? '#dc2626' : hs.risk > 40 ? '#d97706' : '#16a34a',
        fillOpacity: 0.15,
        strokeColor: hs.risk > 70 ? '#dc2626' : hs.risk > 40 ? '#d97706' : '#16a34a',
        strokeOpacity: 0.5,
        strokeWeight: 1,
      });
      circlesRef.current.push(circle);
    });
  }, [hotspots, mapLoaded, showHeatmap]);

  // User location marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    userMarkerRef.current?.setMap(null);
    if (!userLocation) return;
    userMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22d3ee',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 9999,
    });
    mapInstanceRef.current.panTo(userLocation);
  }, [userLocation, mapLoaded]);

  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-xl text-red-400 text-sm">
      {error}
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-xl">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading Jos Emergency Map…</p>
          </div>
        </div>
      )}
    </div>
  );
}
