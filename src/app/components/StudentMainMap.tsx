import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, Calendar, Bell, Home, Users, LogOut, User as UserIcon, 
  ChevronRight, Lock, AlertTriangle, Navigation, Map as MapIcon 
} from 'lucide-react';
import { GEC_CENTER, locations, CAMPUS_ROADS } from '../data/mockData';
import { NotificationList } from './NotificationList';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

// Import Logo (Double jump .. to reach assets)
import LogoSrc from '../../assets/logo.jpeg';

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

// Custom Markers for Map (Teal)
const createCustomIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- SOS STATE ---
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [activeSOSSignals, setActiveSOSSignals] = useState<any[]>([]);
  const [currentSOSId, setCurrentSOSId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const userInitial = isGuest ? "G" : (session?.user?.email?.charAt(0).toUpperCase() || "U");
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 1. Fetch Active SOS Signals & Restore State on Load
  useEffect(() => {
    const fetchSOS = async () => {
      const { data } = await supabase.from('sos_signals').select('*').eq('status', 'active');
      if(data) {
          setActiveSOSSignals(data);
          if (session?.user?.id) {
              const mySignal = data.find(s => s.user_id === session.user.id);
              if (mySignal) {
                  setIsSOSActive(true);
                  setCurrentSOSId(mySignal.id);
                  startLocationTracking(mySignal.id); 
              }
          }
      }
    };

    fetchSOS();

    const channel = supabase.channel('public:sos_signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_signals' }, (payload) => {
        if(payload.eventType === 'INSERT') {
            setActiveSOSSignals(prev => {
                if (prev.find(s => s.id === payload.new.id)) return prev;
                if (payload.new.user_id !== session?.user?.id) toast.error("⚠️ EMERGENCY SIGNAL DETECTED NEARBY");
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

  const startLocationTracking = (signalId: string) => {
      if (!navigator.geolocation) return;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

      watchIdRef.current = navigator.geolocation.watchPosition(async (newPos) => {
          await supabase.from('sos_signals').update({
              lat: newPos.coords.latitude,
              lng: newPos.coords.longitude,
              updated_at: new Date().toISOString()
          }).eq('id', signalId);
      }, (err) => console.error(err), { enableHighAccuracy: true });
  };

  const toggleSOS = async () => {
    if (isGuest) { alert("Guests cannot use SOS."); return; }
    
    if (isSOSActive) {
      setIsSOSActive(false);
      if (currentSOSId) setActiveSOSSignals(prev => prev.filter(s => s.id !== currentSOSId));
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      if (currentSOSId) await supabase.from('sos_signals').update({ status: 'resolved' }).eq('id', currentSOSId);
      setCurrentSOSId(null);
      toast.success("SOS Signal Deactivated");
    } else {
      const confirm = window.confirm("ACTIVATE EMERGENCY MODE?\n\nThis will share your live location.");
      if (!confirm) return;

      setIsSOSActive(true);
      toast.error("SOS ACTIVE: Broadcasting Location...");

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { data, error } = await supabase.from('sos_signals').insert({
          user_id: session.user.id, lat: pos.coords.latitude, lng: pos.coords.longitude, status: 'active'
        }).select().single();

        if (error || !data) {
            setIsSOSActive(false);
            toast.error("Failed to activate SOS");
        } else {
            setCurrentSOSId(data.id);
            setActiveSOSSignals(prev => [...prev, data]);
            startLocationTracking(data.id);
        }
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) onNavigateToSearch(searchQuery);
  };

  if (activeTab === 'notifications' && !isGuest) {
    return <NotificationList notifications={notifications} onBack={onNavigateBackToMap} onVote={onVote} />;
  }

  return (
    <div className="h-full w-full relative bg-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* --- FLOATING HEADER (Logo + Search) --- */}
      {!isSOSActive && (
      <div className="absolute top-0 left-0 w-full z-[500] p-4 flex flex-col gap-3 pointer-events-none">
        {/* Top Row: Logo & Bell */}
        <div className="flex justify-between items-center pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                <img src={LogoSrc} alt="Logo" className="w-6 h-6 object-contain" />
                <span className="text-xs font-bold text-slate-800">GEC Navigator</span>
            </div>
            {!isGuest && (
            <button onClick={onNavigateToNotifications} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-slate-600 border border-white/50 relative hover:scale-105 transition-transform">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white"></span>}
            </button>
            )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="pointer-events-auto shadow-xl shadow-slate-200/50">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white/95 backdrop-blur-xl border-0 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-sm font-medium"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute inset-y-0 right-1.5 flex items-center">
                    <div className="bg-cyan-500 p-2 rounded-xl text-white shadow-md shadow-cyan-200 hover:bg-cyan-600 transition-colors">
                        <Navigation size={16} fill="currentColor" />
                    </div>
                </button>
            </div>
        </form>
      </div>
      )}

      {/* --- SOS HEADER (Only visible during Emergency) --- */}
      {isSOSActive && (
        <div className="absolute top-0 left-0 w-full z-[600] bg-red-600 text-white p-3 flex justify-between items-center shadow-lg animate-pulse">
            <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="fill-current w-5 h-5" />
                <span>EMERGENCY MODE ACTIVE</span>
            </div>
            <button onClick={toggleSOS} className="bg-white text-red-600 px-4 py-1 rounded-full text-xs font-extrabold border-2 border-red-100 shadow-md">
                STOP
            </button>
        </div>
      )}

      {/* --- MAP LAYER --- */}
      <div className="flex-1 z-0 relative">
        <MapContainer center={[GEC_CENTER.lat, GEC_CENTER.lng]} zoom={18} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {CAMPUS_ROADS.map((road, i) => (
               <Polyline key={i} positions={road} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5 }} />
            ))}
            
            {locations.map(loc => (
              <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={createCustomIcon('#06b6d4')}>
                   <Popup className="font-sans font-bold text-slate-700">{loc.name}</Popup>
              </Marker>
            ))}

            {activeSOSSignals.map(signal => (
               <Marker key={signal.id} position={[signal.lat, signal.lng]} icon={sosIcon}>
                  <Popup className="text-red-600 font-bold">⚠️ SOS ACTIVE</Popup>
               </Marker>
            ))}
        </MapContainer>

        {/* SOS FAB (Floating Action Button) */}
        {!isGuest && !isSOSActive && (
            <button onClick={toggleSOS} className="absolute bottom-6 right-4 z-[500] w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-white/20">
                <AlertTriangle size={24} />
            </button>
        )}
      </div>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="bg-white border-t border-slate-100 px-6 py-3 pb-6 flex justify-between items-center z-[500] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl relative">
          
          <NavButton active={activeTab === 'home'} onClick={onNavigateBackToMap} icon={MapIcon} label="Map" />
          
          <NavButton 
            active={activeTab === 'community'} 
            onClick={() => !isGuest && onNavigateToPosts()} 
            icon={Users} label="Social" disabled={isGuest} 
          />

          <div className="-mt-8">
              <button 
                onClick={() => !isGuest && onNavigateToEvents()}
                disabled={isGuest}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform ring-4 ring-white ${isGuest ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-200'}`}
              >
                  <Calendar size={24} />
              </button>
              <span className="text-[10px] font-bold text-slate-400 text-center block mt-1">Events</span>
          </div>

          <NavButton 
            active={activeTab === 'notifications'} 
            onClick={() => !isGuest && onNavigateToNotifications()} 
            icon={Bell} label="Alerts" disabled={isGuest} 
          />

          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => !isGuest && onNavigateToProfile()} 
            icon={UserIcon} label="Profile" disabled={isGuest} 
          />
      </div>
    </div>
  );
}

// Helper Component for Nav Buttons
function NavButton({ active, onClick, icon: Icon, label, disabled }: any) {
    return (
        <button 
            onClick={onClick} 
            disabled={disabled}
            className={`flex flex-col items-center gap-1 min-w-[3rem] group ${disabled ? 'opacity-40' : ''}`}
        >
            <Icon 
                size={24} 
                className={`transition-colors ${active ? 'text-cyan-600 fill-cyan-100' : 'text-slate-300 group-hover:text-slate-400'}`} 
                strokeWidth={active ? 2.5 : 2}
            />
            <span className={`text-[10px] font-bold transition-colors ${active ? 'text-cyan-600' : 'text-slate-300'}`}>
                {label}
            </span>
            {disabled && <Lock size={10} className="absolute top-0 right-2 text-slate-400" />}
        </button>
    );
}