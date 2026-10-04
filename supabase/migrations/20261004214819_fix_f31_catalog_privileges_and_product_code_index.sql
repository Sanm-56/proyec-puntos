revoke all privileges on table public.catalog_products from anon, authenticated;
grant select on table public.catalog_products to anon, authenticated;

revoke all privileges on table public.orders, public.order_items from anon, authenticated;
grant select on table public.orders, public.order_items to authenticated;

revoke all privileges on sequence public.order_number_seq from anon, authenticated;

create index if not exists order_items_product_code_idx on public.order_items (product_code);
