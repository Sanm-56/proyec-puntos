-- F3.1 trusted catalog and orders foundation.
create table public.catalog_products (
  code text primary key, reference text not null unique, display_name text not null,
  category text not null check (category in ('bebidas','pasabocas','dulceria','galletas','hogar')),
  unit_price bigint not null check (unit_price > 0), active boolean not null default true,
  available boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.catalog_products enable row level security;
create policy "Active catalog read anon" on public.catalog_products for select to anon using (active);
create policy "Active catalog read authenticated" on public.catalog_products for select to authenticated using (active);
revoke insert, update, delete on public.catalog_products from anon, authenticated;
grant select on public.catalog_products to anon, authenticated;

create sequence public.order_number_seq start 1;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

create table public.orders (
 id uuid primary key default gen_random_uuid(), order_number text not null unique,
 user_id uuid references auth.users(id) on delete set null, client_request_id uuid not null,
 customer_name text not null, customer_phone text not null,
 status text not null default 'pending' check (status in ('pending','confirmed','preparing','completed','cancelled')),
 subtotal bigint not null check (subtotal >= 0), total bigint not null check (total >= 0),
 points_earned bigint not null default 0 check (points_earned >= 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (user_id, client_request_id)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_code text not null references public.catalog_products(code), product_reference text not null,
 product_name text not null, unit_price bigint not null check (unit_price > 0),
 quantity integer not null check (quantity > 0), line_total bigint generated always as (unit_price * quantity) stored,
 created_at timestamptz not null default now(), unique (order_id, product_code)
);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "Read own or admin orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());
create policy "Read own or admin order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_admin())));
revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
create trigger set_catalog_products_updated_at before update on public.catalog_products for each row execute function public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

insert into public.catalog_products
  (code, reference, display_name, category, unit_price, active, available)
values
  ('BEB-001', 'gaseosa250ml', '250mlx24uni', 'bebidas', 20800, true, true),
  ('BEB-002', 'gaseosa400ml', '400mlx24uni', 'bebidas', 25800, true, true),
  ('BEB-003', 'gaseosa1l', '1lx12uni', 'bebidas', 24000, true, true),
  ('BEB-004', 'gaseosa1.7l', '1.7L x 6uni', 'bebidas', 18500, true, true),
  ('BEB-005', 'jugos250ml', '250mlx24uni', 'bebidas', 10500, true, true),
  ('BEB-006', 'jugos400ml', '400mlx24uni', 'bebidas', 13000, true, true),
  ('BEB-007', 'jugos1.7l', '1.7L x 6uni', 'bebidas', 18500, true, true),
  ('BEB-008', 'jugos200ml', '200mlx24uni', 'bebidas', 19500, true, true),
  ('BEB-009', 'aguanatur600ml', '600ml x 20uni', 'bebidas', 16500, true, true),
  ('DUL-001', 'minichicle', 'tarrox150uni', 'dulceria', 25000, true, true),
  ('DUL-002', 'chicledragon', 'tarrox100uni', 'dulceria', 29000, true, true),
  ('DUL-003', 'bolanis', 'tarrox100uni', 'dulceria', 8000, true, true),
  ('DUL-004', 'superhiperaci', 'cajax80uni', 'dulceria', 11500, true, true),
  ('DUL-005', 'molotov', 'bolsax100uni', 'dulceria', 11500, true, true),
  ('DUL-006', 'mallapolvo', 'bolsax15uni', 'dulceria', 7200, true, true),
  ('DUL-007', 'pintaleng', 'bolsax30uni', 'dulceria', 8200, true, true),
  ('DUL-008', 'vasoare', 'cajax12uni', 'dulceria', 8600, true, true),
  ('DUL-009', 'chuleche', 'bolsax50uni', 'dulceria', 7500, true, true),
  ('DUL-010', 'chucora', 'bolsax50uni', 'dulceria', 7500, true, true),
  ('DUL-011', 'mora', 'tarrox100uni', 'dulceria', 8000, true, true),
  ('DUL-012', 'pitisor', 'bolsax24uni', 'dulceria', 8000, true, true),
  ('DUL-013', 'truehue', 'cajaX24uni', 'dulceria', 24000, true, true),
  ('DUL-014', 'trueleta', 'cajaX24uni', 'dulceria', 15000, true, true),
  ('DUL-015', 'truepop', 'cajax50uni', 'dulceria', 12500, true, true),
  ('DUL-016', 'truepopsod', 'bolsax60uni', 'dulceria', 15000, true, true),
  ('DUL-017', 'palitaci', 'tarrox90uni', 'dulceria', 8000, true, true),
  ('DUL-018', 'bolalmen', 'tarrox100uni', 'dulceria', 8000, true, true),
  ('DUL-019', 'paneleche', 'tarrox50uni', 'dulceria', 8000, true, true),
  ('DUL-020', 'panecoco', 'tarrox50uni', 'dulceria', 8000, true, true),
  ('DUL-021', 'gelaplay25', 'bolsax25uni', 'dulceria', 8000, true, true),
  ('DUL-022', 'chuponluz', 'cajaX24uni', 'dulceria', 26000, true, true),
  ('DUL-023', 'gelaplay90', 'tarrox90uni', 'dulceria', 30500, true, true),
  ('DUL-024', 'bocavele', 'bolsax36uni', 'dulceria', 16400, true, true),
  ('DUL-025', 'barrile', 'bolsax40uni', 'dulceria', 11000, true, true),
  ('DUL-026', 'combi', 'cajaX16uni', 'dulceria', 8000, true, true),
  ('DUL-027', 'menthel', 'bolsax100uni', 'dulceria', 9800, true, true),
  ('DUL-028', 'chili', 'bolsax30uni', 'dulceria', 8300, true, true),
  ('DUL-029', 'tumixsur', 'cajax100uni', 'dulceria', 11400, true, true),
  ('DUL-030', 'labioroj', 'bolsax40uni', 'dulceria', 16500, true, true),
  ('DUL-031', 'bolon', 'tarrox30uni', 'dulceria', 12000, true, true),
  ('DUL-032', 'corcho', 'tarrox80uni', 'dulceria', 12500, true, true),
  ('DUL-033', 'candycere', 'cajax30uni', 'dulceria', 10000, true, true),
  ('DUL-034', 'chupon', 'bolsa', 'dulceria', 11300, true, true),
  ('DUL-035', 'tamarin', 'tarrox40uni', 'dulceria', 10000, true, true),
  ('DUL-036', 'bolamang', 'tarrox100uni', 'dulceria', 8000, true, true),
  ('DUL-037', 'pinpopsur', 'bolsax24uni', 'dulceria', 9800, true, true),
  ('DUL-038', 'gummyball', 'tarrox120uni', 'dulceria', 19000, true, true),
  ('DUL-039', 'geladrinks', 'bolsax20uni', 'dulceria', 19000, true, true),
  ('DUL-040', 'gelafluuup', 'bolsax25uni', 'dulceria', 17000, true, true),
  ('DUL-041', 'anilluz', 'cajaX24uni', 'dulceria', 26000, true, true),
  ('DUL-042', 'samgiasys', 'tarro x 30uni', 'dulceria', 27000, true, true),
  ('DUL-043', 'gelasor', 'tarro x 30uni', 'dulceria', 28000, true, true),
  ('DUL-044', 'chocoboom', 'caja x 30uni', 'dulceria', 12000, true, true),
  ('DUL-045', 'superhot', 'bolsa x 24uni', 'dulceria', 10000, true, true),
  ('DUL-046', 'carameloacidodinosaurio', 'empaque 3g (1g x 3uni)', 'dulceria', 14000, true, true),
  ('DUL-047', 'candymanz', 'cajax30uni - Manzana', 'dulceria', 10000, true, true),
  ('DUL-048', 'candymora', 'cajax30uni - Mora', 'dulceria', 10000, true, true),
  ('GAL-001', 'galleblanc77', 'cajaX24uni', 'galletas', 35500, true, true),
  ('GAL-002', 'gallecoco', 'cajax50uni', 'galletas', 8500, true, true),
  ('GAL-003', 'galleriza', 'cajax50uni', 'galletas', 9500, true, true),
  ('GAL-004', 'gallepoki', 'bolsax12uni', 'galletas', 8000, true, true),
  ('GAL-005', 'herpos', 'cajax26uni', 'galletas', 12000, true, true),
  ('GAL-006', 'gomaemoji', 'caja x 45uni', 'galletas', 8000, true, true),
  ('GAL-007', 'galleneg77', 'cajaX24uni - Negro', 'galletas', 35500, true, true),
  ('GAL-008', 'galletafresa77', 'cajaX24uni - Fresa', 'galletas', 35500, true, true),
  ('GAL-009', 'pokivainilla', 'bolsax12uni - Vainilla', 'galletas', 8000, true, true),
  ('GAL-010', 'pokifresa', 'bolsax12uni - Fresa', 'galletas', 8000, true, true),
  ('GAL-011', 'pokilimon', 'bolsax12uni - Limon', 'galletas', 8000, true, true),
  ('GAL-012', 'pokichocolate', 'bolsax12uni - Chocolate', 'galletas', 8000, true, true),
  ('GAL-013', 'pokivainillablack', 'bolsax12uni - Vainilla black', 'galletas', 8000, true, true),
  ('HOG-001', 'esponjacero', 'paquetesx12uni', 'hogar', 22000, true, true),
  ('HOG-002', 'esponjamalla', 'paquetesx12uni', 'hogar', 10500, true, true),
  ('HOG-003', 'esponjarcoiris', 'paquetesx12uni', 'hogar', 10500, true, true),
  ('HOG-004', 'esponjoroplata', 'paquetesx12uni', 'hogar', 10500, true, true),
  ('HOG-005', 'platohondo', '14cmx12uni', 'hogar', 14000, true, true),
  ('HOG-006', 'platoredomedio', '18CMx12uni', 'hogar', 16000, true, true),
  ('HOG-007', 'platoredopeque', '10cmx12uni', 'hogar', 8500, true, true),
  ('PAS-001', 'charronespic', '18gx10uni', 'pasabocas', 16500, true, true),
  ('PAS-002', 'nachopic', '25gx12uni', 'pasabocas', 12000, true, true),
  ('PAS-003', 'nachoque', '25gx12uni', 'pasabocas', 12000, true, true),
  ('PAS-004', 'bolique', '8gx24uni', 'pasabocas', 9500, true, true),
  ('PAS-005', 'toclim', '20gx12uni', 'pasabocas', 12000, true, true),
  ('PAS-006', 'troclim', '15gx12uni', 'pasabocas', 4500, true, true),
  ('PAS-007', 'gritsnat9', '9gx12uni', 'pasabocas', 4500, true, true),
  ('PAS-008', 'gristcara33', '33gx12uni', 'pasabocas', 10200, true, true),
  ('PAS-009', 'gritsque50', '50gx6uni', 'pasabocas', 7500, true, true),
  ('PAS-010', 'gritscara70', '70gx6uni', 'pasabocas', 9000, true, true),
  ('PAS-011', 'rulizz', '35gx18uni', 'pasabocas', 26000, true, true),
  ('PAS-012', 'lissitazlimon', '10x24uni', 'pasabocas', 9500, true, true),
  ('PAS-013', 'tradi', '20gx12uni', 'pasabocas', 12000, true, true),
  ('PAS-014', 'mix', '20gx12uni', 'pasabocas', 12000, true, true),
  ('PAS-015', 'tostolim', '30gx12uni', 'pasabocas', 12000, true, true),
  ('PAS-016', 'kikecitos', '22g x 12uni', 'pasabocas', 9000, true, true),
  ('PAS-017', 'gritspol9', '9gx12uni - Pollo', 'pasabocas', 4500, true, true),
  ('PAS-018', 'gritscara9', '9gx12uni - Caramelo', 'pasabocas', 4500, true, true),
  ('PAS-019', 'gritspic9', '9gx12uni - Picante', 'pasabocas', 4500, true, true),
  ('PAS-020', 'gritspic33', '33gx12uni - Picante', 'pasabocas', 10200, true, true),
  ('PAS-021', 'gritsque33', '33gx12uni - Queso', 'pasabocas', 10200, true, true),
  ('PAS-022', 'gritsnat33', '33gx12uni - Natural', 'pasabocas', 10200, true, true),
  ('PAS-023', 'gritsnat50', '50gx6uni - Natural', 'pasabocas', 7500, true, true),
  ('PAS-024', 'tocpic', '20gx12uni - Picante', 'pasabocas', 12000, true, true),
  ('PAS-025', 'tocmie', '20gx12uni - Miel', 'pasabocas', 12000, true, true),
  ('PAS-026', 'trocpic', '15gx12uni - Picante', 'pasabocas', 4500, true, true),
  ('PAS-027', 'trocpol', '15gx12uni - Pollo', 'pasabocas', 4500, true, true),
  ('PAS-028', 'tostomadu', '30gx12uni - Maduro', 'pasabocas', 12000, true, true),
  ('PAS-029', 'lissitazbbq', '10x24uni - BBQ', 'pasabocas', 9500, true, true),
  ('PAS-030', 'lissitazhotchilli', '10x24uni - Hot chilli', 'pasabocas', 9500, true, true),
  ('PAS-031', 'lissitazmayonesa', '10x24uni - Mayonesa', 'pasabocas', 9500, true, true),
  ('PAS-032', 'lissitazpollo', '10x24uni - Pollo', 'pasabocas', 9500, true, true)
;


create or replace function public.create_order_from_cart(p_items jsonb, p_client_request_id uuid)
returns table(order_id uuid, order_number text, subtotal bigint, total bigint, status text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_order public.orders%rowtype; v_subtotal bigint;
  v_name text; v_phone text; v_raw_count integer; v_distinct_count integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_client_request_id is null then raise exception 'INVALID_REQUEST_ID'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'INVALID_CART'; end if;
  select * into v_order from public.orders where user_id = v_user_id and client_request_id = p_client_request_id;
  if found then return query select v_order.id,v_order.order_number,v_order.subtotal,v_order.total,v_order.status; return; end if;
  select full_name,phone into v_name,v_phone from public.profiles where id=v_user_id;
  if v_name is null or nullif(trim(v_name),'') is null or v_phone is null or nullif(trim(v_phone),'') is null then raise exception 'PROFILE_INCOMPLETE'; end if;
  create temporary table order_cart_input (code text primary key, quantity integer) on commit drop;
  begin
    insert into order_cart_input(code,quantity)
    select item->>'code', sum((item->>'quantity')::integer)
    from jsonb_array_elements(p_items) item
    where jsonb_typeof(item)='object' and jsonb_typeof(item->'code')='string' and jsonb_typeof(item->'quantity')='number'
      and (item->>'quantity') ~ '^[0-9]+$'
    group by item->>'code';
  exception when others then raise exception 'INVALID_CART'; end;
  select count(*) into v_raw_count from jsonb_array_elements(p_items);
  select count(*) into v_distinct_count from order_cart_input;
  if v_distinct_count = 0 or exists (select 1 from jsonb_array_elements(p_items) item where jsonb_typeof(item)<>'object' or jsonb_typeof(item->'code')<>'string' or jsonb_typeof(item->'quantity')<>'number' or not ((item->>'quantity') ~ '^[0-9]+$')) then raise exception 'INVALID_CART'; end if;
  if exists (select 1 from order_cart_input where code !~ '^[A-Z]{3}-[0-9]{3}$' or quantity < 1 or quantity > 999) then raise exception 'INVALID_QUANTITY'; end if;
  if exists (select 1 from order_cart_input c left join public.catalog_products p on p.code=c.code where p.code is null) then raise exception 'UNKNOWN_PRODUCT'; end if;
  if exists (select 1 from order_cart_input c join public.catalog_products p on p.code=c.code where not p.active) then raise exception 'PRODUCT_INACTIVE'; end if;
  if exists (select 1 from order_cart_input c join public.catalog_products p on p.code=c.code where not p.available) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  select sum(c.quantity*p.unit_price) into v_subtotal from order_cart_input c join public.catalog_products p on p.code=c.code;
  begin
    insert into public.orders(order_number,user_id,client_request_id,customer_name,customer_phone,status,subtotal,total,points_earned)
    values ('GO-' || lpad(nextval('public.order_number_seq')::text,6,'0'),v_user_id,p_client_request_id,v_name,v_phone,'pending',v_subtotal,v_subtotal,0)
    returning * into v_order;
  exception when unique_violation then
    select * into v_order from public.orders where user_id=v_user_id and client_request_id=p_client_request_id;
    return query select v_order.id,v_order.order_number,v_order.subtotal,v_order.total,v_order.status; return;
  end;
  insert into public.order_items(order_id,product_code,product_reference,product_name,unit_price,quantity)
  select v_order.id,p.code,p.reference,p.display_name,p.unit_price,c.quantity from order_cart_input c join public.catalog_products p on p.code=c.code;
  return query select v_order.id,v_order.order_number,v_order.subtotal,v_order.total,v_order.status;
end;
$$;
revoke all on function public.create_order_from_cart(jsonb, uuid) from public, anon;
grant execute on function public.create_order_from_cart(jsonb, uuid) to authenticated;

