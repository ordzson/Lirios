create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'manager');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.product_category as enum ('arrangement', 'single-flower');
create type public.order_status as enum (
  'received',
  'confirmed',
  'in_production',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
);
create type public.payment_method as enum ('bank_transfer', 'cash_on_delivery');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '',
  category public.product_category not null,
  colors text[] not null default '{}',
  flower_types text[] not null default '{}',
  price numeric(10, 2) check (price is null or price >= 0),
  currency text not null default 'GTQ' check (currency = 'GTQ'),
  inventory integer not null default 0 check (inventory >= 0),
  track_inventory boolean not null default true,
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  object_key text not null unique,
  public_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status public.order_status not null default 'received',
  payment_method public.payment_method not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  recipient_name text not null,
  delivery_address text not null,
  municipality text not null,
  delivery_references text not null default '',
  notes text not null default '',
  subtotal numeric(10, 2),
  delivery_fee numeric(10, 2),
  total numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  image_url text not null default '',
  image_alt text not null default '',
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(10, 2),
  line_subtotal numeric(10, 2),
  currency text not null default 'GTQ' check (currency = 'GTQ')
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index products_public_catalog_idx
  on public.products(status, sort_order, created_at desc);
create index product_images_product_idx
  on public.product_images(product_id, sort_order);
create index orders_work_queue_idx
  on public.orders(status, created_at desc);
create index order_items_order_idx
  on public.order_items(order_id);
create index order_history_order_idx
  on public.order_status_history(order_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'manager')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.record_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, (select auth.uid()));
  end if;
  return new;
end;
$$;

create trigger orders_record_status
after insert or update of status on public.orders
for each row execute function public.record_order_status();

