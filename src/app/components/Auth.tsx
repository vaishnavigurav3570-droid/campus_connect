import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { Map } from 'lucide-react'

// NEW PROP: onGuestLogin
interface AuthProps {
  onGuestLogin?: () => void;
}

export default function Auth({ onGuestLogin }: AuthProps) {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) 
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [fullName, setFullName] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [department, setDepartment] = useState('Computer Engineering')
  const [year, setYear] = useState('First Year')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // CORRECT SIGN UP FLOW (Preserved)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              roll_no: rollNo,
              department: department,
              year: year
            }
          }
        })

        if (signUpError) throw signUpError

        if (data.user) {
           toast.success("Account created! You can now log in.")
           setIsSignUp(false) 
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success("Logged in successfully!")
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-sm text-gray-500">{isSignUp ? 'Join the GEC Community' : 'Sign in to continue'}</p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-3">
        
        {isSignUp && (
          <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
              <input className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white transition-all" type="text" placeholder="e.g. Vedant Gurav" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Roll No</label>
                <input className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white" type="text" placeholder="25B-CO-077" value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Year</label>
                <select className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white" value={year} onChange={(e) => setYear(e.target.value)}>
                  <option>First Year</option>
                  <option>Second Year</option>
                  <option>Third Year</option>
                  <option>Final Year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Department</label>
              <select className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option>Computer Engineering</option>
                <option>Information Technology</option>
                <option>Electronics & Telecomm</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
                <option>Electrical Engineering</option>
                <option>Mining Engineering</option>
              </select>
            </div>
            <div className="h-px bg-gray-200 my-2" />
          </div>
        )}

        <div>
           <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
           <input className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white" type="email" placeholder="student@gec.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        <div>
           <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
           <input className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-all" disabled={loading}>
          {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </Button>
      </form>

      <button 
        className="w-full mt-4 text-sm text-blue-500 hover:text-blue-700 font-medium hover:underline transition-colors"
        onClick={() => setIsSignUp(!isSignUp)}
        type="button"
      >
        {isSignUp ? 'Already have an account? Sign In' : 'New student? Create Account'}
      </button>

      {/* NEW: GUEST LOGIN BUTTON */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or continue as</span></div>
      </div>

      <Button variant="outline" onClick={onGuestLogin} className="w-full border-gray-300 hover:bg-gray-50 text-gray-700">
         <Map className="w-4 h-4 mr-2"/> Visitor / Guest
      </Button>
    </div>
  )
}