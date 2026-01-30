import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { 
  ArrowLeft, LogOut, Mail, User, MapPin, Calendar, 
  Shield, Edit3, Trash2, Heart, MessageCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserProfileProps {
  session: any;
  onBack: () => void;
  onLogout: () => void;
}

export function UserProfile({ session, onBack, onLogout }: UserProfileProps) {
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const user = session.user;

      // 1. Get Profile Details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData || { full_name: user.user_metadata.full_name, email: user.email });

      // 2. Get User's Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`*, likes(count), comments(count)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setMyPosts(postsData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await supabase.from('posts').delete().eq('id', postId);
    setMyPosts(myPosts.filter(p => p.id !== postId));
  };

  // Get Initials for Avatar
  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans overflow-hidden relative">
      
      {/* --- HEADER BACKGROUND --- */}
      <div className="h-40 bg-gradient-to-r from-cyan-600 to-blue-600 relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all">
            <ArrowLeft size={20} />
        </button>
        <div className="absolute -bottom-10 left-0 w-full h-20 bg-slate-50 rounded-t-[2.5rem]"></div>
      </div>

      {/* --- PROFILE CONTENT --- */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 -mt-16 z-10">
        
        {/* ID CARD SECTION */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-xl ring-4 ring-cyan-50 mb-4 relative group">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-100 to-blue-50 flex items-center justify-center text-3xl font-bold text-cyan-700">
                    {getInitials(profile?.full_name)}
                </div>
                <button className="absolute bottom-1 right-1 bg-slate-800 text-white p-1.5 rounded-full hover:bg-black transition-colors shadow-md">
                    <Edit3 size={14} />
                </button>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900">{profile?.full_name || 'Student'}</h1>
            <div className="flex items-center gap-2 mt-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                <Shield size={12} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Computer Engineering</span>
            </div>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600"><Mail size={18}/></div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email</p>
                    <p className="text-xs font-medium text-slate-700 truncate w-32">{profile?.email}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><Calendar size={18}/></div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Joined</p>
                    <p className="text-xs font-medium text-slate-700">Batch 2026</p>
                </div>
            </div>
        </div>

        {/* --- MY ACTIVITY SECTION --- */}
        <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-cyan-500" /> My Recent Activity
            </h3>

            {loading ? (
                <div className="text-center py-10 text-slate-400 text-xs">Loading activity...</div>
            ) : myPosts.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">No posts yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {myPosts.map(post => (
                        <div key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative group">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    post.category === 'travel' ? 'bg-blue-50 text-blue-600' : 
                                    post.category === 'food' ? 'bg-orange-50 text-orange-600' :
                                    'bg-slate-100 text-slate-500'
                                }`}>{post.category}</span>
                                <span className="text-[10px] text-slate-300">{formatDistanceToNow(new Date(post.created_at))} ago</span>
                            </div>
                            
                            <p className="text-sm text-slate-700 mb-3 line-clamp-2">{post.content}</p>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-50 pt-3">
                                <span className="flex items-center gap-1"><Heart size={14}/> {post.likes?.length || 0}</span>
                                <span className="flex items-center gap-1"><MessageCircle size={14}/> {post.comments?.length || 0}</span>
                                <div className="flex-1"></div>
                                <button onClick={() => handleDeletePost(post.id)} className="text-red-400 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                    <Trash2 size={12}/> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* LOGOUT BUTTON */}
        <Button 
            onClick={onLogout}
            variant="outline"
            className="w-full border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 py-6 rounded-xl flex items-center gap-2 shadow-sm"
        >
            <LogOut size={18} /> Sign Out
        </Button>
        <p className="text-center text-[10px] text-slate-300 mt-6 pb-4">Version 1.0.4 • GEC Navigator</p>
      </div>
    </div>
  );
}