create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_product public.products;
  v_item jsonb;
  v_quantity integer;
  v_subtotal numeric(10, 2) := 0;
  v_has_unpriced boolean := false;
  v_number text;
  v_suffix text;
  v_payment public.payment_method;
  v_attempt integer := 0;
  v_character integer;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_payload -> 'items' is null
    or jsonb_typeof(p_payload -> 'items') <> 'array'
    or coalesce(jsonb_array_length(p_payload -> 'items'), 0) < 1
    or jsonb_array_length(p_payload -> 'items') > 30 then
    raise exception 'El pedido debe incluir entre 1 y 30 productos.' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_payload #>> '{contact,fullName}', ''))) not between 2 and 80
    or char_length(trim(coalesce(p_payload #>> '{contact,phone}', ''))) not between 8 and 24
    or char_length(trim(coalesce(p_payload #>> '{delivery,recipientName}', ''))) not between 2 and 80
    or char_length(trim(coalesce(p_payload #>> '{delivery,address}', ''))) not between 8 and 180 then
    raise exception 'Los datos de contacto o entrega están incompletos.' using errcode = '22023';
  end if;

  v_payment := case p_payload ->> 'paymentMethod'
    when 'bank-transfer' then 'bank_transfer'::public.payment_method
    else 'cash_on_delivery'::public.payment_method
  end;

  while v_attempt < 12 loop
    v_suffix := '';
    for v_character in 1..4 loop
      v_suffix := v_suffix || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    v_number := 'LIR-' || to_char(timezone('America/Guatemala', now()), 'YYYYMMDD') || '-' || v_suffix;
    exit when not exists (select 1 from public.orders where order_number = v_number);
    v_attempt := v_attempt + 1;
  end loop;

  if exists (select 1 from public.orders where order_number = v_number) then
    raise exception 'No fue posible generar el número de pedido.';
  end if;

  insert into public.orders (
    order_number,
    payment_method,
    customer_name,
    customer_phone,
    customer_email,
    recipient_name,
    delivery_address,
    municipality,
    delivery_references,
    notes
  ) values (
    v_number,
    v_payment,
    trim(p_payload #>> '{contact,fullName}'),
    trim(p_payload #>> '{contact,phone}'),
    trim(coalesce(p_payload #>> '{contact,email}', '')),
    trim(p_payload #>> '{delivery,recipientName}'),
    trim(p_payload #>> '{delivery,address}'),
    trim(coalesce(p_payload #>> '{delivery,municipality}', 'Quetzaltenango')),
    trim(coalesce(p_payload #>> '{delivery,references}', '')),
    trim(coalesce(p_payload #>> '{delivery,notes}', ''))
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_payload -> 'items') loop
    v_quantity := greatest(1, least(99, coalesce((v_item ->> 'quantity')::integer, 1)));

    select * into v_product
    from public.products
    where id = v_item ->> 'productId'
      and status = 'active'
    for update;

    if not found then
      raise exception 'Uno de los productos ya no está disponible.' using errcode = 'P0002';
    end if;

    if v_product.track_inventory and v_product.inventory < v_quantity then
      raise exception 'No hay existencias suficientes de %.', v_product.name using errcode = 'P0002';
    end if;

    if v_product.price is null then
      v_has_unpriced := true;
    else
      v_subtotal := v_subtotal + (v_product.price * v_quantity);
    end if;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_slug,
      image_url,
      image_alt,
      quantity,
      unit_price,
      line_subtotal
    ) values (
      v_order.id,
      v_product.id,
      v_product.name,
      v_product.slug,
      coalesce(v_item ->> 'image', ''),
      coalesce(v_item ->> 'imageAlt', ''),
      v_quantity,
      v_product.price,
      case when v_product.price is null then null else v_product.price * v_quantity end
    );

    if v_product.track_inventory then
      update public.products
      set inventory = inventory - v_quantity
      where id = v_product.id;
    end if;
  end loop;

  update public.orders
  set subtotal = case when v_has_unpriced then null else v_subtotal end,
      total = case when v_has_unpriced then null else v_subtotal end
  where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'id', v_order.id,
    'orderNumber', v_order.order_number,
    'createdAt', v_order.created_at,
    'status', v_order.status,
    'paymentMethod', replace(v_order.payment_method::text, '_', '-'),
    'subtotal', v_order.subtotal,
    'deliveryFee', v_order.delivery_fee,
    'total', v_order.total
  );
end;
$$;

create or replace function public.track_order(p_order_number text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'orderNumber', order_number,
    'status', status,
    'createdAt', created_at,
    'updatedAt', updated_at,
    'total', total
  )
  from public.orders
  where order_number = upper(trim(p_order_number))
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy profiles_read_own_or_staff on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_staff());

create policy profiles_admin_update on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy products_public_read on public.products
for select to anon, authenticated
using (status = 'active' or public.is_staff());

create policy products_staff_insert on public.products
for insert to authenticated
with check (public.is_staff());

create policy products_staff_update on public.products
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy products_admin_delete on public.products
for delete to authenticated
using (public.is_admin());

create policy product_images_public_read on public.product_images
for select to anon, authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and (products.status = 'active' or public.is_staff())
  )
);

create policy product_images_staff_insert on public.product_images
for insert to authenticated
with check (public.is_staff());

create policy product_images_staff_update on public.product_images
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy product_images_staff_delete on public.product_images
for delete to authenticated
using (public.is_staff());

create policy orders_staff_all on public.orders
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy order_items_staff_all on public.order_items
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy order_history_staff_read on public.order_status_history
for select to authenticated
using (public.is_staff());

revoke all on public.profiles from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.product_images from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.order_status_history from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, role) on public.profiles to authenticated;
grant select on public.products, public.product_images to anon, authenticated;
grant insert, update, delete on public.products, public.product_images to authenticated;
grant select, insert, update, delete on public.orders, public.order_items to authenticated;
grant select on public.order_status_history to authenticated;
grant usage, select on sequence public.order_status_history_id_seq to authenticated;

revoke all on function public.create_order(jsonb) from public;
revoke all on function public.track_order(text) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.track_order(text) to anon, authenticated;

insert into public.products (
  id, slug, name, category, colors, flower_types, price, inventory, status, featured, sort_order
) values
  ('arrangement-crimson-lilies', 'lirios-carmesi', 'Lirios carmesí', 'arrangement', array['rojo'], array['lirio'], 145, 4, 'active', true, 1),
  ('arrangement-pink-lilies', 'lirios-rosados', 'Lirios rosados', 'arrangement', array['rosado'], array['lirio'], 145, 4, 'active', false, 2),
  ('arrangement-golden-gerberas', 'gerberas-doradas', 'Gerberas doradas', 'arrangement', array['amarillo'], array['gerbera'], 120, 4, 'active', false, 3),
  ('arrangement-wildflowers', 'arreglo-silvestre', 'Arreglo silvestre', 'arrangement', array['rosado', 'morado', 'blanco'], array['gerbera', 'margarita'], 260, 2, 'active', false, 4),
  ('single-cherry-blossom', 'flor-de-cerezo', 'Flor de cerezo', 'single-flower', array['blanco'], array['flor-de-cerezo'], 45, 8, 'active', false, 5),
  ('arrangement-sunlit', 'arreglo-soleado', 'Arreglo soleado', 'arrangement', array['amarillo', 'blanco'], array['lirio', 'margarita'], 185, 3, 'active', false, 6),
  ('arrangement-lilies-daisies', 'lirios-y-margaritas', 'Lirios y margaritas', 'arrangement', array['amarillo', 'blanco'], array['lirio', 'gerbera', 'margarita'], 210, 3, 'active', false, 7)
on conflict (id) do nothing;

insert into public.product_images (product_id, object_key, public_url, alt_text, sort_order) values
  ('arrangement-crimson-lilies', 'legacy/arreglo_tier1-retouched-full.webp', 'assets/pics/retouched/webp/arreglo_tier1-retouched-full.webp', 'Arreglo de lirios carmesí de limpiapipas envuelto en papel blanco', 0),
  ('arrangement-pink-lilies', 'legacy/arreglo_tier1_2-retouched-full.webp', 'assets/pics/retouched/webp/arreglo_tier1_2-retouched-full.webp', 'Arreglo de lirios rosados de limpiapipas envuelto en papel blanco', 0),
  ('arrangement-golden-gerberas', 'legacy/arreglo_tier1_3-retouched-full.webp', 'assets/pics/retouched/webp/arreglo_tier1_3-retouched-full.webp', 'Tres gerberas amarillas de limpiapipas sostenidas con una mano', 0),
  ('arrangement-wildflowers', 'legacy/arreglo_tier3_3-retouched-full.webp', 'assets/pics/retouched/webp/arreglo_tier3_3-retouched-full.webp', 'Arreglo multicolor de flores de limpiapipas en tonos rosados, morados y blancos', 0),
  ('single-cherry-blossom', 'legacy/flor_individual_1-retouched-full.webp', 'assets/pics/retouched/webp/flor_individual_1-retouched-full.webp', 'Rama de pequeñas flores blancas de limpiapipas sobre fondo vino', 0),
  ('arrangement-sunlit', 'legacy/flores1-retouched-full.webp', 'assets/pics/retouched/webp/flores1-retouched-full.webp', 'Arreglo de lirios amarillos y margaritas blancas de limpiapipas envuelto en papel beige', 0),
  ('arrangement-lilies-daisies', 'legacy/arreglo_tier2-retouched-full.webp', 'assets/pics/retouched/webp/arreglo_tier2-retouched-full.webp', 'Arreglo de lirios, margaritas y gerberas de limpiapipas en tonos amarillos y blancos', 0)
on conflict (object_key) do nothing;

-- After creating the first Auth user, promote it manually once:
-- update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
