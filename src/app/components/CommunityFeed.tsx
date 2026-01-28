import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';

interface CommunityFeedProps {
  onBack: () => void;
  session: Session;
}

export function CommunityFeed({ onBack, session }: CommunityFeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // 1. Fetch Current User's Profile (To get their Name)
  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (data) setUserProfile(data);
    };
    getProfile();
  }, [session]);

  // 2. Fetch Posts & Listen for Realtime Updates
  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        // When a new post comes in, we need to fetch the author's name separately
        fetchNewPostDetails(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    // Join posts with profiles to get the author's name
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles ( full_name, year, department )
      `)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching posts:', error);
    else setPosts(data || []);
  };

  // Helper to fetch details for a single new realtime post
  const fetchNewPostDetails = async (newPost: any) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, year, department')
      .eq('id', newPost.user_id)
      .single();
    
    const postWithProfile = { ...newPost, profiles: data };
    setPosts((current) => [postWithProfile, ...current]);
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('posts').insert([
      { 
        user_id: session.user.id, 
        email: session.user.email,
        content: newPost 
      }
    ]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Posted!');
      setNewPost('');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) toast.error('Could not delete post');
    else {
      toast.success('Post deleted');
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Button>
        <div>
          <h2 className="font-bold text-lg text-gray-800">Campus Community</h2>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> 
            Online as {userProfile ? userProfile.full_name : 'Student'}
          </p>
        </div>
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {posts.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>No posts yet. Be the first to say hi!</p>
          </div>
        ) : (
          posts.map((post) => {
            const isMine = post.user_id === session.user.id;
            // Get Name from the joined 'profiles' data, or fallback to email
            const authorName = post.profiles?.full_name || post.email?.split('@')[0] || 'Unknown';
            const authorDetails = post.profiles ? `${post.profiles.year} • ${post.profiles.department}` : '';

            return (
              <div key={post.id} className={`p-4 rounded-xl shadow-sm border ${isMine ? 'bg-blue-50 border-blue-100' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${isMine ? 'bg-blue-600' : 'bg-slate-500'}`}>
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-800 block leading-tight">
                        {authorName} {isMine && '(You)'}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        {authorDetails}
                      </span>
                    </div>
                  </div>
                  {isMine && (
                    <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap pl-12">{post.content}</p>
                <div className="text-right mt-1">
                   <span className="text-[10px] text-gray-300">
                    {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t flex gap-2 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
        <input 
          className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          placeholder={`What's on your mind, ${userProfile?.full_name?.split(' ')[0] || 'student'}?`}
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePost()}
        />
        <Button 
          size="icon" 
          className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-transform hover:scale-105"
          onClick={handlePost}
          disabled={loading || !newPost.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}