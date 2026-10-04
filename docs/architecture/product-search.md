# Product Search

## 1. Purpose

F2.2 adds local, accessible product lookup without a database request or a new product source of truth.

## 2. Architecture

`window.GoTienda.products` supplies normalized products to `window.GoTienda.productSearch`, which renders the search UI in the products section.

## 3. Indexed Fields

Search normalizes and compares code, legacy reference, display name, and category. It is accent-insensitive, case-insensitive, and collapses repeated whitespace.

## 4. Ranking Rules

Results rank exact code, exact reference, exact name, code prefix, reference prefix, name prefix, partial code/reference/name, then category matches. Ties are ordered by stable code.

## 5. Variant Search

Variant results use the configured variant selector, so the existing flavor mechanism updates the image, reference, code, price inheritance, and availability rather than duplicating that behavior.

## 6. Category Integration

Search indexes all categories regardless of the active category. Selecting a result temporarily reveals the required category; clearing restores the prior category state.

## 7. Hidden Products

Result selection temporarily reveals products behind existing “Ver más” controls and applies a short visual highlight before scrolling to the card.

## 8. Security

The search is memory-only and performs no network or Supabase operation. Results are built with DOM nodes and `textContent`; neither query nor catalog values are injected as HTML.

## 9. Performance

The in-memory index has 109 entries. Search is deterministic client-side filtering with no network request or full catalog rebuild.

## 10. Future Integration

Future database or admin catalog work must preserve the stable product codes used by this search.
