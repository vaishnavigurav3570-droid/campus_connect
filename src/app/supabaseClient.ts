import { createClient } from '@supabase/supabase-js'

// REPLACE with your actual Supabase URL and Anon Key from your dashboard
const supabaseUrl = 'https://glbkyfqpwdvbnkktfisk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYmt5ZnFwd2R2Ym5ra3RmaXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjA3MzgsImV4cCI6MjA4NDk5NjczOH0.TaVnXovz0Ep2vuhHENsFycCSZ9E4CRsksZNUdjd42tA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)