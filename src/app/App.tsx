import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { Session } from '@supabase/supabase-js'; 
import { Toaster, toast } from 'sonner';

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
import { PostsDashboard } from './components/PostsDashboard'; // Use PostsDashboard for community
import { UserProfile } from './components/UserProfile'; 
import Auth from './components/Auth'; 

import { staffMembers as initialStaff, locations as initialLocations, events as initialEvents } from './data/mockData';
import { UserRole, Staff, Location, Event, Notification } from './types';
import { Button } from './components/ui/button';
import { Shield, LogOut } from 'lucide-react';

type Screen = 
  | 'auth'            
  | 'student-map' 
  | 'staff-detail' 
  | 'navigation' 
  | 'events' 
  | 'community'
  | 'profile'
  | 'admin-dashboard' 
  | 'admin-add-staff' 
  | 'admin-path-drawing' 
  | 'admin-pick-location' 
  | 'admin-panorama' 
  | 'admin-events'
  | 'admin-notifications';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Data State
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [locationList, setLocationList] = useState<Location[]>([]);
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null); 
  const [activeTab, setActiveTab] = useState('home');
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);

  // --- 1. CHECK LOGIN STATUS ON LOAD ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentScreen('student-map');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentScreen('student-map');
      } else {
        setCurrentScreen('auth');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- 2. LOAD MOCK DATA (Local Storage) ---
  useEffect(() => {
    const savedStaff = localStorage.getItem('gec_staff');
    const savedLocs = localStorage.getItem('gec_locations');
    const savedEvents = localStorage.getItem('gec_events');
    const savedNotes = localStorage.getItem('gec_notifications');
    
    setStaffList(savedStaff ? JSON.parse(savedStaff) : initialStaff);
    setLocationList(savedLocs ? JSON.parse(savedLocs) : initialLocations);
    setEventsList(savedEvents ? JSON.parse(savedEvents) : initialEvents);
    setNotifications(savedNotes ? JSON.parse(savedNotes) : []);
  }, [currentScreen]); // Reload when screen changes to sync admin updates

  const selectedStaff = selectedStaffId ? staffList.find(s => s.id === selectedStaffId) : null;
  // Resolve location object for navigation
  const selectedLocation = selectedLocationId ? locationList.find(l => l.id === selectedLocationId) : 
                           selectedStaff ? locationList.find(l => l.id === selectedStaff.locationId) : null;

  // --- HANDLERS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  const handleAdminLoginSuccess = () => {
    setUserRole('admin');
    setCurrentScreen('admin-dashboard');
  };

  const handleSetPin = () => {
    setCurrentScreen('admin-pick-location');
  };

  const handleLocationConfirmed = (lat: number, lng: number) => {
    setTempLocation({ lat, lng });
    setCurrentScreen('admin-add-staff');
  };

  const handleSearch = (query: string) => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery === 'admin mode') {
        setShowAdminModal(true);
        return;
    }
    setSelectedStaffId(null);
    setSelectedLocationId(null);
    setSelectedEventId(null);

    const staff = staffList.find(s => s.name.toLowerCase().includes(lowerQuery) || s.department.toLowerCase().includes(lowerQuery));
    if (staff) {
      setSelectedStaffId(staff.id);
      setSelectedLocationId(staff.locationId);
      setCurrentScreen('staff-detail');
      setActiveTab('search');
      return;
    }
    const event = eventsList.find(e => e.title.toLowerCase().includes(lowerQuery));
    if (event) {
      setSelectedEventId(event.id); 
      setSelectedLocationId(event.locationId);
      setCurrentScreen('navigation');
      setActiveTab('search');
      toast.success(`Found Event: ${event.title}`);
      return;
    }
    const location = locationList.find(l => l.name.toLowerCase().includes(lowerQuery) || l.building.toLowerCase().includes(lowerQuery));
    if (location) {
      setSelectedLocationId(location.id);
      setCurrentScreen('navigation');
      setActiveTab('search');
    } else {
      toast.error('No matching staff, event, or department found');
    }
  };

  // Notification handlers
  const handleSendNotification = (newNote: Notification) => {
    const updated = [...notifications, newNote];
    setNotifications(updated);
    localStorage.setItem('gec_notifications', JSON.stringify(updated));
  };
  const handleUpdateNotification = (updatedNote: Notification) => {
    const updated = notifications.map(n => n.id === updatedNote.id ? updatedNote : n);
    setNotifications(updated);
    localStorage.setItem('gec_notifications', JSON.stringify(updated));
  };
  const handleDeleteNotification = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isDeleted: true } : n);
    setNotifications(updated);
    localStorage.setItem('gec_notifications', JSON.stringify(updated));
  };
  const handleVote = (noteId: string, optionId: string) => {
    const updated = notifications.map(note => {
      if (note.id === noteId && note.pollOptions) {
        if (note.votedOptionId === optionId) return note;
        const newOptions = note.pollOptions.map(opt => {
          if (opt.id === optionId) return { ...opt, count: opt.count + 1 };
          if (opt.id === note.votedOptionId) return { ...opt, count: opt.count - 1 };
          return opt;
        });
        return { ...note, votedOptionId: optionId, pollOptions: newOptions };
      }
      return note;
    });
    setNotifications(updated);
    localStorage.setItem('gec_notifications', JSON.stringify(updated));
  };

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
              userRole === 'admin' 
                ? 'bg-slate-900 text-white border-slate-700' 
                : 'bg-white text-gray-700 border-gray-200'
            }`}
            variant={userRole === 'admin' ? 'default' : 'outline'}
          >
            {userRole === 'student' ? (
              <>
                <Shield className="w-4 h-4 text-[#0056b3]" />
                <span className="text-sm font-medium">Admin Login</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="text-sm">Exit Admin</span>
              </>
            )}
          </Button>
        </div>
      )}

      {currentScreen === 'auth' && (
        <div className="h-full flex flex-col justify-center items-center bg-gray-50">
           <h1 className="text-2xl font-bold mb-2 text-[#0056b3]">Campus Connect</h1>
           <p className="text-sm text-gray-500 mb-6">GEC Navigator & Community</p>
           <Auth />
           <button onClick={() => setShowAdminModal(true)} className="fixed bottom-4 text-xs text-gray-300 hover:text-gray-500 underline">
             Admin Access
           </button>
        </div>
      )}

      {currentScreen === 'student-map' && (
        <StudentMainMap
          onNavigateToSearch={handleSearch}
          onNavigateToEvents={() => { setCurrentScreen('events'); setActiveTab('events'); }}
          onNavigateToNotifications={() => setActiveTab('notifications')}
          // FIX: Changed to 'onNavigateToPosts' to match the component
          onNavigateToPosts={() => { setCurrentScreen('community'); setActiveTab('community'); }}
          onNavigateBackToMap={() => setActiveTab('home')}
          onNavigateToProfile={() => setCurrentScreen('profile')}
          activeTab={activeTab}
          notifications={notifications}
          onVote={handleVote}
          session={session}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'profile' && session && (
        <UserProfile 
          session={session} 
          onBack={() => setCurrentScreen('student-map')} 
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'community' && session && (
        <PostsDashboard 
          onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }} 
        />
      )}

      {currentScreen === 'staff-detail' && selectedStaff && selectedLocation && (
        <StaffSearchResult
          staff={selectedStaff}
          location={selectedLocation}
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

      {/* FIX: Now 'EventsDashboard' accepts the 'events' prop */}
      {currentScreen === 'events' && (
        <EventsDashboard
          events={eventsList} 
          onBack={() => { setCurrentScreen('student-map'); setActiveTab('home'); }}
          onShowVenue={(locId: string, eventId: string) => { 
             setSelectedLocationId(locId); 
             setSelectedEventId(eventId);
             setCurrentScreen('navigation'); 
          }}
        />
      )}

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

      {currentScreen === 'admin-add-staff' && (
        <AdminAddStaff
          onBack={() => setCurrentScreen('admin-dashboard')}
          onSetPin={handleSetPin} 
          pickedLocation={tempLocation}
        />
      )}

      {currentScreen === 'admin-pick-location' && (
        <LocationPicker
          onBack={() => setCurrentScreen('admin-add-staff')}
          onConfirm={handleLocationConfirmed}
        />
      )}

      {currentScreen === 'admin-path-drawing' && (
        <AdminPathDrawing
          onBack={() => setCurrentScreen('admin-dashboard')}
        />
      )}

      {currentScreen === 'admin-panorama' && (
        <AdminPanoramaUpload
          onBack={() => setCurrentScreen('admin-dashboard')}
        />
      )}

      {currentScreen === 'admin-events' && (
        <AdminEventManagement
          onBack={() => setCurrentScreen('admin-dashboard')}
        />
      )}

      {currentScreen === 'admin-notifications' && (
        <AdminNotificationSender
          onBack={() => setCurrentScreen('admin-dashboard')}
          onSend={handleSendNotification}
          onUpdate={handleUpdateNotification}
          onDelete={handleDeleteNotification}
          history={notifications}
        />
      )}

      <Toaster position="top-center" />
    </div>
  );
}