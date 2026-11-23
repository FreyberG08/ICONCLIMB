-- =============================================================================
-- AICON · CLIMB PARTS — Esquema inicial
-- Supabase PostgreSQL · RLS · Inventario transaccional · Auditoría
-- =============================================================================
-- Principios:
--   * Los visitantes (rol anon) NUNCA leen tablas internas. Solo leen vistas
--     de catálogo publicadas (sin costo, ubicación ni existencias exactas).
--   * Precios y existencias se validan en el servidor (funciones SECURITY DEFINER).
--   * Las existencias solo cambian mediante funciones que bloquean filas
--     (SELECT ... FOR UPDATE) y restricciones CHECK que impiden negativos.
--   * Cada movimiento de inventario registra fecha, responsable y motivo.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'editor', 'warehouse', 'reviewer');
create type public.product_status as enum ('draft', 'pending_photos', 'pending_review', 'published', 'archived');
create type public.sale_mode as enum ('direct', 'quote');
create type public.movement_type as enum ('entry', 'exit', 'adjustment', 'reservation', 'release', 'sale');
create type public.order_status as enum ('received', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'refunded', 'not_applicable');
create type public.quote_status as enum ('new', 'in_review', 'sent', 'accepted', 'rejected', 'closed');

-- -----------------------------------------------------------------------------
-- Usuarios internos y permisos
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'editor',
  -- Las cuentas nuevas nacen INACTIVAS: un administrador debe activarlas.
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  role public.app_role not null,
  permission text not null,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission) values
  -- Administrador: todo
  ('admin', 'catalog.view'), ('admin', 'catalog.edit'), ('admin', 'catalog.publish'),
  ('admin', 'catalog.cost'), ('admin', 'inventory.manage'), ('admin', 'orders.view'),
  ('admin', 'orders.manage'), ('admin', 'quotes.manage'), ('admin', 'taxonomy.manage'),
  ('admin', 'data.import'), ('admin', 'data.export'), ('admin', 'users.manage'), ('admin', 'audit.view'),
  -- Editor de catálogo
  ('editor', 'catalog.view'), ('editor', 'catalog.edit'), ('editor', 'taxonomy.manage'),
  ('editor', 'data.import'), ('editor', 'data.export'),
  -- Almacén
  ('warehouse', 'catalog.view'), ('warehouse', 'inventory.manage'), ('warehouse', 'orders.view'),
  ('warehouse', 'data.export'),
  -- Revisor comercial / técnico
  ('reviewer', 'catalog.view'), ('reviewer', 'catalog.edit'), ('reviewer', 'catalog.publish'),
  ('reviewer', 'catalog.cost'), ('reviewer', 'orders.view'), ('reviewer', 'orders.manage'),
  ('reviewer', 'quotes.manage'), ('reviewer', 'data.export'), ('reviewer', 'audit.view');

create or replace function public.has_perm(p text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.role_permissions rp on rp.role = pr.role
    where pr.id = auth.uid() and pr.active and rp.permission = p
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.actor_label()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(nullif(full_name, ''), email) from public.profiles where id = auth.uid();
$$;

-- Perfil automático al crear un usuario en Supabase Auth (inactivo por defecto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Taxonomía
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger brands_touch before update on public.brands
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Productos
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9._/-]{1,39}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 3 and 160),
  category_id uuid references public.categories (id) on delete set null,
  subcategory_id uuid references public.categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  model text,
  reference text,                         -- referencia / número de parte original
  alt_codes text[] not null default '{}', -- códigos alternativos de búsqueda
  short_description text check (short_description is null or length(short_description) <= 280),
  description text,
  specs jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array'),
  price numeric(12, 2) check (price is null or price >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  sale_mode public.sale_mode not null default 'quote',
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  min_stock integer not null default 0 check (min_stock >= 0),
  search_text text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index products_status_idx on public.products (status);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_search_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);

-- Datos internos (ubicación física y notas): visibles solo para el personal.
create table public.product_internal (
  product_id uuid primary key references public.products (id) on delete cascade,
  location text,
  internal_notes text,
  updated_at timestamptz not null default now()
);

-- Costo interno: protegido con permiso específico.
create table public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost numeric(12, 2) check (cost is null or cost >= 0),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  alt text,
  width integer,
  height integer,
  position integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

create table public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  is_public boolean not null default false, -- descarga autorizada para visitantes
  created_at timestamptz not null default now()
);
create index product_documents_product_idx on public.product_documents (product_id);

-- Compatibilidades: solo las verificadas se muestran al público.
create table public.product_compatibilities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  brand text not null,
  model text not null,
  notes text,
  verified boolean not null default false,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index product_compat_product_idx on public.product_compatibilities (product_id);

-- Texto de búsqueda normalizado (nombre, SKU, códigos, marca, modelo, referencia).
create or replace function public.products_search_text()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_brand text;
begin
  select name into v_brand from public.brands where id = new.brand_id;
  new.search_text := lower(extensions.unaccent(concat_ws(' ',
    new.sku, new.name, new.model, new.reference, array_to_string(new.alt_codes, ' '), v_brand
  )));
  return new;
