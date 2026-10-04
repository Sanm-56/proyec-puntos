# Current System Audit

## 1. Executive Summary

GO TIENDA is a dependency-free static storefront. `index.html` is both the product-data source and page structure; `css/estilos.css` provides all presentation and responsive rules; and `js/script.js` enhances the rendered DOM with variants, cart behavior, category filtering, animations, local persistence, points estimation, and WhatsApp checkout.

The application is suitable for an incremental Vanilla JavaScript evolution. The smallest safe direction is to retain the existing static catalogue and progressively add isolated JavaScript modules plus Supabase-backed data only where a later phase needs persistence or authorization. No framework migration or catalogue rewrite is needed.

## 2. Repository Baseline

- Branch: `main`
- HEAD: `9fa40a4d6d1b4575d8406eb5c928d190918fba26` (`Estilo letra eje`)
- `origin/main`: `9fa40a4d6d1b4575d8406eb5c928d190918fba26`; it matches local `HEAD` at the locally fetched reference.
- Git status: clean (`## main...origin/main`); no staged, modified, or untracked files before this audit document was created.
- Repository contents at baseline: 118 tracked files: `index.html`, `css/estilos.css`, `js/script.js`, `README.md`, the logo, and product images. There is no package manifest, build system, Supabase directory, Vercel configuration, or dependency directory in the tracked tree.

## 3. Current File Structure

```text
.
├── index.html                 # Page markup and product catalogue data
├── css/
│   └── estilos.css            # Visual system, responsive rules, cart and gallery styles
├── js/
│   └── script.js              # DOM behavior, cart, variants, WhatsApp checkout
├── img/
│   ├── bienestar/             # Household/tableware assets
│   ├── dulceria/              # Candy assets
│   ├── galletas/              # Cookie assets
│   ├── hogar/                 # Household assets
│   ├── liquidos/              # Beverage assets
│   ├── paquetes/              # Snack assets
│   └── logo.png
└── README.md                  # Two-line project identification
```

The visual category labels do not always match asset folders or inquiry text: the household section uses the `hogar` image folder but some product WhatsApp copy says “galletas”; beverages are stored in `liquidos`; and snacks are stored in `paquetes`.

## 4. Current Architecture

### Responsibilities and initialization

- HTML provides all content, product cards, initial availability badges, `data-nombre` and `data-precio` cart metadata, product WhatsApp URLs, cart markup, and the floating WhatsApp action.
- CSS provides the site identity, grid/card styling, cart drawer, category controls, gallery overlays, state classes, animations, and mobile breakpoints at 768px, 600px, and 359px.
- JavaScript operates directly on DOM selectors. The script is loaded at the end of `body`; it immediately loads and renders the cart, then on `DOMContentLoaded` formats prices, wires expanders and variant galleries, hardens external-link `rel` attributes, configures category filtering, and observes cards for animation.

### State and coupling

- Global state: `galeriasSabores`, `referenciasAgotadas`, `carrito`, and `ultimoResumenPuntos`.
- Global functions include formatting, gallery, cart and checkout functions. `vaciarCarrito()` and `enviarPedido()` must remain globally reachable because the HTML uses inline `onclick` handlers.
- The script depends on exact classes and IDs such as `.producto`, `.agregar-carrito`, `.precio`, `#listaCarrito`, `#btnCarrito`, and category section IDs. Product-card child order and selectors such as `p:not(.precio)` are also behaviorally significant.
- No third-party JavaScript, CSS, API, authentication, or backend dependency is currently present.

## 5. Product Catalog Architecture

The catalogue is static markup: 84 add-to-cart buttons, each representing one visible product card. Categories are `bebidas`, `pasabocas`, `dulceria`, `galletas`, and `hogar`. Cards contain a status badge, image, display title, description, formatted price placeholder, WhatsApp inquiry link, and cart button.

