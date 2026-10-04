# Supabase Foundation

## 1. Purpose

F1.1 adds the minimum browser-side Supabase integration foundation for the existing static GO TIENDA storefront. It does not implement authentication, profiles, roles, orders, points, product codes, search, or database schema.

## 2. Project Association

- Supabase project name: `Proyec Puntos` (required dedicated project)
- Project ref: `cyjgonlsovzfeehuqqdg`
- Organization: Sanm-56's Org
- Region: `us-east-1`
- Plan: Free (known account context)
- Project URL: `https://cyjgonlsovzfeehuqqdg.supabase.co`
- Status: `ACTIVE_HEALTHY`; configured with an active modern publishable browser key.

No unrelated project is reused, and no Supabase project was created in this phase.

## 3. Client Architecture

```text
index.html
  -> official @supabase/supabase-js v2 CDN
  -> js/config/supabase-config.js
  -> js/services/supabase.js
  -> existing GO TIENDA modules
  -> js/script.js
```

The existing catalog modules do not depend on Supabase. `supabase.js` creates at most one client and exposes a small status API through `window.GoTienda.supabase`.

## 4. Browser Configuration

`js/config/supabase-config.js` exposes `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` inside `window.GoTienda.supabaseConfig`. It uses this project's modern publishable browser key; the key value is intentionally not documented here.

A project URL and publishable key may be visible in browser source: they identify the public application and are constrained by Row Level Security. They do not authorize unrestricted data access. Every future exposed table must enable RLS and receive least-privilege policies before browser access is enabled.

## 5. Secret Management

Never commit, place in browser code, send in URLs, or expose through Vercel public variables:

- `service_role` / legacy service-role JWTs
- Supabase secret keys (`sb_secret_...`)
- database passwords or connection strings with passwords
- Supabase personal access tokens or Management API tokens
- JWT signing secrets

## 6. Application Namespace

`window.GoTienda.supabase` has three public members:

- `client`: the single Supabase client when configured, otherwise `null`.
- `getStatus()`: returns `not-configured`, `library-unavailable`, `initialization-failed`, or `initialized`.
- `isAvailable()`: returns true only when initialization succeeded.

This enables future services to opt in without making the public storefront depend on the backend.

## 7. Migration Strategy

`supabase/migrations/` is reserved for versioned, additive SQL migrations. When schema work begins, create migration files with the installed Supabase CLI, review them, and apply them in version order. Do not manually change production schema outside controlled migrations. F1.1 creates no migration, table, RLS policy, function, or seed data.

## 8. Future Integration Points

- F1.2: profiles/user database and RLS.
- F1.3: registration and login services/UI.
- F1.4: user account UI.
- F3.1: orders and order items with server-side validation.
- F4.1: protected roles and admin authorization enforced by database/RLS.
- F5.1: persistent points ledger based on confirmed orders.

Future browser features must use the reusable client; privileged work must remain server-side and never use a secret key in the browser.
