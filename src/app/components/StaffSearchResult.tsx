import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Navigation, MapPin, Building, Mail, Phone, User, Image as ImageIcon, X } from 'lucide-react';
import { PanoramaViewer } from './PanoramaViewer';

interface StaffSearchResultProps {
  staff: any;
  location?: any;
  onBack: () => void;
  onNavigate: () => void;
}

export function StaffSearchResult({ staff, location, onBack, onNavigate }: StaffSearchResultProps) {
  const [showPano, setShowPano] = useState(false);

  // Get Initials for Avatar Fallback
  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'St'; // Default to "St" (Staff) if name fails
  };

  return (
    <div className="h-full bg-white flex flex-col font-sans animate-in slide-in-from-right duration-300">
      
      {/* 360 Viewer Overlay */}
      {showPano && staff.cabin_panorama_url && (
        <PanoramaViewer 
            imageUrl={staff.cabin_panorama_url} 
            title={`${staff.name}'s Cabin`} 
            onClose={() => setShowPano(false)} 
        />
      )}

      {/* --- HEADER --- */}
      <div className="relative bg-slate-900 h-48 shrink-0">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900"></div>
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 text-white">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/20 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <span className="text-sm font-medium opacity-80">Faculty Profile</span>
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>

        {/* Profile Image / Avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center relative z-20">
            {staff.image_url ? (
              <img 
                src={staff.image_url} 
                alt={staff.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-3xl">
                {getInitials(staff.name)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- BODY CONTENT --- */}
      <div className="flex-1 overflow-y-auto pt-16 px-6 pb-6 text-center">
        
        {/* Name & Role */}
        <h1 className="text-2xl font-bold text-slate-900 capitalize">{staff.name}</h1>
        <p className="text-blue-600 font-medium mb-1">{staff.role}</p>
        <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-500 uppercase tracking-wide font-bold mb-6">
          {staff.department || "General Staff"}
        </div>

        {/* Action Buttons Row */}
        <div className="flex justify-center gap-3 mb-8">
            {staff.email && (
                <a href={`mailto:${staff.email}`} className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm hover:bg-blue-100 transition-colors">
                    <Mail size={20} />
                </a>
            )}
            {/* If 360 View Exists */}
            {staff.cabin_panorama_url && (
                <button 
                    onClick={() => setShowPano(true)}
                    className="flex-1 max-w-[140px] bg-cyan-50 text-cyan-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-cyan-100 shadow-sm hover:bg-cyan-100 transition-colors"
                >
                    <ImageIcon size={16} /> 360° Cabin
                </button>
            )}
        </div>

        {/* Info Card */}
        <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-6 shadow-inner border border-slate-100">
            
            {/* Location */}
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-red-500 shrink-0">
                    <MapPin size={20} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cabin Location</p>
                    <p className="text-slate-800 font-medium">
                        {staff.cabin_location || "Location Details Not Available"}
                    </p>
                    {location && (
                        <p className="text-xs text-slate-500 mt-1">{location.name}</p>
                    )}
                </div>
            </div>

            {/* Availability (If you added this field to DB) */}
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center shrink-0 ${staff.is_available ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    <User size={20} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status</p>
                    <p className={`font-medium ${staff.is_available ? 'text-green-700' : 'text-orange-700'}`}>
                        {staff.is_available ? "Currently Available" : "Busy / Out of Cabin"}
                    </p>
                </div>
            </div>

        </div>
      </div>

      {/* --- FOOTER / NAVIGATE BUTTON --- */}
      <div className="p-4 bg-white border-t border-slate-100 safe-area-bottom">
        <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl shadow-lg shadow-blue-200 text-lg font-bold flex items-center justify-center gap-2"
            onClick={onNavigate}
            disabled={!location && (!staff.lat || !staff.lng)} // Disable if no coords
        >
            <Navigation size={20} fill="currentColor" />
            Navigate to Cabin
        </Button>
      </div>

    </div>
  );
}