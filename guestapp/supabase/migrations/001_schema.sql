-- =============================================
-- GUESTAPP SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- HOTELS (one per customer)
-- =============================================
create table hotels (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,           -- e.g. "lang-huong-resort"
  name        text not null,
  location    text,
  tagline     text,
  logo_url    text,
  hero_url    text,
  accent_color text default '#C9A96E',
  agent_name  text default 'Lễ tân',
  welcome_msg text default 'Xin chào quý khách! Chúng tôi có thể giúp gì ạ?',
  notice_text text,
  plan        text default 'starter',        -- starter | growth | pro
  active      boolean default true,
  created_at  timestamptz default now()
);

-- =============================================
-- ADMIN USERS (hotel owners)
-- =============================================
create table admin_users (
  id         uuid primary key default uuid_generate_v4(),
  hotel_id   uuid references hotels(id) on delete cascade,
  email      text unique not null,
  full_name  text,
  created_at timestamptz default now()
);

-- =============================================
-- SERVICES (bật/tắt per hotel)
-- =============================================
create table services (
  id         uuid primary key default uuid_generate_v4(),
  hotel_id   uuid references hotels(id) on delete cascade,
  name       text not null,
  description text,
  icon       text default 'ti-star',
  color_class text default 'svc-t',
  enabled    boolean default true,
  sort_order int default 0
);

-- =============================================
-- MENU ITEMS
-- =============================================
create table menu_items (
  id          uuid primary key default uuid_generate_v4(),
  hotel_id    uuid references hotels(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,0) not null,
  emoji       text default '🍽',
  category    text default 'Món chính',
  image_url   text,
  available   boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- =============================================
-- EXPLORE PLACES
-- =============================================
create table places (
  id          uuid primary key default uuid_generate_v4(),
  hotel_id    uuid references hotels(id) on delete cascade,
  name        text not null,
  place_type  text,
  description text,
  distance    text,
  emoji       text default '📍',
  sort_order  int default 0
);

-- =============================================
-- GUEST SESSIONS (unique link per booking)
-- =============================================
create table guest_sessions (
  id            uuid primary key default uuid_generate_v4(),
  hotel_id      uuid references hotels(id) on delete cascade,
  token         text unique not null,          -- short random token for URL
  guest_name    text not null,
  room_number   text,
  check_in      date,
  check_out     date,
  phone         text,
  email         text,
  active        boolean default true,
  created_at    timestamptz default now()
);

-- =============================================
-- ORDERS (F&B orders from guests)
-- =============================================
create table orders (
  id              uuid primary key default uuid_generate_v4(),
  hotel_id        uuid references hotels(id) on delete cascade,
  guest_session_id uuid references guest_sessions(id),
  guest_name      text,
  room_number     text,
  items           jsonb not null,              -- [{name, price, qty, emoji}]
  total           numeric(10,0),
  status          text default 'pending',      -- pending | confirmed | delivered
  notes           text,
  created_at      timestamptz default now()
);

-- =============================================
-- CHAT MESSAGES
-- =============================================
create table messages (
  id              uuid primary key default uuid_generate_v4(),
  hotel_id        uuid references hotels(id) on delete cascade,
  guest_session_id uuid references guest_sessions(id),
  sender          text not null,               -- 'guest' | 'hotel'
  body            text not null,
  read            boolean default false,
  created_at      timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table hotels         enable row level security;
alter table services       enable row level security;
alter table menu_items     enable row level security;
alter table places         enable row level security;
alter table guest_sessions enable row level security;
alter table orders         enable row level security;
alter table messages       enable row level security;

-- Public: guests can read hotel data via token (handled in API)
-- Admin: hotel owners can CRUD their own data

-- Policy: hotel owners read/write their own hotel
create policy "hotel_owner_all" on hotels
  for all using (
    id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- Services
create policy "owner_services" on services
  for all using (
    hotel_id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- Menu items
create policy "owner_menu" on menu_items
  for all using (
    hotel_id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- Places
create policy "owner_places" on places
  for all using (
    hotel_id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- Guest sessions
create policy "owner_sessions" on guest_sessions
  for all using (
    hotel_id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- Orders
create policy "owner_orders" on orders
  for all using (
    hotel_id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- Messages
create policy "owner_messages" on messages
  for all using (
    hotel_id in (
      select hotel_id from admin_users
      where email = auth.jwt() ->> 'email'
    )
  );

-- =============================================
-- REALTIME (for chat & orders)
-- =============================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table orders;

-- =============================================
-- SEED: Sample hotel data
-- =============================================
insert into hotels (slug, name, location, tagline, accent_color, agent_name, welcome_msg, notice_text)
values (
  'lang-huong-resort',
  'Làng Hương Boutique Resort',
  'Mù Cang Chải, Yên Bái',
  'Nơi thiên nhiên chạm đến tâm hồn',
  '#C9A96E',
  'Lễ tân — Lan Anh',
  'Chào quý khách 🌿 Tôi là Lan Anh, lễ tân hôm nay. Quý khách cần hỗ trợ gì ạ?',
  'Check-out lúc 12:00. Muốn gia hạn? Nhắn lễ tân ngay.'
);
