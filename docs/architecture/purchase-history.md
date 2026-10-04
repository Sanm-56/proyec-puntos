# Purchase History

## 1. Purpose

F3.3 adds an authenticated, read-only purchase history to Mi cuenta. It preserves the existing profile editor and checkout behavior.

## 2. Data Sources

The order list reads orders with only order number, creation date, status, subtotal, and total. Expanded details read order_items with the stored product snapshot fields.

## 3. Security

The browser uses the existing publishable-key client and authenticated JWT. It never supplies a user ID to the history queries. PostgreSQL RLS is the authorization boundary for own-order access; no service-role key, privileged RPC, or SECURITY DEFINER history read is used.

## 4. Order List

Orders are sorted by created_at descending. The initial request retrieves at most 20 summaries, plus one look-ahead row to decide whether to show Ver más.

## 5. Order Details

Details load only when a user expands an order. They show date, display-only status, subtotal, total, and item product name, reference, code, quantity, unit price, and line total. UUIDs and client request IDs are not rendered.

## 6. Historical Snapshots

Item values come from order_items, not the current catalog. This preserves the original name, reference, code, and price if products later change.

## 7. Pagination

The account module keeps the loaded page and detail cache only in memory for the active signed-in session. It never writes purchase history to localStorage.

## 8. Status Mapping

pending, confirmed, preparing, completed, and cancelled display as Pendiente, Confirmado, En preparación, Completado, and Cancelado. Database values are not changed.

## 9. Session Lifecycle

History loads only after a signed-in user selects Mis pedidos. Sign-out clears summaries, cached details, messages, and open details from memory; guests make no history query.

## 10. Error Handling

Loading uses safe Spanish status messages. Empty histories show “Aún no tienes pedidos registrados.” Read failures do not expose PostgREST errors and do not prevent profile viewing, editing, or sign-out.

## 11. Deferred Features

- Admin management
- User cancellation
- Reorder
- Loyalty balance
- Payments