end;
$$;

create trigger products_search before insert or update on public.products
  for each row execute function public.products_search_text();

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create or replace function public.brands_refresh_search()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name then
    update public.products set search_text = search_text where brand_id = new.id;
  end if;
  return new;
end;
$$;
create trigger brands_refresh after update on public.brands
  for each row execute function public.brands_refresh_search();

-- Reglas de publicación: solo revisores/administradores publican o despublican,
-- y un producto publicado debe tener datos mínimos coherentes.
create or replace function public.products_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      if new.status = 'published' and not public.has_perm('catalog.publish') then
        raise exception 'Un producto nuevo no puede publicarse sin revisión' using errcode = '42501';
      end if;
    elsif new.status is distinct from old.status
      and (new.status = 'published' or old.status = 'published')
      and not public.has_perm('catalog.publish') then
      raise exception 'Solo un revisor o administrador puede publicar o despublicar productos' using errcode = '42501';
    end if;
    new.updated_by := auth.uid();
  end if;

  if new.status = 'published' then
    if new.category_id is null then
      raise exception 'Asigne una categoría antes de publicar' using errcode = '23514';
    end if;
    if new.sale_mode = 'direct' and (new.price is null or new.price <= 0) then
      raise exception 'Los productos de compra directa requieren un precio autorizado' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger products_guard before insert or update on public.products
  for each row execute function public.products_guard();

-- Solo quien puede publicar puede marcar una compatibilidad como verificada.
create or replace function public.compat_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.verified and (tg_op = 'INSERT' or not old.verified) then
    if auth.uid() is not null and not public.has_perm('catalog.publish') then
      raise exception 'Solo un revisor técnico puede verificar compatibilidades' using errcode = '42501';
    end if;
    new.verified_by := auth.uid();
    new.verified_at := now();
  elsif not new.verified then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;
create trigger compat_guard before insert or update on public.product_compatibilities
  for each row execute function public.compat_guard();

-- -----------------------------------------------------------------------------
-- Inventario
-- -----------------------------------------------------------------------------
create table public.inventory_levels (
  product_id uuid primary key references public.products (id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),     -- existencia física
  reserved integer not null default 0 check (reserved >= 0),   -- reservado por pedidos
  updated_at timestamptz not null default now(),
  constraint reserved_le_on_hand check (reserved <= on_hand)
);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  type public.movement_type not null,
  on_hand_delta integer not null default 0,
  reserved_delta integer not null default 0,
  on_hand_after integer not null,
  reserved_after integer not null,
  reason text not null check (length(trim(reason)) >= 3),
  reference text,
  actor_id uuid references auth.users (id) on delete set null,
  actor_label text not null default 'Sistema',
  created_at timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

