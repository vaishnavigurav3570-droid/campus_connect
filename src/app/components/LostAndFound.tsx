import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Search, Plus, MapPin, Phone, Image as ImageIcon, CheckCircle, Tag, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface LostAndFoundProps {
  onBack: () => void;
  onViewUser?: (userId: string) => void; // <--- NEW PROP
}

export function LostAndFound({ onBack, onViewUser }: LostAndFoundProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');
  const [showForm, setShowForm] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('lost_items')
      .select('*, profiles:user_id(full_name, roll_no)') // Fetch profile details
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!title || !location || !contact) return toast.error("Please fill required fields");
    setLoading(true);

    try {
      let imageUrl = null;
      if (selectedImage && session) {
        const fileName = `lostfound/${Date.now()}_${selectedImage.name}`;
        await supabase.storage.from('post_images').upload(fileName, selectedImage);
        const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('lost_items').insert({
        user_id: session.user.id,
        category: activeTab,
        title,
        description: desc,
        location_found: location,
        contact_info: contact,
        image_url: imageUrl
      });

      if (error) throw error;
      
      toast.success("Item Posted Successfully!");
      setShowForm(false);
      setTitle(''); setDesc(''); setLocation(''); setContact(''); setSelectedImage(null); setImagePreview(null);
      fetchItems();
      
    } catch (error) {
      toast.error("Failed to post item.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    if(!window.confirm("Mark this item as resolved/found?")) return;
    await supabase.from('lost_items').update({ is_resolved: true }).eq('id', id);
    fetchItems();
    toast.success("Item marked as resolved");
  };

  // --- NEW: Request Location Logic ---
  const handleRequestLocation = async (item: any) => {
      if (!session) return;
      
      // Check if already requested
      const { data: existing } = await supabase.from('item_claims')
        .select('*')
        .match({ item_id: item.id, requester_id: session.user.id })
        .single();

      if (existing) {
          return toast.info("Request already sent. Check your profile for updates.");
      }

      const { error } = await supabase.from('item_claims').insert({
          item_id: item.id,
          requester_id: session.user.id,
          owner_id: item.user_id,
          status: 'pending'
      });

      if (error) toast.error("Failed to send request");
      else toast.success("Location request sent! Check your Profile page.");
  };

  const filteredItems = items.filter(i => i.category === activeTab);

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans animate-in slide-in-from-right">
      
      {/* HEADER */}
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between shadow-sm gap-4">
         <div className="flex items-center gap-3 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-slate-800 text-lg truncate">Lost & Found</h1>
         </div>
         <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-slate-900 text-white rounded-full px-4 text-xs font-bold mr-2 flex-shrink-0">
            {showForm ? 'Cancel' : '+ Post Item'}
         </Button>
      </div>

      {/* TABS */}
      {!showForm && (
        <div className="flex p-4 gap-2">
            <button onClick={() => setActiveTab('lost')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${activeTab === 'lost' ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' : 'bg-white text-slate-400 border-transparent'}`}>Lost Items</button>
            <button onClick={() => setActiveTab('found')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${activeTab === 'found' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-white text-slate-400 border-transparent'}`}>Found Items</button>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {showForm ? (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in zoom-in-95">
                <h3 className="font-bold text-slate-800">Post {activeTab === 'lost' ? 'Lost' : 'Found'} Item</h3>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Item Name</label><input className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. Blue Water Bottle" value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Description</label><textarea className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200" rows={2} placeholder="Brand, color..." value={desc} onChange={e => setDesc(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Location</label><input className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. Library" value={location} onChange={e => setLocation(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Contact</label><input className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200" placeholder="Phone / DM" value={contact} onChange={e => setContact(e.target.value)} /></div>
                </div>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors">
                    {imagePreview ? <img src={imagePreview} className="h-32 object-contain rounded-lg" /> : <><ImageIcon size={24} className="mb-2"/><span className="text-xs">Tap to upload photo</span></>}
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
                </div>
                <Button onClick={handleSubmit} disabled={loading} className="w-full bg-slate-900 text-white rounded-xl py-6 font-bold">{loading ? 'Posting...' : 'Submit Post'}</Button>
            </div>
        ) : (
            <div className="space-y-4">
                {filteredItems.length === 0 ? <div className="text-center py-20 text-slate-400"><p>No items reported.</p></div> : filteredItems.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        {item.image_url && <div className="h-40 w-full bg-slate-100"><img src={item.image_url} className="w-full h-full object-cover" /></div>}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">{item.title}</h3>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${item.category === 'lost' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.category}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                            <div className="space-y-1 text-xs text-slate-500 mb-4">
                                <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {item.category === 'lost' ? 'Lost near' : 'Found at'}: <span className="font-medium text-slate-700">{item.location_found}</span></div>
                                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> Contact: <span className="font-medium text-slate-700">{item.contact_info}</span></div>
                                <div className="flex items-center gap-2">
                                    <Tag size={14} className="text-slate-400"/> Posted by: 
                                    {/* CLICKABLE NAME */}
                                    <button 
                                        onClick={() => onViewUser && onViewUser(item.user_id)}
                                        className="font-bold text-blue-600 hover:underline"
                                    >
                                        {item.profiles?.full_name}
                                    </button>
                                    • {formatDistanceToNow(new Date(item.created_at))} ago
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex gap-2">
                                {session?.user?.id === item.user_id ? (
                                    <button onClick={() => handleResolve(item.id)} className="flex-1 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
                                        <CheckCircle size={14} /> Mark Resolved
                                    </button>
                                ) : (
                                    <button onClick={() => handleRequestLocation(item)} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-blue-200 shadow-sm">
                                        <Navigation size={14} /> Request Location
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}