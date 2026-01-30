import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// GEC Coordinates (Center)
const CENTER: [number, number] = [15.4223, 73.9805];

interface InlineMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export function InlineMapPicker({ initialLat, initialLng, onLocationSelect }: InlineMapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  function MapEvents() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner relative z-0">
      <MapContainer center={position || CENTER} zoom={17} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
        {position && <Marker position={position} />}
      </MapContainer>
      
      {/* Overlay Instruction */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm z-[400] text-slate-600 border border-slate-200 pointer-events-none">
        {position ? "Location Selected" : "Tap map to set location"}
      </div>
    </div>
  );
}