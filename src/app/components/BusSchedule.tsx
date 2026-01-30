import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Bus, Clock, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

interface BusScheduleProps {
  onBack: () => void;
}

export function BusSchedule({ onBack }: BusScheduleProps) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('bus_routes').select('*').order('route_name');
    if (data) setRoutes(data);
    setLoading(false);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans animate-in slide-in-from-right">
      
      {/* HEADER */}
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">College Bus Schedule</h1>
            <p className="text-xs text-slate-400 font-medium">Live Status & Timings</p>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {loading ? (
             <p className="text-center text-slate-400 mt-10 text-sm">Loading schedules...</p>
        ) : routes.length === 0 ? (
             <div className="text-center py-20 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bus size={32} className="text-slate-300" />
                </div>
                <p>No bus routes found.</p>
             </div>
        ) : (
            routes.map(bus => (
                <div key={bus.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative group">
                    
                    {/* Status Strip */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        bus.status === 'delayed' ? 'bg-amber-500' : 
                        bus.status === 'cancelled' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}></div>

                    <div className="p-4 pl-5">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    {bus.route_name}
                                </h3>
                                <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{bus.bus_number}</span>
                            </div>
                            
                            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                bus.status === 'delayed' ? 'bg-amber-50 text-amber-600' : 
                                bus.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                                {bus.status === 'delayed' ? <AlertCircle size={12}/> : <CheckCircle size={12}/>}
                                {bus.status.replace('_', ' ')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 my-4">
                            <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm">
                                    <Clock size={16}/>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Departure</p>
                                    <p className="text-sm font-bold text-slate-800">{bus.departure_time}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                                    <Phone size={16}/>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{bus.driver_name}</p>
                                    <p className="text-xs font-bold text-slate-800">{bus.driver_contact || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stops */}
                        {bus.stops && bus.stops.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <MapPin size={12}/> Major Stops
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {bus.stops.map((stop: string, i: number) => (
                                    <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg">
                                        {stop}
                                    </span>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}