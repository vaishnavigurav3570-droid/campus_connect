import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, LogOut, User, MapPin, Calendar, Shield, Edit3, Trash2, Heart, MessageCircle, Hash, BookOpen, ShieldAlert, Navigation, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ActiveMeetupSession } from './ActiveMeetupSession'; 

interface UserProfileProps {
  session: any;
  targetUserId?: string | null;
  onBack: () => void;
  onLogout: () => void;
}

export function UserProfile({ session, targetUserId, onBack, onLogout }: UserProfileProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [incomingClaims, setIncomingClaims] = useState<any[]>([]); // Requests received
  const [outgoingClaims, setOutgoingClaims] = useState<any[]>([]); // Requests sent
  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const isOwnProfile = !targetUserId || targetUserId === session?.user?.id;
  const profileIdToFetch = targetUserId || session?.user?.id;
  const isProfileGuest = profileIdToFetch === 'guest';

  useEffect(() => {
    if (profileIdToFetch && profileIdToFetch !== 'guest') {
      fetchProfileData();
      if(isOwnProfile) {
          fetchIncomingClaims();
          fetchOutgoingClaims(); // <--- Fetch my sent requests
      }
    } else {
      setLoading(false);
    }
  }, [profileIdToFetch]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', profileIdToFetch).single();
      setProfile(profileData || { full_name: 'Unknown Student', email: 'No Email' });
      
      const { data: postsData } = await supabase.from('posts').select(`*, likes(count), comments(count)`).eq('user_id', profileIdToFetch).order('created_at', { ascending: false });
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch Requests I Received (I am the Owner)
  const fetchIncomingClaims = async () => {
      const { data } = await supabase
        .from('item_claims')
        .select(`*, profiles:requester_id(full_name), lost_items(title)`)
        .eq('owner_id', session.user.id)
        .eq('status', 'pending');
      if (data) setIncomingClaims(data);
  };

  // 2. Fetch Requests I Sent (I am the Requester)
  const fetchOutgoingClaims = async () => {
      const { data } = await supabase
        .from('item_claims')
        .select(`*, profiles:owner_id(full_name), lost_items(title)`)
        .eq('requester_id', session.user.id)
        .neq('status', 'rejected'); // Show Pending and Accepted
      if (data) setOutgoingClaims(data);
  };

  // Action: Accept Request (Owner)
  const handleAcceptClaim = async (claim: any) => {
      await supabase.from('item_claims').update({ status: 'accepted' }).eq('id', claim.id);
      
      const { data: meetup } = await supabase.from('meetups').insert({
          host_id: session.user.id,
          guest_id: claim.requester_id,
          lost_item_id: claim.item_id,
          is_active: true
      }).select().single();

      if(meetup) setActiveMeetupId(meetup.id);
      fetchIncomingClaims();
  };

  // Action: Join Live Session (Requester)
  const handleJoinSession = async (claim: any) => {
      // Find the active meetup for this item
      const { data: meetup } = await supabase.from('meetups')
        .select('*')
        .eq('lost_item_id', claim.item_id)
        .eq('is_active', true)
        .single();
      
      if (meetup) setActiveMeetupId(meetup.id);
      else alert("Session not active yet. Wait for the owner.");
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await supabase.from('posts').delete().eq('id', postId);
    setPosts(posts.filter(p => p.id !== postId));
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans overflow-hidden relative animate-in slide-in-from-right duration-300">
      
      {/* TRIGGER LIVE MAP */}
      {activeMeetupId && (
          <div className="absolute inset-0 z-[100] bg-white">
              <ActiveMeetupSession session={session} meetupId={activeMeetupId} onClose={() => setActiveMeetupId(null)} />
          </div>
      )}

      {/* HEADER */}
      <div className={`h-40 bg-gradient-to-r ${isOwnProfile ? 'from-cyan-600 to-blue-600' : 'from-purple-600 to-indigo-600'} relative`}>
        <button onClick={onBack} className="absolute top-4 left-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all">
            <ArrowLeft size={20} />
        </button>
        <div className="absolute -bottom-10 left-0 w-full h-20 bg-slate-50 rounded-t-[2.5rem]"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20 -mt-16 z-10">
        
        {/* ID CARD */}
        <div className="flex flex-col items-center mb-8">
            <div className={`w-28 h-28 rounded-full bg-white p-1.5 shadow-xl ring-4 ${isOwnProfile ? 'ring-cyan-50' : 'ring-purple-50'} mb-4 relative group`}>
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${isOwnProfile ? 'from-cyan-100 to-blue-50 text-cyan-700' : 'from-purple-100 to-indigo-50 text-purple-700'} flex items-center justify-center text-3xl font-bold`}>
                    {isProfileGuest ? "G" : getInitials(profile?.full_name)}
                </div>
                {isOwnProfile && (
                <button className="absolute bottom-1 right-1 bg-slate-800 text-white p-1.5 rounded-full hover:bg-black transition-colors shadow-md">
                    <Edit3 size={14} />
                </button>
                )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center">{isProfileGuest ? "Guest User" : (profile?.full_name || 'Student')}</h1>
            {!isProfileGuest && profile?.branch && (
                <div className={`flex items-center gap-2 mt-1 px-3 py-1 rounded-full border ${isOwnProfile ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
                    <Shield size={12} className={isOwnProfile ? 'text-blue-600' : 'text-purple-600'} />
                    <span className={`text-xs font-medium uppercase tracking-wide ${isOwnProfile ? 'text-blue-700' : 'text-purple-700'}`}>
                        {profile.branch} Engineering
                    </span>
                </div>
            )}
        </div>

        {/* --- SECTION 1: INCOMING REQUESTS (I need to share my location) --- */}
        {isOwnProfile && incomingClaims.length > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 animate-in slide-in-from-top-2">
                <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <Navigation size={16}/> Requests Received
                </h3>
                <div className="space-y-3">
                    {incomingClaims.map(claim => (
                        <div key={claim.id} className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between border border-amber-100">
                            <div>
                                <p className="text-xs font-bold text-slate-800">{claim.profiles?.full_name}</p>
                                <p className="text-[10px] text-slate-500">For item: <b>{claim.lost_items?.title}</b></p>
                            </div>
                            <button onClick={() => handleAcceptClaim(claim)} className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 shadow-sm">
                                Share Location
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- SECTION 2: OUTGOING REQUESTS (I am waiting to join) --- */}
        {isOwnProfile && outgoingClaims.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 animate-in slide-in-from-top-2">
                <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <MapPin size={16}/> My Requests
                </h3>
                <div className="space-y-3">
                    {outgoingClaims.map(claim => (
                        <div key={claim.id} className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between border border-blue-100">
                            <div>
                                <p className="text-xs font-bold text-slate-800">{claim.lost_items?.title}</p>
                                <p className="text-[10px] text-slate-500">Owner: {claim.profiles?.full_name}</p>
                            </div>
                            
                            {claim.status === 'accepted' ? (
                                <button onClick={() => handleJoinSession(claim)} className="bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-600 shadow-sm animate-pulse">
                                    Join Live Map
                                </button>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
                                    <Clock size={10}/> Pending
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* INFO GRID */}
        {!isProfileGuest && (
        <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600"><Hash size={18}/></div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Roll No</p>
                    <p className="text-xs font-medium text-slate-700 truncate w-32">{profile?.roll_no || "N/A"}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><Calendar size={18}/></div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Year</p>
                    <p className="text-xs font-medium text-slate-700">{profile?.year ? `${profile.year} Year` : "N/A"}</p>
                </div>
            </div>
        </div>
        )}

        {/* ACTIVITY & LOGOUT (Keep existing code) */}
        {!isProfileGuest && (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin size={16} className={isOwnProfile ? "text-cyan-500" : "text-purple-500"} /> 
                {isOwnProfile ? "My Recent Activity" : `${profile?.full_name || 'User'}'s Activity`}
            </h3>
            <div className="space-y-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative group">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${post.category === 'travel' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{post.category}</span>
                            <span className="text-[10px] text-slate-300">{formatDistanceToNow(new Date(post.created_at))} ago</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-3 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-50 pt-3">
                            <span className="flex items-center gap-1"><Heart size={14}/> {post.likes?.length || 0}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={14}/> {post.comments?.length || 0}</span>
                            <div className="flex-1"></div>
                            {isOwnProfile && <button onClick={() => handleDeletePost(post.id)} className="text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12}/> Delete</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        )}
        
        {isOwnProfile && (
            <Button onClick={onLogout} variant="outline" className="w-full border-red-100 text-red-500 hover:bg-red-50 py-6 rounded-xl flex items-center gap-2 shadow-sm">
                <LogOut size={18} /> Sign Out
            </Button>
        )}
      </div>
    </div>
  );
}