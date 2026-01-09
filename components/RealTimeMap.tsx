import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L, { Icon, DivIcon } from 'leaflet';
import { RoadData } from '../types';
import { Navigation, MapPin, AlertTriangle, Clock, Spline, Car, Loader2, Siren } from 'lucide-react';

const DESTINATION_COORDS: [number, number] = [30.0441, 31.2338]; 

// دالة سحرية لإصلاح مشكلة الـ Gray Tiles
const MapFix = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
};

const FitBoundsToRoads = ({ roads }: { roads: RoadData[] }) => {
  const map = useMap();
  useEffect(() => {
    if (roads.length === 0) return;
    const bounds = L.latLngBounds(roads.map(r => r.coordinates));
    roads.forEach(r => r.path?.forEach(p => bounds.extend(p)));
    bounds.extend(DESTINATION_COORDS);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [roads, map]);
  return null;
};

export const RealTimeMap: React.FC<{ roads: RoadData[] }> = ({ roads }) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter] = useState<[number, number]>([30.03, 31.05]); 
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const startNavigation = () => {
    setIsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setUserLocation([p.coords.latitude, p.coords.longitude]);
          setIsNavigating(true);
          setIsLoading(false);
        },
        () => {
          setUserLocation([29.9737, 30.9468]); // Fallback
          setIsNavigating(true);
          setIsLoading(false);
        }
      );
    }
  };

  const getTrafficStatus = (road: RoadData) => {
    if (road.avgGreenTime && road.avgGreenTime > 20) return { color: '#2563eb', text: 'طوارئ', type: 'emergency' };
    if (road.gateStatus === 'closed') return { color: '#ef4444', text: 'مغلق', type: 'high' };
    const occupancy = (road.currentVehicles / road.capacity) * 100;
    if (occupancy >= 80) return { color: '#dc2626', text: 'زحام شديد', type: 'high' };
    if (occupancy >= 50) return { color: '#d97706', text: 'بطيء', type: 'medium' };
    return { color: '#16a34a', text: 'سالك', type: 'low' };
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="text-indigo-600" /> متابعة الطرق</h2>
        <button onClick={startNavigation} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">
          {isLoading ? <Loader2 className="animate-spin" /> : 'ابدأ الملاحة'}
        </button>
      </div>
      <div className="h-[600px] w-full rounded-xl overflow-hidden border shadow-inner">
        <MapContainer center={mapCenter} zoom={11} className="w-full h-full">
          <MapFix />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBoundsToRoads roads={roads} />
          {roads.map(road => {
            const status = getTrafficStatus(road);
            const customIcon = new DivIcon({
              className: '',
              html: `<div class="traffic-label ${status.type}"><div>${road.name}</div></div>`,
              iconSize: [120, 30]
            });
            return (
              <React.Fragment key={road.id}>
                <Polyline positions={road.path || [road.coordinates]} pathOptions={{ color: status.color, weight: 8 }} />
                <Marker position={road.coordinates} icon={customIcon}>
                  <Popup>{road.name}: {status.text}</Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};