-- AiseServe Phase 1: core schema
-- Run with: supabase db push
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ENUMS
do $$ begin create type staff_role as enum ('owner','manager','cashier','kitchen','waiter'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('new','preparing','ready','served','paid','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type diet_type as enum ('veg','egg','nonveg','jain'); exception when duplicate_object then null; end $$;
do $$ begin create type pay_mode as enum ('upi','cash','card','link','credit'); exception when duplicate_object then null; end $$;

-- RESTAURANTS
create table if not exists restaurants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  logo_url text,
  gstin text, fssai text,
  plan_id text default 'starter',
  trial_ends_at timestamptz default now() + interval '14 days',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists restaurant_settings (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  service_charge_pct numeric default 0,
  gst_default numeric default 5,
  currency text default 'INR',
  primary_color text default '#6D5EF8',
  updated_at timestamptz default now()
);
create table if not exists plans (
  id text primary key, name text not null,
  price_monthly_paise int not null,
  max_tables int, max_staff int,
  features jsonb default '{}'
);
insert into plans(id,name,price_monthly_paise,max_tables,max_staff,features) values
 ('starter','Starter',49900,10,2,'{"qr":true,"kitchen_exe":true,"cashier_exe":true}'),
 ('growth','Growth',99900,999999,5,'{"staff_app":true,"upi":true,"coupons":true}'),
 ('pro_ai','Pro AI',199900,999999,50,'{"ai":true,"loyalty":true,"multilang":true}'),
 ('business','Business',0,999999,999999,'{"multi_outlet":true,"api":true,"whitelabel":true}')
on conflict(id) do nothing;

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  plan_id text references plans(id),
  status text default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- STAFF
create table if not exists staff (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role staff_role not null default 'waiter',
  name text, phone text,
  active boolean default true,
  created_at timestamptz default now(),
  unique(restaurant_id, user_id)
);

-- MENU
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null, sort int default 0,
  created_at timestamptz default now()
);
create table if not exists menu_items (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null, description text,
  price_paise int not null check (price_paise >= 0),
  mrp_paise int,
  image_url text,
  diet diet_type default 'veg',
  tags text[] default '{}',
  prep_min int default 10,
  station text default 'Kitchen',
  available boolean default true,
  gst_rate numeric default 5,
  bestseller boolean default false,
  spicy int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists item_variants (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  name text not null, price_delta_paise int default 0
);
create table if not exists item_addons (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null, price_paise int default 0
);
create table if not exists item_schedules (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  start_time time, end_time time
);

-- FLOORS / TABLES / SESSIONS
create table if not exists floors (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null, layout jsonb default '{}'
);
create table if not exists tables (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  floor_id uuid references floors(id) on delete set null,
  label text not null,
  token text unique not null default encode(gen_random_bytes(12),'hex'),
  status text default 'free',
  created_at timestamptz default now()
);
create table if not exists table_sessions (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  table_id uuid references tables(id) on delete set null,
  status text default 'open',
  customer_phone text,
  created_at timestamptz default now(), closed_at timestamptz
);

-- ORDERS
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  session_id uuid references table_sessions(id) on delete set null,
  table_id uuid references tables(id) on delete set null,
  number int,
  status order_status default 'new',
  subtotal_paise int default 0, tax_paise int default 0,
  discount_paise int default 0, total_paise int default 0,
  note text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name_snapshot text, price_paise int,
  qty int not null check (qty > 0),
  note text
);
create table if not exists order_item_modifiers (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid references order_items(id) on delete cascade,
  kind text, name text, price_paise int default 0
);
create table if not exists order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  from_status text, to_status text,
  actor uuid, created_at timestamptz default now()
);

-- PAYMENTS / BILLS
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  session_id uuid references table_sessions(id) on delete set null,
  mode pay_mode, amount_paise int,
  status text default 'pending',
  razorpay_order_id text, razorpay_payment_id text,
  created_at timestamptz default now()
);
create table if not exists payment_splits (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references payments(id) on delete cascade,
  mode pay_mode, amount_paise int
);
create table if not exists refunds (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references payments(id) on delete cascade,
  amount_paise int, reason text, by_staff uuid,
  created_at timestamptz default now()
);
create table if not exists discounts (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, code text, pct numeric, flat_paise int, min_order_paise int, active boolean default true, valid_from timestamptz, valid_to timestamptz);
create table if not exists coupons (like discounts including all);
create table if not exists customers (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, phone text, name text, visits int default 0, loyalty_points int default 0, created_at timestamptz default now(), unique(restaurant_id, phone));
create table if not exists loyalty_ledger (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, customer_id uuid references customers(id) on delete cascade, delta int, reason text, created_at timestamptz default now());
create table if not exists feedback (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, order_id uuid references orders(id) on delete set null, stars int check (stars between 1 and 5), comment text, created_at timestamptz default now());
create table if not exists shifts (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, opened_by uuid, opening_cash_paise int default 0, closed_at timestamptz, created_at timestamptz default now());
create table if not exists cash_movements (id uuid primary key default uuid_generate_v4(), shift_id uuid references shifts(id) on delete cascade, kind text, amount_paise int, note text, created_at timestamptz default now());
create table if not exists stations (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, name text not null);
create table if not exists printers (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, name text, kind text, address text, width_mm int default 80);
create table if not exists notifications (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, kind text, title text, body text, read boolean default false, created_at timestamptz default now());
create table if not exists audit_logs (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, actor uuid, action text, meta jsonb, created_at timestamptz default now());
create table if not exists ai_insights (id uuid primary key default uuid_generate_v4(), restaurant_id uuid references restaurants(id) on delete cascade, kind text, text text, created_at timestamptz default now());

