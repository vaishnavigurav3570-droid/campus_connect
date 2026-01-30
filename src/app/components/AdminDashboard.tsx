import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, Map, Calendar, Bell, LogOut, 
  ChevronRight, Shield, Layers, Bus 
} from 'lucide-react';

interface AdminDashboardProps {
  onManageStaff: () => void;
  onDrawPaths: () => void;
  onManagePanorama: () => void;
  onManageEvents: () => void;
  onManageNotifications: () => void;
  onSwitchToStudent: () => void;
  onManageBus: () => void;
}

export function AdminDashboard({ 
  onManageStaff, 
  onDrawPaths, 
  onManagePanorama, 
  onManageEvents, 
  onManageNotifications, 
  onManageBus,
  onSwitchToStudent 
  
}: AdminDashboardProps) {

  // State to hold real numbers
  const [stats, setStats] = useState({
    events: 0,
    staff: 0,
    alerts: 0
  });

  // Fetch real counts on load
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
        const { count: staffCount } = await supabase.from('staff').select('*', { count: 'exact', head: true });
        const { count: alertCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true });

        setStats({
          events: eventCount || 0,
          staff: staffCount || 0,
          alerts: alertCount || 0
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* --- HEADER --- */}
      <div className="bg-slate-900 text-white px-6 py-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-900 rounded-full blur-2xl -ml-10 -mb-10 opacity-50 pointer-events-none"></div>

        <div className="relative z-10 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-2 text-cyan-400">
                    <Shield size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Administrator</span>
                </div>
                <h1 className="text-3xl font-bold mb-1">Command Center</h1>
                <p className="text-slate-400 text-sm">Manage GEC Navigator & Campus Life</p>
            </div>
            
            <button 
                onClick={onSwitchToStudent}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-xl transition-all border border-white/10 text-slate-300 hover:text-white"
                title="Exit Admin Mode"
            >
                <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* --- DASHBOARD GRID --- */}
      <div className="flex-1 px-6 -mt-8 z-20 pb-10">
        <div className="grid grid-cols-1 gap-4">
            
            {/* Quick Stats */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-around mb-2 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center w-1/3">
                    <p className="text-2xl font-bold text-slate-800">{stats.events}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Events</p>
                </div>
                <div className="w-px h-8 bg-slate-100"></div>
                <div className="text-center w-1/3">
                    <p className="text-2xl font-bold text-slate-800">{stats.staff}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Staff</p>
                </div>
                <div className="w-px h-8 bg-slate-100"></div>
                <div className="text-center w-1/3">
                    <p className="text-2xl font-bold text-slate-800">{stats.alerts}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Alerts</p>
                </div>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mt-2">Core Management</p>

            {/* MANAGE STAFF */}
            <DashboardCard 
                title="Faculty & Staff" 
                subtitle="Add or edit staff profiles"
                icon={Users}
                color="text-blue-600"
                bgColor="bg-blue-50"
                onClick={onManageStaff}
            />

            {/* MANAGE EVENTS */}
            <DashboardCard 
                title="Events & News" 
                subtitle="Schedule campus activities"
                icon={Calendar}
                color="text-purple-600"
                bgColor="bg-purple-50"
                onClick={onManageEvents}
            />

            {/* NOTIFICATIONS */}
            <DashboardCard 
                title="Alerts & Polls" 
                subtitle="Send push notifications"
                icon={Bell}
                color="text-amber-600"
                bgColor="bg-amber-50"
                onClick={onManageNotifications}
            />

            {/* BUS ROUTES (New) */}
            <DashboardCard 
                title="Bus Routes" 
                subtitle="Update timings & status"
                icon={Bus}
                color="text-rose-600"
                bgColor="bg-rose-50"
                onClick={onManageBus}
            />

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mt-4">Map Configuration</p>

            {/* PATH DRAWING */}
            <DashboardCard 
                title="Navigation Paths" 
                subtitle="Draw roads & walkways"
                icon={Map}
                color="text-emerald-600"
                bgColor="bg-emerald-50"
                onClick={onDrawPaths}
            />

            {/* PANORAMA */}
            <DashboardCard 
                title="360° Views" 
                subtitle="Upload location panoramas"
                icon={Layers}
                color="text-cyan-600"
                bgColor="bg-cyan-50"
                onClick={onManagePanorama}
            />
        </div>
      </div>
      
      <p className="text-center text-[10px] text-slate-300 py-4">
        Restricted Access • Authorized Personnel Only
      </p>
    </div>
  );
}

// Helper Component for Cards
function DashboardCard({ title, subtitle, icon: Icon, color, bgColor, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-4 group text-left"
        >
            <div className={`w-12 h-12 rounded-xl ${bgColor} ${color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                <ChevronRight size={16} />
            </div>
        </button>
    );
}