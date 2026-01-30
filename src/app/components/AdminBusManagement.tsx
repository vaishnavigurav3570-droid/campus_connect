import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Plus, Trash2, Bus, Save, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminBusManagementProps {
  onBack: () => void;
}

export function AdminBusManagement({ onBack }: AdminBusManagementProps) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [routeName, setRouteName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('bus_routes').select('*').order('created_at');
    if (data) setRoutes(data);
    setLoading(false);
  };

  const handleAddRoute = async () => {
    if (!routeName || !busNumber || !departureTime) return toast.error("Fill required fields");

    const { error } = await supabase.from('bus_routes').insert({
      route_name: routeName,
      bus_number: busNumber,
      driver_name: driverName,
      departure_time: departureTime,
      status: 'on_time',
      stops: [] // Default empty stops
    });

    if (error) toast.error("Failed to add route");
    else {
      toast.success("Bus Route Added");
      setRouteName(''); setBusNumber(''); setDriverName(''); setDepartureTime('');
      fetchRoutes();
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Delete this bus route?")) return;
    await supabase.from('bus_routes').delete().eq('id', id);
    fetchRoutes();
    toast.success("Route deleted");
  };

  const toggleStatus = async (bus: any) => {
    const newStatus = bus.status === 'on_time' ? 'delayed' : bus.status === 'delayed' ? 'cancelled' : 'on_time';
    await supabase.from('bus_routes').update({ status: newStatus }).eq('id', bus.id);
    fetchRoutes();
    toast.success(`Status updated to: ${newStatus}`);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans animate-in slide-in-from-right">
      
      {/* HEADER */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={20} /></Button>
            <h1 className="text-xl font-bold text-slate-800">Manage Buses</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ADD NEW BUS FORM */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus size={18} className="text-blue-600"/> Add New Route
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Route Name (e.g. Panjim Express)" value={routeName} onChange={e => setRouteName(e.target.value)} />
                <input className="p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Bus Number (e.g. GA-01-A-1234)" value={busNumber} onChange={e => setBusNumber(e.target.value)} />
                <input className="p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Driver Name" value={driverName} onChange={e => setDriverName(e.target.value)} />
                <input className="p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Departure Time (e.g. 05:30 PM)" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
            </div>
            <Button onClick={handleAddRoute} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">Add Bus Route</Button>
        </div>

        {/* EXISTING ROUTES */}
        <div className="space-y-4">
            <h3 className="font-bold text-slate-400 uppercase text-xs">Active Routes</h3>
            {routes.map(bus => (
                <div key={bus.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800">{bus.route_name}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                bus.status === 'on_time' ? 'bg-emerald-100 text-emerald-600' : 
                                bus.status === 'delayed' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                            }`}>{bus.status.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-slate-500">{bus.bus_number} • {bus.departure_time}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={() => toggleStatus(bus)} size="sm" variant="outline" className="text-xs">
                            Change Status
                        </Button>
                        <Button onClick={() => handleDelete(bus.id)} size="sm" variant="ghost" className="text-red-500 hover:bg-red-50">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}