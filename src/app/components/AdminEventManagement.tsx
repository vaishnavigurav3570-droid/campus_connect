import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { InlineMapPicker } from './InlineMapPicker';
import { 
  ArrowLeft, Plus, Calendar, MapPin, Trash2, Edit2, Save, 
  Loader2, Clock, Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminEventManagementProps {
  onBack: () => void;
}

export function AdminEventManagement({ onBack }: AdminEventManagementProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', title: '', date: '', startTime: '', endTime: '', venue: '', 
    description: '', type: 'academic', lat: 0, lng: 0,
    banner_url: '', venue_panorama_url: ''
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [panoFile, setPanoFile] = useState<File | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (error) console.error(error);
    else setEvents(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date) return toast.error("Title and Date required.");
    setLoading(true);

    let finalBannerUrl = formData.banner_url;
    let finalPanoUrl = formData.venue_panorama_url;

    try {
        if (bannerFile) {
            const fileName = `event_banner_${Date.now()}.${bannerFile.name.split('.').pop()}`;
            await supabase.storage.from('post_images').upload(fileName, bannerFile);
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            finalBannerUrl = data.publicUrl;
        }
        if (panoFile) {
            const fileName = `event_pano_${Date.now()}.${panoFile.name.split('.').pop()}`;
            await supabase.storage.from('post_images').upload(fileName, panoFile);
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            finalPanoUrl = data.publicUrl;
        }

        const payload = {
            title: formData.title, date: formData.date, start_time: formData.startTime, end_time: formData.endTime,
            venue_name: formData.venue, description: formData.description, category: formData.type,
            lat: formData.lat, lng: formData.lng,
            banner_url: finalBannerUrl, venue_panorama_url: finalPanoUrl
        };

        if (formData.id) {
            const { error } = await supabase.from('events').update(payload).eq('id', formData.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('events').insert([payload]);
            if (error) throw error;
        }

        toast.success(formData.id ? "Event updated!" : "Event created!");
        setIsEditing(false); resetForm(); fetchEvents();

    } catch (error: any) {
        toast.error("Error: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    await supabase.from('events').delete().eq('id', id);
    fetchEvents();
  };

  const startEdit = (event?: any) => {
    if (event) {
        setFormData({
            id: event.id, title: event.title, date: event.date, startTime: event.start_time || '',
            endTime: event.end_time || '', venue: event.venue_name || '', description: event.description || '', 
            type: event.category || 'academic', lat: event.lat || 0, lng: event.lng || 0,
            banner_url: event.banner_url || '', venue_panorama_url: event.venue_panorama_url || ''
        });
    } else resetForm();
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', date: '', startTime: '', endTime: '', venue: '', description: '', type: 'academic', lat: 0, lng: 0, banner_url: '', venue_panorama_url: '' });
    setBannerFile(null); setPanoFile(null);
  };

  const formatTime = (time: string) => {
    if(!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5 text-slate-600" /></Button>
            <h1 className="text-lg font-bold text-slate-800">Manage Events</h1>
        </div>
        {!isEditing && (
            <Button onClick={() => startEdit()} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-xl mr-40 shadow-lg">
                <Plus size={18} /> Add Event
            </Button>
        )}
      </div>

      {/* SCROLLING ENABLED HERE */}
      <div className="flex-1 overflow-y-auto p-6 w-full">
        <div className="max-w-3xl mx-auto pb-20">
            {isEditing ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-5">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">{formData.id ? 'Edit Event' : 'Create New Event'}</h2>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Event Title</label><input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-purple-200" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Pin Venue on Map</label>
                            <InlineMapPicker initialLat={formData.lat} initialLng={formData.lng} onLocationSelect={(lat, lng) => setFormData({...formData, lat, lng})} />
                            <input className="w-full mt-2 p-3 bg-slate-50 rounded-xl text-sm" placeholder="Venue Name (e.g. Auditorium)" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Banner Image</label><input type="file" className="text-xs mt-1" onChange={e => setBannerFile(e.target.files?.[0] || null)} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Venue 360° (Optional)</label><input type="file" className="text-xs mt-1" onChange={e => setPanoFile(e.target.files?.[0] || null)} />{(formData.venue_panorama_url || panoFile) && <p className="text-xs text-green-600 mt-1">360 View Selected</p>}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Date</label><input type="date" className="w-full mt-1 p-3 bg-slate-50 rounded-xl" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Category</label><select className="w-full mt-1 p-3 bg-slate-50 rounded-xl" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="academic">Academic</option><option value="cultural">Cultural</option><option value="sports">Sports</option></select></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Start Time</label><input type="time" className="w-full mt-1 p-3 bg-slate-50 rounded-xl" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">End Time</label><input type="time" className="w-full mt-1 p-3 bg-slate-50 rounded-xl" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
                        </div>

                        <div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea rows={4} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-purple-200 resize-none" placeholder="Add details about the event..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>

                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
                            <Button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">{loading ? <Loader2 className="animate-spin"/> : <Save size={18} className="mr-2"/>} Save Event</Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.length === 0 && (
                        <div className="text-center py-20 text-slate-400">
                            <Calendar className="w-16 h-16 mx-auto mb-3 opacity-20"/>
                            <p>No events scheduled.</p>
                            <Button onClick={() => startEdit()} variant="outline" className="border-purple-200 text-purple-600 mt-2">Create First Event</Button>
                        </div>
                    )}
                    {events.map(event => (
                        <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center relative">
                            <div className="flex gap-4 items-center">
                                <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border">
                                    {event.banner_url ? (
                                        <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{event.title}</h3>
                                    <div className="flex flex-col gap-1 text-xs text-slate-500 mt-1">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {event.date}</span>
                                        <span className="flex items-center gap-1"><MapPin size={12}/> {event.venue_name || 'TBA'}</span>
                                    </div>
                                </div>
                            </div>
                            {event.venue_panorama_url && (
                                <div className="absolute top-4 right-20 bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-100">360° View</div>
                            )}
                            <div className="flex items-center gap-2">
                                <button onClick={() => startEdit(event)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                <button onClick={() => handleDelete(event.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}