-- invoice sequence per restaurant per FY
create table if not exists invoice_counters (
  restaurant_id uuid references restaurants(id) on delete cascade,
  fy text, last_no int default 0,
  primary key (restaurant_id, fy)
);

-- Updated_at trigger
create or replace function touch_updated() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists t_rest on restaurants; create trigger t_rest before update on restaurants for each row execute function touch_updated();
drop trigger if exists t_mi on menu_items; create trigger t_mi before update on menu_items for each row execute function touch_updated();
drop trigger if exists t_ord on orders; create trigger t_ord before update on orders for each row execute function touch_updated();

-- ===== RPC: place_order (server-side pricing) =====
create or replace function place_order(p_session uuid, p_items jsonb)
returns uuid
language plpgsql security definer
as $$
declare v_rest uuid; v_order uuid; it jsonb; v_price int; v_gst numeric; v_sub int := 0; v_tax int := 0; v_avail boolean;
begin
  select restaurant_id into v_rest from table_sessions where id = p_session;
  if v_rest is null then raise exception 'bad session'; end if;
  insert into orders(restaurant_id, session_id) values (v_rest, p_session) returning id into v_order;
  for it in select * from jsonb_array_elements(p_items) loop
    select price_paise, gst_rate, available into v_price, v_gst, v_avail
      from menu_items where id = (it->>'menu_item_id')::uuid and restaurant_id = v_rest;
    if not found then raise exception 'bad item'; end if;
    if v_avail = false then raise exception 'item sold out'; end if;
    insert into order_items(order_id, menu_item_id, name_snapshot, price_paise, qty, note)
      values (v_order, (it->>'menu_item_id')::uuid,
        (select name from menu_items where id=(it->>'menu_item_id')::uuid),
        v_price, coalesce((it->>'qty')::int,1), it->>'note');
    v_sub := v_sub + v_price * coalesce((it->>'qty')::int,1);
    v_tax := v_tax + round(v_price * coalesce((it->>'qty')::int,1) * coalesce(v_gst,5) / 100);
  end loop;
  update orders set subtotal_paise=v_sub, tax_paise=v_tax, total_paise=v_sub+v_tax-discount_paise where id=v_order;
  insert into order_events(order_id, to_status) values (v_order,'new');
  return v_order;
end $$;

create or replace function update_order_status(p_order uuid, p_status order_status)
returns void language plpgsql security definer as $$
declare v_old order_status; v_rest uuid;
begin
  select status, restaurant_id into v_old, v_rest from orders where id=p_order;
  -- legal transitions
  if v_old='new' and p_status not in ('preparing','cancelled') then raise exception 'illegal transition'; end if;
  if v_old='preparing' and p_status not in ('ready','cancelled') then raise exception 'illegal transition'; end if;
  if v_old='ready' and p_status not in ('served') then raise exception 'illegal transition'; end if;
  if v_old in ('served','paid','cancelled') then raise exception 'terminal'; end if;
  update orders set status=p_status where id=p_order;
  insert into order_events(order_id, from_status, to_status) values (p_order, v_old::text, p_status::text);
end $$;

create or replace function get_dashboard_kpis(p_rest uuid)
returns jsonb language sql security definer as $$
  select jsonb_build_object(
    'today_revenue', coalesce((select sum(total_paise) from orders where restaurant_id=p_rest and created_at::date=now()::date and status<>'cancelled'),0),
    'today_orders', (select count(*) from orders where restaurant_id=p_rest and created_at::date=now()::date),
    'active_tables', (select count(*) from table_sessions where restaurant_id=p_rest and status='open')
  );
$$;

-- ===== RLS =====
alter table restaurants enable row level security;
alter table restaurant_settings enable row level security;
alter table staff enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table table_sessions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table feedback enable row level security;

-- helper: staff restaurant
create or replace function my_restaurant() returns uuid language sql stable security definer as $$
  select restaurant_id from staff where user_id = auth.uid() limit 1;
$$;

-- Public read menu by restaurant (anon via join is handled in app with restaurant_id filter; keep open-read for demo, tighten later)
create policy "public read restaurants" on restaurants for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read menu" on menu_items for select using (true);
create policy "public read tables" on tables for select using (true);
create policy "anon sessions insert" on table_sessions for insert with check (true);
create policy "anon sessions read" on table_sessions for select using (true);
create policy "anon orders all" on orders for all using (true) with check (true);
create policy "anon order_items all" on order_items for all using (true) with check (true);
create policy "anon payments insert" on payments for insert with check (true);
create policy "anon payments read" on payments for select using (true);
create policy "anon feedback insert" on feedback for insert with check (true);

-- Staff full access within own restaurant
create policy "staff restaurants" on restaurants for all using (id = my_restaurant()) with check (id = my_restaurant());
create policy "staff settings" on restaurant_settings for all using (restaurant_id = my_restaurant()) with check (restaurant_id = my_restaurant());
create policy "staff read staff" on staff for select using (restaurant_id = my_restaurant());
create policy "staff menu write" on menu_items for all using (restaurant_id = my_restaurant()) with check (restaurant_id = my_restaurant());
create policy "staff cat write" on categories for all using (restaurant_id = my_restaurant()) with check (restaurant_id = my_restaurant());
