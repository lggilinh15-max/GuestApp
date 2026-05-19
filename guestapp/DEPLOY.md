# 🚀 HƯỚNG DẪN DEPLOY GUESTAPP
## Miễn phí 100% — Supabase + Vercel

---

## BƯỚC 1 — Tạo Supabase project (5 phút)

1. Vào https://supabase.com → "New project"
2. Đặt tên project, chọn region: **Southeast Asia (Singapore)**
3. Đặt mật khẩu database (lưu lại)
4. Chờ ~2 phút để project khởi tạo

### Chạy migration schema:
1. Vào **SQL Editor** trong Supabase dashboard
2. Copy toàn bộ nội dung file `supabase/migrations/001_schema.sql`
3. Paste và click **Run** ✅

### Lấy API keys:
- Vào **Settings → API**
- Copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Bật Auth:
- Vào **Authentication → Providers → Email** → bật **Magic Link**
- Vào **Authentication → URL Configuration**
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `https://your-app.vercel.app/admin`

---

## ## BƯỚC 2 — Deploy lên Vercel (5 phút)

### Option A: GitHub (khuyến nghị)
1. Push code lên GitHub repo mới
2. Vào https://vercel.com → "New Project" → Import repo
3. Vercel tự nhận dạng Next.js ✅

### Option A: GitHub (khuyến nghị)
1. Push code lên GitHub repo mới
2. Vào https://vercel.com → "New Project" → Import repo
3. Vercel tự nhận dạng Next.js ✅

### Option B: Vercel CLI
```bash
npm i -g vercel
cd guestapp
vercel
```

### Thêm Environment Variables trong Vercel:
Vào Project Settings → Environment Variables, thêm:
```
NEXT_PUBLIC_SUPABASE_URL        = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
NEXT_PUBLIC_APP_URL             = https://your-app.vercel.app
```

### Redeploy sau khi thêm env vars.

---

## BƯỚC 3 — Tạo tài khoản admin đầu tiên

1. Vào Supabase SQL Editor, chạy:
```sql
-- Sau khi chạy schema, insert hotel của bạn:
INSERT INTO hotels (slug, name, location, accent_color, agent_name, welcome_msg)
VALUES (
  'ten-resort-cua-ban',
  'Tên Resort Của Bạn',
  'Địa điểm',
  '#C9A96E',
  'Lễ tân — Tên nhân viên',
  'Chào quý khách! Chúng tôi có thể giúp gì?'
);

-- Lấy hotel_id vừa tạo:
SELECT id FROM hotels WHERE slug = 'ten-resort-cua-ban';

-- Insert admin user (thay YOUR_HOTEL_ID và YOUR_EMAIL):
INSERT INTO admin_users (hotel_id, email, full_name)
VALUES ('YOUR_HOTEL_ID', 'your@email.com', 'Tên của bạn');
```

2. Vào `https://your-app.vercel.app/admin/login`
3. Nhập email → nhận magic link → đăng nhập ✅

---

## BƯỚC 4 — Tạo link cho khách đầu tiên

1. Đăng nhập admin dashboard
2. Vào tab **"Tạo link khách"**
3. Nhập tên khách, số phòng, ngày check-in/out
4. Click **"Tạo link & QR"**
5. Copy link → gửi cho khách qua Zalo/WhatsApp/Email
6. Khách click link → vào app ngay, không cần cài đặt ✅

---

## KIẾN TRÚC HỆ THỐNG

```
Guest URL:  yourapp.vercel.app/g/{token}
Admin URL:  yourapp.vercel.app/admin

API Routes:
  GET  /api/guest/{token}           → Load toàn bộ data cho guest app
  POST /api/orders/create           → Khách đặt món
  GET/POST /api/messages            → Chat 2 chiều
  POST /api/admin/sessions/create   → Tạo link khách mới (admin only)
  GET/POST/PUT/DELETE /api/admin/content → CRUD menu, places, services
  PATCH /api/admin/content?target=hotel  → Update hotel settings

Database: Supabase PostgreSQL
Realtime: Supabase Realtime (chat messages, orders)
Auth: Supabase Magic Link (no password)
Hosting: Vercel (free tier: 100GB bandwidth/month)
```

---

## SCALE LÊN NHIỀU KHÁCH SẠN

Mỗi khách sạn = 1 row trong bảng `hotels` + 1 `admin_users` row.
Data hoàn toàn isolated theo `hotel_id`.

Để thêm khách sạn mới:
```sql
INSERT INTO hotels (slug, name, ...) VALUES (...);
INSERT INTO admin_users (hotel_id, email, ...) VALUES (...);
```

---

## CHI PHÍ (miễn phí cho đến khi scale lớn)

| Service  | Free tier                          | Paid khi nào       |
|----------|------------------------------------|--------------------|
| Supabase | 500MB DB, 2GB bandwidth, 50K users | >10 hotels active  |
| Vercel   | 100GB bandwidth, unlimited deploys | >1M requests/tháng |
| Total    | **$0/tháng**                       | ~$25/tháng khi scale|

---

## CẦN HỖ TRỢ?

File structure:
```
guestapp/
├── src/
│   ├── lib/supabase.ts              # Supabase client + types
│   ├── pages/
│   │   ├── g/[token].tsx           # Guest app (PWA)
│   │   ├── admin/
│   │   │   ├── login.tsx           # Magic link login
│   │   │   └── index.tsx           # Admin dashboard
│   │   └── api/
│   │       ├── guest/[token].ts    # Public API
│   │       ├── orders/create.ts    # Order API
│   │       ├── messages/index.ts   # Chat API
│   │       └── admin/
│   │           ├── sessions/create.ts  # Generate guest links
│   │           └── content.ts          # CRUD content
├── supabase/migrations/001_schema.sql  # Full DB schema
├── .env.example                        # Env vars template
└── DEPLOY.md                           # This file
```
