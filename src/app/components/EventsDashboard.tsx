import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Calendar, MapPin, Clock, Navigation, ChevronRight } from 'lucide-react';
import { Event } from '../types';

interface EventsDashboardProps {
  events: Event[];
  onBack: () => void;
  onShowVenue: (locationId: string, eventId: string) => void;
}

export function EventsDashboard({ events, onBack, onShowVenue }: EventsDashboardProps) {
  // Use 'all' as default, but allow specific category filtering
  const [filter, setFilter] = useState('all');

  // FIX 1: Changed 'category' to 'type' to match your Event type
  const filteredEvents = events.filter(e => filter === 'all' || e.type === filter);

  // Helper for date formatting
  const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return {
          month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
          day: d.getDate()
      };
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans animate-in slide-in-from-right duration-300">
      
      {/* --- HEADER --- */}
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
                <h1 className="font-bold text-slate-800 text-lg leading-tight">Campus Events</h1>
                <p className="text-xs text-slate-400 font-medium">Happening at GEC</p>
            </div>
        </div>
        <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center font-bold text-xs border border-cyan-100">
            {events.length}
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-sm sticky top-[73px] z-10 overflow-x-auto scrollbar-hide border-b border-slate-50">
        <div className="flex gap-2 min-w-max">
            {['all', 'academic', 'cultural', 'sports', 'workshop'].map((cat) => (
                <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                        filter === cat 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {/* --- EVENTS LIST --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {filteredEvents.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Calendar size={48} className="mb-2 opacity-20" />
                <p className="text-sm">No events found in this category.</p>
             </div>
        ) : (
            filteredEvents.map(event => {
                const { month, day } = formatDate(event.date);
                return (
                <div key={event.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                    
                    {/* Event Banner (Teal Gradient) */}
                    <div className="h-28 bg-gradient-to-r from-cyan-500 to-blue-600 relative">
                        {/* Date Badge */}
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl px-3 py-1.5 text-center shadow-sm min-w-[3.5rem]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{month}</p>
                            <p className="text-xl font-bold text-slate-800 leading-none">{day}</p>
                        </div>
                        {/* FIX 2: Changed 'category' to 'type' */}
                        <div className="absolute top-3 right-3 bg-black/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur uppercase border border-white/20">
                            {event.type}
                        </div>
                    </div>

                    <div className="p-4">
                        <h3 className="font-bold text-lg text-slate-800 mb-1 leading-snug">{event.title}</h3>
                        
                        {/* FIX 3: Removed 'description' since it doesn't exist. Replaced with generic text or subtitle if needed. */}
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                            Join us for this {event.type} event at the campus.
                        </p>

                        <div className="flex flex-col gap-2 mb-4">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock size={14} className="text-cyan-500"/>
                                <span>{event.startTime} - {event.endTime}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <MapPin size={14} className="text-amber-500"/>
                                {/* FIX 4: Changed 'venueName' to 'venue' */}
                                <span className="font-medium">{event.venue}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                            <Button 
                                onClick={() => onShowVenue(event.locationId, event.id)}
                                size="sm" 
                                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-none text-xs font-bold h-9 rounded-lg"
                            >
                                <Navigation size={14} className="mr-1.5"/> Navigate
                            </Button>
                            <Button 
                                size="sm" 
                                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold h-9 shadow-sm shadow-cyan-200 rounded-lg"
                            >
                                Register <ChevronRight size={14} className="ml-1 opacity-70"/>
                            </Button>
                        </div>
                    </div>
                </div>
            )})
        )}
      </div>
    </div>
  );
}