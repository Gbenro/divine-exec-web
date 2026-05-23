-- Run this in the Supabase SQL editor to create the bookings table

create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  service text,
  date text,
  time text,
  pickup text,
  dropoff text,
  notes text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Index for common dashboard queries
create index if not exists bookings_date_idx on bookings(date);
create index if not exists bookings_status_idx on bookings(status);
create index if not exists bookings_created_at_idx on bookings(created_at desc);

-- Disable public access — only service role key (used server-side) can read/write
alter table bookings enable row level security;
