import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { Mail, Lock, Loader2, ArrowRight, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

// Import your logo
// Note: If you see an error here, verify the number of '../' matches your folder structure.
import LogoSrc from '../../assets/logo.jpeg'; 

interface AuthProps {
    onGuestLogin?: () => void;
}

export default function Auth({ onGuestLogin }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            toast.success("Account created! You can now log in.");
            setIsSignUp(false);
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-cyan-600 to-blue-600 transform -skew-y-3 origin-top-left z-0"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-100 rounded-full blur-3xl opacity-50 z-0"></div>

      {/* LOGIN CARD */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white p-8 animate-in fade-in zoom-in duration-500">
            
            {/* LOGO SECTION */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 p-2 ring-4 ring-cyan-50">
                    <img src={LogoSrc} alt="GEC Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GEC Navigator</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Campus Connection Portal</p>
            </div>

            {/* FORM */}
            <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                    <div className="relative group">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-10 py-3 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-400"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                )}

                <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                    <input 
                        type="email" 
                        placeholder="College Email ID" 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-10 py-3 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-400"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-10 py-3 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-400"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
                </Button>
            </form>

            {/* TOGGLE SIGN UP */}
            <div className="mt-6 text-center">
                <p className="text-xs text-slate-400 mb-4">
                    {isSignUp ? "Already have an ID?" : "New to campus?"} 
                    <button 
                        onClick={() => setIsSignUp(!isSignUp)} 
                        className="text-cyan-600 font-bold ml-1 hover:underline"
                    >
                        {isSignUp ? "Login" : "Register"}
                    </button>
                </p>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] uppercase font-bold tracking-widest">Or continue as</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* GUEST BUTTON */}
                <button 
                    onClick={onGuestLogin}
                    className="w-full mt-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm group"
                >
                    Visitor Access <ArrowRight size={16} className="text-slate-300 group-hover:text-cyan-500 transition-colors"/>
                </button>
            </div>
        </div>
        
        {/* FOOTER */}
        <p className="text-center text-slate-400 text-xs mt-8">
            © 2026 Goa College of Engineering
        </p>
      </div>
    </div>
  );
}