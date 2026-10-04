# Persistent Checkout

F3.2 connects the existing cart to the F3.1 order RPC without replacing the static catalog, cart UI, localStorage persistence, or WhatsApp service.

## Browser request

js/orders/orders.js maps each legacy cart nombre through GoTienda.products.getByReference(). The browser sends only an item code, quantity, and client request UUID. It does not send prices, totals, product names, customer details, roles, status, or points.

## Checkout behavior

An authenticated user is required. The cart remains in localStorage while the RPC runs and on every failure. It is cleared only after a valid server response. The WhatsApp message then includes the server order number and server-confirmed total; WhatsApp remains a customer-service handoff, not the source of order persistence.

## Idempotency

The browser stores only a UUID and a deterministic cart fingerprint in sessionStorage. A retry of the same cart reuses the UUID so create_order_from_cart returns the same order. A cart change gets a new UUID. Session storage holds no price, product, customer, session, or role information.

## Authority

The existing JavaScript prices and point estimate remain display-only. PostgreSQL validates product codes and availability, calculates the total from catalog_products, snapshots items, and creates the order. Points remain zero server-side until the dedicated loyalty phase.
