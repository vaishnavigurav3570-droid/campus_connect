import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Send, Image as ImageIcon, Heart, MessageCircle, X, ArrowLeft, Search, 
  Clock, Car, Utensils, CheckCircle, AlertCircle, Hash, Trash2, MapPin, Navigation
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';
import { Post } from '../types'; 
import { ActiveMeetupSession } from './ActiveMeetupSession'; // <--- CONNECTING YOUR FILE HERE

// Tag Colors
const TAG_COLORS = [
  'bg-red-50 text-red-600 border-red-100', 
  'bg-blue-50 text-blue-600 border-blue-100', 
  'bg-green-50 text-green-600 border-green-100', 
  'bg-purple-50 text-purple-600 border-purple-100', 
  'bg-orange-50 text-orange-600 border-orange-100',
];
const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

interface PostsDashboardProps {
    onBack: () => void;
}

export function PostsDashboard({ onBack }: PostsDashboardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // -- MEETUP STATE --
  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(null);

  // -- Form State --
  const [activeCategory, setActiveCategory] = useState<'general' | 'travel' | 'food' | 'errand'>('general');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [tagName, setTagName] = useState('');
  const [tags, setTags] = useState<{ name: string; color: string }[]>([]);

  // Category Inputs
  const [tripOrigin, setTripOrigin] = useState('GEC Campus');
  const [tripDest, setTripDest] = useState('');
  const [tripTime, setTripTime] = useState('');
  const [tripMode, setTripMode] = useState<'car' | 'bike'>('car');
  const [seats, setSeats] = useState(3);
  const [restaurant, setRestaurant] = useState('');
  const [deadline, setDeadline] = useState('');

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel('public:posts_unified')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    // We select user_id in comments to allow sharing location with specific people
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *, 
        profiles(full_name, email), 
        likes(user_id), 
        comments(id, user_id, content, created_at, profiles(full_name))
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) setPosts(data as unknown as Post[]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addTag = () => {
    if (tagName.trim() && tags.length < 5) {
      setTags([...tags, { name: tagName.trim(), color: getRandomColor() }]);
      setTagName('');
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setLoading(true);

    try {
      let imageUrl = null;
      if (selectedImage) {
        const fileName = `${Math.random()}.${selectedImage.name.split('.').pop()}`;
        const filePath = `${session.user.id}/${fileName}`;
        await supabase.storage.from('post_images').upload(filePath, selectedImage);
        const { data } = supabase.storage.from('post_images').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }

      let finalTags = tags.map(t => t.name);
      if (tagName.trim()) finalTags.push(tagName.trim());

      const postData: any = {
        user_id: session.user.id,
        content,
        category: activeCategory,
        image_url: imageUrl,
        tags: finalTags,
      };

      if (activeCategory === 'travel') {
        postData.trip_origin = tripOrigin;
        postData.trip_destination = tripDest;
        postData.trip_datetime = tripTime; 
        postData.trip_mode = tripMode;
        postData.seats_available = seats;
      } else if (activeCategory === 'food') {
        postData.restaurant_name = restaurant;
        postData.order_deadline = deadline;
      } else if (activeCategory === 'errand') {
        postData.status = 'open';
      }

      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;

      setContent(''); setSelectedImage(null); setImagePreview(null); setTags([]);
      setTripDest(''); setRestaurant('');
    } catch (e) {
      console.error(e);
      alert('Failed to post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if(window.confirm("Delete this post?")) await supabase.from('posts').delete().eq('id', postId);
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const liked = post?.likes?.some((l: any) => l.user_id === session.user.id);
    if (liked) await supabase.from('likes').delete().match({ user_id: session.user.id, post_id: postId });
    else await supabase.from('likes').insert({ user_id: session.user.id, post_id: postId });
  };

  const handleCommentSubmit = async (postId: string) => {
      if (!commentText.trim()) return;
      await supabase.from('comments').insert({ user_id: session.user.id, post_id: postId, content: commentText });
      setCommentText('');
  };

  const handleJoinRide = async (post: Post) => {
      if((post.seats_available || 0) <= 0) return;
      if(!window.confirm("Request to join?")) return;
      await supabase.from('posts').update({ seats_available: (post.seats_available || 1) - 1 }).eq('id', post.id);
      await supabase.from('comments').insert({ post_id: post.id, user_id: session.user.id, content: `🚗 I'm joining this ride! (Seat booked)` });
  };

  const handleAcceptErrand = async (post: Post) => {
      if(!window.confirm("Accept this task?")) return;
      await supabase.from('posts').update({ status: 'in_progress', accepted_by: session.user.id }).eq('id', post.id);
      await supabase.from('comments').insert({ post_id: post.id, user_id: session.user.id, content: `✅ I've accepted this request!` });
  };

  // --- NEW: PRIVATE LOCATION SHARING LOGIC ---
  const handleShareLocation = async (postId: string, guestId: string) => {
    if (!window.confirm("Share your LIVE location with this user for a meetup?")) return;
    
    try {
        // 1. Create Meetup Record
        const { data, error } = await supabase.from('meetups').insert({
            post_id: postId,
            host_id: session.user.id,
            guest_id: guestId,
            is_active: true
        }).select().single();

        if (error) throw error;

        // 2. Post a system comment with the special ID tag
        await supabase.from('comments').insert({
            post_id: postId,
            user_id: session.user.id,
            content: `📍 LIVE LOCATION SHARED. [MEETUP_ID:${data.id}]` 
        });
        
        // 3. Auto-open for the host
        setActiveMeetupId(data.id);
        
    } catch (err) {
        console.error(err);
        alert("Failed to start location share");
    }
  };

  const handleJoinMeetup = (content: string) => {
    // Extract ID from comment text
    const match = content.match(/\[MEETUP_ID:(.*?)\]/);
    if (match && match[1]) {
        setActiveMeetupId(match[1]);
    }
  };

  const filteredPosts = posts.filter(post => {
      const matchesSearch = searchQuery === '' || 
          post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags?.some((t: any) => (typeof t === 'string' ? t : t.name).toLowerCase().includes(searchQuery.toLowerCase())) ||
          post.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'general' ? true : post.category === activeCategory;
      return matchesSearch && matchesCategory; 
  });

  return (
    <div className="h-full bg-slate-50 flex flex-col relative">
      
      {/* --- LIVE MEETUP MODAL --- */}
      {/* This renders your existing ActiveMeetupSession.tsx file on top */}
      {activeMeetupId && (
        <ActiveMeetupSession 
            session={session} 
            meetupId={activeMeetupId} 
            onClose={() => setActiveMeetupId(null)} 
        />
      )}

      {/* HEADER */}
      <div className="bg-white px-4 py-3 border-b sticky top-0 z-20 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <h1 className="font-bold text-slate-800 text-lg">Campus Pulse</h1>
        </div>
        <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2">
            <Search size={16} className="text-slate-400 mr-2"/>
            <input 
                className="bg-transparent text-sm outline-none flex-1 placeholder:text-slate-400"
                placeholder="Search posts, tags, or people..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* CREATOR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b bg-slate-50">
            {[{ id: 'general', icon: MessageCircle, label: 'Post', color: 'text-slate-600' }, { id: 'travel', icon: Car, label: 'Ride', color: 'text-blue-600' }, { id: 'food', icon: Utensils, label: 'Food', color: 'text-orange-500' }, { id: 'errand', icon: CheckCircle, label: 'Task', color: 'text-emerald-600' }].map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id as any)} className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 transition-all ${activeCategory === cat.id ? `bg-white ${cat.color} border-b-2 border-current` : 'text-slate-400 hover:bg-slate-100'}`}>
                <cat.icon size={18} /> {cat.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
             {activeCategory === 'travel' && (
                <div className="grid grid-cols-2 gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                    <input className="text-sm p-2 rounded border outline-none" placeholder="From" value={tripOrigin} onChange={e => setTripOrigin(e.target.value)} />
                    <input className="text-sm p-2 rounded border outline-none" placeholder="To" value={tripDest} onChange={e => setTripDest(e.target.value)} />
                    <input type="datetime-local" className="text-sm p-2 rounded border outline-none" value={tripTime} onChange={e => setTripTime(e.target.value)} />
                    <select className="text-sm p-2 rounded border outline-none bg-white" value={tripMode} onChange={e => setTripMode(e.target.value as any)}>
                        <option value="car">Car</option>
                        <option value="bike">Bike</option>
                    </select>
                </div>
             )}
             {activeCategory === 'food' && (
                <div className="flex gap-2 bg-orange-50 p-3 rounded-xl border border-orange-100 items-center animate-in slide-in-from-top-2">
                    <Utensils size={16} className="text-orange-500"/>
                    <input className="flex-1 text-sm bg-transparent outline-none text-orange-800" placeholder="Restaurant Name?" value={restaurant} onChange={e => setRestaurant(e.target.value)} />
                    <input type="time" className="text-sm outline-none w-20 bg-white rounded p-1" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
             )}

            <textarea className="w-full text-sm outline-none resize-none placeholder:text-slate-400 min-h-[80px]" rows={3} placeholder="Details..." value={content} onChange={e => setContent(e.target.value)} />
            
            <div className="flex flex-wrap gap-2">
                 {tags.map((t: any, i: number) => <span key={i} className={`text-xs px-2 py-1 rounded-full ${t.color || 'bg-slate-100'}`}>#{t.name || t}</span>)}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200 w-fit">
                 <Hash size={14} className="text-slate-400"/>
                 <input className="bg-transparent text-xs outline-none w-24" placeholder="Add tag..." value={tagName} onChange={e => setTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
                 {tagName && <button onClick={addTag}><Send size={10} className="text-blue-500"/></button>}
            </div>

            {imagePreview && (
                <div className="relative mb-2">
                    <img src={imagePreview} className="w-full h-32 object-cover rounded-lg border border-slate-100" />
                    <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={12}/></button>
                </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
                <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-slate-50"><ImageIcon size={20}/></button>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} hidden accept="image/*"/>
                <Button size="sm" onClick={handleSubmit} disabled={loading} className="rounded-full px-6 bg-slate-900 hover:bg-slate-800">{loading ? '...' : 'Post'}</Button>
            </div>
          </div>
        </div>

        {/* FEED */}
        <div className="space-y-4 pb-20">
            {filteredPosts.map(post => {
                const isOwner = session?.user?.id === post.user_id;
                return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                    {post.category === 'travel' && <div className="bg-blue-600 h-1.5 w-full"></div>}
                    {post.category === 'food' && <div className="bg-orange-500 h-1.5 w-full"></div>}
                    {post.category === 'errand' && <div className="bg-emerald-500 h-1.5 w-full"></div>}

                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-600 border border-slate-200">{post.profiles?.full_name?.[0] || 'U'}</div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="text-sm font-bold text-slate-800">{post.profiles?.full_name}</p>
                                    {isOwner && <button onClick={() => handleDelete(post.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}
                                </div>
                                <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                            </div>
                        </div>

                        {post.category === 'travel' && (
                             <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl mb-3 border border-blue-100">
                                <span className="text-xs font-bold text-slate-700">{post.trip_origin}</span>
                                <Car size={14} className="text-blue-400"/>
                                <span className="text-xs font-bold text-slate-700">{post.trip_destination}</span>
                             </div>
                        )}

                        <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                        {post.image_url && <img src={post.image_url} className="w-full rounded-xl mb-3 max-h-64 object-cover" />}
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.map((t: any, i: number) => <span key={i} className={`text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200`}>#{typeof t === 'string' ? t : t.name}</span>)}
                            </div>
                        )}

                        {/* Actions */}
                        {post.category === 'travel' && (post.seats_available || 0) > 0 && !isOwner && (
                            <Button onClick={() => handleJoinRide(post)} className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 mb-3 border-blue-100">Join ({post.seats_available} left)</Button>
                        )}
                        {post.category === 'errand' && post.status === 'open' && !isOwner && (
                            <Button onClick={() => handleAcceptErrand(post)} className="w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 mb-3 border-emerald-100">I'll do this</Button>
                        )}

                        <div className="flex items-center gap-6 text-slate-400 text-sm pt-2 border-t">
                             <button onClick={() => handleLike(post.id)} className="flex items-center gap-1 hover:text-pink-500"><Heart size={18}/> {post.likes?.length || 0}</button>
                             <button onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} className="flex items-center gap-1 hover:text-blue-500"><MessageCircle size={18}/> {post.comments?.length || 0}</button>
                        </div>
                    </div>
                    
                    {expandedPostId === post.id && (
                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-50 animate-in slide-in-from-top-1">
                            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                {post.comments?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((c:any) => (
                                    <div key={c.id} className="text-xs bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex justify-between items-start">
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-700 block mb-0.5">{c.profiles?.full_name}</span>
                                            
                                            {/* CHECK IF COMMENT IS A MEETUP LINK */}
                                            {c.content.includes('[MEETUP_ID:') ? (
                                                <button onClick={() => handleJoinMeetup(c.content)} className="mt-1 flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md hover:bg-blue-700 transition animate-pulse">
                                                    <Navigation size={12} className="fill-current"/> TRACK LIVE LOCATION
                                                </button>
                                            ) : (
                                                <span className="text-slate-600">{c.content}</span>
                                            )}
                                        </div>
                                        
                                        {/* SHARE BUTTON: Only visible to Post Owner, NOT on their own comment, and NOT if already shared */}
                                        {isOwner && c.user_id !== session.user.id && !c.content.includes('[MEETUP_ID:') && (
                                            <button onClick={() => handleShareLocation(post.id, c.user_id)} className="ml-2 text-slate-400 hover:text-green-600 p-1.5 hover:bg-green-50 rounded-full transition" title="Share Live Location">
                                                <MapPin size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input className="flex-1 text-xs px-3 py-2 rounded-full border outline-none" placeholder="Comment..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)} />
                                <button onClick={() => handleCommentSubmit(post.id)} className="text-blue-600"><Send size={16}/></button>
                            </div>
                        </div>
                    )}
                </div>
            )})}
        </div>
      </div>
    </div>
  );
}