create or replace function public.products_init_inventory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_levels (product_id) values (new.id) on conflict do nothing;
  insert into public.product_internal (product_id) values (new.id) on conflict do nothing;
  insert into public.product_costs (product_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger products_init_inventory after insert on public.products
  for each row execute function public.products_init_inventory();

-- Movimiento manual de inventario (entrada, salida o ajuste por conteo físico).
--   entry:      p_quantity = unidades que ingresan (> 0)
--   exit:       p_quantity = unidades que salen (> 0)
--   adjustment: p_quantity = existencia física contada (>= reservado)
create or replace function public.record_inventory_movement(
  p_product_id uuid,
  p_type public.movement_type,
  p_quantity integer,
  p_reason text,
  p_reference text default null
)
returns public.inventory_movements
language plpgsql security definer
set search_path = public
as $$
declare
  v_level public.inventory_levels;
  v_delta integer;
  v_row public.inventory_movements;
begin
  if not public.has_perm('inventory.manage') then
    raise exception 'No tiene permiso para mover inventario' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Indique el motivo del movimiento' using errcode = '22023';
  end if;
  if p_type not in ('entry', 'exit', 'adjustment') then
    raise exception 'Tipo de movimiento no permitido manualmente' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 0 or (p_type <> 'adjustment' and p_quantity = 0) then
    raise exception 'Cantidad inválida' using errcode = '22023';
  end if;

  select * into v_level from public.inventory_levels where product_id = p_product_id for update;
  if not found then
    raise exception 'Producto sin registro de inventario' using errcode = 'P0002';
  end if;

  v_delta := case p_type
    when 'entry' then p_quantity
    when 'exit' then -p_quantity
    else p_quantity - v_level.on_hand
  end;

  if v_level.on_hand + v_delta < v_level.reserved then
    raise exception 'Existencia insuficiente: % unidades físicas, % reservadas por pedidos', v_level.on_hand, v_level.reserved
      using errcode = '23514';
  end if;

  update public.inventory_levels
     set on_hand = on_hand + v_delta, updated_at = now()
   where product_id = p_product_id
  returning * into v_level;

  insert into public.inventory_movements
    (product_id, type, on_hand_delta, reserved_delta, on_hand_after, reserved_after, reason, reference, actor_id, actor_label)
  values
    (p_product_id, p_type, v_delta, 0, v_level.on_hand, v_level.reserved, trim(p_reason), p_reference,
     auth.uid(), coalesce(public.actor_label(), 'Sistema'))
  returning * into v_row;

  return v_row;
end;
$$;

-- Registro de ingreso al almacén: crea el producto como BORRADOR con su SKU
-- y registra la entrada de unidades. Nunca publica.
create or replace function public.register_intake(
  p_sku text,
  p_name text,
  p_quantity integer,
  p_location text,
  p_reason text,
  p_category_id uuid default null,
  p_slug text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (public.has_perm('inventory.manage') or public.has_perm('catalog.edit')) then
    raise exception 'No tiene permiso para registrar ingresos' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'Cantidad inválida' using errcode = '22023';
  end if;
  if p_quantity > 0 and not public.has_perm('inventory.manage') then
    raise exception 'Su rol no puede registrar existencias' using errcode = '42501';
  end if;

  insert into public.products (sku, slug, name, category_id, status, sale_mode)
  values (upper(trim(p_sku)), coalesce(p_slug, lower(regexp_replace(trim(p_sku), '[^A-Za-z0-9]+', '-', 'g'))),
          trim(p_name), p_category_id, 'draft', 'quote')
  returning id into v_id;

  update public.product_internal set location = nullif(trim(p_location), '') where product_id = v_id;

  if p_quantity > 0 then
    update public.inventory_levels set on_hand = p_quantity where product_id = v_id;
    insert into public.inventory_movements
      (product_id, type, on_hand_delta, reserved_delta, on_hand_after, reserved_after, reason, actor_id, actor_label)
    values (v_id, 'entry', p_quantity, 0, p_quantity, 0, coalesce(nullif(trim(p_reason), ''), 'Ingreso a almacén'),
            auth.uid(), coalesce(public.actor_label(), 'Sistema'));
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Pedidos (compra directa)
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq;
create sequence public.quote_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  status public.order_status not null default 'received',
  payment_status public.payment_status not null default 'pending',
  stock_state text not null default 'reserved' check (stock_state in ('reserved', 'consumed', 'released')),
  customer_name text not null,
  company text,
  tax_id text,
  email text not null,
  phone text not null,
  city text,
  address text,
  notes text,
  currency char(3) not null,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('created', 'status', 'payment', 'note')),
  from_value text,
  to_value text,
  note text,
  is_internal boolean not null default true,
  actor_id uuid references auth.users (id) on delete set null,
  actor_label text not null default 'Sistema',
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Crea un pedido validando en el servidor precio, modalidad y disponibilidad.
-- Bloquea las filas de inventario para impedir sobreventa concurrente.
create or replace function public.create_order(p_items jsonb, p_customer jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_item record;
  v_product public.products;
  v_level public.inventory_levels;
  v_order_id uuid;
  v_number text;
  v_currency char(3);
  v_subtotal numeric(12, 2) := 0;
  v_count integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Demasiados artículos en un solo pedido' using errcode = '22023';
  end if;
  if coalesce(trim(p_customer ->> 'name'), '') = '' or coalesce(trim(p_customer ->> 'email'), '') = ''
     or coalesce(trim(p_customer ->> 'phone'), '') = '' then
    raise exception 'Faltan datos de contacto' using errcode = '22023';
  end if;

  v_number := 'ICN-P' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');

  insert into public.orders (number, customer_name, company, tax_id, email, phone, city, address, notes,
                             currency, subtotal, total)
  values (v_number, trim(p_customer ->> 'name'), nullif(trim(p_customer ->> 'company'), ''),
          nullif(trim(p_customer ->> 'tax_id'), ''), lower(trim(p_customer ->> 'email')), trim(p_customer ->> 'phone'),
          nullif(trim(p_customer ->> 'city'), ''), nullif(trim(p_customer ->> 'address'), ''),
          nullif(trim(p_customer ->> 'notes'), ''), 'USD', 0, 0)
  returning id into v_order_id;

  -- Orden determinista de bloqueo para evitar interbloqueos.
  for v_item in
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 9999 then
      raise exception 'Cantidad inválida' using errcode = '22023';
    end if;

    select * into v_product from public.products where id = v_item.product_id;
    if not found or v_product.status <> 'published' then
      raise exception 'Un producto del carrito ya no está disponible' using errcode = 'P0002';
    end if;
    if v_product.sale_mode <> 'direct' or v_product.price is null or v_product.price <= 0 then
      raise exception 'El producto % requiere cotización', v_product.sku using errcode = '22023';
    end if;
    if v_currency is null then
      v_currency := v_product.currency;
    elsif v_currency <> v_product.currency then
      raise exception 'El carrito contiene productos en monedas distintas' using errcode = '22023';
    end if;

    select * into v_level from public.inventory_levels where product_id = v_product.id for update;
    if v_level.on_hand - v_level.reserved < v_item.quantity then
      raise exception 'Disponibilidad insuficiente para % (disponible: %)', v_product.sku,
        greatest(v_level.on_hand - v_level.reserved, 0) using errcode = '23514';
    end if;

    update public.inventory_levels set reserved = reserved + v_item.quantity, updated_at = now()
     where product_id = v_product.id
    returning * into v_level;

    insert into public.inventory_movements
      (product_id, type, on_hand_delta, reserved_delta, on_hand_after, reserved_after, reason, reference, actor_label)
    values (v_product.id, 'reservation', 0, v_item.quantity, v_level.on_hand, v_level.reserved,
            'Reserva por pedido web', v_number, 'Tienda web');

    insert into public.order_items (order_id, product_id, sku, name, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.sku, v_product.name, v_product.price, v_item.quantity,
            round(v_product.price * v_item.quantity, 2));

    v_subtotal := v_subtotal + round(v_product.price * v_item.quantity, 2);
    v_count := v_count + 1;
  end loop;

  update public.orders set currency = v_currency, subtotal = v_subtotal, total = v_subtotal where id = v_order_id;

  insert into public.order_events (order_id, kind, to_value, note, is_internal, actor_label)
  values (v_order_id, 'created', 'received', 'Pedido registrado desde la tienda web', false, 'Tienda web');

  return jsonb_build_object('id', v_order_id, 'number', v_number, 'total', v_subtotal, 'currency', v_currency);
end;
$$;

-- Cambio de estado del pedido con efectos de inventario:
--   shipped/delivered: consume la reserva (sale existencia física)
--   cancelled:          libera la reserva
create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item record;
  v_level public.inventory_levels;
begin
  if not public.has_perm('orders.manage') then
    raise exception 'No tiene permiso para gestionar pedidos' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado' using errcode = 'P0002'; end if;
  if v_order.status = p_status then return; end if;
  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'El pedido ya está cerrado' using errcode = '22023';
  end if;
  if p_status = 'cancelled' and v_order.stock_state = 'consumed' then
    raise exception 'El pedido ya fue despachado; registre una devolución como entrada de inventario' using errcode = '22023';
  end if;

  if p_status in ('shipped', 'delivered') and v_order.stock_state = 'reserved' then
    for v_item in select * from public.order_items where order_id = p_order_id and product_id is not null order by product_id loop
      update public.inventory_levels
         set on_hand = on_hand - v_item.quantity, reserved = reserved - v_item.quantity, updated_at = now()
       where product_id = v_item.product_id
      returning * into v_level;
      insert into public.inventory_movements
        (product_id, type, on_hand_delta, reserved_delta, on_hand_after, reserved_after, reason, reference, actor_id, actor_label)
      values (v_item.product_id, 'sale', -v_item.quantity, -v_item.quantity, v_level.on_hand, v_level.reserved,
              'Despacho de pedido', v_order.number, auth.uid(), coalesce(public.actor_label(), 'Sistema'));
    end loop;
    update public.orders set stock_state = 'consumed' where id = p_order_id;
  elsif p_status = 'cancelled' and v_order.stock_state = 'reserved' then
    for v_item in select * from public.order_items where order_id = p_order_id and product_id is not null order by product_id loop
      update public.inventory_levels
         set reserved = reserved - v_item.quantity, updated_at = now()
       where product_id = v_item.product_id
      returning * into v_level;
      insert into public.inventory_movements
        (product_id, type, on_hand_delta, reserved_delta, on_hand_after, reserved_after, reason, reference, actor_id, actor_label)
      values (v_item.product_id, 'release', 0, -v_item.quantity, v_level.on_hand, v_level.reserved,
              'Liberación por cancelación', v_order.number, auth.uid(), coalesce(public.actor_label(), 'Sistema'));
    end loop;
    update public.orders set stock_state = 'released' where id = p_order_id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  insert into public.order_events (order_id, kind, from_value, to_value, note, is_internal, actor_id, actor_label)
  values (p_order_id, 'status', v_order.status::text, p_status::text, nullif(trim(p_note), ''), false,
          auth.uid(), coalesce(public.actor_label(), 'Sistema'));
end;
$$;

-- Registro manual del estado de pago (pagos confirmados fuera de línea por el personal).
create or replace function public.set_order_payment(p_order_id uuid, p_status public.payment_status, p_note text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old public.payment_status;
begin
  if not public.has_perm('orders.manage') then
    raise exception 'No tiene permiso para gestionar pedidos' using errcode = '42501';
  end if;
  select payment_status into v_old from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado' using errcode = 'P0002'; end if;
  if v_old = p_status then return; end if;
  update public.orders set payment_status = p_status where id = p_order_id;
  insert into public.order_events (order_id, kind, from_value, to_value, note, is_internal, actor_id, actor_label)
  values (p_order_id, 'payment', v_old::text, p_status::text, nullif(trim(p_note), ''), true,
          auth.uid(), coalesce(public.actor_label(), 'Sistema'));
end;
$$;

create or replace function public.add_order_note(p_order_id uuid, p_note text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.has_perm('orders.manage') then
    raise exception 'No tiene permiso para gestionar pedidos' using errcode = '42501';
  end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'La nota está vacía' using errcode = '22023'; end if;
  insert into public.order_events (order_id, kind, note, is_internal, actor_id, actor_label)
  values (p_order_id, 'note', trim(p_note), true, auth.uid(), coalesce(public.actor_label(), 'Sistema'));
end;
$$;

-- -----------------------------------------------------------------------------
-- Solicitudes de cotización
-- -----------------------------------------------------------------------------
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  status public.quote_status not null default 'new',
  customer_name text not null,
  company text,
  tax_id text,
  email text not null,
  phone text not null,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_requests_status_idx on public.quote_requests (status, created_at desc);
create trigger quotes_touch before update on public.quote_requests
  for each row execute function public.touch_updated_at();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  notes text
);
create index quote_items_quote_idx on public.quote_items (quote_id);

create table public.quote_events (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quote_requests (id) on delete cascade,
  kind text not null check (kind in ('created', 'status', 'note')),
  from_value text,
  to_value text,
  note text,
  is_internal boolean not null default true,
  actor_id uuid references auth.users (id) on delete set null,
  actor_label text not null default 'Sistema',
  created_at timestamptz not null default now()
);
create index quote_events_quote_idx on public.quote_events (quote_id, created_at);

create or replace function public.create_quote(p_items jsonb, p_customer jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_item record;
  v_product public.products;
  v_quote_id uuid;
  v_number text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La lista de cotización está vacía' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Demasiados artículos en una sola solicitud' using errcode = '22023';
  end if;
  if coalesce(trim(p_customer ->> 'name'), '') = '' or coalesce(trim(p_customer ->> 'email'), '') = ''
     or coalesce(trim(p_customer ->> 'phone'), '') = '' then
    raise exception 'Faltan datos de contacto' using errcode = '22023';
  end if;

  v_number := 'ICN-C' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.quote_number_seq')::text, 5, '0');

  insert into public.quote_requests (number, customer_name, company, tax_id, email, phone, city, notes)
  values (v_number, trim(p_customer ->> 'name'), nullif(trim(p_customer ->> 'company'), ''),
          nullif(trim(p_customer ->> 'tax_id'), ''), lower(trim(p_customer ->> 'email')), trim(p_customer ->> 'phone'),
          nullif(trim(p_customer ->> 'city'), ''), nullif(trim(p_customer ->> 'notes'), ''))
  returning id into v_quote_id;

  for v_item in
    select nullif(e ->> 'product_id', '')::uuid as product_id, (e ->> 'quantity')::integer as quantity,
           nullif(trim(e ->> 'notes'), '') as notes, nullif(trim(e ->> 'description'), '') as description
    from jsonb_array_elements(p_items) e
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 99999 then
      raise exception 'Cantidad inválida' using errcode = '22023';
    end if;
    if v_item.product_id is null then
      -- Pieza no catalogada: el cliente la describe (referencia, marca, modelo del equipo).
      if v_item.description is null or length(v_item.description) < 3 then
        raise exception 'Describa la pieza que necesita' using errcode = '22023';
      end if;
      insert into public.quote_items (quote_id, product_id, sku, name, quantity, notes)
      values (v_quote_id, null, 'NO-CATALOGADO', left(v_item.description, 200), v_item.quantity, left(v_item.notes, 500));
    else
      select * into v_product from public.products where id = v_item.product_id and status = 'published';
      if not found then
        raise exception 'Un producto de la lista ya no está disponible' using errcode = 'P0002';
      end if;
      insert into public.quote_items (quote_id, product_id, sku, name, quantity, notes)
      values (v_quote_id, v_product.id, v_product.sku, v_product.name, v_item.quantity, left(v_item.notes, 500));
    end if;
  end loop;

  insert into public.quote_events (quote_id, kind, to_value, note, is_internal, actor_label)
  values (v_quote_id, 'created', 'new', 'Solicitud recibida desde la tienda web', false, 'Tienda web');

  return jsonb_build_object('id', v_quote_id, 'number', v_number);
end;
$$;

create or replace function public.set_quote_status(p_quote_id uuid, p_status public.quote_status, p_note text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old public.quote_status;
begin
  if not public.has_perm('quotes.manage') then
    raise exception 'No tiene permiso para gestionar cotizaciones' using errcode = '42501';
  end if;
  select status into v_old from public.quote_requests where id = p_quote_id for update;
  if not found then raise exception 'Solicitud no encontrada' using errcode = 'P0002'; end if;
  if v_old = p_status then return; end if;
  update public.quote_requests set status = p_status where id = p_quote_id;
  insert into public.quote_events (quote_id, kind, from_value, to_value, note, is_internal, actor_id, actor_label)
  values (p_quote_id, 'status', v_old::text, p_status::text, nullif(trim(p_note), ''), false,
          auth.uid(), coalesce(public.actor_label(), 'Sistema'));
end;
$$;

create or replace function public.add_quote_note(p_quote_id uuid, p_note text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.has_perm('quotes.manage') then
    raise exception 'No tiene permiso para gestionar cotizaciones' using errcode = '42501';
  end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'La nota está vacía' using errcode = '22023'; end if;
  insert into public.quote_events (quote_id, kind, note, is_internal, actor_id, actor_label)
  values (p_quote_id, 'note', trim(p_note), true, auth.uid(), coalesce(public.actor_label(), 'Sistema'));
end;
$$;

-- Seguimiento público: requiere número de referencia + correo del solicitante.
-- Devuelve solo información no sensible y eventos públicos.
create or replace function public.track_request(p_number text, p_email text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if upper(p_number) like 'ICN-P%' then
    select jsonb_build_object(
      'kind', 'order', 'number', o.number, 'status', o.status, 'payment_status', o.payment_status,
      'created_at', o.created_at, 'currency', o.currency, 'total', o.total,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('sku', i.sku, 'name', i.name, 'quantity', i.quantity)), '[]'::jsonb)
                from public.order_items i where i.order_id = o.id),
      'events', (select coalesce(jsonb_agg(jsonb_build_object('to', e.to_value, 'note', e.note, 'at', e.created_at) order by e.created_at), '[]'::jsonb)
                 from public.order_events e where e.order_id = o.id and not e.is_internal)
    ) into v_result
    from public.orders o
    where o.number = upper(trim(p_number)) and o.email = lower(trim(p_email));
  else
    select jsonb_build_object(
      'kind', 'quote', 'number', q.number, 'status', q.status, 'created_at', q.created_at,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('sku', i.sku, 'name', i.name, 'quantity', i.quantity)), '[]'::jsonb)
                from public.quote_items i where i.quote_id = q.id),
      'events', (select coalesce(jsonb_agg(jsonb_build_object('to', e.to_value, 'note', e.note, 'at', e.created_at) order by e.created_at), '[]'::jsonb)
                 from public.quote_events e where e.quote_id = q.id and not e.is_internal)
    ) into v_result
    from public.quote_requests q
    where q.number = upper(trim(p_number)) and q.email = lower(trim(p_email));
  end if;
  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_label text not null default 'Sistema',
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_id text;
  v_details jsonb := '{}'::jsonb;
  v_new jsonb;
  v_old jsonb;
  v_key text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_id := coalesce(v_old ->> 'id', v_old ->> 'product_id');
    v_details := jsonb_build_object('deleted', v_old - 'search_text');
  else
    v_new := to_jsonb(new);
    v_id := coalesce(v_new ->> 'id', v_new ->> 'product_id');
    if tg_op = 'UPDATE' then
      v_old := to_jsonb(old);
      for v_key in select jsonb_object_keys(v_new) loop
        if v_key not in ('updated_at', 'search_text', 'updated_by') and (v_new -> v_key) is distinct from (v_old -> v_key) then
          -- El costo se audita sin exponer su valor en el historial.
          if tg_table_name = 'product_costs' then
            v_details := v_details || jsonb_build_object(v_key, 'modificado');
          else
            v_details := v_details || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
          end if;
        end if;
      end loop;
      if v_details = '{}'::jsonb then return new; end if;
    else
      v_details := case when tg_table_name = 'product_costs' then '{}'::jsonb else v_new - 'search_text' end;
    end if;
  end if;

  insert into public.audit_log (actor_id, actor_label, action, entity, entity_id, details)
  values (auth.uid(), coalesce(public.actor_label(), 'Sistema'), lower(tg_op), tg_table_name, v_id, v_details);
  return coalesce(new, old);
end;
$$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_trigger();
create trigger audit_product_costs after update on public.product_costs
  for each row execute function public.audit_trigger();
create trigger audit_product_internal after update on public.product_internal
  for each row execute function public.audit_trigger();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_trigger();
create trigger audit_brands after insert or update or delete on public.brands
  for each row execute function public.audit_trigger();
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_trigger();
create trigger audit_images after insert or delete on public.product_images
  for each row execute function public.audit_trigger();
create trigger audit_documents after insert or update or delete on public.product_documents
  for each row execute function public.audit_trigger();
create trigger audit_compat after insert or update or delete on public.product_compatibilities
  for each row execute function public.audit_trigger();

-- -----------------------------------------------------------------------------
-- Vistas públicas de catálogo (solo productos publicados, sin datos internos)
-- Se ejecutan con los privilegios del propietario a propósito: exponen
-- únicamente columnas seguras y un estado de disponibilidad, nunca cantidades.
-- -----------------------------------------------------------------------------
create view public.catalog_products with (security_invoker = false) as
select
  p.id, p.sku, p.slug, p.name,
  p.category_id, c.slug as category_slug, c.name as category_name,
  p.subcategory_id, sc.slug as subcategory_slug, sc.name as subcategory_name,
  p.brand_id, b.slug as brand_slug, b.name as brand_name,
  p.model, p.reference, p.alt_codes, p.short_description, p.description, p.specs,
  case when p.sale_mode = 'direct' then p.price end as price,
  p.currency, p.sale_mode, p.featured, p.published_at, p.search_text,
  case
    when coalesce(il.on_hand - il.reserved, 0) <= 0 then 'out_of_stock'
    when (il.on_hand - il.reserved) <= p.min_stock then 'low_stock'
    else 'in_stock'
  end as availability,
  (select i.storage_path from public.product_images i
    where i.product_id = p.id order by i.is_primary desc, i.position asc limit 1) as primary_image_path
from public.products p
left join public.categories c on c.id = p.category_id
left join public.categories sc on sc.id = p.subcategory_id
left join public.brands b on b.id = p.brand_id
left join public.inventory_levels il on il.product_id = p.id
where p.status = 'published';

create view public.catalog_product_images with (security_invoker = false) as
select i.id, i.product_id, i.storage_path, i.alt, i.width, i.height, i.position, i.is_primary
from public.product_images i
join public.products p on p.id = i.product_id
where p.status = 'published';

create view public.catalog_product_documents with (security_invoker = false) as
select d.id, d.product_id, d.title, d.file_name, d.mime_type, d.size_bytes, d.storage_path
from public.product_documents d
join public.products p on p.id = d.product_id
where p.status = 'published' and d.is_public;

create view public.catalog_compatibilities with (security_invoker = false) as
select x.id, x.product_id, x.brand, x.model, x.notes, x.verified_at
from public.product_compatibilities x
join public.products p on p.id = x.product_id
where p.status = 'published' and x.verified;

create view public.catalog_categories with (security_invoker = false) as
select c.id, c.parent_id, c.name, c.slug, c.description, c.position,
       (select count(*) from public.products p
         where p.status = 'published' and (p.category_id = c.id or p.subcategory_id = c.id))::integer as product_count
from public.categories c
where c.active;

create view public.catalog_brands with (security_invoker = false) as
select b.id, b.name, b.slug,
       (select count(*) from public.products p where p.status = 'published' and p.brand_id = b.id)::integer as product_count
from public.brands b
where b.active;

-- Vista administrativa (security_invoker: aplica la RLS de quien consulta).
create view public.admin_product_overview with (security_invoker = true) as
select
  p.id, p.sku, p.name, p.slug, p.status, p.sale_mode, p.price, p.currency, p.min_stock, p.featured,
  p.category_id, p.brand_id, p.search_text, p.created_at, p.updated_at, p.published_at,
  c.name as category_name, b.name as brand_name, pi.location,
  coalesce(il.on_hand, 0) as on_hand,
  coalesce(il.reserved, 0) as reserved,
  coalesce(il.on_hand, 0) - coalesce(il.reserved, 0) as available,
  (coalesce(il.on_hand, 0) - coalesce(il.reserved, 0)) <= 0 as is_out_of_stock,
  (coalesce(il.on_hand, 0) - coalesce(il.reserved, 0)) > 0
    and (coalesce(il.on_hand, 0) - coalesce(il.reserved, 0)) <= p.min_stock as is_low_stock,
  il.updated_at as stock_updated_at,
  (select count(*) from public.product_images i where i.product_id = p.id)::integer as image_count,
  (select i.storage_path from public.product_images i
    where i.product_id = p.id order by i.is_primary desc, i.position asc limit 1) as primary_image_path
from public.products p
left join public.categories c on c.id = p.category_id
left join public.brands b on b.id = p.brand_id
left join public.inventory_levels il on il.product_id = p.id
left join public.product_internal pi on pi.product_id = p.id;

-- Documento descargable por visitantes (para la política de Storage).
create or replace function public.is_public_document(p_path text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.product_documents d
    join public.products p on p.id = d.product_id
    where d.storage_path = p_path and d.is_public and p.status = 'published'
  );
$$;

-- -----------------------------------------------------------------------------
-- Seguridad a nivel de fila (RLS)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_internal enable row level security;
alter table public.product_costs enable row level security;
alter table public.product_images enable row level security;
alter table public.product_documents enable row level security;
alter table public.product_compatibilities enable row level security;
alter table public.inventory_levels enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_events enable row level security;
alter table public.audit_log enable row level security;

-- Perfiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_perm('users.manage'));
create policy profiles_update on public.profiles for update to authenticated
  using (public.has_perm('users.manage')) with check (public.has_perm('users.manage'));

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (public.is_staff());

