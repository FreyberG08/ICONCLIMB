-- Pruebas de seguridad e inventario (se ejecutan dentro de una transacción y se revierten).
-- Requiere: supabase_stub.sql (solo en PostgreSQL local) + migración + seed.sql
-- Uso: psql -v ON_ERROR_STOP=1 -d <db> -f supabase/tests/security_and_inventory.sql
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test'),
  ('00000000-0000-0000-0000-0000000000e1', 'editor@test'),
  ('00000000-0000-0000-0000-0000000000b1', 'almacen@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'revisor@test'),
  ('00000000-0000-0000-0000-0000000000d1', 'nuevo@test');
update public.profiles set role = 'admin', active = true where email = 'admin@test';
update public.profiles set role = 'editor', active = true where email = 'editor@test';
update public.profiles set role = 'warehouse', active = true where email = 'almacen@test';
update public.profiles set role = 'reviewer', active = true where email = 'revisor@test';

create function public._t_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), true);
end $$;
create function public._t_err(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'OK  %  (%)', p_label, sqlerrm;
    return;
  end;
  raise exception 'FALLO: se esperaba error en "%"', p_label;
end $$;
create function public._t_eq(p_got bigint, p_expected bigint, p_label text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_expected then
    raise exception 'FALLO: % (obtenido %, esperado %)', p_label, p_got, p_expected;
  end if;
  raise notice 'OK  %', p_label;
end $$;
grant execute on function public._t_as(uuid), public._t_err(text, text), public._t_eq(bigint, bigint, text) to anon, authenticated;

-- 1. Usuario nuevo (inactivo) no ve nada interno
select public._t_as('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
select public._t_eq((select count(*) from public.categories), 0, 'usuario inactivo no lee tablas internas');
select public._t_err($$insert into public.products (sku, slug, name) values ('X-1', 'x-1', 'Intruso')$$, 'usuario inactivo no crea productos');
reset role;

-- 2. Editor crea producto en borrador; no puede publicar ni ver costos
select public._t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
insert into public.products (sku, slug, name, category_id, sale_mode, price, currency)
select 'TEST-001', 'test-001', 'Tarjeta de prueba', id, 'direct', 100, 'USD'
from public.categories where slug = 'tarjetas-y-electronica';
select public._t_err($$update public.products set status = 'published' where sku = 'TEST-001'$$, 'editor no puede publicar');
select public._t_err($$insert into public.products (sku, slug, name, status) values ('TEST-009', 'test-009', 'Directo', 'published')$$, 'producto nuevo no nace publicado');
select public._t_eq((select count(*) from public.product_costs), 0, 'editor no lee costos internos');
select public._t_err($$select public.record_inventory_movement((select id from public.products where sku='TEST-001'), 'entry', 5, 'Prueba')$$, 'editor no mueve inventario');
select public._t_err($$update public.inventory_levels set on_hand = 999$$, 'nadie escribe inventario directamente');
select public._t_err($$insert into public.product_compatibilities (product_id, brand, model, verified) select id, 'Marca', 'Modelo', true from public.products where sku='TEST-001'$$, 'editor no verifica compatibilidades');
reset role;

-- 3. Almacén registra entradas y conteos; no puede dejar existencias negativas
select public._t_as('00000000-0000-0000-0000-0000000000b1');
set local role authenticated;
select public.record_inventory_movement((select id from public.products where sku = 'TEST-001'), 'entry', 3, 'Ingreso de proveedor');
select public._t_err($$select public.record_inventory_movement((select id from public.products where sku='TEST-001'), 'exit', 5, 'Salida excesiva')$$, 'salida no deja existencia negativa');
select public._t_err($$select public.record_inventory_movement((select id from public.products where sku='TEST-001'), 'entry', 2, '')$$, 'movimiento exige motivo');
select public._t_eq((select on_hand from public.inventory_levels where product_id = (select id from public.products where sku='TEST-001')), 3, 'existencia física = 3');
select public.register_intake('INT-100', 'Repuesto recién llegado', 4, 'Estante A-3', 'Recepción OC-1', null, 'int-100');
select public._t_eq((select count(*) from public.products where sku = 'INT-100' and status = 'draft'), 1, 'ingreso crea borrador (no publica)');
reset role;

-- 4. Revisor publica; anónimo ve el catálogo pero no tablas internas
select public._t_as('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
update public.products set status = 'published' where sku = 'TEST-001';
update public.product_costs set cost = 42 where product_id = (select id from public.products where sku='TEST-001');
select public._t_err($$update public.products set status='published' where sku='INT-100'$$, 'no se publica sin categoría');
reset role;

select public._t_as(null);
set local role anon;
select public._t_eq((select count(*) from public.catalog_products where sku = 'TEST-001'), 1, 'anónimo ve producto publicado');
select public._t_eq((select count(*) from public.catalog_products where sku = 'INT-100'), 0, 'anónimo no ve borradores');
select public._t_err($$select * from public.products$$, 'anónimo no lee tabla products');
select public._t_err($$select * from public.product_costs$$, 'anónimo no lee costos');
select public._t_err($$select * from public.inventory_levels$$, 'anónimo no lee existencias');
select public._t_err($$select * from public.orders$$, 'anónimo no lee pedidos');
select public._t_err($$update public.catalog_products set price = 1$$, 'anónimo no modifica precios');

-- 5. Pedido: valida precio en servidor, reserva y evita sobreventa
select public._t_err($$select public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.catalog_products where sku='TEST-001'), 'quantity', 4)), '{"name":"Cliente","email":"c@x.com","phone":"1"}')$$, 'no se vende más de lo disponible');
select public.create_order(
  jsonb_build_array(jsonb_build_object('product_id', (select id from public.catalog_products where sku='TEST-001'), 'quantity', 2, 'price', 0.01)),
  '{"name":"Cliente","email":"C@X.com","phone":"555"}');
