import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Search, Calendar, Bell, Home, Users, LogOut, User as UserIcon, ChevronRight, Lock, AlertTriangle } from 'lucide-react';
import { GEC_CENTER, locations, CAMPUS_ROADS } from '../data/mockData';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NotificationList } from './NotificationList';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

// --- ICONS ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom SOS Icon (Red & Pulsing)
const sosIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4); animation: pulse 1.5s infinite;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

interface StudentMainMapProps {
  onNavigateToSearch: (query: string) => void;
  onNavigateToEvents: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToPosts: () => void;
  onNavigateBackToMap: () => void;
  onNavigateToProfile: () => void;
  activeTab: string;
  notifications: any[];
  onVote: (noteId: string, optionId: string) => void;
  session: any;
  onLogout: () => void;
  isGuest?: boolean;
}

export function StudentMainMap({ 
  onNavigateToSearch, 
  onNavigateToEvents, 
  onNavigateToNotifications,
  onNavigateToPosts,
  onNavigateBackToMap,
  onNavigateToProfile,
  activeTab,
  notifications,
  onVote,
  session,
  onLogout,
  isGuest = false 
}: StudentMainMapProps) {
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // --- SOS STATE ---
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [activeSOSSignals, setActiveSOSSignals] = useState<any[]>([]);
  const [currentSOSId, setCurrentSOSId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const userInitial = isGuest ? "G" : (session?.user?.email?.charAt(0).toUpperCase() || "U");

  // 1. Fetch Active SOS Signals & Restore State on Load
  useEffect(() => {
    const fetchSOS = async () => {
      const { data } = await supabase.from('sos_signals').select('*').eq('status', 'active');
      if(data) {
          setActiveSOSSignals(data);
          
          // Check if I ALREADY have an active SOS running (e.g. after refresh)
          if (session?.user?.id) {
              const mySignal = data.find(s => s.user_id === session.user.id);
              if (mySignal) {
                  setIsSOSActive(true);
                  setCurrentSOSId(mySignal.id);
                  // Restart tracking if we found an existing active signal
                  startLocationTracking(mySignal.id); 
              }
          }
      }
    };

    fetchSOS();

    // Realtime Listener
    const channel = supabase.channel('public:sos_signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_signals' }, (payload) => {
        if(payload.eventType === 'INSERT') {
            setActiveSOSSignals(prev => {
                if (prev.find(s => s.id === payload.new.id)) return prev;
                // Only toast if it's NOT me
                if (payload.new.user_id !== session?.user?.id) {
                     toast.error("⚠️ EMERGENCY SIGNAL DETECTED NEARBY");
                }
                return [...prev, payload.new];
            });
        } 
        else if (payload.eventType === 'UPDATE') {
            setActiveSOSSignals(prev => {
                if (payload.new.status !== 'active') return prev.filter(s => s.id !== payload.new.id);
                return prev.map(s => s.id === payload.new.id ? payload.new : s);
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Helper: Start Tracking
  const startLocationTracking = (signalId: string) => {
      if (!navigator.geolocation) return;
      
      // Clear any existing watch first
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

      watchIdRef.current = navigator.geolocation.watchPosition(async (newPos) => {
          console.log("📍 Updating SOS Location...", newPos.coords);
          await supabase.from('sos_signals').update({
              lat: newPos.coords.latitude,
              lng: newPos.coords.longitude,
              updated_at: new Date().toISOString()
          }).eq('id', signalId);
      }, (err) => console.error(err), { enableHighAccuracy: true });
  };

  // 2. Handle SOS Activation/Deactivation
  const toggleSOS = async () => {
    if (isGuest) {
        alert("Guests cannot use SOS. Please contact security directly.");
        return;
    }
    
    // --- STOP SOS ---
    if (isSOSActive) {
      toast.dismiss(); // Clear existing toasts
      
      // 1. UI Updates (Instant)
      setIsSOSActive(false);
      
      // 2. Remove Marker Instantly (Don't wait for DB)
      if (currentSOSId) {
          setActiveSOSSignals(prev => prev.filter(s => s.id !== currentSOSId));
      }

      // 3. Stop Tracking
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      
      // 4. DB Update (Async)
      if (currentSOSId) {
        await supabase.from('sos_signals').update({ status: 'resolved' }).eq('id', currentSOSId);
      }
      setCurrentSOSId(null);
      toast.success("SOS Signal Deactivated");

    } else {
      // --- START SOS ---
      const confirm = window.confirm("ACTIVATE EMERGENCY MODE?\n\nThis will share your live location with Campus Security and other users.");
      if (!confirm) return;

      setIsSOSActive(true);
      toast.error("SOS ACTIVE: Broadcasting Location...");

      if (!navigator.geolocation) {
          alert("Geolocation is not supported.");
          return;
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        
        const { data, error } = await supabase.from('sos_signals').insert({
          user_id: session.user.id,
          lat: latitude,
          lng: longitude,
          status: 'active'
        }).select().single();

        if (error) {
            console.error(error);
            toast.error("Failed to activate SOS");
            setIsSOSActive(false);
            return;
        }

        if (data) {
          setCurrentSOSId(data.id);
          // Add myself to the map immediately
          setActiveSOSSignals(prev => [...prev, data]);
          // Start live tracking
          startLocationTracking(data.id);
        }
      });
    }
  };

  if (activeTab === 'notifications' && !isGuest) {
    return (
      <NotificationList 
        notifications={notifications} 
        onBack={onNavigateBackToMap}
        onVote={onVote} 
      />
    );
  }

  const GuestLock = () => isGuest ? <div className="absolute -top-1 -right-1 bg-gray-100 rounded-full p-0.5"><Lock size={10} className="text-gray-400"/></div> : null;

  return (
    <div className="relative w-full h-full bg-slate-50 flex flex-col">
      
      {/* SOS OVERLAY HEADER (Visible only when SOS is active for YOU) */}
      {isSOSActive && (
        <div className="bg-red-600 text-white p-3 z-[600] flex justify-between items-center shadow-lg animate-pulse">
            <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="fill-current w-5 h-5" />
                <span>EMERGENCY MODE ACTIVE</span>
            </div>
            <button onClick={toggleSOS} className="bg-white text-red-600 px-4 py-1 rounded-full text-xs font-extrabold border-2 border-red-100 shadow-md hover:bg-red-50">
                STOP BROADCAST
            </button>
        </div>
      )}

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

          {/* Static Locations */}
          {locations.map(loc => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]}></Marker>
          ))}

          {/* LIVE SOS SIGNALS (Red Pulsing Markers) */}
          {activeSOSSignals.map(signal => (
             <Marker key={signal.id} position={[signal.lat, signal.lng]} icon={sosIcon}>
                <Popup className="text-red-600 font-bold">⚠️ SOS: HELP NEEDED HERE</Popup>
             </Marker>
          ))}

        </MapContainer>

        {/* Search Bar (Hidden during SOS) */}
        {!isSOSActive && (
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
        )}

        {/* SOS FAB (Floating Action Button) */}
        {!isGuest && (
            <button 
                onClick={toggleSOS}
                className={`absolute bottom-6 right-4 z-[500] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isSOSActive ? 'bg-white text-red-600 border-4 border-red-600 scale-110' : 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'}`}
            >
                <AlertTriangle size={24} className={isSOSActive ? 'animate-bounce' : ''} />
            </button>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t p-2 pb-6 flex justify-between items-end px-4 z-10 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] relative">
        
        <button 
          onClick={onNavigateBackToMap}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Map</span>
        </button>

        <button 
          onClick={() => !isGuest && onNavigateToPosts()}
          className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'posts' ? 'text-blue-600' : isGuest ? 'opacity-40 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Users className={`w-6 h-6 ${activeTab === 'posts' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Social</span>
          <GuestLock />
        </button>

        <button 
          onClick={() => !isGuest && onNavigateToEvents()}
          className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'events' ? 'text-blue-600' : isGuest ? 'opacity-40 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Calendar className={`w-6 h-6 ${activeTab === 'events' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Events</span>
          <GuestLock />
        </button>

        <button 
          onClick={() => !isGuest && onNavigateToNotifications()}
          className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${activeTab === 'notifications' ? 'text-blue-600' : isGuest ? 'opacity-40 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="relative">
            <Bell className={`w-6 h-6 ${activeTab === 'notifications' ? 'fill-current' : ''}`} />
            {!isGuest && notifications.length > 0 && (
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <span className="text-[10px] font-bold">Notices</span>
          <GuestLock />
        </button>

        <div className="relative">
            {showProfileMenu && (
                <div className="absolute bottom-16 right-0 bg-white shadow-2xl rounded-2xl p-3 w-60 border border-slate-100 animate-in slide-in-from-bottom-5 zoom-in-95 z-[999]">
                    <div className="flex items-center gap-3 p-2 border-b border-slate-100 pb-3 mb-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isGuest ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {userInitial}
                        </div>
                        <div className="overflow-hidden">
                             <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
                             <p className="text-sm font-bold text-slate-800 truncate w-32">{isGuest ? 'Guest Visitor' : session?.user?.email}</p>
                        </div>
                    </div>
                    
                    {!isGuest && (
                    <button 
                        onClick={() => { setShowProfileMenu(false); onNavigateToProfile(); }}
                        className="w-full text-left flex items-center justify-between p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors font-medium text-sm mt-1 group"
                    >
                        <span className="flex items-center gap-3">
                           <UserIcon className="w-4 h-4 text-blue-500" /> My Profile
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                    </button>
                    )}

                    <button 
                        onClick={onLogout}
                        className="w-full text-left flex items-center gap-3 p-3 hover:bg-red-50 text-red-600 rounded-xl transition-colors font-medium text-sm mt-1"
                    >
                        <LogOut className="w-4 h-4" /> {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
                    </button>
                </div>
            )}

            <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${showProfileMenu ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${showProfileMenu ? 'border-blue-600 bg-blue-50' : 'border-slate-300'} ${isGuest ? 'bg-orange-50 border-orange-300' : ''}`}>
                    <UserIcon className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-bold">Profile</span>
            </button>
        </div>

      </div>
    </div>
  );
}