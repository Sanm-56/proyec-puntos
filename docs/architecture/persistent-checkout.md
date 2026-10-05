# Persistent Checkout

F3.2 connects the existing cart to the F3.1 order RPC without replacing the static catalog, cart UI, localStorage persistence, or WhatsApp service.

## Browser request

js/orders/orders.js maps each legacy cart nombre through GoTienda.products.getByReference(). After delivery confirmation, the browser sends only item code/quantity, a client request UUID, normalized delivery fields, and an explicit save-default boolean through the four-argument `create_order_from_cart` RPC. It does not send prices, totals, product names, customer details, roles, status, or points.

## Checkout behavior

An authenticated user is required. Cart validation opens delivery confirmation; no order is created until the user confirms it. The cart remains in localStorage while the RPC runs and on every failure. It is cleared only after a valid server response. The WhatsApp message then includes the server order number and server-confirmed total; WhatsApp remains a customer-service handoff, not the source of order persistence.

## Idempotency

The browser stores a UUID plus a deterministic fingerprint containing cart code/quantity, normalized delivery values, and save-default choice in sessionStorage. A retry of the same payload reuses the UUID so create_order_from_cart returns the same order. A cart or delivery change gets a new UUID. This pending technical state is removed after success, intentional cancellation, or sign-out.

## Authority

The existing JavaScript prices and point estimate remain display-only. PostgreSQL validates product codes and availability, calculates the total from catalog_products, snapshots items, and creates the order. Points remain zero server-side until the dedicated loyalty phase.
