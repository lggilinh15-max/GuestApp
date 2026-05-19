// src/pages/api/admin/sessions/create.ts
// Creates a unique guest link for a booking
// Protected: requires valid admin session (Supabase Auth)

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { nanoid } from 'nanoid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify caller is authenticated admin
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const token = authHeader.replace('Bearer ', '')
  const db = supabaseAdmin()

  // Validate the token belongs to an admin user
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  // Get their hotel_id
  const { data: adminUser } = await db
    .from('admin_users')
    .select('hotel_id')
    .eq('email', user.email)
    .single()

  if (!adminUser) return res.status(403).json({ error: 'No hotel found for this account' })

  const { guest_name, room_number, check_in, check_out, phone, email } = req.body

  if (!guest_name || !room_number) {
    return res.status(400).json({ error: 'Cần tên khách và số phòng.' })
  }

  // Generate unique short token (8 chars)
  const guestToken = nanoid(8)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data: session, error } = await db
    .from('guest_sessions')
    .insert({
      hotel_id: adminUser.hotel_id,
      token: guestToken,
      guest_name,
      room_number,
      check_in,
      check_out,
      phone,
      email,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const guestLink = `${appUrl}/g/${guestToken}`

  return res.status(201).json({
    session,
    guest_link: guestLink,
    qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestLink)}`,
  })
}
