# Delivery Checkout

## Purpose

F4.4B inserts an explicit delivery-confirmation step between cart validation and trusted checkout. Opening or cancelling the modal never creates an order.

## Mi Cuenta Default Address

Mi cuenta keeps its existing name, phone, email, and role loading independent from delivery defaults. The optional default-address form reads and updates only the four `default_delivery_*` profile columns through the existing own-profile RLS rule. Until F4.4A is deployed, its unavailable-column failure is isolated and does not make the account unusable.

## Checkout Confirmation

Authenticated checkout opens an accessible modal showing read-only profile name and phone plus editable city, neighborhood, address, and instructions. City and address are required. The save-default checkbox is explicit and starts unchecked. Cancellation preserves the cart and does not call the RPC.

## Required Fields

- City or municipality: 2–120 trimmed characters.
- Delivery address: 5–250 trimmed characters.

Neighborhood (up to 120) and instructions (up to 500) are optional. Client validation improves feedback only; the deployed RPC is authoritative.

## Save as Default

The checkout checkbox is sent as `p_save_as_default`. The browser does not pre-save the address: the future four-argument RPC saves the default atomically only after a successful order.

## New RPC Contract

```text
create_order_from_cart(p_items, p_client_request_id, p_delivery, p_save_as_default)
```

`p_items` contains only code and quantity. `p_delivery` contains only city, neighborhood, address, and instructions. No price, total, user, role, status, order number, or points value is client authority. There is no two-argument fallback.

## Trusted Delivery Snapshot

The confirmed normalized delivery payload is supplied to the backend for the order snapshot and retained in the successful checkout result context for F6.1. WhatsApp still opens only after database success.

## Idempotency Fingerprint

The pending request fingerprint includes sorted code/quantity pairs, normalized delivery values, and the save-default choice. The same payload reuses its UUID; a changed delivery or save choice receives a new UUID.

## Retry Behavior

After an uncertain request outcome, the cart and pending session-scoped request data remain. Reconfirming the same payload retries with the same UUID. Successful checkout and intentional cancellation clear the pending technical state.

## Legacy Orders

Order history and admin order details display stored delivery snapshots. Orders without `delivery_address`, including pre-F4.4 history, show “Sin información de entrega registrada.”

## User Purchase History

The user order query includes only its own RLS-authorized delivery snapshot fields and renders them only in order details.

## Admin Order Details

The existing admin order-detail query includes the delivery snapshot for fulfillment. Summary cards do not expose full addresses.

## Privacy

Addresses are not placed in localStorage, URLs, query parameters, logs, or analytics. Session storage holds a pending normalized delivery payload only to support idempotent retry, and is cleared on success, intentional cancellation, or sign-out.

## WhatsApp F6.1 Integration

F4.4B preserves the current WhatsApp handoff. F6.1 can use the confirmed delivery snapshot carried by the successful checkout context.

F6.1 reloads the persisted delivery snapshot through RLS before sending it to WhatsApp, so the in-memory confirmation is not message authority.
