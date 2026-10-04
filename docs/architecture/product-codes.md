# Product Code System

## 1. Purpose

F2.1 assigns stable internal product identity to the static catalog. It does not add product search, a product database, or change storefront behavior.

## 2. Code Format

Codes use `PREFIX-001`: three uppercase letters, a hyphen, and a zero-padded three-digit sequence. Codes are explicitly written in product markup or variant configuration, never generated from runtime DOM position.

## 3. Category Prefixes

| Category | Prefix |
| --- | --- |
| bebidas | BEB |
| pasabocas | PAS |
| dulceria | DUL |
| galletas | GAL |
| hogar | HOG |

`js/products/catalog.js` centralizes this mapping as `window.GoTienda.products.CATEGORY_PREFIXES`.

## 4. Code vs Legacy Reference

`code` is the permanent human-readable business identifier. `reference` is the existing internal/legacy `data-nombre` value. Both are retained: carts and WhatsApp continue using legacy references in F2.1.

## 5. Variant Identity

Every selectable flavor has its own code in `variantGalleries`. Selecting a flavor preserves its reference and updates the add-to-cart button's internal code. `resolveVariant(reference)` exposes `{ code, reference, price, availability }` for a known variant.

## 6. Catalog Index

`js/products/catalog.js` derives normal products from the existing buttons and merges non-card variants from configuration. Its public API is:

- `getAll()`
- `getByCode(code)`
- `getByReference(reference)`
- `getDiagnostics()`

Each normalized entry has `code`, `reference`, `category`, `name`, `price`, `available`, and, when applicable, `variantFamily`.

## 7. Backward Compatibility

The `carrito` localStorage shape remains `{ nombre, precio, cantidad }`. Existing references continue to resolve in the catalog index and cart code; no customer must clear their cart. WhatsApp messages are unchanged.

## 8. Code Assignment Rules

Codes are unique, permanent, and must never be reused after a product retires. A new sellable reference or variant must receive a new explicit code. Initialization reports missing, malformed, duplicate code, duplicate reference, category-prefix, and missing-variant-code diagnostics without crashing the storefront.

## 9. Future F2.2 Integration

Search can use the index by `code`, `reference`, `category`, and display `name` without changing the current product identity model.
