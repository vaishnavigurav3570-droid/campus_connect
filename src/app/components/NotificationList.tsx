import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Bell, BarChart2, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationListProps {
  notifications: any[];
  onBack: () => void;
  onVote: (notificationId: string, optionIndex: number) => void;
}

export function NotificationList({ notifications, onBack, onVote }: NotificationListProps) {
  const [votes, setVotes] = useState<Record<string, any[]>>({}); // Stores all votes per poll
  const [userVotes, setUserVotes] = useState<Record<string, number>>({}); // Stores MY vote per poll
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id || null));
    fetchVotes();
    
    // Listen to INSERT, UPDATE, and DELETE (event: '*')
    const channel = supabase.channel('public:poll_votes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchVotes)
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [notifications]);

  const fetchVotes = async () => {
    // 1. Rename 'data' to 'allVotes' to avoid confusion
    const { data: allVotes } = await supabase.from('poll_votes').select('*');
    
    if (allVotes) {
        // Group votes by notification_id
        const grouped = allVotes.reduce((acc: any, vote: any) => {
            if (!acc[vote.notification_id]) acc[vote.notification_id] = [];
            acc[vote.notification_id].push(vote);
            return acc;
        }, {});
        setVotes(grouped);

        // Determine user's specific choices
        if (userId) {
            const myVotes = allVotes.filter(v => v.user_id === userId);
            const myVoteMap = myVotes.reduce((acc: any, v: any) => ({ ...acc, [v.notification_id]: v.option_index }), {});
            setUserVotes(myVoteMap);
        } else {
             // If user logged out or session loading, check session again
             // 2. Rename destructuring to 'sessionData' to avoid shadowing
             supabase.auth.getSession().then(({ data: sessionData }) => {
                 if (sessionData.session?.user.id) {
                     // 3. Use 'allVotes' here correctly
                     const myVotes = allVotes.filter((v:any) => v.user_id === sessionData.session?.user.id);
                     const myVoteMap = myVotes.reduce((acc: any, v: any) => ({ ...acc, [v.notification_id]: v.option_index }), {});
                     setUserVotes(myVoteMap);
                 }
             });
        }
    }
  };

  const calculatePercentage = (notifId: string, optionIndex: number) => {
      const allVotes = votes[notifId] || [];
      if (allVotes.length === 0) return 0;
      const optionVotes = allVotes.filter(v => v.option_index === optionIndex).length;
      return Math.round((optionVotes / allVotes.length) * 100);
  };

  const getOptionCount = (notifId: string, optionIndex: number) => {
      const allVotes = votes[notifId] || [];
      return allVotes.filter(v => v.option_index === optionIndex).length;
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans animate-in slide-in-from-right">
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
        <h1 className="font-bold text-slate-800 text-lg">Notifications</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notifications.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
                <Bell size={40} className="mx-auto mb-2 opacity-20"/>
                <p>No new notifications</p>
            </div>
        ) : (
            notifications.map(note => (
                <div key={note.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-start gap-3 mb-2">
                        <div className={`p-2 rounded-full ${note.type === 'poll' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                            {note.type === 'poll' ? <BarChart2 size={18}/> : <Bell size={18}/>}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{note.title}</h3>
                            <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(note.created_at))} ago</p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4 pl-12">{note.content}</p>

                    {/* POLL RENDERING */}
                    {note.type === 'poll' && note.poll_options && (
                        <div className="pl-12 space-y-2">
                            {note.poll_options.map((opt: string, idx: number) => {
                                const isVoted = userVotes[note.id] === idx;
                                const percentage = calculatePercentage(note.id, idx);
                                const count = getOptionCount(note.id, idx);
                                
                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => onVote(note.id, idx)}
                                        className={`w-full relative overflow-hidden rounded-xl border transition-all h-10 ${
                                            isVoted ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200' : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        {/* Progress Bar Background */}
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-purple-100 transition-all duration-500" 
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                        
                                        {/* Content */}
                                        <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                                            <div className="flex items-center gap-2">
                                                {isVoted && <CheckCircle size={12} className="text-purple-600" />}
                                                <span className={`text-xs font-bold ${isVoted ? 'text-purple-900' : 'text-slate-700'}`}>
                                                    {opt}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">
                                                {percentage}% <span className="text-[10px] font-normal opacity-70">({count})</span>
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                            <p className="text-[10px] text-slate-400 text-right mt-1">
                                {(votes[note.id] || []).length} total votes • Click option to vote/unvote
                            </p>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
}