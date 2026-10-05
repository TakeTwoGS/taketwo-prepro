import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// If the two keys were not added in Vercel, the app shows a setup screen instead of a blank page.
export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null
