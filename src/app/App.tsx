import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { Session } from '@supabase/supabase-js'; 
import { Toaster, toast } from 'sonner';
import { locations as localLocations } from './data/mockData';

// Components
import { StudentMainMap } from './components/StudentMainMap';
import { StaffSearchResult } from './components/StaffSearchResult';
import { ActiveNavigation } from './components/ActiveNavigation';
import { EventsDashboard } from './components/EventsDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAddStaff } from './components/AdminAddStaff';
import { AdminPathDrawing } from './components/AdminPathDrawing';
import { LocationPicker } from './components/LocationPicker';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanoramaUpload } from './components/AdminPanoramaUpload';
import { AdminEventManagement } from './components/AdminEventManagement';
import { AdminNotificationSender } from './components/AdminNotificationSender';
import { AdminBusManagement } from './components/AdminBusManagement'; // <--- NEW IMPORT
import { PostsDashboard } from './components/PostsDashboard'; 
import { UserProfile } from './components/UserProfile'; 
import { LostAndFound } from './components/LostAndFound';
import { BusSchedule } from './components/BusSchedule'; 
import Auth from './components/Auth'; 

// UI
import { Button } from './components/ui/button';
import { Shield, LogOut } from 'lucide-react';

// Types
import { UserRole, Notification } from './types';

