alter table public.profiles
  add column if not exists default_delivery_city text null,
  add column if not exists default_delivery_neighborhood text null,
  add column if not exists default_delivery_address text null,
  add column if not exists default_delivery_instructions text null;

alter table public.orders
  add column if not exists delivery_city text null,
  add column if not exists delivery_neighborhood text null,
  add column if not exists delivery_address text null,
  add column if not exists delivery_instructions text null;

create or replace function public.create_order_from_cart(
  p_items jsonb,
  p_client_request_id uuid,
  p_delivery jsonb,
  p_save_as_default boolean
)
returns table(order_id uuid, order_number text, subtotal bigint, total bigint, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_subtotal bigint;
  v_name text;
  v_phone text;
  v_distinct_count integer;
  v_city text;
  v_neighborhood text;
  v_address text;
  v_instructions text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_client_request_id is null then
    raise exception 'INVALID_REQUEST_ID';
  end if;

  select *
  into v_order
  from public.orders
  where user_id = v_user_id
    and client_request_id = p_client_request_id;

  if found then
    return query
    select v_order.id, v_order.order_number, v_order.subtotal, v_order.total, v_order.status;
    return;
  end if;

  if p_delivery is null
    or jsonb_typeof(p_delivery) <> 'object'
    or exists (
      select 1
      from jsonb_object_keys(p_delivery) as delivery_key(key)
      where delivery_key.key not in ('city', 'neighborhood', 'address', 'instructions')
    ) then
    raise exception 'DELIVERY_REQUIRED';
  end if;

  if (p_delivery ? 'city' and jsonb_typeof(p_delivery -> 'city') not in ('string', 'null'))
    or (p_delivery ? 'neighborhood' and jsonb_typeof(p_delivery -> 'neighborhood') not in ('string', 'null'))
    or (p_delivery ? 'address' and jsonb_typeof(p_delivery -> 'address') not in ('string', 'null'))
    or (p_delivery ? 'instructions' and jsonb_typeof(p_delivery -> 'instructions') not in ('string', 'null')) then
    raise exception 'DELIVERY_REQUIRED';
  end if;

  v_city := nullif(trim(p_delivery ->> 'city'), '');
  v_neighborhood := nullif(trim(p_delivery ->> 'neighborhood'), '');
  v_address := nullif(trim(p_delivery ->> 'address'), '');
  v_instructions := nullif(trim(p_delivery ->> 'instructions'), '');

  if v_city is null or char_length(v_city) < 2 or char_length(v_city) > 120 then
    raise exception 'DELIVERY_CITY_INVALID';
  end if;

  if v_address is null or char_length(v_address) < 5 or char_length(v_address) > 250 then
    raise exception 'DELIVERY_ADDRESS_INVALID';
  end if;

  if v_neighborhood is not null and char_length(v_neighborhood) > 120 then
    raise exception 'DELIVERY_NEIGHBORHOOD_INVALID';
  end if;

  if v_instructions is not null and char_length(v_instructions) > 500 then
    raise exception 'DELIVERY_INSTRUCTIONS_INVALID';
  end if;

  if p_save_as_default is null then
    raise exception 'INVALID_SAVE_AS_DEFAULT';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'INVALID_CART';
  end if;

  select full_name, phone
  into v_name, v_phone
  from public.profiles
  where id = v_user_id;

  if v_name is null or nullif(trim(v_name), '') is null
    or v_phone is null or nullif(trim(v_phone), '') is null then
    raise exception 'PROFILE_INCOMPLETE';
  end if;

  create temporary table order_cart_input (code text primary key, quantity integer) on commit drop;

  begin
    insert into order_cart_input(code, quantity)
    select item ->> 'code', sum((item ->> 'quantity')::integer)
    from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item) = 'object'
      and jsonb_typeof(item -> 'code') = 'string'
      and jsonb_typeof(item -> 'quantity') = 'number'
      and (item ->> 'quantity') ~ '^[0-9]+$'
    group by item ->> 'code';
  exception when others then
    raise exception 'INVALID_CART';
  end;

  select count(*)
  into v_distinct_count
  from order_cart_input;

  if v_distinct_count = 0
    or exists (
      select 1
      from jsonb_array_elements(p_items) as item
      where jsonb_typeof(item) <> 'object'
        or jsonb_typeof(item -> 'code') <> 'string'
        or jsonb_typeof(item -> 'quantity') <> 'number'
        or not ((item ->> 'quantity') ~ '^[0-9]+$')
    ) then
    raise exception 'INVALID_CART';
  end if;

  if exists (
    select 1
    from order_cart_input
    where code !~ '^[A-Z]{3}-[0-9]{3}$'
      or quantity < 1
      or quantity > 999
  ) then
    raise exception 'INVALID_QUANTITY';
  end if;

  if exists (
    select 1
    from order_cart_input as cart
    left join public.catalog_products as product on product.code = cart.code
    where product.code is null
  ) then
    raise exception 'UNKNOWN_PRODUCT';
  end if;

  if exists (
    select 1
    from order_cart_input as cart
    join public.catalog_products as product on product.code = cart.code
    where not product.active
  ) then
    raise exception 'PRODUCT_INACTIVE';
  end if;

  if exists (
    select 1
    from order_cart_input as cart
    join public.catalog_products as product on product.code = cart.code
    where not product.available
  ) then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  select sum(cart.quantity * product.unit_price)
  into v_subtotal
  from order_cart_input as cart
  join public.catalog_products as product on product.code = cart.code;

  begin
    insert into public.orders(
      order_number,
      user_id,
      client_request_id,
      customer_name,
      customer_phone,
      status,
      subtotal,
      total,
      points_earned,
      delivery_city,
      delivery_neighborhood,
      delivery_address,
      delivery_instructions
    )
    values (
      'GO-' || lpad(nextval('public.order_number_seq')::text, 6, '0'),
      v_user_id,
      p_client_request_id,
      v_name,
      v_phone,
      'pending',
      v_subtotal,
      v_subtotal,
      0,
      v_city,
      v_neighborhood,
      v_address,
      v_instructions
    )
    returning * into v_order;
  exception when unique_violation then
    select *
    into v_order
    from public.orders
    where user_id = v_user_id
      and client_request_id = p_client_request_id;

    return query
    select v_order.id, v_order.order_number, v_order.subtotal, v_order.total, v_order.status;
    return;
  end;

  insert into public.order_items(
    order_id,
    product_code,
    product_reference,
    product_name,
    unit_price,
    quantity
  )
  select v_order.id, product.code, product.reference, product.display_name, product.unit_price, cart.quantity
  from order_cart_input as cart
  join public.catalog_products as product on product.code = cart.code;

  if p_save_as_default then
    update public.profiles
    set default_delivery_city = v_city,
        default_delivery_neighborhood = v_neighborhood,
        default_delivery_address = v_address,
        default_delivery_instructions = v_instructions
    where id = v_user_id;
  end if;

  return query
  select v_order.id, v_order.order_number, v_order.subtotal, v_order.total, v_order.status;
end;
$$;

revoke execute on function public.create_order_from_cart(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.create_order_from_cart(jsonb, uuid, jsonb, boolean) from public, anon;
grant execute on function public.create_order_from_cart(jsonb, uuid, jsonb, boolean) to authenticated;