-- Taxonomía
create policy categories_select on public.categories for select to authenticated using (public.is_staff());
create policy categories_write on public.categories for all to authenticated
  using (public.has_perm('taxonomy.manage')) with check (public.has_perm('taxonomy.manage'));
create policy brands_select on public.brands for select to authenticated using (public.is_staff());
create policy brands_write on public.brands for all to authenticated
  using (public.has_perm('taxonomy.manage')) with check (public.has_perm('taxonomy.manage'));

-- Productos y anexos
create policy products_select on public.products for select to authenticated using (public.has_perm('catalog.view'));
create policy products_insert on public.products for insert to authenticated with check (public.has_perm('catalog.edit'));
create policy products_update on public.products for update to authenticated
  using (public.has_perm('catalog.edit') or public.has_perm('catalog.publish'))
  with check (public.has_perm('catalog.edit') or public.has_perm('catalog.publish'));
create policy products_delete on public.products for delete to authenticated using (public.has_perm('users.manage'));

create policy internal_select on public.product_internal for select to authenticated using (public.has_perm('catalog.view'));
create policy internal_update on public.product_internal for update to authenticated
  using (public.has_perm('catalog.edit') or public.has_perm('inventory.manage'))
  with check (public.has_perm('catalog.edit') or public.has_perm('inventory.manage'));