type Screen = 
  | 'auth' | 'student-map' | 'staff-detail' | 'navigation' | 'events' 
  | 'community' | 'profile' | 'lost-found' | 'bus-schedule'
  | 'admin-dashboard' | 'admin-add-staff' | 'admin-path-drawing' 
  | 'admin-pick-location' | 'admin-panorama' | 'admin-events' 
  | 'admin-notifications' | 'admin-bus'; // <--- ADDED ADMIN BUS SCREEN

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // --- DATA STATE ---
  const [staffList, setStaffList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null); 
  
  // State to track whose profile we are viewing
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('home');
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);

  // --- 1. AUTH CHECK ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentScreen('student-map');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setCurrentScreen('student-map');
      else setCurrentScreen('auth');
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- 2. FETCH DATA & NOTIFICATIONS ---
  useEffect(() => {
    const fetchData = async () => {
        // A. Fetch Staff
        const { data: staffData } = await supabase.from('staff').select('*');
        if (staffData) {
            const mappedStaff = staffData.map(s => ({ ...s, locationId: s.id, description: s.department }));
            setStaffList(mappedStaff);
        }
        
        // B. Fetch Events
        const { data: eventData } = await supabase.from('events').select('*');
        if (eventData) setEventsList(eventData);

        // C. Fetch Notifications
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.id !== 'guest') {
            const { data: noteData } = await supabase
                .from('notifications')
                .select('*, profiles:actor_id(full_name)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            
            if (noteData) setNotifications(noteData);
        }
    };

    fetchData();

    // D. Realtime Listener for Notifications
    const channel = supabase.channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
             supabase.auth.getSession().then(({ data: { session } }) => {
                 // Only alert if the notification belongs to the logged-in user
                 if (session && payload.new.user_id === session.user.id) {
                     fetchData(); // Refresh the list
                     toast.info("New Notification received!");
                 }
             });
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // --- HELPER: RESOLVE SELECTED OBJECTS ---
  const selectedStaff = selectedStaffId ? staffList.find(s => s.id === selectedStaffId) : null;
  const selectedLocation = selectedLocationId 
    ? localLocations.find(l => l.id === selectedLocationId)
    : (selectedStaff && selectedStaff.lat) 
        ? { id: selectedStaff.id, name: selectedStaff.cabin_location || "Staff Cabin", lat: selectedStaff.lat, lng: selectedStaff.lng, type: 'cabin', panorama: selectedStaff.cabin_panorama_url }
        : (selectedEventId)
            ? (() => {
                const evt = eventsList.find(e => e.id === selectedEventId);
                return evt && evt.lat ? { id: evt.id, name: evt.venue_name, lat: evt.lat, lng: evt.lng, type: 'event', panorama: evt.venue_panorama_url } : null;
            })()
        : null;

  // --- HANDLERS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  const handleGuestLogin = () => {
    setSession({ user: { id: 'guest', email: 'guest@gec.ac.in' }, access_token: 'guest-token' } as any);
    setUserRole('student');
    setCurrentScreen('student-map');
    toast.success("Welcome, Guest!");
  };

  const handleAdminLoginSuccess = () => {
    setUserRole('admin');
    setCurrentScreen('admin-dashboard');
  };

  const handleLocationConfirmed = (lat: number, lng: number) => {
    setTempLocation({ lat, lng });
    setCurrentScreen('admin-add-staff');
  };

  const handleViewUserProfile = (userId: string) => {
      setViewingProfileId(userId);
      setCurrentScreen('profile');
  };

  const handleSearch = (query: string) => {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery === 'admin mode') { setShowAdminModal(true); return; }
    
    setSelectedStaffId(null); setSelectedLocationId(null); setSelectedEventId(null);

    const location = localLocations.find(l => l.name.toLowerCase().includes(lowerQuery) || l.building.toLowerCase().includes(lowerQuery));
    if (location) {
        setSelectedLocationId(location.id);
        setCurrentScreen('navigation');
        setActiveTab('search');
        toast.success(`Found: ${location.name}`);
        return;
    }

    const staff = staffList.find(s => s.name.toLowerCase().includes(lowerQuery));
    if (staff) {
        setSelectedStaffId(staff.id);
        if(!staff.lat && staff.locationId) setSelectedLocationId(staff.locationId); 
        setCurrentScreen('staff-detail');
        setActiveTab('search');
        return;
    }

    const event = eventsList.find(e => e.title.toLowerCase().includes(lowerQuery));
    if (event) {
        setSelectedEventId(event.id);
        setCurrentScreen('navigation');
        setActiveTab('search');
        toast.success(`Found Event: ${event.title}`);
        return;
    }
    toast.error('No matching Department, Staff, or Event found');
  };

  // --- RENDER ---
  return (
    <div className="h-screen overflow-hidden bg-white relative">
      <AdminLoginModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} onLoginSuccess={handleAdminLoginSuccess} />

      {currentScreen !== 'auth' && (
        <div className="fixed top-4 right-4 z-[900]">
          <Button onClick={() => { if (userRole === 'admin') { setUserRole('student'); setCurrentScreen('student-map'); } else { setShowAdminModal(true); } }} className={`shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border ${userRole === 'admin' ? 'bg-slate-900 text-white' : 'bg-white text-gray-700'}`}>
            {userRole === 'student' ? <><Shield className="w-4 h-4 text-[#0056b3]" /><span className="text-sm">Admin</span></> : <><LogOut className="w-4 h-4 text-red-400" /><span className="text-sm">Exit</span></>}
          </Button>
        </div>
      )}

      {currentScreen === 'auth' && (
        <div className="h-full flex flex-col justify-center items-center bg-gray-50">
           <h1 className="text-2xl font-bold mb-2 text-[#0056b3]">Campus Connect</h1>
           <Auth onGuestLogin={handleGuestLogin} />
           <button onClick={() => setShowAdminModal(true)} className="fixed bottom-4 text-xs text-gray-300 underline">Admin Access</button>
        </div>
      )}

      {currentScreen === 'student-map' && (
        <StudentMainMap
          onNavigateToLostFound={() => setCurrentScreen('lost-found')}
          onNavigateToBus={() => setCurrentScreen('bus-schedule')} // <--- CONNECTED HERE
          onNavigateToSearch={handleSearch}
          onNavigateToEvents={() => { setCurrentScreen('events'); setActiveTab('events'); }}
          onNavigateToNotifications={() => setActiveTab('notifications')}
          onNavigateToPosts={() => { setCurrentScreen('community'); setActiveTab('community'); }}
          onNavigateBackToMap={() => setActiveTab('home')}
          onNavigateToProfile={() => { 
             setViewingProfileId(session?.user?.id || null); 
             setCurrentScreen('profile'); 
          }}
          activeTab={activeTab}
          notifications={notifications}
          onVote={() => {}}
          session={session}
          onLogout={handleLogout}
          isGuest={session?.user?.id === 'guest'}
          staffList={staffList} 
          eventList={eventsList}
        />
      )}

      {currentScreen === 'community' && session && (
        <PostsDashboard 
            onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }} 
            onViewUser={handleViewUserProfile}
        />
      )}

      {currentScreen === 'profile' && session && (
        <UserProfile 
            session={session} 
            targetUserId={viewingProfileId} 
            onBack={() => { 
                if(viewingProfileId && viewingProfileId !== session.user.id) {
                    setCurrentScreen('community');
                } else {
                    setCurrentScreen('student-map'); 
                }
                setViewingProfileId(null);
            }} 
            onLogout={handleLogout} 
        />
      )}

      {currentScreen === 'lost-found' && (
         <LostAndFound 
            onBack={() => setCurrentScreen('student-map')} 
            onViewUser={handleViewUserProfile} 
         />
      )}

      {currentScreen === 'bus-schedule' && (
         <BusSchedule onBack={() => setCurrentScreen('student-map')} />
      )}

      {currentScreen === 'staff-detail' && selectedStaff && <StaffSearchResult staff={selectedStaff} location={selectedLocation || undefined} onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }} onNavigate={() => setCurrentScreen('navigation')} />}
      {currentScreen === 'navigation' && selectedLocation && <ActiveNavigation destination={selectedLocation} relatedEventId={selectedEventId} relatedStaffId={selectedStaffId} onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }} />}
      {currentScreen === 'events' && <EventsDashboard events={eventsList} onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }} onShowVenue={(locId, eventId) => { setSelectedEventId(eventId); setCurrentScreen('navigation'); }} />}
      
      {/* Admin Screens */}
      {currentScreen === 'admin-dashboard' && (
        <AdminDashboard 
            onManageStaff={() => { setTempLocation(null); setCurrentScreen('admin-add-staff'); }} 
            onDrawPaths={() => setCurrentScreen('admin-path-drawing')} 
            onManagePanorama={() => setCurrentScreen('admin-panorama')} 
            onManageEvents={() => setCurrentScreen('admin-events')} 
            onManageNotifications={() => setCurrentScreen('admin-notifications')} 
            onManageBus={() => setCurrentScreen('admin-bus')} // <--- CONNECTED HERE
            onSwitchToStudent={() => { setUserRole('student'); setCurrentScreen('student-map'); }} 
        />
      )}
      
      {currentScreen === 'admin-add-staff' && <AdminAddStaff onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-pick-location' && <LocationPicker onBack={() => setCurrentScreen('admin-add-staff')} onConfirm={handleLocationConfirmed} />}
      {currentScreen === 'admin-path-drawing' && <AdminPathDrawing onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-panorama' && <AdminPanoramaUpload onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-events' && <AdminEventManagement onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-notifications' && <AdminNotificationSender onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-bus' && <AdminBusManagement onBack={() => setCurrentScreen('admin-dashboard')} />} 

      <Toaster position="top-center" />
    </div>
  );
}