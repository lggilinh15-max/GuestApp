// src/pages/g/[token].tsx
// The guest-facing app: yourapp.com/g/abc12345
// Loads hotel data + renders full PWA

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import type { Hotel, MenuItem, Place, Service, Message } from '@/lib/supabase'

type GuestData = {
  hotel: Hotel
  guest: { id: string; name: string; room: string; check_in: string; check_out: string }
  menu: MenuItem[]
  places: Place[]
  services: Service[]
}

type CartItem = MenuItem & { qty: number }

export default function GuestApp() {
  const router = useRouter()
  const { token } = router.query as { token: string }

  const [data, setData] = useState<GuestData | null>(null)
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<'home' | 'menu' | 'explore' | 'chat' | 'profile'>('home')
  const [cart, setCart] = useState<CartItem[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [orderSent, setOrderSent] = useState(false)
  const msgsEndRef = useRef<HTMLDivElement>(null)

  // Load hotel data
  useEffect(() => {
    if (!token) return
    fetch(`/api/guest/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
        // Set CSS accent color
        document.documentElement.style.setProperty('--accent', d.hotel.accent_color || '#C9A96E')
      })
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
  }, [token])

  // Load messages + subscribe realtime
  useEffect(() => {
    if (!data) return
    // Initial load
    fetch(`/api/messages?session_id=${data.guest.id}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${data.guest.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `guest_session_id=eq.${data.guest.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [data])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Link không hợp lệ</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>{error}</p>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid #ddd', borderTopColor: 'var(--accent,#C9A96E)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <p style={{ color: '#999', fontSize: '13px' }}>Đang tải...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const { hotel, guest, menu, places, services } = data

  // Format dates
  const fmtDate = (d: string) => {
    if (!d) return ''
    const date = new Date(d)
    return `${date.getDate()}/${date.getMonth() + 1}`
  }
  const nights = guest.check_in && guest.check_out
    ? Math.round((new Date(guest.check_out).getTime() - new Date(guest.check_in).getTime()) / 86400000)
    : 0

  // Cart
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)

  const submitOrder = async () => {
    if (!cart.length) return
    await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_id: hotel.id,
        guest_session_id: guest.id,
        guest_name: guest.name,
        room_number: guest.room,
        items: cart.map(c => ({ name: c.name, price: c.price, qty: c.qty, emoji: c.emoji })),
      }),
    })
    setCart([])
    setOrderSent(true)
    setTimeout(() => setOrderSent(false), 3000)
  }

  // Chat
  const sendMsg = async () => {
    const body = msgInput.trim()
    if (!body) return
    setMsgInput('')
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel_id: hotel.id, guest_session_id: guest.id, sender: 'guest', body }),
    })
  }

  const iconMap: Record<string, string> = {
    'svc-a': '#FAEEDA', 'svc-p': '#FBEAF0', 'svc-b': '#E6F1FB',
    'svc-g': '#EAF3DE', 'svc-t': '#E1F5EE',
  }

  return (
    <>
      <Head>
        <title>{hotel.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#161412" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" />
        <style>{`
          :root { --accent: ${hotel.accent_color || '#C9A96E'}; }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
          body { font-family: 'DM Sans', sans-serif; background: #F8F5F0; max-width: 430px; margin: 0 auto; min-height: 100vh; }
          .screen { display: none; animation: fadeUp 0.25s ease; }
          .screen.active { display: block; }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          button { font-family: 'DM Sans', sans-serif; cursor: pointer; }
        `}</style>
      </Head>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '430px', margin: '0 auto', background: '#F8F5F0', position: 'relative', overflow: 'hidden' }}>

        {/* SCROLL AREA */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} id="scrollArea">

          {/* ===== HOME ===== */}
          <div className={`screen ${screen === 'home' ? 'active' : ''}`}>
            {/* Hero */}
            <div style={{ background: '#161412', padding: '16px 20px 20px', position: 'relative', overflow: 'hidden' }}>
              {hotel.hero_url && (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${hotel.hero_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25 }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(22,20,18,0.4)0%,rgba(22,20,18,0.85)100%)' }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.35)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', fontWeight: 500, color: '#F0DFC0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <i className="ti ti-diamond" /> Guest App
                  </span>
                  <button style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '4px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                    <i className="ti ti-world" /> VI / EN
                  </button>
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: '#FDFCF9', lineHeight: 1.1, marginBottom: '4px' }}>{hotel.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '18px' }}>
                  <i className="ti ti-map-pin" style={{ fontSize: '12px' }} />{hotel.location}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '13px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#FDFCF9' }}>{guest.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      {fmtDate(guest.check_in)} – {fmtDate(guest.check_out)} · {nights} đêm
                    </div>
                  </div>
                  <div style={{ background: 'var(--accent)', color: '#161412', fontSize: '11px', fontWeight: 500, padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                    {guest.room}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '18px 18px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8E7E', marginBottom: '11px' }}>Truy cập nhanh</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {[
                  { icon: 'ti-tools-kitchen-2', label: 'Đặt F&B', action: () => setScreen('menu') },
                  { icon: 'ti-map-2', label: 'Khám phá', action: () => setScreen('explore') },
                  { icon: 'ti-message-circle', label: 'Lễ tân', action: () => setScreen('chat') },
                  { icon: 'ti-sparkles', label: 'Spa', action: () => {} },
                ].map((q, i) => (
                  <button key={i} onClick={q.action} style={{ background: '#fff', border: '0.5px solid #E2DBD0', borderRadius: '14px', padding: '13px 6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <i className={`ti ${q.icon}`} style={{ fontSize: '22px', color: 'var(--accent)' }} />
                    <span style={{ fontSize: '9px', color: '#3D3830', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Services */}
            <div style={{ padding: '16px 18px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8E7E', marginBottom: '11px' }}>Dịch vụ</div>
              <div style={{ background: '#fff', border: '0.5px solid #E2DBD0', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px' }}>
                {services.map((svc, i) => (
                  <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 15px', borderTop: i > 0 ? '0.5px solid #EDE8DF' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: iconMap[svc.color_class] || '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${svc.icon}`} style={{ fontSize: '18px', color: '#0F6E56' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#161412' }}>{svc.name}</div>
                      <div style={{ fontSize: '10px', color: '#9C8E7E', marginTop: '1px' }}>{svc.description}</div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: '#9C8E7E', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Notice */}
            {hotel.notice_text && (
              <div style={{ margin: '0 18px 12px', background: '#EAF3DE', borderRadius: '10px', padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                <i className="ti ti-clock" style={{ color: '#3B6D11', fontSize: '15px', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '11px', color: '#1A4008', lineHeight: 1.5 }}>{hotel.notice_text}</span>
              </div>
            )}
            <div style={{ height: '90px' }} />
          </div>

          {/* ===== MENU ===== */}
          <div className={`screen ${screen === 'menu' ? 'active' : ''}`}>
            <div style={{ background: '#161412', padding: '14px 18px 16px', position: 'relative', overflow: 'hidden' }}>
              {hotel.hero_url && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${hotel.hero_url})`, backgroundSize: 'cover', opacity: 0.2 }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(22,20,18,0.5)0%,rgba(22,20,18,0.9)100%)' }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <button onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-arrow-left" style={{ color: 'white', fontSize: '15px' }} />
                  </button>
                  <div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: '#FDFCF9' }}>Thực đơn</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Đặt món · Giao tại phòng</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 18px', paddingBottom: cartCount > 0 ? '130px' : '90px' }}>
              {menu.map(item => {
                const inCart = cart.find(c => c.id === item.id)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: '0.5px solid #EDE8DF' }}>
                    <div style={{ width: '58px', height: '58px', borderRadius: '12px', background: '#EDE8DF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                      {item.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#161412' }}>{item.name}</div>
                      <div style={{ fontSize: '10px', color: '#9C8E7E', margin: '2px 0 5px' }}>{item.description}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent)' }}>
                        {item.price.toLocaleString('vi-VN')} ₫
                      </div>
                    </div>
                    <button onClick={() => addToCart(item)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: inCart ? '#0F6E56' : '#161412', color: '#fff', border: 'none', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                      {inCart ? inCart.qty : '+'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Cart bar */}
            {cartCount > 0 && (
              <div style={{ position: 'fixed', bottom: '64px', left: '50%', transform: 'translateX(-50%)', width: '390px', maxWidth: '100%', padding: '0 18px 10px', background: '#F8F5F0' }}>
                <button onClick={submitOrder} style={{ width: '100%', background: '#161412', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500 }}>
                  <span style={{ background: 'var(--accent)', color: '#161412', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{cartCount}</span>
                  <span>Đặt ngay — Phòng {guest.room}</span>
                  <span>{cartTotal.toLocaleString('vi-VN')} ₫</span>
                </button>
              </div>
            )}

            {orderSent && (
              <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: '#0F6E56', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', zIndex: 100 }}>
                <i className="ti ti-check" /> Đã đặt! Nhân viên sẽ mang lên sớm.
              </div>
            )}
          </div>

          {/* ===== EXPLORE ===== */}
          <div className={`screen ${screen === 'explore' ? 'active' : ''}`}>
            <div style={{ background: '#0D1A16', padding: '14px 18px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0D1A16 0%,#161412 100%)' }} />
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-arrow-left" style={{ color: 'white', fontSize: '15px' }} />
                </button>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: '#FDFCF9' }}>Khám phá</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Gợi ý từ đội ngũ chúng tôi</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 18px 90px' }}>
              {places.map(p => (
                <div key={p.id} style={{ background: '#fff', border: '0.5px solid #E2DBD0', borderRadius: '16px', padding: '13px 14px', marginBottom: '10px', display: 'flex', gap: '13px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px', width: '48px', textAlign: 'center', flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#161412' }}>{p.name}</div>
                    <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', margin: '2px 0' }}>{p.place_type}</div>
                    <div style={{ fontSize: '10px', color: '#9C8E7E', lineHeight: 1.4 }}>{p.description}</div>
                    <div style={{ fontSize: '10px', color: '#9C8E7E', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <i className="ti ti-map-pin" style={{ fontSize: '11px' }} />{p.distance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== CHAT ===== */}
          <div className={`screen ${screen === 'chat' ? 'active' : ''}`} style={{ display: screen === 'chat' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
            <div style={{ background: '#161412', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <button onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-arrow-left" style={{ color: 'white', fontSize: '15px' }} />
                </button>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(201,169,110,0.15)', border: '1.5px solid rgba(201,169,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-headset" style={{ fontSize: '17px', color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#FDFCF9' }}>{hotel.agent_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5DCAA5', display: 'inline-block' }} />
                    Đang trực · Phản hồi &lt; 2 phút
                  </div>
                </div>
              </div>
            </div>

            {/* Welcome msg (if no messages yet) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 80px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ maxWidth: '76%' }}>
                  <div style={{ background: '#fff', color: '#161412', padding: '8px 12px', borderRadius: '14px', borderBottomLeftRadius: '3px', border: '0.5px solid #E2DBD0', fontSize: '12px', lineHeight: 1.5 }}>
                    {hotel.welcome_msg}
                  </div>
                </div>
              </div>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'guest' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '76%' }}>
                    <div style={{ padding: '8px 12px', borderRadius: '14px', fontSize: '12px', lineHeight: 1.5, ...(m.sender === 'guest' ? { background: '#231F1A', color: '#fff', borderBottomRightRadius: '3px' } : { background: '#fff', color: '#161412', border: '0.5px solid #E2DBD0', borderBottomLeftRadius: '3px' }) }}>
                      {m.body}
                    </div>
                    <div style={{ fontSize: '9px', color: '#9C8E7E', marginTop: '2px', padding: '0 3px', textAlign: m.sender === 'guest' ? 'right' : 'left' }}>
                      {new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={msgsEndRef} />
            </div>

            <div style={{ position: 'absolute', bottom: '56px', left: 0, right: 0, background: 'rgba(248,245,240,0.97)', borderTop: '0.5px solid #E2DBD0', padding: '8px 14px 10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Nhắn tin cho lễ tân..."
                style={{ flex: 1, background: '#EDE8DF', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: '#161412', outline: 'none' }}
              />
              <button onClick={sendMsg} style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#231F1A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-send" style={{ fontSize: '14px', color: '#fff' }} />
              </button>
            </div>
          </div>

          {/* ===== PROFILE ===== */}
          <div className={`screen ${screen === 'profile' ? 'active' : ''}`}>
            <div style={{ background: '#161412', padding: '20px 18px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              {hotel.hero_url && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${hotel.hero_url})`, backgroundSize: 'cover', opacity: 0.15 }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(22,20,18,0.3)0%,rgba(22,20,18,0.9)100%)' }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: 'rgba(201,169,110,0.12)', border: '1.5px solid rgba(201,169,110,0.4)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#F0DFC0' }}>
                  {guest.name.charAt(0)}
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: '#FDFCF9' }}>{guest.name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{guest.room} · Check-out {fmtDate(guest.check_out)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: '#E2DBD0', borderRadius: '14px', overflow: 'hidden', margin: '14px 18px 0' }}>
              {[{ v: nights, l: 'Đêm lưu trú' }, { v: cart.length, l: 'Đã đặt món' }, { v: '4.9', l: 'Đánh giá' }].map((s, i) => (
                <div key={i} style={{ background: '#fff', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 500, color: '#161412', fontFamily: 'Cormorant Garamond, serif' }}>{s.v}</div>
                  <div style={{ fontSize: '9px', color: '#9C8E7E', marginTop: '1px' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ height: '90px' }} />
          </div>

        </div>{/* /scroll-area */}

        {/* BOTTOM NAV */}
        <nav style={{ background: 'rgba(248,245,240,0.97)', borderTop: '0.5px solid #E2DBD0', display: 'flex', padding: '8px 0 12px', flexShrink: 0 }}>
          {[
            { id: 'home', icon: 'ti-home', label: 'Trang chủ' },
            { id: 'menu', icon: 'ti-tools-kitchen-2', label: 'Đặt món', badge: cartCount },
            { id: 'explore', icon: 'ti-map-2', label: 'Khám phá' },
            { id: 'chat', icon: 'ti-message-circle', label: 'Chat' },
            { id: 'profile', icon: 'ti-user', label: 'Tôi' },
          ].map(n => (
            <button key={n.id} onClick={() => setScreen(n.id as any)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: '20px', color: screen === n.id ? 'var(--accent)' : '#9C8E7E' }} />
                {n.badge ? <span style={{ position: 'absolute', top: '-4px', right: '-6px', minWidth: '15px', height: '15px', borderRadius: '8px', background: 'var(--accent)', color: '#161412', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{n.badge}</span> : null}
              </div>
              <span style={{ fontSize: '9px', color: screen === n.id ? 'var(--accent)' : '#9C8E7E', fontWeight: 500 }}>{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}
