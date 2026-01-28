import React, { useState, useEffect } from 'react';

import { MapContainer, TileLayer, Marker, Polyline, useMap, CircleMarker } from 'react-leaflet';

import { Button } from './ui/button';

import { ArrowLeft, Footprints, Eye, MapPin } from 'lucide-react';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import { CAMPUS_ROADS, PANORAMA_DATA } from '../data/mockData';

import { buildGraphAndFindPath } from './ui/pathfinding';

import { PanoramaViewer } from './PanoramaViewer';



import icon from 'leaflet/dist/images/marker-icon.png';

import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DestinationIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });



function AutoRecenter({ userPos, routeCoords }: any) {

  const map = useMap();

  useEffect(() => {

    if (routeCoords.length > 0) {

      map.fitBounds(L.latLngBounds(routeCoords), { padding: [50, 50] });

    } else if (userPos) {

      map.setView(userPos, 18);

    }

  }, [userPos, routeCoords, map]);

  return null;

}



// UPDATED: Now accepts relatedStaffId

export function ActiveNavigation({ destination, relatedEventId, relatedStaffId, onBack }: any) {

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [routePath, setRoutePath] = useState<{lat: number, lng: number}[]>([]);

  const [distance, setDistance] = useState<number>(0);

 

  // --- TWO SEPARATE IMAGE STATES ---

  const [destPano, setDestPano] = useState<string | null>(null);

  const [turnPano, setTurnPano] = useState<string | null>(null);

 

  // Viewer State

  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const [viewerTitle, setViewerTitle] = useState<string>('');

 

  const [allPanoramas, setAllPanoramas] = useState<Record<string, string>>({});



  useEffect(() => {

    const localData = JSON.parse(localStorage.getItem('gec_panoramas') || '{}');

    setAllPanoramas({ ...PANORAMA_DATA, ...localData });

  }, []);



  useEffect(() => {

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(

      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),

      (err) => console.error(err),

      { enableHighAccuracy: true }

    );

    return () => navigator.geolocation.clearWatch(watchId);

  }, []);



  useEffect(() => {

    if (!userLocation || !destination) return;



    // A. Pathfinding

    const path = buildGraphAndFindPath(

      userLocation,

      { lat: destination.lat, lng: destination.lng },

      CAMPUS_ROADS

    );

    setRoutePath(path);



    // B. Distance

    let totalDist = 0;

    for(let i=0; i<path.length-1; i++) {

      totalDist += L.latLng(path[i]).distanceTo(path[i+1]);

    }

    setDistance(Math.round(totalDist));



    // --- C. PURPLE EYE LOGIC (Destination) ---

    // Priority: Event ID > Staff ID > Location ID

    let foundDestPano = null;

   

    if (relatedEventId && allPanoramas[relatedEventId]) {

      foundDestPano = allPanoramas[relatedEventId];

    }

    // NEW CHECK: If we have a staff ID, check that!

    else if (relatedStaffId && allPanoramas[relatedStaffId]) {

      foundDestPano = allPanoramas[relatedStaffId];

    }

    // Fallback: Check the building/location ID

    else if (allPanoramas[destination.id]) {

      foundDestPano = allPanoramas[destination.id];

    }

    setDestPano(foundDestPano);



    // --- D. BLUE EYE LOGIC (Turns) ---

    let foundTurnPano = null;

    Object.keys(allPanoramas).forEach(key => {

      if (key.includes(',')) {

        const [lat, lng] = key.split(',').map(Number);

        const dist = L.latLng(userLocation).distanceTo({ lat, lng });

       

        if (dist < 70) {

          foundTurnPano = allPanoramas[key];

        }

      }

    });

    setTurnPano(foundTurnPano);



  }, [userLocation, destination, allPanoramas, relatedEventId, relatedStaffId]);



  return (

    <div className="relative w-full h-full bg-gray-100 flex flex-col">

     

      {viewerImage && (

        <PanoramaViewer

          imageUrl={viewerImage}

          title={viewerTitle}

          onClose={() => setViewerImage(null)}

        />

      )}



      <div className="flex-1 relative z-0">

        <MapContainer center={[destination.lat, destination.lng]} zoom={18} style={{ height: '100%', width: '100%' }}>

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <AutoRecenter userPos={userLocation} routeCoords={routePath} />

         

          <Marker position={[destination.lat, destination.lng]} icon={DestinationIcon} />

          {userLocation && <CircleMarker center={userLocation} radius={8} pathOptions={{ color: 'white', fillColor: '#2563eb', fillOpacity: 1 }} />}



          {CAMPUS_ROADS.map((road, i) => (

             <Polyline key={i} positions={road} pathOptions={{ color: 'gray', weight: 4, opacity: 0.3 }} />

          ))}



          {routePath.length > 0 && (

            <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.9 }} />

          )}

        </MapContainer>

      </div>



      <div className="absolute top-4 left-4 z-10">

        <Button variant="secondary" size="icon" className="shadow-lg bg-white rounded-full" onClick={onBack}>

          <ArrowLeft className="w-5 h-5" />

        </Button>

      </div>



      <div className="absolute bottom-40 right-4 z-10 flex flex-col gap-3 items-end">

       

        {/* PURPLE EYE */}

        {destPano && (

          <div className="animate-in slide-in-from-right duration-500">

             <div className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full mb-1 shadow-md text-center font-bold">

               Destination

             </div>

             <Button

              onClick={() => {

                setViewerImage(destPano);

                setViewerTitle(`Inside: ${destination.name}`);

              }}

              className="rounded-full w-14 h-14 bg-white shadow-xl border-4 border-purple-500 hover:bg-purple-50 flex items-center justify-center"

            >

              <Eye className="w-6 h-6 text-purple-600" />

            </Button>

          </div>

        )}



        {/* BLUE EYE */}

        {turnPano && (

          <div className="animate-bounce">

            <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full mb-1 shadow-md text-center font-bold">

               Street View

             </div>

            <Button

              onClick={() => {

                setViewerImage(turnPano);

                setViewerTitle("Street View");

              }}

              className="rounded-full w-14 h-14 bg-white shadow-xl border-4 border-blue-500 hover:bg-blue-50 flex items-center justify-center"

            >

              <MapPin className="w-6 h-6 text-blue-600" />

            </Button>

          </div>

        )}

      </div>

     

      <div className="bg-white p-5 rounded-t-3xl shadow-lg z-10 relative">

        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        <h2 className="text-xl font-bold text-gray-800">To: {destination.name}</h2>

        <div className="mt-2 flex items-center gap-2">

             <Footprints className="w-5 h-5 text-blue-600" />

             <span className="text-lg font-bold">{distance} m</span>

             <span className="text-sm text-gray-500 ml-2">({Math.ceil(distance / 80)} min)</span>

        </div>

      </div>

    </div>

  );

} 