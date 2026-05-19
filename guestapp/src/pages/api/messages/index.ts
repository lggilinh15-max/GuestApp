// src/pages/api/messages/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = supabaseAdmin()

  // GET: load messages for a session
  if (req.method === 'GET') {
    const { session_id } = req.query
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('guest_session_id', session_id)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ messages: data })
  }

  // POST: send a message
  if (req.method === 'POST') {
    const { hotel_id, guest_session_id, sender, body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Tin nhắn trống.' })

    const { data, error } = await db
      .from('messages')
      .insert({ hotel_id, guest_session_id, sender, body })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ message: data })
  }

  return res.status(405).end()
}
