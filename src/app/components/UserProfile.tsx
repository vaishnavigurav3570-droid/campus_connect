import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, User, Hash, BookOpen, Calendar, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Session } from '@supabase/supabase-js';

interface UserProfileProps {
  session: Session;
  onBack: () => void;
  onLogout: () => void;
}

export function UserProfile({ session, onBack, onLogout }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Button>
        <h2 className="font-bold text-lg text-gray-800">My Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center mt-10 text-gray-400">Loading details...</div>
        ) : (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg">
                {getInitials(profile?.full_name || session.user.email)}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{profile?.full_name || 'Student'}</h3>
              <p className="text-sm text-gray-500">{session.user.email}</p>
            </div>

            {/* Academic Details */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50/50">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Academic Details</h4>
              </div>
              
              <div className="divide-y">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Roll Number</p>
                    <p className="font-medium text-gray-800">{profile?.roll_no || 'Not set'}</p>
                  </div>
                </div>

                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium text-gray-800">{profile?.department || 'Not set'}</p>
                  </div>
                </div>

                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Year</p>
                    <p className="font-medium text-gray-800">{profile?.year || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <Button 
              variant="outline" 
              className="w-full py-6 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-2 mt-4"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5" /> Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}