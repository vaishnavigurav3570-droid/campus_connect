import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Calendar, MapPin, Clock, Search, Info, Navigation } from 'lucide-react';
import { Event } from '../types';

// FIX: Added 'events' back to the interface
interface EventsDashboardProps {
  events: Event[]; 
  onBack: () => void;
  onShowVenue: (locationId: string, eventId: string) => void;
}

export function EventsDashboard({ events, onBack, onShowVenue }: EventsDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'academic' | 'cultural' | 'sports'>('all');
  const [search, setSearch] = useState('');

  const formatTime = (time: string) => {
    if(!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const filteredEvents = events.filter(e => {
    const matchesFilter = filter === 'all' || e.type === filter;
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-full bg-gray-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="bg-white p-4 shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Campus Events</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search events..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'academic', 'cultural', 'sports'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                filter === f ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No events found</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gray-200 relative">
                <img src={event.bannerImage || "https://via.placeholder.com/500"} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider text-gray-700">
                  {event.type}
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{event.title}</h3>
                  <div className="text-center bg-blue-50 px-2 py-1 rounded-lg min-w-[3rem]">
                    <span className="block text-xs font-bold text-blue-600 uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="block text-lg font-bold text-blue-800 leading-none">{new Date(event.date).getDate()}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 font-medium bg-blue-50 p-2 rounded-md">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {event.venue}
                  </div>
                  {event.venueDetails && (
                    <div className="flex items-start text-sm text-gray-500 bg-gray-50 p-2 rounded-lg mt-1">
                        <Info className="w-4 h-4 mr-2 text-blue-400 shrink-0 mt-0.5" />
                        <span className="text-xs">{event.venueDetails}</span>
                    </div>
                  )}
                </div>

                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={() => onShowVenue(event.locationId, event.id)}>
                  <Navigation className="w-4 h-4 mr-2" /> Navigate to Venue
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}