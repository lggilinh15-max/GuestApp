// src/pages/api/orders/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { hotel_id, guest_session_id, guest_name, room_number, items } = req.body

  if (!hotel_id || !items?.length) {
    return res.status(400).json({ error: 'Thiếu thông tin đơn hàng.' })
  }

  const total = items.reduce((sum: number, i: any) => sum + i.price * i.qty, 0)
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('orders')
    .insert({ hotel_id, guest_session_id, guest_name, room_number, items, total, status: 'pending' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ order: data })
}
