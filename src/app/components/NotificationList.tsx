import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Bell, Check, AlertTriangle, BarChart2, Clock, Heart, MessageCircle, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationListProps {
  notifications: any[];
  onBack: () => void;
  onVote: (notificationId: string, optionId: string) => void;
}

export function NotificationList({ notifications, onBack, onVote }: NotificationListProps) {
  
  // 1. AUTOMATICALLY MARK AS READ
  useEffect(() => {
    const markRead = async () => {
      // Find IDs of unread notifications
      const unreadIds = notifications
        .filter(n => n.is_read === false) // Ensure we check the DB field 'is_read'
        .map(n => n.id);

      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      }
    };
    markRead();
  }, [notifications]);

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans animate-in slide-in-from-right duration-300">
      
      {/* --- HEADER --- */}
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
                <h1 className="font-bold text-slate-800 text-lg leading-tight">Notifications</h1>
                <p className="text-xs text-slate-400 font-medium">Recent Activity</p>
            </div>
        </div>
      </div>

      {/* --- LIST CONTENT --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        
        {notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Bell size={32} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-600">All caught up!</p>
                <p className="text-xs">No new notifications for you.</p>
             </div>
        ) : (
            notifications.map(note => (
                <div 
                    key={note.id} 
                    className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all ${
                        !note.is_read ? 'bg-blue-50/40 border-blue-100' : 'bg-white border-slate-100'
                    }`}
                >
                    {/* Left Colored Stripe based on Type */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                        note.type === 'alert' ? 'bg-red-500' : 
                        note.type === 'poll' ? 'bg-amber-500' : 
                        note.type === 'like' ? 'bg-rose-500' :
                        note.type === 'meetup' ? 'bg-emerald-500' :
                        'bg-cyan-500' // Comment/Default
                    }`}></div>

                    <div className="flex gap-3 pl-2">
                        {/* Dynamic Icon */}
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                            note.type === 'alert' ? 'bg-red-100 text-red-600' : 
                            note.type === 'poll' ? 'bg-amber-100 text-amber-600' : 
                            note.type === 'like' ? 'bg-rose-100 text-rose-500' :
                            note.type === 'meetup' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-cyan-50 text-cyan-600'
                        }`}>
                            {note.type === 'alert' ? <AlertTriangle size={20}/> : 
                             note.type === 'poll' ? <BarChart2 size={20}/> : 
                             note.type === 'like' ? <Heart size={20} className="fill-current"/> :
                             note.type === 'meetup' ? <MapPin size={20}/> :
                             <MessageCircle size={20}/>}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-bold text-slate-800">
                                    {/* Display Sender Name if available (Social), otherwise Title (System) */}
                                    {note.profiles?.full_name || note.title || 'Notification'}
                                </h3>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock size={10}/>
                                    {note.created_at ? formatDistanceToNow(new Date(note.created_at), { addSuffix: true }) : 'Just now'}
                                </span>
                            </div>
                            
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {note.content || note.message}
                            </p>

                            {/* POLL RENDERER (If data exists) */}
                            {note.type === 'poll' && note.pollOptions && (
                                <div className="space-y-2 mt-3">
                                    {note.pollOptions.map((opt: any) => {
                                        const totalVotes = note.pollOptions.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 1;
                                        const percentage = Math.round(((opt.count || 0) / totalVotes) * 100);
                                        const isSelected = note.votedOptionId === opt.id;

                                        return (
                                            <button 
                                                key={opt.id}
                                                onClick={() => onVote(note.id, opt.id)}
                                                disabled={!!note.votedOptionId}
                                                className={`w-full relative h-9 rounded-lg overflow-hidden border transition-all text-xs font-bold flex items-center justify-between px-3 ${
                                                    isSelected ? 'border-cyan-500 text-cyan-700 bg-cyan-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`absolute top-0 left-0 h-full opacity-20 transition-all duration-500 ${isSelected ? 'bg-cyan-500' : 'bg-slate-300'}`} style={{ width: `${percentage}%` }}></div>
                                                <span className="relative z-10 flex items-center gap-2">{opt.text} {isSelected && <Check size={12} className="text-cyan-600"/>}</span>
                                                <span className="relative z-10 text-[10px]">{percentage}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}