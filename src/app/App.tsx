import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { Session } from '@supabase/supabase-js'; 
import { Toaster, toast } from 'sonner';

// --- IMPORT LOCAL DATA ---
import { locations as localLocations } from './data/mockData'; // Import your static list

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
import { CommunityFeed } from './components/CommunityFeed'; 
import { PostsDashboard } from './components/PostsDashboard'; 
import { UserProfile } from './components/UserProfile'; 
import Auth from './components/Auth'; 

// UI
import { Button } from './components/ui/button';
import { Shield, LogOut } from 'lucide-react';

// Types
import { UserRole, Notification } from './types';

type Screen = 
  | 'auth' | 'student-map' | 'staff-detail' | 'navigation' | 'events' 
  | 'community' | 'profile' | 'admin-dashboard' | 'admin-add-staff' 
  | 'admin-path-drawing' | 'admin-pick-location' | 'admin-panorama' 
  | 'admin-events' | 'admin-notifications';

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

  // --- 2. FETCH DYNAMIC DATA (Staff & Events only) ---
  useEffect(() => {
    const fetchData = async () => {
        // A. Fetch Staff
        const { data: staffData } = await supabase.from('staff').select('*');
        if (staffData) {
            const mappedStaff = staffData.map(s => ({
                ...s,
                locationId: s.id, 
                description: s.department
            }));
            setStaffList(mappedStaff);
        }

        // B. Fetch Events
        const { data: eventData } = await supabase.from('events').select('*');
        if (eventData) {
            setEventsList(eventData);
        }
    };

    fetchData();
    
    const channel = supabase.channel('public_data')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchData)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- 3. HELPER: RESOLVE SELECTED OBJECTS ---
  const selectedStaff = selectedStaffId ? staffList.find(s => s.id === selectedStaffId) : null;
  
  // LOGIC UPDATE: Check Local Locations first
  const selectedLocation = selectedLocationId 
    ? localLocations.find(l => l.id === selectedLocationId) // <--- USES LOCAL MOCK DATA
    : (selectedStaff && selectedStaff.lat) 
        ? { 
            id: selectedStaff.id, 
            name: selectedStaff.cabin_location || "Staff Cabin", 
            lat: selectedStaff.lat, 
            lng: selectedStaff.lng, 
            type: 'cabin',
            description: selectedStaff.name + "'s Cabin",
            panorama: selectedStaff.cabin_panorama_url 
          }
        : (selectedEventId)
            ? (() => {
                const evt = eventsList.find(e => e.id === selectedEventId);
                return evt && evt.lat ? {
                    id: evt.id,
                    name: evt.venue_name,
                    lat: evt.lat,
                    lng: evt.lng,
                    type: 'event',
                    panorama: evt.venue_panorama_url
                } : null;
            })()
        : null;

  // --- HANDLERS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  const handleGuestLogin = () => {
    const guestSession: any = { user: { id: 'guest', email: 'guest@gec.ac.in' }, access_token: 'guest-token' };
    setSession(guestSession);
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

  // --- UPDATED SEARCH HANDLER (Prioritizes Local Data) ---
  const handleSearch = (query: string) => {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery === 'admin mode') {
        setShowAdminModal(true);
        return;
    }
    
    setSelectedStaffId(null);
    setSelectedLocationId(null);
    setSelectedEventId(null);

    // 1. SEARCH LOCAL LOCATIONS (Departments/Labs from mockData)
    // This is instant and doesn't need internet
    const location = localLocations.find(l => 
        l.name.toLowerCase().includes(lowerQuery) || 
        l.building.toLowerCase().includes(lowerQuery) ||
        (l.id && l.id.includes(lowerQuery))
    );

    if (location) {
        setSelectedLocationId(location.id);
        setCurrentScreen('navigation'); // Go straight to nav
        setActiveTab('search');
        toast.success(`Found: ${location.name}`);
        return;
    }

    // 2. Search Staff (From Supabase)
    const staff = staffList.find(s => s.name.toLowerCase().includes(lowerQuery) || (s.department && s.department.toLowerCase().includes(lowerQuery)));
    if (staff) {
        setSelectedStaffId(staff.id);
        if(!staff.lat && staff.locationId) setSelectedLocationId(staff.locationId); 
        setCurrentScreen('staff-detail');
        setActiveTab('search');
        return;
    }

    // 3. Search Events (From Supabase)
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

  // Notification placeholders
  const handleVote = (noteId: string, optionId: string) => { console.log('Vote', noteId, optionId); };

  return (
    <div className="h-screen overflow-hidden bg-white relative">
      <AdminLoginModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {currentScreen !== 'auth' && (
        <div className="fixed top-4 right-4 z-[900]">
          <Button
            onClick={() => {
              if (userRole === 'admin') {
                setUserRole('student');
                setCurrentScreen('student-map');
                toast.info("Exited Admin Mode");
              } else {
                setShowAdminModal(true);
              }
            }}
            className={`shadow-lg hover:shadow-xl rounded-full px-4 py-2 flex items-center gap-2 border transition-all ${
              userRole === 'admin' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-gray-700 border-gray-200'
            }`}
            variant={userRole === 'admin' ? 'default' : 'outline'}
          >
            {userRole === 'student' ? (
              <> <Shield className="w-4 h-4 text-[#0056b3]" /> <span className="text-sm font-medium">Admin Login</span> </>
            ) : (
              <> <LogOut className="w-4 h-4 text-red-400" /> <span className="text-sm">Exit Admin</span> </>
            )}
          </Button>
        </div>
      )}

      {currentScreen === 'auth' && (
        <div className="h-full flex flex-col justify-center items-center bg-gray-50">
           <h1 className="text-2xl font-bold mb-2 text-[#0056b3]">Campus Connect</h1>
           <p className="text-sm text-gray-500 mb-6">GEC Navigator & Community</p>
           <Auth onGuestLogin={handleGuestLogin} />
           <button onClick={() => setShowAdminModal(true)} className="fixed bottom-4 text-xs text-gray-300 hover:text-gray-500 underline">Admin Access</button>
        </div>
      )}

      {currentScreen === 'student-map' && (
        <StudentMainMap
          onNavigateToSearch={handleSearch}
          onNavigateToEvents={() => { setCurrentScreen('events'); setActiveTab('events'); }}
          onNavigateToNotifications={() => setActiveTab('notifications')}
          onNavigateToPosts={() => { setCurrentScreen('community'); setActiveTab('community'); }}
          onNavigateBackToMap={() => setActiveTab('home')}
          onNavigateToProfile={() => setCurrentScreen('profile')}
          activeTab={activeTab}
          notifications={notifications}
          onVote={handleVote}
          session={session}
          onLogout={handleLogout}
          isGuest={session?.user?.id === 'guest'}
          staffList={staffList} 
          eventList={eventsList}
        />
      )}

      {currentScreen === 'profile' && session && (
        <UserProfile session={session} onBack={() => setCurrentScreen('student-map')} onLogout={handleLogout} />
      )}

      {currentScreen === 'community' && session && (
        <PostsDashboard onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }} />
      )}

      {currentScreen === 'staff-detail' && selectedStaff && (
        <StaffSearchResult
          staff={selectedStaff}
          location={selectedLocation || undefined}
          onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }}
          onNavigate={() => setCurrentScreen('navigation')}
        />
      )}

      {currentScreen === 'navigation' && selectedLocation && (
        <ActiveNavigation
          destination={selectedLocation}
          relatedEventId={selectedEventId}
          relatedStaffId={selectedStaffId}
          onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }}
        />
      )}

      {currentScreen === 'events' && (
        <EventsDashboard
          events={eventsList} 
          onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }}
          onShowVenue={(locId: string, eventId: string) => { 
             setSelectedEventId(eventId);
             setCurrentScreen('navigation'); 
          }}
        />
      )}

      {/* --- ADMIN SCREENS --- */}
      {currentScreen === 'admin-dashboard' && (
        <AdminDashboard
          onManageStaff={() => { setTempLocation(null); setCurrentScreen('admin-add-staff'); }}
          onDrawPaths={() => setCurrentScreen('admin-path-drawing')}
          onManagePanorama={() => setCurrentScreen('admin-panorama')}
          onManageEvents={() => setCurrentScreen('admin-events')}
          onManageNotifications={() => setCurrentScreen('admin-notifications')}
          onSwitchToStudent={() => { setUserRole('student'); setCurrentScreen('student-map'); }}
        />
      )}

      {currentScreen === 'admin-add-staff' && <AdminAddStaff onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-pick-location' && <LocationPicker onBack={() => setCurrentScreen('admin-add-staff')} onConfirm={handleLocationConfirmed} />}
      {currentScreen === 'admin-path-drawing' && <AdminPathDrawing onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-panorama' && <AdminPanoramaUpload onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-events' && <AdminEventManagement onBack={() => setCurrentScreen('admin-dashboard')} />}
      {currentScreen === 'admin-notifications' && <AdminNotificationSender onBack={() => setCurrentScreen('admin-dashboard')} />}
      
      <Toaster position="top-center" />
    </div>
  );
}