create policy costs_select on public.product_costs for select to authenticated using (public.has_perm('catalog.cost'));
create policy costs_update on public.product_costs for update to authenticated
  using (public.has_perm('catalog.cost')) with check (public.has_perm('catalog.cost'));

create policy images_select on public.product_images for select to authenticated using (public.has_perm('catalog.view'));
create policy images_write on public.product_images for all to authenticated
  using (public.has_perm('catalog.edit')) with check (public.has_perm('catalog.edit'));

create policy documents_select on public.product_documents for select to authenticated using (public.has_perm('catalog.view'));
create policy documents_write on public.product_documents for all to authenticated
  using (public.has_perm('catalog.edit')) with check (public.has_perm('catalog.edit'));

create policy compat_select on public.product_compatibilities for select to authenticated using (public.has_perm('catalog.view'));
create policy compat_write on public.product_compatibilities for all to authenticated
  using (public.has_perm('catalog.edit') or public.has_perm('catalog.publish'))
  with check (public.has_perm('catalog.edit') or public.has_perm('catalog.publish'));

-- Inventario: lectura para el personal; escritura SOLO mediante funciones.
create policy levels_select on public.inventory_levels for select to authenticated using (public.has_perm('catalog.view'));
create policy movements_select on public.inventory_movements for select to authenticated using (public.has_perm('catalog.view'));

