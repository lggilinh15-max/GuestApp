// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (for guest app + admin frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client with service role (for API routes only)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

// ---- Types ----
export type Hotel = {
  id: string
  slug: string
  name: string
  location: string
  tagline?: string
  hero_url?: string
  accent_color: string
  agent_name: string
  welcome_msg: string
  notice_text?: string
  plan: string
}

export type MenuItem = {
  id: string
  hotel_id: string
  name: string
  description: string
  price: number
  emoji: string
  category: string
  available: boolean
}

export type Place = {
  id: string
  hotel_id: string
  name: string
  place_type: string
  description: string
  distance: string
  emoji: string
}

export type Service = {
  id: string
  hotel_id: string
  name: string
  description: string
  icon: string
  color_class: string
  enabled: boolean
  sort_order: number
}

export type GuestSession = {
  id: string
  hotel_id: string
  token: string
  guest_name: string
  room_number: string
  check_in: string
  check_out: string
  active: boolean
}

export type Order = {
  id: string
  hotel_id: string
  guest_session_id: string
  guest_name: string
  room_number: string
  items: { name: string; price: number; qty: number; emoji: string }[]
  total: number
  status: 'pending' | 'confirmed' | 'delivered'
  created_at: string
}

export type Message = {
  id: string
  hotel_id: string
  guest_session_id: string
  sender: 'guest' | 'hotel'
  body: string
  read: boolean
  created_at: string
}
