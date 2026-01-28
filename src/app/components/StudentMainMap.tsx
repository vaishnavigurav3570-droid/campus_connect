import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { Search, Calendar, Bell, Home, Users, LogOut, User as UserIcon, ChevronRight } from 'lucide-react';
import { GEC_CENTER, locations, CAMPUS_ROADS } from '../data/mockData';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NotificationList } from './NotificationList';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface StudentMainMapProps {
  onNavigateToSearch: (query: string) => void;
  onNavigateToEvents: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToCommunity: () => void;
  onNavigateBackToMap: () => void;
  onNavigateToProfile: () => void; // <--- NEW PROP
  activeTab: string;
  notifications: any[];
  onVote: (noteId: string, optionId: string) => void;
  session: any;
  onLogout: () => void;
}

export function StudentMainMap({ 
  onNavigateToSearch, 
  onNavigateToEvents, 
  onNavigateToNotifications,
  onNavigateToCommunity,
  onNavigateBackToMap,
  onNavigateToProfile, // <--- Destructure it
  activeTab,
  notifications,
  onVote,
  session,
  onLogout
}: StudentMainMapProps) {
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  if (activeTab === 'notifications') {
    return (
      <NotificationList 
        notifications={notifications} 
        onBack={onNavigateBackToMap}
        onVote={onVote} 
      />
    );
  }

  const userInitial = session?.user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative w-full h-full bg-slate-50 flex flex-col">
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={[GEC_CENTER.lat, GEC_CENTER.lng]} 
          zoom={18} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {CAMPUS_ROADS.map((road, i) => (
             <Polyline key={i} positions={road} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5 }} />
          ))}

          {locations.map(loc => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]}></Marker>
          ))}
        </MapContainer>

        <div className="absolute top-4 left-4 right-4 z-[500]">
          <div className="bg-white rounded-xl shadow-lg flex items-center p-3 border border-slate-200">
            <Search className="w-5 h-5 text-slate-400 ml-1" />
            <input 
              type="text"
              placeholder="Search faculty, labs, or rooms..."
              className="flex-1 ml-3 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNavigateToSearch(e.currentTarget.value);
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-t p-2 pb-6 flex justify-between items-end px-4 z-10 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] relative">
        
        <button 
          onClick={onNavigateBackToMap}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Map</span>
        </button>

        <button 
          onClick={onNavigateToEvents}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'events' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Calendar className={`w-6 h-6 ${activeTab === 'events' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Events</span>
        </button>

        <button 
          onClick={onNavigateToCommunity}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'community' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Users className={`w-6 h-6 ${activeTab === 'community' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Social</span>
        </button>

        <button 
          onClick={onNavigateToNotifications}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'notifications' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="relative">
            <Bell className={`w-6 h-6 ${activeTab === 'notifications' ? 'fill-current' : ''}`} />
            {notifications.length > 0 && (
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <span className="text-[10px] font-bold">Notices</span>
        </button>

        <div className="relative">
            {showProfileMenu && (
                <div className="absolute bottom-16 right-0 bg-white shadow-2xl rounded-2xl p-3 w-60 border border-slate-100 animate-in slide-in-from-bottom-5 zoom-in-95 z-[999]">
                    <div className="flex items-center gap-3 p-2 border-b border-slate-100 pb-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                            {userInitial}
                        </div>
                        <div className="overflow-hidden">
                             <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
                             <p className="text-sm font-bold text-slate-800 truncate w-32">{session?.user?.email}</p>
                        </div>
                    </div>
                    
                    {/* NEW: View Profile Button */}
                    <button 
                        onClick={() => { setShowProfileMenu(false); onNavigateToProfile(); }}
                        className="w-full text-left flex items-center justify-between p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors font-medium text-sm mt-1 group"
                    >
                        <span className="flex items-center gap-3">
                           <UserIcon className="w-4 h-4 text-blue-500" /> My Profile
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                    </button>

                    <button 
                        onClick={onLogout}
                        className="w-full text-left flex items-center gap-3 p-3 hover:bg-red-50 text-red-600 rounded-xl transition-colors font-medium text-sm mt-1"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            )}

            <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${showProfileMenu ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${showProfileMenu ? 'border-blue-600 bg-blue-50' : 'border-slate-300'}`}>
                    <UserIcon className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-bold">Profile</span>
            </button>
        </div>

      </div>
    </div>
  );
}