-- Pedidos y cotizaciones: lectura para el personal; escritura mediante funciones.
create policy orders_select on public.orders for select to authenticated using (public.has_perm('orders.view'));
create policy order_items_select on public.order_items for select to authenticated using (public.has_perm('orders.view'));
create policy order_events_select on public.order_events for select to authenticated using (public.has_perm('orders.view'));
create policy quotes_select on public.quote_requests for select to authenticated using (public.has_perm('quotes.manage'));
create policy quote_items_select on public.quote_items for select to authenticated using (public.has_perm('quotes.manage'));
create policy quote_events_select on public.quote_events for select to authenticated using (public.has_perm('quotes.manage'));

create policy audit_select on public.audit_log for select to authenticated using (public.has_perm('audit.view'));

-- -----------------------------------------------------------------------------
-- Privilegios explícitos
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.inventory_levels, public.inventory_movements,
  public.orders, public.order_items, public.order_events,
  public.quote_requests, public.quote_items, public.quote_events,
  public.audit_log, public.role_permissions from authenticated;
revoke insert, delete on public.profiles, public.product_internal, public.product_costs from authenticated;

grant select on public.admin_product_overview to authenticated;
grant select on public.catalog_products, public.catalog_product_images, public.catalog_product_documents,
  public.catalog_compatibilities, public.catalog_categories, public.catalog_brands to anon, authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_order(jsonb, jsonb) to anon, authenticated;