`data-nombre` currently acts as the product identifier and `data-precio` as the canonical client-side price. `configurarPrecios()` overwrites visible `.precio` text from `data-precio`. The HTML therefore duplicates product metadata across title/description, image path, WhatsApp message, button identifier, and price.

Availability is initially marked as available in HTML. JavaScript keeps an empty `referenciasAgotadas` set and can change the badge, add button, and WhatsApp link for a selected variant. This is a manually maintained client-side presentation state, not inventory control.

## 6. Cart Data Flow

1. At load, `obtenerCatalogo()` builds a `Map<nombre, precio>` from all `.agregar-carrito` buttons and supplements it with variant references at their family price.
2. `cargarCarrito()` reads the `carrito` localStorage key and accepts only array entries with a string `nombre`, positive integer `cantidad`, and a product ID present in the current DOM-derived catalogue. It replaces persisted prices with current catalogue prices.
3. Add buttons increment an item matching `nombre`, or append `{ nombre, precio, cantidad: 1 }`.
4. `actualizarCarrito()` renders items with DOM nodes and `textContent`, calculates subtotal/total, estimates points, updates the counter, and writes the array to localStorage.
5. Remove, decrement, and clear operate by current array index. Total equals subtotal; there are no shipping, taxes, discounts, customer data, or order status.

The localStorage shape is an array such as:

```json
[{"nombre":"gaseosa250ml","precio":20800,"cantidad":2}]
```

The load path correctly re-derives prices from the HTML catalogue, but active-session additions, quantities, the cart itself, and checkout are still client-controlled. Cart contents are not a source of truth for a future persisted order.

## 7. WhatsApp Checkout Flow

All current product, wholesale, checkout, and floating-support links target the same business number: `573132082366` (86 `wa.me` links in `index.html`). Product cards contain prefilled inquiry URLs. Selecting a variant replaces its inquiry link with a dynamically built URL using `encodeURIComponent`.

`enviarPedido()` builds a plain-text “NUEVO PEDIDO” message from the client cart, includes line prices, subtotal, total, and estimated points, clears the local cart, then opens WhatsApp in a new tab with an encoded message. Its popup is opened from the click handler, so it is normally user-gesture initiated. The generic card URLs are mostly percent encoded in markup, but their wording and encoding are inconsistent; one observed URL uses `&20` instead of `%20`.

There is no order record, order ID, customer identity, confirmation callback, duplicate-submission protection, or evidence that WhatsApp delivery occurred. A later persisted-order phase should create the order before opening WhatsApp and include a server-generated, non-guessable order reference in the message.

## 8. Loyalty Points Flow

Points are an estimate only: `Math.floor(subtotal / 1000)`, displayed as one point per COP 1,000. `ultimoResumenPuntos` is in-memory display state refreshed with each cart render. It is included in the WhatsApp message but is neither independently persisted nor credited to a user.

Because the estimate depends entirely on a browser-calculated cart, it must not become an account balance or award transaction. Future points must be calculated from validated order line items after the business-confirmed order event, then stored as an immutable ledger/transaction in the database.

## 9. Product Identity and Variant Model

There is no formal, stable product-code system. Existing `data-nombre` values are lower-case reference-like strings and are useful as legacy identifiers, but they are not validated, documented, immutable, or consistently named. Examples of fragility include `gristcara33` versus related `grits...` values, and a card whose inquiry text says `paliment` while `data-nombre` is `palitaci`.

Ten hard-coded `galeriasSabores` family entries map a base product name to arrays of `[label, image path, reference]`. Variant selection mutates the visible card image, description, inquiry URL, and cart button `data-nombre`. Variants inherit the first known price found in their family rather than having explicit per-variant prices. Some gallery references do not correspond to a static cart button; they are added only at runtime by `obtenerCatalogo()`.

This model supports current presentation, but it is insufficient as a database key. F2.1 should introduce an immutable unique `product_code` for each sellable SKU/variant while retaining a separate `legacy_reference` mapping for these current identifiers.

## 10. Responsive Architecture

