import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { Mail, Lock, User, Hash, BookOpen, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AuthProps {
  onGuestLogin: () => void;
}

export default function Auth({ onGuestLogin }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // New Fields
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 1. Sign Up
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // 2. Save Extra Details to 'profiles' table
        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                roll_no: rollNo,
                branch: branch,
                year: year,
                email: email
            });
            if (profileError) {
                console.error("Profile Save Error:", profileError);
                toast.error("Account created, but failed to save profile details.");
            } else {
                toast.success("Account created! Please check your email to verify.");
            }
        }
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-outfit text-slate-800">{isSignUp ? 'Create Account' : 'Student Login'}</h2>
        <p className="text-xs text-slate-400">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        
        {isSignUp && (
            <>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input className="w-full pl-10 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <Hash className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                        <input className="w-full pl-10 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} required />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                        <select className="w-full pl-10 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600" value={year} onChange={e => setYear(e.target.value)} required>
                            <option value="">Year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                </div>
                <div className="relative">
                    <BookOpen className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <select className="w-full pl-10 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600" value={branch} onChange={e => setBranch(e.target.value)} required>
                        <option value="">Select Branch</option>
                        <option value="Comp">Computer</option>
                        <option value="IT">IT</option>
                        <option value="Mech">Mechanical</option>
                        <option value="ETC">ETC</option>
                        <option value="Civil">Civil</option>
                        <option value="Elec">Electrical</option>
                        <option value="Mining">Mining</option>
                    </select>
                </div>
            </>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
          <input type="email" className="w-full pl-10 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
          <input type="password" className="w-full pl-10 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-200" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Sign Up' : 'Login')}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-slate-500 font-medium hover:text-blue-600">
          {isSignUp ? "Already have an account? Login" : "New student? Create Account"}
        </button>
        <div className="w-full h-px bg-slate-100 my-1"></div>
        <button onClick={onGuestLogin} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          Continue as Guest
        </button>
      </div>
    </div>
  );
}