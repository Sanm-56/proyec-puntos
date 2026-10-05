create table public.loyalty_settings (
  id smallint primary key check (id = 1),
  cop_amount bigint not null check (cop_amount > 0),
  points_amount bigint not null check (points_amount > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.loyalty_settings (id, cop_amount, points_amount, enabled)
values (1, 1000, 1, true);

create table public.loyalty_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  transaction_type text not null check (transaction_type = 'order_earned'),
  points bigint not null check (points > 0),
  description text,
  created_at timestamptz not null default now(),
  unique (order_id, transaction_type)
);

create index loyalty_transactions_user_created_at_idx
  on public.loyalty_transactions (user_id, created_at desc);

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;

create policy "Anyone can read loyalty settings"
on public.loyalty_settings for select
to anon, authenticated
using (id = 1);

create policy "Users or administrators can read loyalty accounts"
on public.loyalty_accounts for select
to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "Users or administrators can read loyalty transactions"
on public.loyalty_transactions for select
to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()));

revoke all on table public.loyalty_settings from public, anon, authenticated;
revoke all on table public.loyalty_accounts from public, anon, authenticated;
revoke all on table public.loyalty_transactions from public, anon, authenticated;
grant select on table public.loyalty_settings to anon, authenticated;
grant select on table public.loyalty_accounts to authenticated;
grant select on table public.loyalty_transactions to authenticated;

create trigger set_loyalty_settings_updated_at
before update on public.loyalty_settings
for each row execute function public.set_updated_at();

create trigger set_loyalty_accounts_updated_at
before update on public.loyalty_accounts
for each row execute function public.set_updated_at();

