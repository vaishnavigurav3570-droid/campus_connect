import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Plus, Image as ImageIcon, Trash2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanoramaUploadProps {
  onBack: () => void;
}

export function AdminPanoramaUpload({ onBack }: AdminPanoramaUploadProps) {
  const [panoramas, setPanoramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPanoramas();
  }, []);

  const fetchPanoramas = async () => {
    const { data } = await supabase.from('panoramas').select('*').order('created_at', { ascending: false });
    if (data) setPanoramas(data);
  };

  const handleUpload = async () => {
    if (!title || !selectedFile) return toast.error("Title and Image required");

    setLoading(true);
    try {
        // 1. Upload File to Supabase Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `360_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('post_images').upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // 2. Get the Public URL
        const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(fileName);

        // 3. Save Entry to 'panoramas' Table
        const { error: dbError } = await supabase.from('panoramas').insert({
            title: title,
            image_url: urlData.publicUrl
        });

        if (dbError) throw dbError;

        toast.success("360 View Added Successfully!");
        setIsUploading(false);
        setTitle('');
        setSelectedFile(null);
        fetchPanoramas();

    } catch (error: any) {
        console.error(error);
        toast.error("Upload failed: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Delete this 360 view?")) return;
      
      const { error } = await supabase.from('panoramas').delete().eq('id', id);
      if (error) {
          toast.error("Failed to delete");
      } else {
          toast.success("View deleted");
          fetchPanoramas();
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* --- HEADER --- */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800">360° Views Manager</h1>
        </div>
        
        {/* --- MOVED: Added 'mr-36' to push button left --- */}
        {!isUploading && (
            <Button onClick={() => setIsUploading(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 rounded-xl shadow-md mr-36">
                <Plus size={18} /> Add View
            </Button>
        )}
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        
        {isUploading ? (
            /* --- UPLOAD FORM --- */
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-lg mx-auto animate-in fade-in zoom-in-95">
                <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Upload New 360° Photo</h2>
                
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Location Title</label>
                        <input 
                            className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-cyan-200 transition-all"
                            placeholder="e.g. Library Reading Room"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Drag & Drop Style Input */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                        
                        {selectedFile ? (
                            <div className="text-cyan-600 font-bold flex flex-col items-center relative z-0">
                                <img src={URL.createObjectURL(selectedFile)} className="w-20 h-20 object-cover rounded-lg mb-2 shadow-sm" />
                                <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                                <span className="text-xs text-cyan-400 mt-1">Click to change</span>
                            </div>
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center relative z-0 group-hover:text-slate-500 transition-colors">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <ImageIcon size={24}/>
                                </div>
                                <span className="text-sm font-bold">Click to upload 360 image</span>
                                <span className="text-xs mt-1">Supports JPG/PNG/WEBP</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsUploading(false)} className="flex-1">Cancel</Button>
                        <Button onClick={handleUpload} disabled={loading} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : null}
                            {loading ? 'Uploading...' : 'Save 360 View'}
                        </Button>
                    </div>
                </div>
            </div>
        ) : (
            /* --- GALLERY LIST --- */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {panoramas.length === 0 && (
                    <div className="col-span-full text-center py-20 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ImageIcon size={32} className="text-slate-300"/>
                        </div>
                        <h3 className="text-slate-600 font-bold">Gallery Empty</h3>
                        <p className="text-sm">Upload your first 360° panorama to get started.</p>
                    </div>
                )}
                
                {panoramas.map(pano => (
                    <div key={pano.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 aspect-video hover:shadow-lg transition-all hover:-translate-y-1">
                        <img src={pano.image_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/>
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                            <h3 className="text-white font-bold truncate pr-8 shadow-sm">{pano.title}</h3>
                            <p className="text-[10px] text-white/70 uppercase font-bold tracking-wider">360° Panorama</p>
                        </div>
                        
                        {/* Delete Button */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-white/90 rounded-lg text-slate-600 hover:text-red-600 shadow-sm transition-colors" onClick={(e) => { e.stopPropagation(); handleDelete(pano.id); }}>
                                <Trash2 size={16}/>
                            </button>
                        </div>
                        
                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/40 shadow-xl group-hover:scale-110 transition-transform">
                                <Eye size={24}/>
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