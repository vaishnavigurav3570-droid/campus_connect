import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { InlineMapPicker } from './InlineMapPicker';
import { 
  ArrowLeft, Plus, Users, MapPin, 
  Trash2, Edit2, Camera, CheckCircle, XCircle, Image as ImageIcon, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminAddStaffProps {
  onBack: () => void;
}

export function AdminAddStaff({ onBack }: AdminAddStaffProps) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', name: '', role: '', department: '', cabin_location: '', email: '', 
    image_url: '', cabin_panorama_url: '', lat: 0, lng: 0, is_available: true
  });
  
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [panoFile, setPanoFile] = useState<File | null>(null);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase.from('staff').select('*').order('name', { ascending: true });
    if (data) setStaffList(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role) return toast.error("Name and Role are required.");
    setLoading(true);
    
    let finalProfileUrl = formData.image_url;
    let finalPanoUrl = formData.cabin_panorama_url;

    try {
        if (profileFile) {
            const fileName = `staff_${Date.now()}_profile.${profileFile.name.split('.').pop()}`;
            await supabase.storage.from('post_images').upload(fileName, profileFile);
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            finalProfileUrl = data.publicUrl;
        }
        if (panoFile) {
            const fileName = `staff_${Date.now()}_pano.${panoFile.name.split('.').pop()}`;
            await supabase.storage.from('post_images').upload(fileName, panoFile);
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            finalPanoUrl = data.publicUrl;
        }

        const payload = {
            name: formData.name, role: formData.role, department: formData.department,
            cabin_location: formData.cabin_location, email: formData.email,
            image_url: finalProfileUrl, cabin_panorama_url: finalPanoUrl,
            lat: formData.lat, lng: formData.lng, is_available: formData.is_available
        };

        if (formData.id) {
            const { error } = await supabase.from('staff').update(payload).eq('id', formData.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('staff').insert(payload);
            if (error) throw error;
        }

        toast.success(formData.id ? "Profile Updated" : "Staff Member Added");
        setIsEditing(false); resetForm(); fetchStaff();

    } catch (error: any) {
        toast.error("Error: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    await supabase.from('staff').delete().eq('id', id);
    toast.success("Profile deleted");
    fetchStaff();
  };

  const startEdit = (staff?: any) => {
    if (staff) {
        setFormData({
            id: staff.id, name: staff.name, role: staff.role, department: staff.department || '',
            cabin_location: staff.cabin_location || '', email: staff.email || '', image_url: staff.image_url || '',
            cabin_panorama_url: staff.cabin_panorama_url || '', lat: staff.lat || 0, lng: staff.lng || 0,
            is_available: staff.is_available
        });
    } else resetForm();
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', role: '', department: '', cabin_location: '', email: '', image_url: '', cabin_panorama_url: '', lat: 0, lng: 0, is_available: true });
    setProfileFile(null); setPanoFile(null);
  };

  const toggleAvailability = async (staff: any) => {
    const newStatus = !staff.is_available;
    const { error } = await supabase.from('staff').update({ is_available: newStatus }).eq('id', staff.id);
    if (error) toast.error("Failed to update status");
    else {
        setStaffList(staffList.map(s => s.id === staff.id ? { ...s, is_available: newStatus } : s));
        toast.success(`Marked as ${newStatus ? 'Available' : 'Busy'}`);
    }
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5 text-slate-600" /></Button>
            <h1 className="text-lg font-bold text-slate-800">Faculty Directory</h1>
        </div>
        {!isEditing && (
            <Button onClick={() => startEdit()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl mr-40 shadow-lg">
                <Plus size={18} /> Add Staff
            </Button>
        )}
      </div>

      {/* SCROLLING ENABLED HERE with 'overflow-y-auto' */}
      <div className="flex-1 overflow-y-auto p-6 w-full">
        <div className="max-w-5xl mx-auto pb-20"> {/* pb-20 adds space at bottom for scrolling past buttons */}
            {isEditing ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">{formData.id ? 'Edit Profile' : 'New Faculty Member'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* LEFT: IMAGES */}
                        <div className="flex flex-col items-center gap-6">
                            <div>
                                <label className="relative cursor-pointer group block">
                                    <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                                        {profileFile ? <img src={URL.createObjectURL(profileFile)} className="w-full h-full object-cover" /> : formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <Users size={40} className="text-slate-300" />}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24} /></div>
                                    <input type="file" hidden accept="image/*" onChange={e => setProfileFile(e.target.files?.[0] || null)} />
                                </label>
                                <p className="text-[10px] text-center text-slate-400 mt-2">Profile Photo</p>
                            </div>

                            <div className="w-full">
                                <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <ImageIcon size={24} className="text-cyan-500 mb-2"/>
                                    <span className="text-xs font-bold text-slate-600">{panoFile ? "Pano Selected" : formData.cabin_panorama_url ? "Change 360 View" : "Add Cabin 360°"}</span>
                                    <input type="file" hidden accept="image/*" onChange={e => setPanoFile(e.target.files?.[0] || null)} />
                                </label>
                                {(formData.cabin_panorama_url || panoFile) && <p className="text-[10px] text-green-600 text-center mt-1 flex items-center justify-center gap-1"><CheckCircle size={10}/> 360 View Active</p>}
                            </div>
                        </div>

                        {/* RIGHT: DETAILS */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dr. Sarah Smith" /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Role / Title</label><input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="e.g. HOD Computer Dept" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Department</label><input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} /></div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Pin Cabin Location on Map</label>
                                <InlineMapPicker initialLat={formData.lat} initialLng={formData.lng} onLocationSelect={(lat, lng) => setFormData({...formData, lat, lng})} />
                                <div className="flex gap-2 mt-2">
                                    <input className="flex-1 p-3 bg-slate-50 rounded-xl text-sm" placeholder="Location Name (e.g. Main Bldg, Room 101)" value={formData.cabin_location} onChange={e => setFormData({...formData, cabin_location: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
                                <Button onClick={handleSave} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                    {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : null} Save Profile
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.length === 0 && !loading && (
                        <div className="col-span-full text-center py-20 text-slate-400">
                            <Users className="w-16 h-16 mx-auto text-slate-200 mb-4"/>
                            <p className="mb-4">No staff members found.</p>
                            <Button onClick={() => startEdit()} variant="outline" className="border-blue-200 text-blue-600">Create First Profile</Button>
                        </div>
                    )}
                    {staffList.map(staff => (
                        <div key={staff.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative">
                            <div className="flex items-start gap-4">
                                <img src={staff.image_url || "https://via.placeholder.com/100"} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"/>
                                <div>
                                    <h3 className="font-bold text-slate-800">{staff.name}</h3>
                                    <p className="text-xs font-medium text-blue-600 mb-1">{staff.role}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> {staff.cabin_location || 'N/A'}</p>
                                </div>
                            </div>
                            {staff.cabin_panorama_url && <div className="absolute top-4 right-4 bg-cyan-50 text-cyan-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-cyan-100"><ImageIcon size={10} /> 360°</div>}
                            <div className="mt-4 flex items-center justify-between border-t pt-3">
                                <button onClick={() => toggleAvailability(staff)} className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition-colors ${staff.is_available ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                    {staff.is_available ? <CheckCircle size={12}/> : <XCircle size={12}/>} {staff.is_available ? 'In Cabin' : 'Unavailable'}
                                </button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => startEdit(staff)}><Edit2 size={14}/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(staff.id)}><Trash2 size={14}/></Button>
                                </div>
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