create or replace function public.admin_update_order_status(
  p_order_number text,
  p_new_status text
)
returns table(
  order_number text,
  old_status text,
  new_status text,
  updated_at timestamptz,
  changed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_old_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not (select public.is_admin()) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if nullif(trim(p_order_number), '') is null then
    raise exception 'INVALID_ORDER_NUMBER';
  end if;

  if p_new_status not in ('pending', 'confirmed', 'preparing', 'completed', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into v_order
  from public.orders
  where public.orders.order_number = p_order_number
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  v_old_status := v_order.status;

  if v_old_status = p_new_status then
    return query
    select v_order.order_number, v_old_status, v_order.status, v_order.updated_at, false;
    return;
  end if;

  if not (
    (v_old_status = 'pending' and p_new_status in ('confirmed', 'cancelled'))
    or (v_old_status = 'confirmed' and p_new_status in ('preparing', 'cancelled'))
    or (v_old_status = 'preparing' and p_new_status in ('completed', 'cancelled'))
  ) then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.orders
  set status = p_new_status
  where public.orders.id = v_order.id
  returning * into v_order;

  return query
  select v_order.order_number, v_old_status, v_order.status, v_order.updated_at, true;
end;
$$;

revoke all on function public.admin_update_order_status(text, text) from public, anon;
grant execute on function public.admin_update_order_status(text, text) to authenticated;
