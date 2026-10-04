# JavaScript Architecture

## 1. Purpose

This controlled refactor separates existing GO TIENDA browser responsibilities while retaining the static HTML/CSS/Vanilla JavaScript site. It adds no Supabase, authentication, database access, product codes, search, orders, roles, or dependencies.

## 2. Current Entry Point

`js/script.js` remains the entry point. Classic scripts load at the end of `body` in this order: `core/format.js`, `whatsapp/whatsapp.js`, `products/variants.js`, `cart/cart.js`, then `script.js`. Classic scripts preserve the current static loading model; `window.GoTienda` is the sole shared namespace and there are no standalone global cart handlers.

## 3. Module/File Responsibilities

- `js/core/format.js`: COP price formatting. Depends on browser APIs. Public interface: `GoTienda.formatPrice(value)`.
- `js/whatsapp/whatsapp.js`: WhatsApp URL and checkout message construction. Depends on `formatPrice`. Public interface: `GoTienda.whatsapp.createWhatsappUrl(message)` and `buildCheckoutMessage(cart, summary)`.
- `js/products/variants.js`: existing price rendering, variant gallery configuration, selection, and availability presentation. Depends on formatting and WhatsApp URL construction. Public interface: `GoTienda.products.variantGalleries`, `configurePrices()`, and `configureFlavorGalleries()`.
- `js/cart/cart.js`: DOM catalog lookup, localStorage validation/restore, cart state/rendering, quantity actions, points estimate, and checkout delegation. Depends on format, variants, and WhatsApp. Public interface: `GoTienda.cart.createCartController()`.
- `js/script.js`: orchestration, expanders, cart drawer/listeners, animation, navigation, link hardening, and viewport animation. Depends on the preceding namespace APIs. It has no public interface.

## 4. Initialization Flow

1. Dependency files create their namespace interfaces.
2. The entry point creates a cart controller, restores `carrito`, and renders it.
3. On `DOMContentLoaded`, it formats prices, configures expanders, builds galleries, and wires cart buttons.
4. It sets external-link protections, configures category navigation/Mostrar todos, and enables existing animations.
5. Variant selection and checkout preserve the existing image/reference/availability and WhatsApp workflow.

## 5. State Ownership

- Cart: closure-local state in the cart controller, persisted at `localStorage["carrito"]`.
- Catalog lookup: derived from current add buttons plus gallery variant references.
- Variants/availability: `GoTienda.products.variantGalleries` and its current empty client-side unavailable set.
- Points estimate: closure-local cart summary, recalculated as `floor(subtotal / 1000)` on render.

## 6. localStorage Contract

The key remains `carrito`; each item remains compatible with:

```json
{"nombre":"gaseosa250ml","precio":20800,"cantidad":2}
```

Restore requires a known string `nombre` and positive integer `cantidad`, and replaces persisted price with the current DOM catalog price exactly as before. Invalid JSON clears the key.

## 7. Future Extension Points

- F1.1 can add a public-key-only Supabase client at `js/config/`.
- Auth/profile UI can add isolated modules without preventing anonymous catalog/cart use.
- Product code/search can map current legacy references without moving the current catalog in this phase.
- Order persistence can replace only the checkout boundary; the cart remains a UI draft and WhatsApp follows a persisted order.
- Admin modules follow server-enforced roles/RLS; persistent points follow confirmed orders and an authorized ledger.

## 8. Compatibility Guarantees

The 84 product cards, five categories, images, prices, references, availability, expanders, galleries, category navigation, Mostrar todos, responsive CSS, and animations remain markup/CSS driven. Cart add/increment/decrement/remove/clear, totals, points estimate, localStorage shape/restore, product/wholesale/floating WhatsApp links, and checkout destination remain unchanged. Inline handlers were replaced by explicit listeners for `#btnVaciarCarrito` and `#btnEnviarPedido`.
