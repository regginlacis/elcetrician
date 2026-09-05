create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  urgency text not null check (urgency in ('normal', 'soon', 'urgent')),
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.service_orders enable row level security;

create index if not exists service_orders_priority_idx
  on public.service_orders (
    (case urgency when 'urgent' then 1 when 'soon' then 2 else 3 end),
    created_at asc
  );