create or replace function public.create_order_from_cart(
  p_items jsonb,
  p_client_request_id uuid,
  p_delivery jsonb,
  p_save_as_default boolean
)
returns table(order_id uuid, order_number text, subtotal bigint, total bigint, status text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_order public.orders%rowtype; v_subtotal bigint;
  v_name text; v_phone text; v_distinct_count integer;
  v_city text; v_neighborhood text; v_address text; v_instructions text;
  v_cop_amount bigint; v_points_amount bigint; v_loyalty_enabled boolean; v_calculated_points bigint := 0;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_client_request_id is null then raise exception 'INVALID_REQUEST_ID'; end if;
  select * into v_order from public.orders where user_id = v_user_id and client_request_id = p_client_request_id;
  if found then return query select v_order.id, v_order.order_number, v_order.subtotal, v_order.total, v_order.status; return; end if;
  if p_delivery is null or jsonb_typeof(p_delivery) <> 'object' or exists (select 1 from jsonb_object_keys(p_delivery) as key_name(key) where key_name.key not in ('city', 'neighborhood', 'address', 'instructions')) then raise exception 'DELIVERY_REQUIRED'; end if;
  if (p_delivery ? 'city' and jsonb_typeof(p_delivery -> 'city') not in ('string', 'null')) or (p_delivery ? 'neighborhood' and jsonb_typeof(p_delivery -> 'neighborhood') not in ('string', 'null')) or (p_delivery ? 'address' and jsonb_typeof(p_delivery -> 'address') not in ('string', 'null')) or (p_delivery ? 'instructions' and jsonb_typeof(p_delivery -> 'instructions') not in ('string', 'null')) then raise exception 'DELIVERY_REQUIRED'; end if;
  v_city := nullif(trim(p_delivery ->> 'city'), ''); v_neighborhood := nullif(trim(p_delivery ->> 'neighborhood'), ''); v_address := nullif(trim(p_delivery ->> 'address'), ''); v_instructions := nullif(trim(p_delivery ->> 'instructions'), '');
  if v_city is null or char_length(v_city) < 2 or char_length(v_city) > 120 then raise exception 'DELIVERY_CITY_INVALID'; end if;
  if v_address is null or char_length(v_address) < 5 or char_length(v_address) > 250 then raise exception 'DELIVERY_ADDRESS_INVALID'; end if;
  if v_neighborhood is not null and char_length(v_neighborhood) > 120 then raise exception 'DELIVERY_NEIGHBORHOOD_INVALID'; end if;
  if v_instructions is not null and char_length(v_instructions) > 500 then raise exception 'DELIVERY_INSTRUCTIONS_INVALID'; end if;
  if p_save_as_default is null then raise exception 'INVALID_SAVE_AS_DEFAULT'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'INVALID_CART'; end if;
  select full_name, phone into v_name, v_phone from public.profiles where id = v_user_id;
  if v_name is null or nullif(trim(v_name), '') is null or v_phone is null or nullif(trim(v_phone), '') is null then raise exception 'PROFILE_INCOMPLETE'; end if;
  create temporary table order_cart_input (code text primary key, quantity integer) on commit drop;
  begin
    insert into order_cart_input(code, quantity)
    select item ->> 'code', sum((item ->> 'quantity')::integer)
    from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item) = 'object' and jsonb_typeof(item -> 'code') = 'string' and jsonb_typeof(item -> 'quantity') = 'number' and (item ->> 'quantity') ~ '^[0-9]+$'
    group by item ->> 'code';
  exception when others then raise exception 'INVALID_CART'; end;
  select count(*) into v_distinct_count from order_cart_input;
  if v_distinct_count = 0 or exists (select 1 from jsonb_array_elements(p_items) as item where jsonb_typeof(item) <> 'object' or jsonb_typeof(item -> 'code') <> 'string' or jsonb_typeof(item -> 'quantity') <> 'number' or not ((item ->> 'quantity') ~ '^[0-9]+$')) then raise exception 'INVALID_CART'; end if;
  if exists (select 1 from order_cart_input where code !~ '^[A-Z]{3}-[0-9]{3}$' or quantity < 1 or quantity > 999) then raise exception 'INVALID_QUANTITY'; end if;
  if exists (select 1 from order_cart_input as cart left join public.catalog_products as product on product.code = cart.code where product.code is null) then raise exception 'UNKNOWN_PRODUCT'; end if;
  if exists (select 1 from order_cart_input as cart join public.catalog_products as product on product.code = cart.code where not product.active) then raise exception 'PRODUCT_INACTIVE'; end if;
  if exists (select 1 from order_cart_input as cart join public.catalog_products as product on product.code = cart.code where not product.available) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  select sum(cart.quantity * product.unit_price) into v_subtotal from order_cart_input as cart join public.catalog_products as product on product.code = cart.code;
  select cop_amount, points_amount, enabled into v_cop_amount, v_points_amount, v_loyalty_enabled from public.loyalty_settings where id = 1;
  if not found then raise exception 'LOYALTY_SETTINGS_UNAVAILABLE'; end if;
  if v_loyalty_enabled then v_calculated_points := floor((v_subtotal::numeric * v_points_amount::numeric) / v_cop_amount::numeric)::bigint; end if;
  begin
    insert into public.orders(order_number, user_id, client_request_id, customer_name, customer_phone, status, subtotal, total, points_earned, delivery_city, delivery_neighborhood, delivery_address, delivery_instructions)
    values ('GO-' || lpad(nextval('public.order_number_seq')::text, 6, '0'), v_user_id, p_client_request_id, v_name, v_phone, 'pending', v_subtotal, v_subtotal, v_calculated_points, v_city, v_neighborhood, v_address, v_instructions)
    returning * into v_order;
  exception when unique_violation then
    select * into v_order from public.orders where user_id = v_user_id and client_request_id = p_client_request_id;
    return query select v_order.id, v_order.order_number, v_order.subtotal, v_order.total, v_order.status; return;
  end;
  insert into public.order_items(order_id, product_code, product_reference, product_name, unit_price, quantity)
  select v_order.id, product.code, product.reference, product.display_name, product.unit_price, cart.quantity from order_cart_input as cart join public.catalog_products as product on product.code = cart.code;
  if p_save_as_default then update public.profiles set default_delivery_city = v_city, default_delivery_neighborhood = v_neighborhood, default_delivery_address = v_address, default_delivery_instructions = v_instructions where id = v_user_id; end if;
  return query select v_order.id, v_order.order_number, v_order.subtotal, v_order.total, v_order.status;
