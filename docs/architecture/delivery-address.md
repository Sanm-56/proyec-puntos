# Delivery Address

## Purpose

F4.4 adds a delivery-address foundation to trusted checkout. The reusable profile address is convenience data; the order keeps its own immutable delivery snapshot for operational and historical use.

## Default Profile Address

`public.profiles` stores nullable default values for city, neighborhood, address, and instructions. A user may have no default address, save one during a successful checkout, or change it later through the existing own-profile update model.

## Historical Order Snapshot

`public.orders` stores `delivery_city`, `delivery_neighborhood`, `delivery_address`, and `delivery_instructions` for each new order. The checkout RPC copies validated values into the order, so later changes to profile defaults never change a historical order.

## Legacy Orders

Orders created before F4.4, including `GO-000001`, retain null delivery fields. They are valid historical records and later UI should display “Sin información de entrega registrada”; no synthetic address is backfilled.

## Checkout RPC

The new checkout contract is:

```text
create_order_from_cart(
  p_items jsonb,
  p_client_request_id uuid,
  p_delivery jsonb,
  p_save_as_default boolean
)
```

After deployment, the old two-argument signature is not executable by browser roles, preventing delivery-validation bypasses.

## Required Delivery Fields

- `city`: trimmed text from 2 through 120 characters.
- `address`: trimmed text from 5 through 250 characters.

## Optional Delivery Fields

- `neighborhood`: trimmed text up to 120 characters.
- `instructions`: trimmed text up to 500 characters.

Normal address punctuation, including `#`, `-`, `.`, and `/`, is preserved. Unknown delivery keys and non-text field values are rejected.

## Save as Default

When `p_save_as_default` is true, the same successful checkout transaction updates only `profiles.id = auth.uid()` with the validated values. A false value leaves profile defaults unchanged.

## Idempotency

The existing `(user_id, client_request_id)` uniqueness contract remains authoritative. A retry returns the original order and does not overwrite its saved delivery snapshot or profile defaults.

## Security

The RPC obtains the user from `auth.uid()` and derives name, phone, catalog validity, availability, unit prices, totals, initial status, and points server-side. Browser input has no authority over user identity, prices, totals, status, order number, or points. Browser roles receive no direct order writes.

## WhatsApp Integration

F6.1 will use the persisted order delivery snapshot when building customer-service WhatsApp messages.