grant execute on function public.create_quote(jsonb, jsonb) to anon, authenticated;
grant execute on function public.track_request(text, text) to anon, authenticated;
grant execute on function public.is_public_document(text) to anon, authenticated;
grant execute on function public.has_perm(text), public.is_staff(), public.actor_label(),
  public.record_inventory_movement(uuid, public.movement_type, integer, text, text),
  public.register_intake(text, text, integer, text, text, uuid, text),
  public.set_order_status(uuid, public.order_status, text),
  public.set_order_payment(uuid, public.payment_status, text),
  public.add_order_note(uuid, text),
  public.set_quote_status(uuid, public.quote_status, text),
  public.add_quote_note(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: fotografías (públicas) y documentos técnicos (privados)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('product-documents', 'product-documents', false, 26214400,
   array['application/pdf', 'image/jpeg', 'image/png', 'application/zip',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy "icon images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.has_perm('catalog.edit'));
create policy "icon images update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_perm('catalog.edit'));
create policy "icon images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_perm('catalog.edit'));

create policy "icon docs read staff" on storage.objects for select to authenticated
  using (bucket_id = 'product-documents' and public.has_perm('catalog.view'));
create policy "icon docs read public" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-documents' and public.is_public_document(name));
create policy "icon docs write" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-documents' and public.has_perm('catalog.edit'));
create policy "icon docs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-documents' and public.has_perm('catalog.edit'));