end;
$$;

create or replace function public.admin_update_order_status(p_order_number text, p_new_status text)
returns table(order_number text, old_status text, new_status text, updated_at timestamptz, changed boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype; v_old_status text; v_awarded_points bigint;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not (select public.is_admin()) then raise exception 'ADMIN_REQUIRED'; end if;
  if nullif(trim(p_order_number), '') is null then raise exception 'INVALID_ORDER_NUMBER'; end if;
  if p_new_status not in ('pending', 'confirmed', 'preparing', 'completed', 'cancelled') then raise exception 'INVALID_STATUS'; end if;
  select * into v_order from public.orders where public.orders.order_number = p_order_number for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  v_old_status := v_order.status;
  if v_old_status = p_new_status then return query select v_order.order_number, v_old_status, v_order.status, v_order.updated_at, false; return; end if;
  if not ((v_old_status = 'pending' and p_new_status in ('confirmed', 'cancelled')) or (v_old_status = 'confirmed' and p_new_status in ('preparing', 'cancelled')) or (v_old_status = 'preparing' and p_new_status in ('completed', 'cancelled'))) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  update public.orders set status = p_new_status where public.orders.id = v_order.id returning * into v_order;
  if v_old_status = 'preparing' and p_new_status = 'completed' and v_order.user_id is not null and v_order.points_earned > 0 then
    insert into public.loyalty_transactions(user_id, order_id, transaction_type, points, description)
    values (v_order.user_id, v_order.id, 'order_earned', v_order.points_earned, 'Puntos ganados por pedido ' || v_order.order_number)
    on conflict (order_id, transaction_type) do nothing
    returning points into v_awarded_points;
    if found then
      insert into public.loyalty_accounts(user_id, balance, lifetime_earned)
      values (v_order.user_id, v_awarded_points, v_awarded_points)
      on conflict (user_id) do update
      set balance = public.loyalty_accounts.balance + excluded.balance,
          lifetime_earned = public.loyalty_accounts.lifetime_earned + excluded.lifetime_earned;
    end if;
  end if;
  return query select v_order.order_number, v_old_status, v_order.status, v_order.updated_at, true;
end;
$$;

create or replace function public.admin_update_loyalty_settings(p_cop_amount bigint, p_points_amount bigint, p_enabled boolean)
returns table(cop_amount bigint, points_amount bigint, enabled boolean, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not (select public.is_admin()) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_cop_amount is null or p_cop_amount <= 0 then raise exception 'INVALID_COP_AMOUNT'; end if;
  if p_points_amount is null or p_points_amount <= 0 then raise exception 'INVALID_POINTS_AMOUNT'; end if;
  if p_enabled is null then raise exception 'INVALID_LOYALTY_ENABLED'; end if;
  return query
  update public.loyalty_settings
  set cop_amount = p_cop_amount, points_amount = p_points_amount, enabled = p_enabled
  where id = 1
  returning loyalty_settings.cop_amount, loyalty_settings.points_amount, loyalty_settings.enabled, loyalty_settings.updated_at;
  if not found then raise exception 'LOYALTY_SETTINGS_UNAVAILABLE'; end if;
end;
$$;

revoke all on function public.create_order_from_cart(jsonb, uuid, jsonb, boolean) from public, anon;
grant execute on function public.create_order_from_cart(jsonb, uuid, jsonb, boolean) to authenticated;
revoke all on function public.admin_update_order_status(text, text) from public, anon;
grant execute on function public.admin_update_order_status(text, text) to authenticated;
revoke all on function public.admin_update_loyalty_settings(bigint, bigint, boolean) from public, anon;
grant execute on function public.admin_update_loyalty_settings(bigint, bigint, boolean) to authenticated;
