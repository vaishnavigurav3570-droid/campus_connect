import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, Navigation, User, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Meetup } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker for the "Other Person" (Red)
const otherPersonIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Custom Marker for "Me" (Blue)
const meIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

interface ActiveMeetupSessionProps {
  session: any;
  meetupId: string;
  onClose: () => void;
}

export function ActiveMeetupSession({ session, meetupId, onClose }: ActiveMeetupSessionProps) {
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchMeetup();

    // 1. Subscribe to Live Updates (See the other person move)
    const channel = supabase.channel(`meetup:${meetupId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetups', filter: `id=eq.${meetupId}` }, (payload) => {
         setMeetup(payload.new as Meetup);
      })
      .subscribe();

    // 2. Start Broadcasting My Location
    startTracking();

    return () => {
      supabase.removeChannel(channel);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const fetchMeetup = async () => {
    const { data } = await supabase.from('meetups').select('*').eq('id', meetupId).single();
    if(data) setMeetup(data);
  };

  const startTracking = () => {
    if (!navigator.geolocation) return;
    
    watchIdRef.current = navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!meetupId || !session?.user?.id) return;

        // Determine if I am Host or Guest to update the correct column
        // We fetch the record once to know our role, or pass it in. 
        // For simplicity, we assume the component knows via the fetched 'meetup' state, 
        // but since state is async, we do a quick check here or in the update query.
        
        // Optimistic update query: Update based on user ID match
        const updates: any = {};
        // We can't know for sure without the meetup data, but we can try to update both based on ID match logic in SQL
        // Easier approach: update specific columns based on fetched data role.
        
        // Wait for meetup data to load first
        const { data } = await supabase.from('meetups').select('host_id, guest_id').eq('id', meetupId).single();
        if(!data) return;

        if (data.host_id === session.user.id) {
            await supabase.from('meetups').update({ host_lat: latitude, host_lng: longitude }).eq('id', meetupId);
        } else if (data.guest_id === session.user.id) {
            await supabase.from('meetups').update({ guest_lat: latitude, guest_lng: longitude }).eq('id', meetupId);
        }

    }, (err) => console.error(err), { enableHighAccuracy: true });
  };

  const stopSession = async () => {
      const confirm = window.confirm("End this location sharing session?");
      if(!confirm) return;
      await supabase.from('meetups').update({ is_active: false }).eq('id', meetupId);
      onClose();
  };

  if (!meetup) return <div className="p-4 text-center">Loading secure connection...</div>;
  if (!meetup.is_active) return <div className="p-4 text-center text-red-500">Session Ended</div>;

  const isHost = meetup.host_id === session.user.id;
  
  // Coordinates to display
  const myLat = isHost ? meetup.host_lat : meetup.guest_lat;
  const myLng = isHost ? meetup.host_lng : meetup.guest_lng;
  const otherLat = isHost ? meetup.guest_lat : meetup.host_lat;
  const otherLng = isHost ? meetup.guest_lng : meetup.host_lng;

  const hasBothLocations = myLat && myLng && otherLat && otherLng;
  const center: [number, number] = myLat && myLng ? [myLat, myLng] : [15.4226, 73.9829]; // Default GEC

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-5">
        {/* Header */}
        <div className="bg-white p-4 shadow-md border-b flex justify-between items-center z-10">
            <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Live Meetup
                </h2>
                <p className="text-xs text-slate-500">Sharing location with {isHost ? 'Guest' : 'Host'}</p>
            </div>
            <button onClick={stopSession} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold border border-red-200">
                End Session
            </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
            <MapContainer center={center} zoom={18} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* Me */}
                {myLat && myLng && (
                    <Marker position={[myLat, myLng]} icon={meIcon}>
                        <Popup>You</Popup>
                    </Marker>
                )}

                {/* Them */}
                {otherLat && otherLng && (
                    <Marker position={[otherLat, otherLng]} icon={otherPersonIcon}>
                        <Popup>Them</Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Info Overlay */}
            <div className="absolute bottom-8 left-4 right-4 bg-white p-3 rounded-xl shadow-xl z-[500] border border-slate-200 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <Navigation size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">
                        {hasBothLocations ? 'Tracking Active' : 'Waiting for location...'}
                    </p>
                    <p className="text-xs text-slate-500">
                        {hasBothLocations ? 'Both users connected' : 'One user has not enabled GPS yet'}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}