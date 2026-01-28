import React, { useState, useEffect } from 'react';

import { Button } from './ui/button';

import { ArrowLeft, Plus, Trash2, Calendar, MapPin, Edit, Save, X, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';

import { locations } from '../data/mockData';

import { toast } from 'sonner';

import { supabase } from '../supabaseClient';



interface AdminEventManagementProps {

  onBack: () => void;

}



export function AdminEventManagement({ onBack }: AdminEventManagementProps) {

  const [eventsList, setEventsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

 

  // Form State

  const [formData, setFormData] = useState({

    title: '',

    description: '',

    date: '',

    startTime: '',

    endTime: '',

    locationId: '',

    type: 'academic',

    bannerImage: '', // URL string

    venueDetails: ''

  });

 

  const [selectedFile, setSelectedFile] = useState<File | null>(null);



  // 1. Fetch Events from Supabase

  useEffect(() => {

    fetchEvents();

   

    // Realtime subscription

    const channel = supabase.channel('admin_events')

      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)

      .subscribe();



    return () => { supabase.removeChannel(channel); };

  }, []);



  const fetchEvents = async () => {

    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });

    if (error) {

      console.error(error);

      toast.error("Failed to load events");

    } else {

      // Map DB columns (snake_case) to app state (camelCase) if needed,

      // or just use DB structure. Let's map for consistency with your UI.

      const mapped = data.map(e => ({

        ...e,

        startTime: e.start_time,

        endTime: e.end_time,

        locationId: e.location_id,

        bannerImage: e.banner_url,

        venueDetails: e.venue_name // We store simple venue name in venue_name column

      }));

      setEventsList(mapped);

    }

  };



  const handleEdit = (event: any) => {

    setFormData({

      title: event.title,

      description: event.description || '',

      date: event.date,

      startTime: event.startTime,

      endTime: event.endTime,

      locationId: event.locationId,

      type: event.category || 'academic',

      bannerImage: event.bannerImage,

      venueDetails: event.venueDetails

    });

    setEditingId(event.id);

    setIsAdding(true);

  };



  const handleDelete = async (id: string) => {

    if (confirm('Are you sure you want to delete this event?')) {

      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) toast.error("Failed to delete");

      else toast.success("Event deleted");

    }

  };



  const handleSave = async () => {

    if (!formData.title || !formData.date || !formData.startTime || !formData.locationId) {

      toast.error('Please fill in required fields');

      return;

    }

    setLoading(true);



    try {

      // 1. Upload Image if selected

      let bannerUrl = formData.bannerImage;

     

      if (selectedFile) {

        const fileExt = selectedFile.name.split('.').pop();

        const fileName = `event_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('post_images').upload(fileName, selectedFile);

       

        if (uploadError) throw uploadError;

       

        const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);

        bannerUrl = data.publicUrl;

      }



      // 2. Prepare Data for DB (Map back to snake_case)

      const loc = locations.find(l => l.id === formData.locationId);

      const venueName = loc ? `${loc.name} (${loc.building})` : formData.venueDetails;



      const eventPayload = {

        title: formData.title,

        description: formData.description,

        date: formData.date,

        start_time: formData.startTime,

        end_time: formData.endTime,

        venue_name: venueName,

        location_id: formData.locationId, // For navigation

        category: formData.type,

        banner_url: bannerUrl

      };



      if (editingId) {

        // UPDATE

        const { error } = await supabase.from('events').update(eventPayload).eq('id', editingId);

        if(error) throw error;

        toast.success('Event Updated!');

      } else {

        // CREATE

        const { error } = await supabase.from('events').insert(eventPayload);

        if(error) throw error;

        toast.success('Event Created!');

      }



      // Reset

      setIsAdding(false);

      setEditingId(null);

      setFormData({

        title: '', description: '', date: '', startTime: '', endTime: '',

        locationId: '', type: 'academic', bannerImage: '', venueDetails: ''

      });

      setSelectedFile(null);



    } catch (error: any) {

      console.error(error);

      toast.error(error.message || "Operation failed");

    } finally {

      setLoading(false);

    }

  };



  const handleCancel = () => {

    setIsAdding(false);

    setEditingId(null);

    setSelectedFile(null);

    setFormData({ title: '', description: '', date: '', startTime: '', endTime: '', locationId: '', type: 'academic', bannerImage: '', venueDetails: '' });

  };



  const formatTime = (time: string) => {

    if(!time) return '';

    // Handle "HH:mm:ss" or "HH:mm"

    const [hours, minutes] = time.split(':');

    const h = parseInt(hours, 10);

    const ampm = h >= 12 ? 'PM' : 'AM';

    const h12 = h % 12 || 12;

    return `${h12}:${minutes} ${ampm}`;

  };



  return (

    <div className="h-full bg-gray-50 flex flex-col">

      <div className="bg-white p-4 shadow-sm border-b flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">

        <div className="flex items-center gap-3">

          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>

          <h2 className="font-bold text-lg whitespace-nowrap">

            {isAdding ? (editingId ? 'Edit Event' : 'New Event') : 'Manage Events'}

          </h2>

        </div>

        {!isAdding && (

          <Button onClick={() => setIsAdding(true)} className="bg-slate-900 text-white gap-2 shadow-md">

            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New Event</span>

            <span className="sm:hidden">Add</span>

          </Button>

        )}

      </div>



      <div className="flex-1 overflow-y-auto p-4">

        {isAdding ? (

          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4 max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200">

            <div>

              <label className="text-xs font-bold text-gray-500 uppercase">Event Title</label>

              <input

                className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white transition-colors"

                value={formData.title}

                onChange={e => setFormData({...formData, title: e.target.value})}

              />

            </div>



            <div>

              <label className="text-xs font-bold text-gray-500 uppercase">Description</label>

              <textarea

                className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white transition-colors h-20 resize-none"

                value={formData.description}

                onChange={e => setFormData({...formData, description: e.target.value})}

              />

            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>

                <label className="text-xs font-bold text-gray-500 uppercase">Date</label>

                <input type="date" className="w-full border p-2 rounded-lg bg-gray-50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />

              </div>

              <div>

                <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>

                <input type="time" className="w-full border p-2 rounded-lg bg-gray-50" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />

              </div>

              <div>

                <label className="text-xs font-bold text-gray-500 uppercase">End Time</label>

                <input type="time" className="w-full border p-2 rounded-lg bg-gray-50" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />

              </div>

            </div>



            <div>

              <label className="text-xs font-bold text-gray-500 uppercase">Venue (Map Location)</label>

              <select

                className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white"

                value={formData.locationId}

                onChange={e => setFormData({...formData, locationId: e.target.value})}

              >

                <option value="">Select a Campus Location...</option>

                {locations.map(loc => (

                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.building})</option>

                ))}

              </select>

            </div>



            <div>

              <label className="text-xs font-bold text-gray-500 uppercase">Category</label>

              <div className="flex gap-2 mt-1">

                {['academic', 'cultural', 'sports', 'workshop'].map(type => (

                  <button

                    key={type}

                    onClick={() => setFormData({...formData, type: type as any})}

                    className={`px-3 py-1 rounded-full text-xs capitalize border transition-all ${

                      formData.type === type

                        ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'

                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'

                    }`}

                  >

                    {type}

                  </button>

                ))}

              </div>

            </div>



            {/* Image Upload */}

            <div>

              <label className="text-xs font-bold text-gray-500 uppercase">Banner Image</label>

              <div className="flex items-center gap-3 mt-1">

                  <label className="cursor-pointer flex items-center gap-2 border border-dashed border-slate-300 p-3 rounded-lg hover:bg-slate-50 transition w-full">

                      <ImageIcon size={20} className="text-slate-400"/>

                      <span className="text-sm text-slate-500 truncate">{selectedFile ? selectedFile.name : "Click to upload image"}</span>

                      <input type="file" hidden accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />

                  </label>

                  {formData.bannerImage && !selectedFile && (

                      <img src={formData.bannerImage} className="w-10 h-10 rounded object-cover border" />

                  )}

              </div>

            </div>



            <div className="flex gap-3 pt-4 border-t mt-4">

              <Button variant="outline" className="flex-1" onClick={handleCancel}>

                <X className="w-4 h-4 mr-2" /> Cancel

              </Button>

              <Button className="flex-1 bg-green-600 text-white hover:bg-green-700" onClick={handleSave} disabled={loading}>

                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2" />}

                {editingId ? 'Update Event' : 'Publish Event'}

              </Button>

            </div>

          </div>

        ) : (

          <div className="space-y-3 pb-20">

            {eventsList.length === 0 && <div className="text-center text-slate-400 py-10">No events found. Create one!</div>}

           

            {eventsList.map(event => (

              <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center group transition-all hover:shadow-md">

                <div className="flex gap-4 items-center">

                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border">

                    {event.bannerImage ? (

                        <img src={event.bannerImage} alt="" className="w-full h-full object-cover" />

                    ) : (

                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>

                    )}

                  </div>

                  <div>

                    <h3 className="font-bold text-gray-800">{event.title}</h3>

                    <div className="flex flex-col gap-1 text-xs text-gray-500 mt-1">

                      <span className="flex items-center gap-1">

                        <Calendar className="w-3 h-3" /> {event.date}

                      </span>

                      <span className="flex items-center gap-1 text-blue-600 font-medium">

                        <Clock className="w-3 h-3" /> {formatTime(event.startTime)}

                      </span>

                      <span className="flex items-center gap-1">

                        <MapPin className="w-3 h-3" /> {event.venueDetails || 'Campus'}

                      </span>

                    </div>

                  </div>

                </div>

                <div className="flex items-center gap-2">

                  <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>

                    <Edit className="w-4 h-4 text-blue-400" />

                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>

                    <Trash2 className="w-4 h-4 text-red-400" />

                  </Button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>

  );

}