select public._t_err($$select public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.catalog_products where sku='TEST-001'), 'quantity', 2)), '{"name":"Cliente","email":"c@x.com","phone":"1"}')$$, 'reserva descuenta disponibilidad');
select public.create_quote(
  jsonb_build_array(jsonb_build_object('product_id', (select id from public.catalog_products where sku='TEST-001'), 'quantity', 10)),
  '{"name":"Cliente","email":"q@x.com","phone":"555","notes":"Urgente"}');
reset role;
select set_config('t.num', (select number from public.orders limit 1), true);
set local role anon;
select public._t_eq((select count(*) from (select public.track_request(current_setting('t.num'), 'c@x.com') r) t where r is not null), 1, 'seguimiento con número + correo');
select public._t_eq((select count(*) from (select public.track_request(current_setting('t.num'), 'otro@x.com') r) t where r is not null), 0, 'seguimiento rechaza otro correo');
reset role;

select public._t_eq((select total::bigint from public.orders limit 1), 200, 'total calculado con precio del servidor (2 x 100)');
select public._t_eq((select reserved from public.inventory_levels where product_id = (select id from public.products where sku='TEST-001')), 2, 'reserva registrada');

-- 6. Almacén ve pedidos pero no cambia su estado; revisor despacha y consume reserva
select public._t_as('00000000-0000-0000-0000-0000000000b1');
set local role authenticated;
select public._t_eq((select count(*) from public.orders), 1, 'almacén ve pedidos');
select public._t_err($$select public.set_order_status((select id from public.orders limit 1), 'shipped')$$, 'almacén no cambia estado de pedido');
select public._t_err($$select public.record_inventory_movement((select id from public.products where sku='TEST-001'), 'adjustment', 1, 'Conteo físico')$$, 'ajuste no baja de lo reservado');
reset role;

select public._t_as('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select public.set_order_status((select id from public.orders limit 1), 'confirmed', 'Disponibilidad confirmada');
select public.set_order_payment((select id from public.orders limit 1), 'paid', 'Transferencia verificada');
select public.set_order_status((select id from public.orders limit 1), 'shipped');
select public._t_err($$select public.set_order_status((select id from public.orders limit 1), 'cancelled')$$, 'no se cancela un pedido despachado');
reset role;
select public._t_eq((select on_hand from public.inventory_levels where product_id = (select id from public.products where sku='TEST-001')), 1, 'despacho descuenta existencia física');
select public._t_eq((select reserved from public.inventory_levels where product_id = (select id from public.products where sku='TEST-001')), 0, 'despacho libera reserva');
select public._t_eq((select count(*) from public.inventory_movements where product_id = (select id from public.products where sku='TEST-001')), 3, 'movimientos: entrada, reserva, venta');
select public._t_eq((select count(*) from public.audit_log where entity = 'products'), 3, 'auditoría registra cambios de producto');
select public._t_eq((select count(*) from public.audit_log where entity = 'product_costs' and details::text like '%42%'), 0, 'auditoría no expone valor del costo');

rollback;
\echo 'TODAS LAS PRUEBAS PASARON'