- Desktop uses an auto-fit product grid with a 160px minimum card width and a fixed cart drawer.
- At 600px and below, header/navigation wrap or scroll horizontally, category navigation becomes horizontally scrollable and sticky, the product grid becomes three columns, product inquiry links are hidden, gallery controls shrink, and the cart drawer is sized to 92vw.
- At 359px and below, the product grid switches to two columns.
- The floating WhatsApp button and cart button remain fixed. Category filtering hides non-selected sections via `.inactive`; expanders independently reveal selected product groups.

The existing mobile behavior is CSS/DOM dependent and should be preserved by adding controls alongside current markup rather than altering product-card structure wholesale.

## 11. Current Security Risks

| Severity | Risk | Evidence and impact |
| --- | --- | --- |
| HIGH | Client-controlled checkout price and order data | Prices and quantities originate in browser markup/state, and the WhatsApp message is client generated. An attacker can alter the page or local state before messaging. This matters once the message is treated as an order. |
| HIGH | No trusted authorization boundary for future accounts/admin work | The current app has no server. Adding an `isAdmin` browser flag or trusting client profile data would allow privilege escalation. Future role checks must be enforced by Supabase RLS/database functions. |
| MEDIUM | Checkout clears cart before confirmation | `enviarPedido()` clears localStorage before the new tab proves WhatsApp opened or before any business acceptance. Popup failure or abandonment can lose the draft. |
| MEDIUM | Availability is client-only | `referenciasAgotadas` is hard-coded and empty. Browser manipulation can re-enable unavailable products; no stock or server validation exists. |
| MEDIUM | No anti-duplicate order mechanism | A user can invoke checkout repeatedly or duplicate a WhatsApp message; no idempotency key or persisted order exists. |
| LOW | Product identity is mutable and inconsistent | A selected gallery variant modifies a button's identifier and variant prices are inferred. This can produce ambiguous reporting or order mapping if directly persisted later. |
| LOW | Inline handlers require globals | The two inline cart actions expose global functions and make future module isolation more error-prone. This is not presently an authorization vulnerability. |
| LOW | Untrusted localStorage is expected but not authenticated | Cart data can be altered. The loader validates structure, known identifiers, and current price, but this is UI resilience rather than security. |
| LOW | XSS surface is presently constrained | Cart data and product labels are rendered with `textContent`; no obvious HTML insertion of customer-controlled data was found. Future profile/order text must retain this discipline and be validated server-side. |

## 12. Maintainability Risks

- The 1,279-line HTML file contains catalogue content and repeated card markup; price, reference, image, description, category, and WhatsApp copy can drift.
- The 927-line CSS file has accumulated styles in sections; duplicate `.producto` declarations and apparently unused `.btn`, `.ripple`, `.redimir-puntos`, `.descuento-puntos`, `.selector-clientes`, and `.mensaje-selector` rules were found. They should not be removed in this phase without a usage decision.
- The 549-line JavaScript file combines independent responsibilities and relies on global scope and fragile selectors.
- Several identifiers, category labels, text strings, image filenames, and encodings are inconsistent. Text appears mojibake in terminal output; future editors should preserve UTF-8 explicitly and verify rendered Spanish copy before any content clean-up.
- Variant availability and prices are duplicated or inferred in separate structures. This is a future data-modeling issue, not a reason to rewrite the working catalogue now.

## 13. Recommended Target Architecture

Keep the static HTML/CSS/Vanilla JS site. Add small, responsibility-based browser modules and leave existing cart/catalog behavior in place behind adapters. Later, use Supabase Auth and PostgreSQL as the only source of truth for authenticated profiles, roles, orders, and points.

Use public browser configuration only for the Supabase URL and publishable/anon key. Never place a `service_role` key in the repository, HTML, JavaScript, Vercel public variables, or browser storage. Server-side database functions and RLS policies must derive identity from `auth.uid()` and never trust a client-supplied user ID, role, price, points amount, or administrative action.

