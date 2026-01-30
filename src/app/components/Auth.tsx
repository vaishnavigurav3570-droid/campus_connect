import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Loader2, Shield } from 'lucide-react';
import LogoSrc from '../../assets/logo.jpeg'; // Ensure this path is correct

interface AuthProps {
  onGuestLogin: () => void;
}

export default function Auth({ onGuestLogin }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [branch, setBranch] = useState('Computer');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 1. Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName } // Store metadata
          }
        });
        if (error) throw error;

        // 2. Create Profile
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: fullName,
            roll_no: rollNo,
            branch: branch,
            email: email,
            year: 1 // Default to 1st year
          });
          if (profileError) throw profileError;
        }

        toast.success("Account created! Please Log in.");
        setIsSignUp(false);
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* CARD */}
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 relative">
        
        {/* Header Background */}
        <div className="h-32 bg-slate-900 relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-2xl opacity-20 -ml-10 -mb-10"></div>
            
            {/* LOGO RESTORED HERE */}
            <div className="z-10 bg-white p-2 rounded-2xl shadow-lg mt-8">
               <img src={LogoSrc} alt="GEC Logo" className="w-16 h-16 object-contain" />
            </div>
        </div>

        <div className="px-8 pt-12 pb-8">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">
                {isSignUp ? "Create Account" : "Student Login"}
            </h2>
            <p className="text-center text-slate-400 text-sm mb-6">
                {isSignUp ? "Join the GEC Navigator community" : "Access maps, buses & campus updates"}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
                
                {isSignUp && (
                    <>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        <input type="text" placeholder="Full Name" className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <input type="text" placeholder="Roll No" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium" value={rollNo} onChange={e => setRollNo(e.target.value)} required />
                         <select className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-slate-600" value={branch} onChange={e => setBranch(e.target.value)}>
                            <option value="Comp">Comp</option>
                            <option value="IT">IT</option>
                            <option value="Mech">Mech</option>
                            <option value="ETC">ETC</option>
                            <option value="Civil">Civil</option>
                            <option value="Elec">Elec</option>
                         </select>
                    </div>
                    </>
                )}

                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input type="email" placeholder="College Email" className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input type="password" placeholder="Password" className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                <button disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                    {loading ? <Loader2 className="animate-spin" /> : <>{isSignUp ? "Sign Up" : "Sign In"} <ArrowRight size={18} /></>}
                </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-4">
                <p className="text-xs text-slate-400">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 font-bold ml-1 hover:underline">
                        {isSignUp ? "Login" : "Register"}
                    </button>
                </p>

                <div className="w-full flex items-center gap-4">
                    <div className="h-px bg-slate-100 flex-1"></div>
                    <span className="text-[10px] text-slate-300 font-bold uppercase">Or</span>
                    <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <button onClick={onGuestLogin} className="text-xs font-bold text-slate-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <Shield size={14} /> Continue as Guest
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}