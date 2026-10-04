# Secure Order Management

## Scope

F4.3 permits an authenticated administrator to move an existing order through its operational status flow from the existing administration dashboard. It does not add payments, refunds, order editing, product editing, loyalty changes, or role management.

## Server Authority

`public.admin_update_order_status(p_order_number text, p_new_status text)` is the only browser mutation path. It is a `SECURITY DEFINER` PostgreSQL function with `search_path` set to the empty string and fully qualified application references.

The function requires both a non-null `auth.uid()` and `public.is_admin()`. It locks the target order with `FOR UPDATE`, validates the requested status, and returns the authoritative stored result: order number, old status, new status, `updated_at`, and whether a row changed.

`anon` and `public` have no execute privilege. Only `authenticated` has execute privilege. The authenticated role does not receive direct `UPDATE` on `public.orders`; RLS remains the authorization boundary for all direct table access.

## Transition Contract

- `pending` -> `confirmed` or `cancelled`
- `confirmed` -> `preparing` or `cancelled`
- `preparing` -> `completed` or `cancelled`
- `completed` and `cancelled` are terminal

Requesting the existing status is idempotent and returns `changed = false`. Invalid, skipped, reverse, terminal, unknown-order, unauthenticated, and non-admin requests are rejected by the database.

## Dashboard Behaviour

`js/admin/order-management.js` calls only `supabase.rpc('admin_update_order_status', ...)`; it never calls `.from('orders').update(...)`. The dashboard renders only permitted next actions, confirms cancellation, disables that card's status actions while the request runs, maps expected failures to safe Spanish text, and refreshes the summary and order list from the server result.

Client-side admin checks and available-action rendering are usability controls. They are not permission controls: forged browser calls still require the RPC's server-side authentication, role check, locked transition validation, function privilege, and RLS-protected data access.

## Concurrency and Limitations

The row lock serializes concurrent status changes for the same order. A stale dashboard request is validated against the latest locked status and is rejected if its transition is no longer legal. Status changes are not separately audited in this phase; the `orders.updated_at` value records the most recent change.
