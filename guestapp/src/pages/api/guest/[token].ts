// src/pages/api/guest/[token].ts
// Public endpoint — returns hotel + guest session data for a given token
// URL: /api/guest/q_IJ_N-I3

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { token } = req.query as { token: string }
  const db = supabaseAdmin()

  // 1. Find guest session by token
  const { data: session, error: sessErr } = await db
    .from('guest_sessions')
    .select('*, hotels(*)')
    .eq('token', token)
    .eq('active', true)
    .single()

  if (sessErr || !session) {
    return res.status(404).json({ error: 'Link không hợp lệ hoặc đã hết hạn.' })
  }

  const hotel = session.hotels
  const hotelId = hotel.id

  // 2. Load menu, places, services in parallel
  const [menuRes, placesRes, servicesRes] = await Promise.all([
    db.from('menu_items').select('*').eq('hotel_id', hotelId).eq('available', true).order('sort_order'),
    db.from('places').select('*').eq('hotel_id', hotelId).order('sort_order'),
    db.from('services').select('*').eq('hotel_id', hotelId).eq('enabled', true).order('sort_order'),
  ])

  return res.status(200).json({
    hotel: {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      tagline: hotel.tagline,
      hero_url: hotel.hero_url,
      accent_color: hotel.accent_color,
      agent_name: hotel.agent_name,
      welcome_msg: hotel.welcome_msg,
      notice_text: hotel.notice_text,
    },
    guest: {
      id: session.id,
      name: session.guest_name,
      room: session.room_number,
      check_in: session.check_in,
      check_out: session.check_out,
    },
    menu: menuRes.data || [],
    places: placesRes.data || [],
    services: servicesRes.data || [],
  })
}
