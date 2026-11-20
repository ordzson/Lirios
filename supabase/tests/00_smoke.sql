-- 00 · Prueba de humo (Oleada 0, paso 0-T; dueño: T).
-- Solo comprueba que `pnpm run db:test` llega a la base local con pgTAP y que
-- las tablas de la migración inicial (que no se modifica, PLAN.md §4.1) existen.
-- Las pruebas del catálogo (§9.3, DB-01..54) van en sus propios archivos.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select ok(true, 'pgTAP corre en la base local');
select has_table('public', 'products', 'existe public.products (migración inicial)');
select has_table('public', 'orders', 'existe public.orders (migración inicial)');
select has_function('public', 'create_order', array['jsonb'], 'existe public.create_order(jsonb)');

select * from finish();
rollback;