## 14. Recommended Future File Structure

Do not create these files in this phase. This is the minimal future shape:

```text
js/
├── script.js                   # Existing compatibility entry point during transition
├── config/
│   └── supabase.js             # Browser client, public URL/key only
├── services/
│   ├── catalog-service.js      # Static/remote catalogue adapter
│   ├── order-service.js        # Validated order RPC calls
│   └── points-service.js       # Read-only customer points access
├── auth/
│   ├── auth-service.js
│   └── auth-ui.js
├── products/
│   ├── product-identity.js     # Legacy reference to product-code mapping
│   └── search.js
├── orders/
│   ├── checkout.js
│   └── history.js
└── admin/
    └── dashboard.js
supabase/
└── migrations/                 # Versioned, additive SQL migrations
docs/
└── architecture/
    └── current-system-audit.md
```

## 15. Supabase Integration Strategy

- **Client initialization:** F1.1 adds a single browser Supabase client module imported by only features that need it. Its configuration uses the project URL and publishable/anon key supplied at deployment time; no credentials are invented in this repository.
- **Auth:** F1.3 adds registration, session restoration, logout, and a small UI adapter without interrupting anonymous catalogue/cart use.
- **Profiles:** F1.2 adds a `profiles` table keyed to `auth.users.id`, with users able to view/update only their own permitted profile fields through RLS.
- **Roles:** F4.1 stores roles in protected server-controlled data. A user cannot update their role. Admin checks are policy/database-function checks, not JavaScript conditionals.
- **Products/codes:** F2.1 maps legacy HTML identifiers and gallery variants to unique, immutable product codes. F2.2 searches that controlled data; static cards stay operational during migration.
- **Orders:** F3.1/3.2 add orders and order-items tables, server-side price lookup/calculation, authenticated ownership checks, and an idempotent checkout RPC. WhatsApp opens only after a successful order creation and receives its generated reference.
- **Points:** F5.1 adds an append-only points ledger tied to confirmed orders. Points balance is calculated/read from authorized server data, never supplied by the browser.
- **RLS:** Each migration introduces least-privilege policies. Customers can only access their own profile/orders/points; admins have explicit server-enforced policies; public catalogue access is limited to required read-only data if cataloguing moves to Supabase.

## 16. Backward Compatibility Strategy

- Preserve the existing product card markup, image paths, categories, gallery interactions, availability labels, and current `data-nombre` values initially.
- Keep `localStorage` key `carrito` and its array shape for anonymous and pre-login carts. On login, do not silently discard it; later checkout can validate/map it to server product codes.
- Keep the current client cart as a draft/UI mechanism even after server checkout exists. The server must recompute products, prices, totals, and awarded points.
- Preserve WhatsApp product inquiries, wholesale link, floating support link, and responsive behavior. Later checkout augments the message with a database-generated order ID rather than replacing the channel.
- Introduce modules beside the existing code and migrate one behavior per approved phase. Avoid visual/card markup refactors until feature work requires a narrowly scoped adapter.

## 17. Recommended Phase Order

Follow the requested sequence without merging or reordering:

1. F0.2 Architecture Preparation
2. F1.1 Supabase Foundation
3. F1.2 User Database
4. F1.3 Registration and Login
5. F1.4 User Account UI
6. F2.1 Product Code System
7. F2.2 Product Search
8. F3.1 Orders Database
9. F3.2 Persistent Checkout
10. F3.3 Purchase History
11. F4.1 Secure Admin Roles
12. F4.2 Admin Dashboard
13. F4.3 Order Management
14. F5.1 Persistent Loyalty Points
15. F6.1 WhatsApp Customer Service Upgrade
16. F7.1 Security and RLS Audit
17. F8.1 Final Integration Validation

There is no concrete blocker requiring a change to this order. The key dependency is that F3.2 must validate and persist orders on the server before F5.1 grants persistent points, and F4.2 must follow secure F4.1 role enforcement.
