// src/pages/api/admin/content.ts
// Generic CRUD for hotel content managed from admin panel
// POST /api/admin/content?table=menu_items  → insert row
// PUT  /api/admin/content?table=menu_items  → update row (body.id required)
// DELETE /api/admin/content?table=menu_items&id=xxx → delete row
// PATCH /api/admin/hotel  → update hotel settings

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_TABLES = ['menu_items', 'places', 'services', 'guest_sessions']

async function getHotelId(token: string, db: ReturnType<typeof supabaseAdmin>) {
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  const { data } = await db.from('admin_users').select('hotel_id').eq('email', user.email).single()
  return data?.hotel_id || null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const db = supabaseAdmin()
  const userToken = authHeader.replace('Bearer ', '')
  const hotelId = await getHotelId(userToken, db)
  if (!hotelId) return res.status(403).json({ error: 'No hotel found' })

  // PATCH /api/admin/content?target=hotel → update hotel settings
  if (req.method === 'PATCH' && req.query.target === 'hotel') {
    const allowed = ['name','location','tagline','hero_url','accent_color','agent_name','welcome_msg','notice_text']
    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const { data, error } = await db.from('hotels').update(updates).eq('id', hotelId).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ hotel: data })
  }

  const table = req.query.table as string
  if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' })

  // POST → insert
  if (req.method === 'POST') {
    const { data, error } = await db.from(table).insert({ ...req.body, hotel_id: hotelId }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  }

  // PUT → update
  if (req.method === 'PUT') {
    const { id, ...rest } = req.body
    const { data, error } = await db.from(table).update(rest).eq('id', id).eq('hotel_id', hotelId).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { id } = req.query
    const { error } = await db.from(table).delete().eq('id', id).eq('hotel_id', hotelId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  // GET → list
  if (req.method === 'GET') {
    const { data, error } = await db.from(table).select('*').eq('hotel_id', hotelId).order('sort_order')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  return res.status(405).end()
}
