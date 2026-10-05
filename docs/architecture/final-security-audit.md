# Final Security Audit

## Scope and Evidence

This F7.1 closeout reconciles the repository migrations and browser source with the independently verified current Supabase function, grant, RLS, and Advisor state supplied for this review. It does not change application behavior or the database.

## RLS and Browser Authority

All application tables introduced by the project migrations have RLS enabled. `catalog_products` exposes only active products to `anon` and `authenticated`; `loyalty_settings` exposes only its singleton read. `profiles`, `user_roles`, `orders`, `order_items`, `loyalty_accounts`, and `loyalty_transactions` have authenticated owner-or-admin read policies as applicable.

Browser roles have no direct writes to `orders`, `order_items`, `user_roles`, `loyalty_accounts`, or `loyalty_transactions`. The browser submits product codes and quantities to checkout; `create_order_from_cart` loads prices and availability from `catalog_products`, derives the customer from the authenticated profile, and calculates points from `loyalty_settings`. It does not accept browser-supplied prices, totals, status, roles, or points as authority.

## Function Execution Matrix

| Function | Security mode / `search_path` | PUBLIC / anon / authenticated execute | Internal authorization | Intended exposure |
| --- | --- | --- | --- | --- |
| `admin_update_loyalty_settings(bigint,bigint,boolean)` | DEFINER / empty | no / no / yes | Requires `auth.uid()` and `public.is_admin()`; validates positive COP and point values and updates singleton row 1. | Authenticated admin RPC only. |
| `admin_update_order_status(text,text)` | DEFINER / empty | no / no / yes | Requires `auth.uid()` and `public.is_admin()`; locks the order, permits only valid transitions, preserves terminal behavior, and awards loyalty exactly once. | Authenticated admin RPC only. |
| `create_order_from_cart(jsonb,uuid,jsonb,boolean)` | DEFINER / empty | no / no / yes | Requires `auth.uid()`; derives profile and trusted catalog data, validates delivery and cart input, calculates loyalty from database settings, and preserves idempotency. | Authenticated checkout RPC only. |
| `create_order_from_cart(jsonb,uuid)` | DEFINER / empty | no / no / no | Its migration implementation requires `auth.uid()` and derives prices from the catalog, but this legacy overload has no browser-executable grant. | Retained legacy signature; not browser exposed. |
| `handle_new_user()` | DEFINER / empty | no / no / no | Auth-user insert trigger creates a profile and fixed `user` role; callers cannot select their role. | Auth trigger only. |
| `is_admin()` | DEFINER / empty | no / no / yes | Derives caller solely from `auth.uid()` and checks `public.user_roles`. | Authenticated helper for RLS and authorized RPCs. |
| `set_updated_at()` | INVOKER / empty | no / no / no | Trigger-only timestamp helper; it accepts no browser authority. | Table trigger only. |
| `set_user_role(uuid,text)` | DEFINER / empty | no / no / yes | Requires `auth.uid()` and an existing admin role, whitelists roles, rejects self-mutation, and verifies the target Auth user. | Restricted authenticated admin RPC; no current browser UI calls it. |

## INTENTIONAL: SECURITY DEFINER Advisor Warnings

The Advisor identifies authenticated-executable `SECURITY DEFINER` functions. This warning is intentional and mitigated, not dismissed: each listed function has an empty fixed `search_path`, `PUBLIC` and `anon` execution revoked, and internal authorization appropriate to its operation.

- `create_order_from_cart`: authenticated checkout needs controlled writes across orders, items, delivery defaults, and trusted catalog/loyalty data. It requires `auth.uid()` and derives all authoritative order values server-side.
- `admin_update_order_status`: only an authenticated caller that `is_admin()` may lock and transition an order; loyalty awarding is protected by an order/transaction uniqueness constraint and `ON CONFLICT` handling.
- `admin_update_loyalty_settings`: only an authenticated caller that `is_admin()` may modify the singleton settings row, after value validation.
- `is_admin`: authenticated-only helper derives identity with `auth.uid()` and prevents RLS recursion while reading roles.
- `set_user_role`: authenticated-only, but independently requires an existing administrator, validates the role and target user, and blocks self-role mutation.

## FIXED / VERIFIED

No confirmed critical defect was found in the reconciled migrations, browser source, or supplied remote verification:

- no anonymous private-profile, order, or loyalty-account read;
- no direct browser role, order, or loyalty mutation;
- no browser-supplied trusted price or trusted points;
- no service-role credential exposure in browser code; and
- no self-admin escalation through the role RPC.

The browser configuration contains only the Supabase URL and publishable key. Application code does not store or log passwords or service-role credentials. `localStorage` retains the legacy cart; `sessionStorage` retains only temporary checkout idempotency state. WhatsApp support reloads RLS-authorized order data and opens a `wa.me` URL only after user action.

## ACCEPTED: Performance Warnings

- `order_items_product_code_idx`: **ACCEPTED / RETAINED**. It covers product-code foreign-key access and is appropriate for the current low-traffic system despite the unused-index informational notice.
- `profiles` multiple permissive SELECT policies: **ACCEPTED PERFORMANCE WARNING**. The policies implement owner-or-admin read semantics; this is not a confirmed authorization failure.
- `user_roles` multiple permissive SELECT policies: **ACCEPTED PERFORMANCE WARNING**. The policies implement owner-or-admin read semantics; this is not a confirmed authorization failure.

## MANUAL ACTION REQUIRED

**Leaked Password Protection is disabled.** Enable it in Supabase Dashboard: **Authentication / Auth settings / Password security / Leaked Password Protection**. This is an Auth dashboard setting; no SQL workaround was attempted. Supabase documents this control under the project's Auth settings and notes its plan availability.

## DEFERRED DEPLOYMENT HARDENING

At release, add and test Vercel security headers: CSP, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, and `frame-ancestors`. Validate that they do not break Supabase, WhatsApp, image assets, or the Supabase CDN before deployment.
