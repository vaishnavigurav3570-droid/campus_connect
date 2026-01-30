import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Send, Image as ImageIcon, Heart, MessageCircle, X, ArrowLeft, Search, 
  Car, Utensils, CheckCircle, Hash, Trash2, MapPin, Navigation, Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';
import { Post } from '../types';
import { ActiveMeetupSession } from './ActiveMeetupSession';

// Import your logo (Adjust path if needed)
// If in public folder, use: const LogoSrc = "/logo.jpeg";
import LogoSrc from '../../assets/logo.jpeg';

const TAG_COLORS = [
  'bg-cyan-50 text-cyan-700 border-cyan-100', 
  'bg-amber-50 text-amber-700 border-amber-100', 
  'bg-emerald-50 text-emerald-700 border-emerald-100', 
  'bg-purple-50 text-purple-700 border-purple-100', 
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
  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(null);
  
  // --- Form State ---
  const [activeCategory, setActiveCategory] = useState<'general' | 'travel' | 'food' | 'errand'>('general');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Tags
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

  // View State
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
    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles(full_name, email), likes(user_id), comments(id, user_id, content, created_at, profiles(full_name))`)
      .order('created_at', { ascending: false });
    
    if (!error && data) setPosts(data as unknown as Post[]);
  };

  // --- Handlers (Same Logic as Before) ---
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
      alert('Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if(window.confirm("Delete this post?")) await supabase.from('posts').delete().eq('id', postId);
  };

  const handleLike = async (postId: string) => {
    if (!session) return;
    const post = posts.find(p => p.id === postId);
    const liked = post?.likes?.some((l: any) => l.user_id === session.user.id);
    if (liked) await supabase.from('likes').delete().match({ user_id: session.user.id, post_id: postId });
    else await supabase.from('likes').insert({ user_id: session.user.id, post_id: postId });
  };

  const handleCommentSubmit = async (postId: string) => {
      if (!commentText.trim() || !session) return;
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

  const handleShareLocation = async (postId: string, guestId: string) => {
    if (!window.confirm("Share your LIVE location?")) return;
    const { data } = await supabase.from('meetups').insert({
        post_id: postId, host_id: session.user.id, guest_id: guestId, is_active: true
    }).select().single();
    if (data) {
        await supabase.from('comments').insert({
            post_id: postId, user_id: session.user.id, content: `📍 LIVE LOCATION SHARED. [MEETUP_ID:${data.id}]` 
        });
        setActiveMeetupId(data.id);
    }
  };

  const handleJoinMeetup = (content: string) => {
    const match = content.match(/\[MEETUP_ID:(.*?)\]/);
    if (match && match[1]) setActiveMeetupId(match[1]);
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
    <div className="h-full bg-slate-50 flex flex-col relative font-sans">
      {activeMeetupId && session && (
        <ActiveMeetupSession session={session} meetupId={activeMeetupId} onClose={() => setActiveMeetupId(null)} />
      )}

      {/* --- NEW HEADER DESIGN --- */}
      <div className="bg-white px-4 py-3 border-b sticky top-0 z-30 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-5 h-5" />
            </Button>
            {/* LOGO INTEGRATION */}
            <div className="flex items-center gap-2">
                <img src={LogoSrc} alt="Logo" className="w-8 h-8 rounded-md object-contain" />
                <h1 className="font-bold text-slate-800 text-lg hidden sm:block tracking-tight">Campus Connect</h1>
            </div>
        </div>

        {/* MODERN SEARCH BAR */}
        <div className="flex-1 max-w-md relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                <Search size={16} />
            </div>
            <input 
                className="w-full bg-slate-100 text-sm py-2 pl-9 pr-4 rounded-full outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all border border-transparent focus:border-cyan-200 placeholder:text-slate-400"
                placeholder="Search feeds..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </div>

        {/* NOTIFICATION ICON (Placeholder) */}
        <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full border border-white"></span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* --- CREATOR CARD (Elevated Design) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 p-1 overflow-hidden">
            {/* PILL TABS */}
            <div className="flex p-1 bg-slate-50/50 rounded-xl mb-3 gap-1">
                {[{ id: 'general', label: 'Post', icon: MessageCircle }, { id: 'travel', label: 'Ride', icon: Car }, { id: 'food', label: 'Food', icon: Utensils }, { id: 'errand', label: 'Task', icon: CheckCircle }].map(cat => (
                <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id as any)} 
                    className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
                        activeCategory === cat.id 
                        ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <cat.icon size={16} className={activeCategory === cat.id ? 'text-cyan-500' : ''} /> {cat.label}
                </button>
                ))}
            </div>
            
            <div className="px-3 pb-3">
                {/* DYNAMIC INPUTS */}
                {activeCategory === 'travel' && (
                    <div className="grid grid-cols-2 gap-2 bg-cyan-50/50 p-3 rounded-xl border border-cyan-100/50 mb-3 animate-in fade-in slide-in-from-top-1">
                        <input className="text-sm p-2 rounded-lg border-0 ring-1 ring-cyan-200 focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="From location" value={tripOrigin} onChange={e => setTripOrigin(e.target.value)} />
                        <input className="text-sm p-2 rounded-lg border-0 ring-1 ring-cyan-200 focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="To destination" value={tripDest} onChange={e => setTripDest(e.target.value)} />
                        <input type="datetime-local" className="text-sm p-2 rounded-lg border-0 ring-1 ring-cyan-200 outline-none text-cyan-900" value={tripTime} onChange={e => setTripTime(e.target.value)} />
                        <select className="text-sm p-2 rounded-lg border-0 ring-1 ring-cyan-200 outline-none bg-white text-cyan-900" value={tripMode} onChange={e => setTripMode(e.target.value as any)}>
                            <option value="car">Car Ride</option><option value="bike">Bike Ride</option>
                        </select>
                    </div>
                )}

                {/* TEXT AREA */}
                <textarea 
                    className="w-full text-sm outline-none resize-none placeholder:text-slate-400 min-h-[80px] bg-transparent" 
                    rows={3} 
                    placeholder={`What's on your mind, ${session?.user?.user_metadata?.full_name?.split(' ')[0] || 'friend'}?`} 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                />
                
                {/* TAGS & PREVIEW */}
                {tags.length > 0 && (
                     <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((t, i) => <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${t.color} flex items-center gap-1`}>#{t.name} <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))}><X size={10}/></button></span>)}
                    </div>
                )}
                {imagePreview && (
                    <div className="relative mb-3 group">
                        <img src={imagePreview} className="w-full h-48 object-cover rounded-xl border border-slate-100 shadow-sm" />
                        <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                    </div>
                )}
                
                {/* TOOLBAR */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                         <button onClick={() => fileInputRef.current?.click()} className="text-cyan-600 bg-cyan-50 hover:bg-cyan-100 p-2 rounded-full transition-colors"><ImageIcon size={18}/></button>
                         <input type="file" ref={fileInputRef} onChange={handleImageSelect} hidden accept="image/*"/>
                         
                         <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 rounded-full px-3 py-1.5 transition-colors cursor-text group" onClick={() => (document.querySelector('.tag-input') as HTMLElement)?.focus()}>
                              <Hash size={14} className="text-slate-400 group-hover:text-cyan-500"/>
                              <input className="tag-input bg-transparent text-xs outline-none w-20 cursor-text" placeholder="Add tag..." value={tagName} onChange={e => setTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
                              {tagName && <button onClick={addTag}><Send size={12} className="text-cyan-500"/></button>}
                         </div>
                    </div>
                    
                    <Button size="sm" onClick={handleSubmit} disabled={loading || !content.trim()} className="rounded-full px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md shadow-cyan-200 transition-all active:scale-95 font-medium">
                        {loading ? 'Posting...' : 'Post'}
                    </Button>
                </div>
            </div>
        </div>

        {/* --- FEED --- */}
        <div className="space-y-5 pb-20">
            {filteredPosts.map(post => {
                const isOwner = session?.user?.id === post.user_id;
                return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 overflow-hidden relative group">
                    
                    <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-50 flex items-center justify-center font-bold text-sm text-cyan-700 border border-white shadow-sm ring-2 ring-slate-50">
                                {post.profiles?.full_name?.[0] || 'U'}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-none mb-1">{post.profiles?.full_name}</p>
                                        <div className="flex items-center gap-2">
                                            {post.category !== 'general' && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                                    post.category === 'travel' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                    post.category === 'food' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>{post.category}</span>
                                            )}
                                            <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                    {isOwner && <button onClick={() => handleDelete(post.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={15}/></button>}
                                </div>
                            </div>
                        </div>

                        {/* Travel Details Card */}
                        {post.category === 'travel' && (
                             <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100">
                                <div className="p-2 bg-white rounded-full shadow-sm text-blue-500"><Car size={16}/></div>
                                <div className="flex-1 text-xs">
                                    <div className="flex items-center gap-2 text-slate-500 mb-0.5">
                                        <span className="font-medium text-slate-800">{post.trip_origin}</span> 
                                        <span className="text-slate-300">➜</span> 
                                        <span className="font-medium text-slate-800">{post.trip_destination}</span>
                                    </div>
                                    <span className="text-slate-400">Available Seats: <span className="text-slate-700 font-bold">{post.seats_available}</span></span>
                                </div>
                                {(post.seats_available || 0) > 0 && !isOwner && (
                                    <button onClick={() => handleJoinRide(post)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full font-medium transition-colors shadow-sm shadow-blue-200">
                                        Join
                                    </button>
                                )}
                             </div>
                        )}

                        {/* Main Content */}
                        <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        
                        {/* Image */}
                        {post.image_url && (
                            <div className="rounded-xl overflow-hidden mb-3 border border-slate-100 shadow-sm">
                                <img src={post.image_url} className="w-full max-h-96 object-cover hover:scale-[1.01] transition-transform duration-500" />
                            </div>
                        )}
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.map((t: any, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors rounded-full cursor-pointer">#{typeof t === 'string' ? t : t.name}</span>)}
                            </div>
                        )}
                        
                        {/* Interaction Bar */}
                        <div className="flex items-center gap-6 pt-3 border-t border-slate-50">
                             <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-sm transition-all active:scale-110 ${post.likes?.some((l:any) => l.user_id === session?.user?.id) ? 'text-rose-500 font-medium' : 'text-slate-400 hover:text-slate-600'}`}>
                                <Heart size={18} className={post.likes?.some((l:any) => l.user_id === session?.user?.id) ? 'fill-current' : ''}/> 
                                {post.likes?.length || 0}
                             </button>
                             <button onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} className={`flex items-center gap-1.5 text-sm transition-colors ${expandedPostId === post.id ? 'text-cyan-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}>
                                <MessageCircle size={18} className={expandedPostId === post.id ? 'fill-current' : ''}/> 
                                {post.comments?.length || 0}
                             </button>
                        </div>
                    </div>
                    
                    {/* Comments Section (Expanded) */}
                    {expandedPostId === post.id && (
                        <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-100 animate-in slide-in-from-top-2">
                            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {post.comments?.map((c:any) => (
                                    <div key={c.id} className="flex gap-2 items-start group">
                                         <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600 mt-1">
                                            {c.profiles?.full_name?.[0]}
                                         </div>
                                         <div className="flex-1 bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm relative">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-xs text-slate-800">{c.profiles?.full_name}</span>
                                                <span className="text-[10px] text-slate-300">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                                            </div>
                                            
                                            {c.content.includes('[MEETUP_ID:') ? (
                                                <div className="mt-1 p-2 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-blue-700 flex items-center gap-1"><MapPin size={12}/> Live Location</span>
                                                    <button onClick={() => handleJoinMeetup(c.content)} className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-700 transition-colors">
                                                        Track
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-600 mt-0.5">{c.content}</p>
                                            )}

                                            {isOwner && c.user_id !== session.user.id && !c.content.includes('[MEETUP_ID:') && (
                                                <button onClick={() => handleShareLocation(post.id, c.user_id)} className="absolute -right-8 top-0 text-slate-300 hover:text-emerald-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all" title="Share Location">
                                                    <MapPin size={16} />
                                                </button>
                                            )}
                                         </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center bg-white p-1.5 rounded-full border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
                                <input className="flex-1 text-xs px-2 outline-none bg-transparent" placeholder="Write a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)} />
                                <button onClick={() => handleCommentSubmit(post.id)} disabled={!commentText.trim()} className="w-7 h-7 flex items-center justify-center bg-cyan-500 text-white rounded-full hover:bg-cyan-600 disabled:opacity-50 disabled:bg-slate-200 transition-all">
                                    <Send size={12} className="ml-0.5"/>
                                </button>
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