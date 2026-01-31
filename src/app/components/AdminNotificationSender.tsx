import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { ArrowLeft, Bell, BarChart2, Send, Trash2, Plus, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminNotificationSenderProps {
  onBack: () => void;
}

export function AdminNotificationSender({ onBack }: AdminNotificationSenderProps) {
  const [activeTab, setActiveTab] = useState<'alert' | 'poll'>('alert');
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Alert Form
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  // Poll Form
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to changes
    const channel = supabase.channel('admin_notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNotifications = async () => {
    // Only fetch Alerts and Polls (Hide likes/comments)
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .in('type', ['alert', 'poll']) // <--- ADD THIS FILTER
        .order('created_at', { ascending: false });
        
    if (data) setNotifications(data);
  };

  // --- SEND ALERT ---
  const handleSendAlert = async () => {
    if (!alertTitle || !alertMessage) return toast.error("Title and message required");

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
        user_id: null, // Required for RLS
        title: isEmergency ? `🚨 ${alertTitle}` : alertTitle, // Add emoji for emergency
        content: alertMessage, // FIXED: DB uses 'content', not 'message'
        type: 'alert',         // FIXED: DB only accepts 'alert' or 'poll'
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('notifications').insert(payload);
    
    if (error) {
        console.error(error);
        toast.error("Failed to send alert");
    } else {
        toast.success("Notification Broadcasted!");
        setAlertTitle('');
        setAlertMessage('');
        setIsEmergency(false);
    }
  };

  // --- CREATE POLL ---
  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (!pollTitle || validOptions.length < 2) return toast.error("Poll needs title and at least 2 options");

    const { data: { user } } = await supabase.auth.getUser();

    // FIXED: Store options directly in the notifications table (Array)
    const payload = {
        user_id: user?.id,
        title: pollTitle,
        content: "Poll", // Placeholder content
        type: 'poll',
        poll_options: validOptions, // Saving array directly
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('notifications').insert(payload);

    if (error) {
        console.error(error);
        toast.error("Failed to create poll");
    } else {
        toast.success("Poll Published!");
        setPollTitle('');
        setPollOptions(['', '']);
    }
  };

  const deleteNotification = async (id: string) => {
      if(!confirm("Delete this notification?")) return;
      await supabase.from('notifications').delete().eq('id', id);
      toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* HEADER */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <h1 className="text-lg font-bold text-slate-800">Broadcast Center</h1>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- LEFT COLUMN: COMPOSE --- */}
        <div className="space-y-6">
            
            {/* TABS */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setActiveTab('alert')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'alert' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Bell size={16}/> Send Alert
                </button>
                <button 
                    onClick={() => setActiveTab('poll')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'poll' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <BarChart2 size={16}/> Create Poll
                </button>
            </div>

            {/* ALERT FORM */}
            {activeTab === 'alert' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-left-4">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Send size={18} className="text-blue-600"/> Compose Notification
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                            <input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Campus Closed Tomorrow" value={alertTitle} onChange={e => setAlertTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Message</label>
                            <textarea rows={3} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 resize-none" placeholder="Enter details..." value={alertMessage} onChange={e => setAlertMessage(e.target.value)} />
                        </div>
                        
                        <label className="flex items-center gap-3 p-3 border border-red-100 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-colors">
                            <input type="checkbox" className="w-5 h-5 accent-red-600" checked={isEmergency} onChange={e => setIsEmergency(e.target.checked)} />
                            <div>
                                <p className="text-sm font-bold text-red-700">Mark as Emergency</p>
                                <p className="text-[10px] text-red-500">Adds 🚨 emoji and highlights alert</p>
                            </div>
                            <AlertTriangle className="ml-auto text-red-500" size={20}/>
                        </label>

                        <Button onClick={handleSendAlert} className={`w-full ${isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'} text-white py-6 rounded-xl`}>
                            Send Notification
                        </Button>
                    </div>
                </div>
            )}

            {/* POLL FORM */}
            {activeTab === 'poll' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-4">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart2 size={18} className="text-amber-500"/> Design Poll
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Poll Question</label>
                            <input className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-amber-200" placeholder="e.g. Best date for Sports Day?" value={pollTitle} onChange={e => setPollTitle(e.target.value)} />
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Options</label>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input 
                                        className="flex-1 p-2 bg-slate-50 rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-amber-100" 
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...pollOptions];
                                            newOpts[idx] = e.target.value;
                                            setPollOptions(newOpts);
                                        }}
                                    />
                                    {pollOptions.length > 2 && (
                                        <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><X size={18}/></button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < 5 && (
                                <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:underline mt-1">
                                    <Plus size={14}/> Add Option
                                </button>
                            )}
                        </div>

                        <Button onClick={handleCreatePoll} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 rounded-xl">
                            Publish Poll
                        </Button>
                    </div>
                </div>
            )}
        </div>

        {/* --- RIGHT COLUMN: HISTORY --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-700 text-sm">Recent Activity</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">No history yet.</div>
                ) : (
                    notifications.map(note => (
                        <div key={note.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors group relative">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    note.type === 'alert' ? 'bg-red-100 text-red-600' : 
                                    note.type === 'poll' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                }`}>{note.type}</span>
                                <span className="text-[10px] text-slate-400">{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm">{note.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2">{note.content}</p> {/* FIXED: Use content */}
                            
                            <button onClick={() => deleteNotification(note.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}