import React, { useState } from 'react';
import { Button } from './ui/button';
import { 
  ArrowLeft, Calendar, MapPin, Clock, 
  Navigation, Image as ImageIcon, Bookmark, Share2, MoreVertical
} from 'lucide-react';
import { PanoramaViewer } from './PanoramaViewer';

interface EventsDashboardProps {
  events: any[];
  onBack: () => void;
  onShowVenue: (locationId: string, eventId: string) => void;
}

export function EventsDashboard({ events, onBack, onShowVenue }: EventsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedPano, setSelectedPano] = useState<string | null>(null);

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getTodayString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  };

  const todayStr = getTodayString();

  const filteredEvents = events.filter(e => {
    if (!e.date) return false;
    const eventDateStr = e.date.substring(0, 10);
    return activeTab === 'upcoming' ? eventDateStr >= todayStr : eventDateStr < todayStr;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="h-full bg-[#F1F5F9] flex flex-col font-inter page-enter relative">
      
      {selectedPano && (
        <PanoramaViewer 
            imageUrl={selectedPano} 
            title="Event Venue" 
            onClose={() => setSelectedPano(null)} 
        />
      )}

      {/* --- MINIMALIST HEADER --- */}
      <div className="bg-white px-6 pt-10 pb-4 shadow-sm z-20">
        <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-800" />
            </button>
            <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Bookmark size={20}/></button>
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Share2 size={20}/></button>
            </div>
        </div>
        <h1 className="text-3xl font-black text-slate-900 font-outfit mb-4">Discovery</h1>

        {/* CLEAN TAB SWITCHER */}
        <div className="flex gap-8 border-b border-slate-100">
            <button 
                onClick={() => setActiveTab('upcoming')} 
                className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'upcoming' ? 'text-blue-600' : 'text-slate-400'}`}
            >
                Upcoming
                {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
            <button 
                onClick={() => setActiveTab('past')} 
                className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'past' ? 'text-blue-600' : 'text-slate-400'}`}
            >
                History
                {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-medium">No events scheduled</p>
            </div>
        ) : (
            filteredEvents.map(event => (
                <div key={event.id} className="bg-white rounded-[2.5rem] p-3 shadow-md border border-slate-50 hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                        {/* LEFT: IMAGE COLUMN */}
                        <div className="w-24 h-32 rounded-[1.8rem] overflow-hidden shrink-0 relative">
                            {event.banner_url ? (
                                <img src={event.banner_url} className="w-full h-full object-cover" alt={event.title} />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                            {/* FLOATING DATE OVERLAY */}
                            <div className="absolute top-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-2xl py-1 text-center shadow-sm">
                                <p className="text-[10px] font-black text-blue-600 leading-none uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</p>
                                <p className="text-sm font-black text-slate-900 leading-none">{new Date(event.date).getDate()}</p>
                            </div>
                        </div>

                        {/* RIGHT: DETAILS COLUMN */}
                        <div className="flex-1 flex flex-col justify-center pr-2">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{event.category || 'General'}</p>
                                <button className="text-slate-300"><MoreVertical size={16}/></button>
                            </div>
                            <h3 className="font-outfit font-bold text-slate-900 text-lg leading-tight mb-2">{event.title}</h3>
                            
                            <div className="flex items-center gap-3 text-slate-400 mb-4">
                                <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-blue-400"/>
                                    <span className="text-[10px] font-bold">{formatTime(event.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-1 max-w-[100px]">
                                    <MapPin size={12} className="text-red-400 shrink-0"/>
                                    <span className="text-[10px] font-bold truncate">{event.venue_name || 'GEC Campus'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onShowVenue(event.location_id || event.id, event.id)}
                                    className="flex-1 bg-slate-900 text-white text-[10px] font-black py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                                >
                                    <Navigation size={12} fill="currentColor" /> GO NOW
                                </button>
                                {event.venue_panorama_url && (
                                    <button 
                                        onClick={() => setSelectedPano(event.venue_panorama_url)}
                                        className="w-10 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-200"
                                    >
                                        <ImageIcon size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}