#!/usr/bin/env bash
# Prueba de concurrencia: N clientes compran simultáneamente la ÚLTIMA unidad.
# Debe confirmarse exactamente un pedido y la existencia nunca debe quedar negativa.
# Uso: PSQL="psql -h host -U postgres -d db" ./supabase/tests/concurrency.sh
set -euo pipefail
PSQL=${PSQL:?Defina PSQL}
N=${N:-20}
$PSQL -q -v ON_ERROR_STOP=1 <<'SQL'
insert into public.products (sku, slug, name, category_id, sale_mode, price, status)
select 'CONC-1', 'conc-1', 'Producto concurrencia', id, 'direct', 50, 'published' from public.categories limit 1;
update public.inventory_levels set on_hand = 1 where product_id = (select id from public.products where sku = 'CONC-1');
SQL
PID=$($PSQL -tAq -c "select id from public.products where sku='CONC-1'")
for i in $(seq 1 "$N"); do
  $PSQL -tAq -c "set role anon; select public.create_order('[{\"product_id\":\"$PID\",\"quantity\":1}]', '{\"name\":\"C$i\",\"email\":\"c$i@x.com\",\"phone\":\"1\"}')" >/dev/null 2>&1 &
done
wait
RESULT=$($PSQL -tAq -c "select (select count(*) from public.orders o join public.order_items i on i.order_id=o.id where i.product_id='$PID') || ' ' || on_hand || ' ' || reserved from public.inventory_levels where product_id='$PID'")
$PSQL -q -c "delete from public.orders where id in (select order_id from public.order_items where product_id='$PID'); delete from public.products where sku='CONC-1';"
echo "pedidos/on_hand/reserved = $RESULT"
[ "$RESULT" = "1 1 1" ] && echo "OK concurrencia: un solo pedido para la última unidad" || { echo "FALLO concurrencia"; exit 1; }
