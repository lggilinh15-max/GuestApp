// src/pages/admin/login.tsx
// Hotel owner login via Supabase Magic Link (no password needed)

import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <>
      <Head>
        <title>Admin — GuestApp</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: '#161412', marginBottom: '6px' }}>GuestApp</div>
            <div style={{ fontSize: '13px', color: '#9C8E7E' }}>Đăng nhập vào Admin Dashboard</div>
          </div>

          {sent ? (
            <div style={{ background: '#EAF3DE', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📧</div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#1A4008', marginBottom: '8px' }}>Kiểm tra email của bạn!</div>
              <div style={{ fontSize: '13px', color: '#3B6D11', lineHeight: 1.5 }}>
                Chúng tôi đã gửi magic link đến <strong>{email}</strong>.<br />
                Click vào link để đăng nhập ngay.
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '0.5px solid #E2DBD0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#3D3830', marginBottom: '8px' }}>Email đăng ký</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ten@resort.com"
                  style={{ width: '100%', background: '#F8F5F0', border: '0.5px solid #E2DBD0', borderRadius: '10px', padding: '11px 14px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: '#161412', outline: 'none', marginBottom: '16px' }}
                />
                {error && <div style={{ color: '#A32D2D', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width: '100%', background: '#161412', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />Đang gửi...</> : <><i className="ti ti-send" />Gửi magic link</>}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#9C8E7E', marginTop: '16px' }}>
                Không cần mật khẩu. Chúng tôi gửi link đăng nhập qua email.
              </p>
            </form>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
