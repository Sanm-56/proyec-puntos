# Orders Database

## Purpose

F3.1 creates the server-side foundation for persisted orders. HTML remains the storefront source; PostgreSQL is the trusted persistence and price authority.

## Trusted Catalog

`catalog_products` mirrors the 109 stable codes with reference, display name, category, integer COP unit price, `active`, and `available`. Active means the identity remains catalogued; available means it can currently be ordered.

## Orders and Items

`orders` stores server-generated `GO-000001` numbers, profile name/phone snapshots, status, totals, and a request ID. `order_items` snapshots reference, name, and price so later catalog changes do not alter history.

## create_order_from_cart

The authenticated browser sends only a request UUID and item `code` plus `quantity`. The function derives user/profile, prices, availability, status, totals, and points from database state. Prices shown by the browser are informational only.

## Security

RLS permits active catalog reads and own/admin order reads. Browser roles have no direct order mutations. The RPC is SECURITY DEFINER with an empty fixed search path, requires `auth.uid()`, and is executable only by `authenticated`.

## Idempotency and Status

`unique(user_id, client_request_id)` prevents duplicate checkout creation; retries return the existing order. Initial status is `pending`; supported lifecycle states are confirmed, preparing, completed, and cancelled. Points remain zero until F5.1.

## F3.2 Contract

```json
{ "client_request_id": "UUID", "items": [{ "code": "BEB-001", "quantity": 2 }] }
```
