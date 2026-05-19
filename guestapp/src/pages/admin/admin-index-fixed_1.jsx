// src/pages/admin/index.jsx  ← đổi thành .jsx (không có TypeScript)
import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [hotel, setHotel] = useState(null)
  const [menu, setMenu] = useState([])
  const [places, setPlaces] = useState([])
  const [services, setServices] = useState([])
  const [sessions, setSessions] = useState([])
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [newGuest, setNewGuest] = useState({ guest_name: '', room_number: '', check_in: '', check_out: '', phone: '', email: '' })
  const [createdLink, setCreatedLink] = useState('')
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', emoji: '🍽', category: 'Món chính' })
  const [newPlace, setNewPlace] = useState({ name: '', place_type: 'Thiên nhiên · Trekking', description: '', distance: '', emoji: '📍' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const apiHeaders = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/admin/login'); return }
      setToken(session.access_token)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/admin/login')
      else setToken(session.access_token)
    })
  }, [router])

  useEffect(() => {
    if (!token) return
    const h = apiHeaders()
    Promise.all([
      fetch('/api/admin/content?table=menu_items', { headers: h }).then(r => r.json()),
      fetch('/api/admin/content?table=places', { headers: h }).then(r => r.json()),
      fetch('/api/admin/content?table=services', { headers: h }).then(r => r.json()),
      fetch('/api/admin/content?table=guest_sessions', { headers: h }).then(r => r.json()),
    ]).then(([m, p, sv, g]) => {
      setMenu(m.data || []); setPlaces(p.data || [])
      setServices(sv.data || []); setSessions(g.data || [])
    })
    fetch('/api/admin/content?target=hotel', { headers: h })
      .then(r => r.json()).then(d => d.hotel && setHotel(d.hotel))
  }, [token, apiHeaders])

  const saveHotel = async () => {
    if (!hotel) return
    setSaving(true)
    await fetch('/api/admin/content?target=hotel', { method: 'PATCH', headers: apiHeaders(), body: JSON.stringify(hotel) })
    setSaving(false); showToast('✅ Đã lưu!')
  }

  const addMenuItem = async () => {
    if (!newItem.name || !newItem.price) return
    const { data } = await fetch('/api/admin/content?table=menu_items', {
      method: 'POST', headers: apiHeaders(),
      body: JSON.stringify({ ...newItem, price: parseInt(newItem.price) }),
    }).then(r => r.json())
    setMenu(prev => [...prev, data])
    setNewItem({ name: '', description: '', price: '', emoji: '🍽', category: 'Món chính' })
    showToast('✅ Đã thêm món!')
  }

  const delMenuItem = async (id) => {
    await fetch(`/api/admin/content?table=menu_items&id=${id}`, { method: 'DELETE', headers: apiHeaders() })
    setMenu(prev => prev.filter(m => m.id !== id))
  }

  const addPlace = async () => {
    if (!newPlace.name) return
    const { data } = await fetch('/api/admin/content?table=places', {
      method: 'POST', headers: apiHeaders(), body: JSON.stringify(newPlace),
    }).then(r => r.json())
    setPlaces(prev => [...prev, data])
    setNewPlace({ name: '', place_type: 'Thiên nhiên · Trekking', description: '', distance: '', emoji: '📍' })
    showToast('✅ Đã thêm!')
  }

  const toggleService = async (svc) => {
    await fetch('/api/admin/content?table=services', {
      method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ id: svc.id, enabled: !svc.enabled }),
    })
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, enabled: !s.enabled } : s))
  }

  const createGuestLink = async () => {
    if (!newGuest.guest_name || !newGuest.room_number) return
    const res = await fetch('/api/admin/sessions/create', {
      method: 'POST', headers: apiHeaders(), body: JSON.stringify(newGuest),
    }).then(r => r.json())
    setCreatedLink(res.guest_link)
    setSessions(prev => [...prev, res.session])
    setNewGuest({ guest_name: '', room_number: '', check_in: '', check_out: '', phone: '', email: '' })
    showToast('🔗 Đã tạo link!')
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/admin/login') }

  if (!hotel) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9C8E7E', fontFamily: 'sans-serif' }}>Đang tải...</div>

  const navItems = [
    { id: 'overview', icon: 'ti-layout-dashboard', label: 'Tổng quan' },
    { id: 'brand', icon: 'ti-building', label: 'Thương hiệu' },
    { id: 'menu', icon: 'ti-tools-kitchen-2', label: 'Thực đơn' },
    { id: 'explore', icon: 'ti-map-2', label: 'Địa điểm' },
    { id: 'services', icon: 'ti-settings-2', label: 'Dịch vụ' },
    { id: 'guests', icon: 'ti-users', label: 'Tạo link khách' },
    { id: 'orders', icon: 'ti-receipt', label: 'Đơn hàng' },
  ]

  const inp = { width: '100%', background: '#F8F5F0', border: '0.5px solid #E2DBD0', borderRadius: '8px', padding: '8px 11px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', color: '#161412', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 500, color: '#3D3830', marginBottom: '5px' }
  const btn = { background: '#161412', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
  const card = { background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '0.5px solid #E2DBD0' }
  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const secTitle = { fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9C8E7E', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }

  return (
    <>
      <Head>
        <title>Admin — {hotel.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" />
        <style>{`*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F0EDE8}`}</style>
      </Head>

      <div style={{ minHeight: '100vh', background: '#F0EDE8' }}>
        {/* SIDEBAR */}
        <div style={{ width: '220px', background: '#161412', minHeight: '100vh', padding: '24px 0', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 20px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#C9A96E', marginBottom: '2px' }}>GuestApp</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Admin Dashboard</div>
          </div>
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', borderRadius: '8px', background: tab === n.id ? 'rgba(201,169,110,0.12)' : 'transparent', border: 'none', cursor: 'pointer', color: tab === n.id ? '#C9A96E' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', marginBottom: '2px', textAlign: 'left' }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: '16px' }} />{n.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px 12px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
            <button onClick={signOut} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'DM Sans, sans-serif', padding: '8px 12px' }}>
              <i className="ti ti-logout" />Đăng xuất
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ marginLeft: '220px', padding: '28px 32px', maxWidth: '900px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 500, color: '#161412' }}>{hotel.name}</div>
              <div style={{ fontSize: '12px', color: '#9C8E7E' }}>{hotel.location}</div>
            </div>
            <a href="/g/demo" target="_blank" rel="noreferrer" style={{ background: '#C9A96E', color: '#161412', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
              <i className="ti ti-eye" />Preview App
            </a>
          </div>

          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Khách hiện tại', val: sessions.filter(s => s.active).length, icon: 'ti-users', color: '#E6F1FB' },
                  { label: 'Món trong menu', val: menu.length, icon: 'ti-tools-kitchen-2', color: '#FAEEDA' },
                  { label: 'Địa điểm', val: places.length, icon: 'ti-map-pin', color: '#EAF3DE' },
                  { label: 'Dịch vụ bật', val: services.filter(s => s.enabled).length, icon: 'ti-toggle-right', color: '#E1F5EE' },
                ].map((c, i) => (
                  <div key={i} style={{ ...card, marginBottom: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <i className={`ti ${c.icon}`} style={{ fontSize: '18px' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 500, color: '#161412', fontFamily: 'Cormorant Garamond, serif' }}>{c.val}</div>
                    <div style={{ fontSize: '11px', color: '#9C8E7E', marginTop: '2px' }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-link" />Link app của bạn</div>
                <div style={{ background: '#F8F5F0', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: '#3D3830', wordBreak: 'break-all' }}>
                  {process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.vercel.app'}/g/<span style={{ color: '#C9A96E' }}>[guest-token]</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'brand' && (
            <div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-building" />Thông tin khách sạn</div>
                <div style={row2}>
                  <div><label style={lbl}>Tên khách sạn</label><input style={inp} value={hotel.name} onChange={e => setHotel({ ...hotel, name: e.target.value })} /></div>
                  <div><label style={lbl}>Địa điểm</label><input style={inp} value={hotel.location || ''} onChange={e => setHotel({ ...hotel, location: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '12px' }}><label style={lbl}>Slogan</label><input style={inp} value={hotel.tagline || ''} onChange={e => setHotel({ ...hotel, tagline: e.target.value })} /></div>
                <div style={{ marginTop: '12px' }}><label style={lbl}>Thông báo</label><textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={hotel.notice_text || ''} onChange={e => setHotel({ ...hotel, notice_text: e.target.value })} /></div>
              </div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-photo" />Ảnh bìa</div>
                <input style={{ ...inp, marginBottom: '8px' }} placeholder="https://images.unsplash.com/..." value={hotel.hero_url || ''} onChange={e => setHotel({ ...hotel, hero_url: e.target.value })} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[['🏔 Núi','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],['🏖 Biển','https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'],['🏛 Phố cổ','https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800'],['🌴 Resort','https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800']].map(([label, url], i) => (
                    <button key={i} onClick={() => setHotel({ ...hotel, hero_url: url })} style={{ ...btn, fontSize: '11px', padding: '5px 10px' }}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-palette" />Màu thương hiệu</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {['#C9A96E','#4A7C6F','#1D9E75','#185FA5','#7F77DD','#D85A30','#993556'].map(c => (
                    <div key={c} onClick={() => setHotel({ ...hotel, accent_color: c })} style={{ width: '30px', height: '30px', borderRadius: '8px', background: c, cursor: 'pointer', border: hotel.accent_color === c ? '2px solid #161412' : '2px solid transparent' }} />
                  ))}
                  <input type="color" value={hotel.accent_color} onChange={e => setHotel({ ...hotel, accent_color: e.target.value })} style={{ width: '36px', height: '36px', padding: '2px', borderRadius: '8px', border: '0.5px solid #E2DBD0', cursor: 'pointer' }} />
                </div>
              </div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-message-chatbot" />Chat</div>
                <div style={row2}>
                  <div><label style={lbl}>Tên nhân viên</label><input style={inp} value={hotel.agent_name} onChange={e => setHotel({ ...hotel, agent_name: e.target.value })} /></div>
                  <div><label style={lbl}>Tin nhắn chào</label><input style={inp} value={hotel.welcome_msg} onChange={e => setHotel({ ...hotel, welcome_msg: e.target.value })} /></div>
                </div>
              </div>
              <button onClick={saveHotel} disabled={saving} style={{ ...btn, background: '#C9A96E', color: '#161412', padding: '12px 24px', fontSize: '13px' }}>
                <i className="ti ti-device-floppy" />{saving ? 'Đang lưu...' : 'Lưu & Xuất bản'}
              </button>
            </div>
          )}

          {tab === 'menu' && (
            <div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-plus" />Thêm món mới</div>
                <div style={row2}>
                  <div><label style={lbl}>Tên món</label><input style={inp} value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Phở bò đặc biệt" /></div>
                  <div><label style={lbl}>Giá (VNĐ)</label><input style={inp} type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="145000" /></div>
                </div>
                <div style={{ ...row2, marginTop: '10px' }}>
                  <div><label style={lbl}>Emoji</label><input style={{ ...inp, fontSize: '18px' }} value={newItem.emoji} onChange={e => setNewItem({ ...newItem, emoji: e.target.value })} maxLength={4} /></div>
                  <div><label style={lbl}>Danh mục</label><select style={inp} value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>{['Bữa sáng','Món chính','Đồ uống','Tráng miệng'].map(c => <option key={c}>{c}</option>)}</select></div>
                </div>
                <div style={{ marginTop: '10px' }}><label style={lbl}>Mô tả</label><input style={inp} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></div>
                <button onClick={addMenuItem} style={{ ...btn, marginTop: '12px' }}><i className="ti ti-plus" />Thêm vào thực đơn</button>
              </div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-list" />Thực đơn ({menu.length} món)</div>
                {menu.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid #EDE8DF' }}>
                    <span style={{ fontSize: '22px' }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: '#9C8E7E' }}>{Number(item.price).toLocaleString('vi-VN')} ₫ · {item.category}</div>
                    </div>
                    <button onClick={() => delMenuItem(item.id)} style={{ background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}><i className="ti ti-trash" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'explore' && (
            <div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-plus" />Thêm địa điểm</div>
                <div style={row2}>
                  <div><label style={lbl}>Tên</label><input style={inp} value={newPlace.name} onChange={e => setNewPlace({ ...newPlace, name: e.target.value })} /></div>
                  <div><label style={lbl}>Emoji</label><input style={{ ...inp, fontSize: '18px' }} value={newPlace.emoji} onChange={e => setNewPlace({ ...newPlace, emoji: e.target.value })} maxLength={4} /></div>
                </div>
                <div style={{ ...row2, marginTop: '10px' }}>
                  <div><label style={lbl}>Loại</label><select style={inp} value={newPlace.place_type} onChange={e => setNewPlace({ ...newPlace, place_type: e.target.value })}>{['Thiên nhiên · Trekking','Văn hóa · Dân tộc','Ẩm thực · Quán đặc biệt','Wellness · Miễn phí'].map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label style={lbl}>Khoảng cách</label><input style={inp} value={newPlace.distance} onChange={e => setNewPlace({ ...newPlace, distance: e.target.value })} placeholder="3.5 km" /></div>
                </div>
                <div style={{ marginTop: '10px' }}><label style={lbl}>Mô tả</label><textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={newPlace.description} onChange={e => setNewPlace({ ...newPlace, description: e.target.value })} /></div>
                <button onClick={addPlace} style={{ ...btn, marginTop: '12px' }}><i className="ti ti-map-pin" />Thêm địa điểm</button>
              </div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-list" />Địa điểm ({places.length})</div>
                {places.map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: '0.5px solid #EDE8DF', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#C9A96E' }}>{p.place_type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'services' && (
            <div style={card}>
              <div style={secTitle}><i className="ti ti-toggle-right" />Bật / tắt dịch vụ</div>
              {services.map(svc => (
                <div key={svc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #EDE8DF' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{svc.name}</div>
                    <div style={{ fontSize: '11px', color: '#9C8E7E' }}>{svc.description}</div>
                  </div>
                  <div onClick={() => toggleService(svc)} style={{ width: '38px', height: '22px', borderRadius: '11px', background: svc.enabled ? '#0F6E56' : '#E2DBD0', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', top: '3px', left: svc.enabled ? '19px' : '3px', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'guests' && (
            <div>
              <div style={card}>
                <div style={secTitle}><i className="ti ti-link" />Tạo link khách mới</div>
                <div style={row2}>
                  <div><label style={lbl}>Tên khách</label><input style={inp} value={newGuest.guest_name} onChange={e => setNewGuest({ ...newGuest, guest_name: e.target.value })} placeholder="Nguyễn Văn A" /></div>
                  <div><label style={lbl}>Số phòng</label><input style={inp} value={newGuest.room_number} onChange={e => setNewGuest({ ...newGuest, room_number: e.target.value })} placeholder="205" /></div>
                </div>
                <div style={{ ...row2, marginTop: '10px' }}>
                  <div><label style={lbl}>Check-in</label><input style={inp} type="date" value={newGuest.check_in} onChange={e => setNewGuest({ ...newGuest, check_in: e.target.value })} /></div>
                  <div><label style={lbl}>Check-out</label><input style={inp} type="date" value={newGuest.check_out} onChange={e => setNewGuest({ ...newGuest, check_out: e.target.value })} /></div>
                </div>
                <button onClick={createGuestLink} style={{ ...btn, background: '#C9A96E', color: '#161412', marginTop: '14px' }}><i className="ti ti-link" />Tạo link & QR</button>
              </div>
              {createdLink && (
                <div style={{ ...card, background: '#EAF3DE', border: '0.5px solid #C0DD97' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A4008', marginBottom: '10px' }}>🎉 Gửi link này cho khách:</div>
                  <div style={{ background: '#fff', borderRadius: '8px', padding: '10px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', marginBottom: '10px', color: '#3B6D11' }}>{createdLink}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigator.clipboard.writeText(createdLink)} style={{ ...btn, fontSize: '12px', padding: '7px 12px' }}><i className="ti ti-copy" />Copy</button>
                    <a href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(createdLink)}`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none', fontSize: '12px', padding: '7px 12px' }}><i className="ti ti-qrcode" />QR</a>
                  </div>
                </div>
              )}
              <div style={card}>
                <div style={secTitle}><i className="ti ti-users" />Danh sách khách</div>
                {sessions.map(sess => (
                  <div key={sess.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #EDE8DF' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{sess.guest_name}</div>
                      <div style={{ fontSize: '11px', color: '#9C8E7E' }}>Phòng {sess.room_number}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sess.active ? '#EAF3DE' : '#F1EFE8', color: sess.active ? '#3B6D11' : '#9C8E7E', fontWeight: 500 }}>
                      {sess.active ? 'Đang ở' : 'Checkout'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div style={card}>
              <div style={secTitle}><i className="ti ti-receipt" />Đơn hàng</div>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9C8E7E', fontSize: '13px' }}>Chưa có đơn hàng.</div>
              ) : orders.map(order => (
                <div key={order.id} style={{ padding: '12px 0', borderBottom: '0.5px solid #EDE8DF' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{order.guest_name} — {order.room_number}</div>
                  <div style={{ fontSize: '11px', color: '#9C8E7E' }}>{order.items.map(i => `${i.emoji} ${i.name} x${i.qty}`).join(' · ')}</div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#C9A96E', marginTop: '3px' }}>{order.total?.toLocaleString('vi-VN')} ₫</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#161412', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', zIndex: 1000 }}>
          {toast}
        </div>
      )}
    </>
  )
}
